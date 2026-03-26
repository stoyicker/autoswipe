/**
 * Tinder content script — handles both main feed (/app/recs) and
 * Explore page (/app/explore) with automatic group cycling.
 */

let groupIndex = 0;
let navigatingToGrid = false;

function getPage() {
  const path = window.location.pathname;
  if (path.startsWith('/app/explore/')) return 'explore-group';
  if (path === '/app/explore' || path === '/app/explore/') return 'explore';
  return 'recs';
}

function hasUpsellPopup() {
  return !!document.querySelector('div[role="dialog"]');
}

function hasBeacon() {
  const output = document.querySelector('output');
  if (output) {
    if (output.querySelector('span[class*="beacon__"]')) return true;
  }

  // "Back to Explore" button means the group is exhausted (explore groups only)
  if (getPage() !== 'recs') {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.includes('Back to Explore')) return true;
    }
  }

  return false;
}

function getGroupButtons() {
  return Array.from(document.querySelectorAll('button[class*="Fxb"]'));
}

async function clickGroupAtIndex(index) {
  const buttons = getGroupButtons();

  if (index >= buttons.length) return false;

  const btn = buttons[index];
  const rect = btn.getBoundingClientRect();
  const x = Math.round(rect.left + rect.width / 2);
  const y = Math.round(rect.top + rect.height / 2);

  try {
    const result = await chrome.runtime.sendMessage({ type: 'SEND_CLICK', x, y });
    if (!result?.ok) return false;
  } catch {
    return false;
  }

  return true;
}

const engine = new AutoSwipeEngine({
  platformId: 'tinder',
  key: 'ArrowRight',

  beforeSwipe() {
    const page = getPage();

    if (hasUpsellPopup()) return false;

    if (page === 'recs') {
      if (hasBeacon()) return false;
      return;
    }

    if (page === 'explore') {
      if (navigatingToGrid) {
        navigatingToGrid = false;
      }

      clickGroupAtIndex(groupIndex).then((ok) => {
        if (!ok) {
          engine.stop();
          if (engine._isContextValid()) {
            chrome.runtime.sendMessage({ type: 'ENGINE_STOPPED' }).catch(() => {});
          }
        }
      });

      groupIndex++;
      return 'skip';
    }

    if (page === 'explore-group') {
      if (hasBeacon()) {
        navigatingToGrid = true;
        window.location.href = '/app/explore';
        return 'skip';
      }
      return;
    }
  },

  afterSwipe() {
    if (hasUpsellPopup() || hasBeacon()) return false;
  },
});

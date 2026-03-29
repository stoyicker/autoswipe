/**
 * Tinder content script — handles both main feed (/app/recs) and
 * Explore page (/app/explore) with automatic group cycling.
 */

let groupIndex = 0;
let navigatingToGrid = false;
let waitingForGroupLoad = false;

function getPage() {
  const path = window.location.pathname;
  if (path.startsWith('/app/explore/')) return 'explore-group';
  if (path === '/app/explore' || path === '/app/explore/') return 'explore';
  return 'recs';
}

function getVisibleDialog() {
  const dialog = document.querySelector('div[role="dialog"]');
  if (dialog && dialog.offsetParent !== null) return dialog;
  return null;
}

function isPlatinumUpsell(dialog) {
  return dialog && dialog.innerText.includes('Tinder Platinum');
}

function hasBeacon() {
  const output = document.querySelector('output');
  return !!output?.querySelector('span[class*="beacon__"]');
}

function getGroupButtons() {
  return Array.from(document.querySelectorAll('button[class*="Fxb"]'));
}

async function clickGroupAtIndex(index) {
  const buttons = getGroupButtons();
  console.log(`[AS] clickGroupAtIndex(${index}): ${buttons.length} buttons found`);

  if (index >= buttons.length) return false;

  const btn = buttons[index];
  const rect = btn.getBoundingClientRect();
  const x = Math.round(rect.left + rect.width / 2);
  const y = Math.round(rect.top + rect.height / 2);
  console.log(`[AS] button rect:`, rect, `clicking at (${x}, ${y}), visible=${btn.offsetParent !== null}`);

  try {
    const result = await chrome.runtime.sendMessage({ type: 'SEND_CLICK', x, y });
    console.log(`[AS] SEND_CLICK result:`, result);
    if (!result?.ok) return false;
  } catch (e) {
    console.log(`[AS] SEND_CLICK error:`, e.message);
    return false;
  }

  return true;
}

const engine = new AutoSwipeEngine({
  platformId: 'tinder',
  key: 'ArrowRight',

  beforeSwipe() {
    const page = getPage();
    console.log(`[AS] beforeSwipe page=${page}, url=${window.location.pathname}, groupIndex=${groupIndex}, waitingForGroupLoad=${waitingForGroupLoad}`);

    const dialog = getVisibleDialog();
    if (dialog) {
      if (isPlatinumUpsell(dialog)) {
        console.log('[AS] Platinum upsell — dismissing with ESC');
        chrome.runtime.sendMessage({ type: 'SEND_KEY', key: 'Escape' });
        return 'skip';
      }
      console.log('[AS] upsell popup detected — stopping');
      return false;
    }

    if (page === 'recs') {
      if (hasBeacon()) {
        console.log('[AS] beacon on recs — stopping');
        return false;
      }
      return;
    }

    if (page === 'explore' || page === 'explore-group') {
      // After clicking a group, wait for profiles to load (beacon to disappear)
      if (waitingForGroupLoad) {
        const beacon = hasBeacon();
        console.log(`[AS] waitingForGroupLoad: hasBeacon=${beacon}, page=${getPage()}, url=${window.location.pathname}`);
        if (beacon) {
          return 'skip';
        }
        console.log(`[AS] group ${groupIndex} loaded, resuming swipes`);
        waitingForGroupLoad = false;
        groupIndex++;
        return;
      }

      if (hasBeacon()) {
        const buttons = getGroupButtons();
        console.log(`[AS] exhausted, clicking next group ${groupIndex}/${buttons.length - 1}`);

        if (page === 'explore-group') {
          navigatingToGrid = true;
          window.location.href = '/app/explore';
          return 'skip';
        }

        // On explore grid — click the next group
        waitingForGroupLoad = true;
        const clickIdx = groupIndex;
        clickGroupAtIndex(clickIdx).then((ok) => {
          console.log(`[AS] clickGroupAtIndex(${clickIdx}) result: ${ok}`);
          if (!ok) {
            waitingForGroupLoad = false;
            engine.stop();
            if (engine._isContextValid()) {
              chrome.runtime.sendMessage({ type: 'ENGINE_STOPPED' }).catch(() => {});
            }
          }
        });
        return 'skip';
      }

      console.log('[AS] profiles visible — swiping');
      return;
    }
  },

  afterSwipe() {
    const dialog = getVisibleDialog();
    if (dialog) {
      if (isPlatinumUpsell(dialog)) {
        console.log('[AS] afterSwipe: Platinum upsell — dismissing with ESC');
        chrome.runtime.sendMessage({ type: 'SEND_KEY', key: 'Escape' });
        return;
      }
      return false;
    }
    if (!waitingForGroupLoad && hasBeacon()) return false;
  },
});

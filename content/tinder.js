/**
 * Tinder content script — handles both main feed (/app/recs) and
 * Explore page (/app/explore) with automatic group cycling.
 */

let groupIndex = 0;
let navigatingToGrid = false;
let waitingForGroupLoad = false;
let groupLoadStartTime = 0;
const GROUP_LOAD_TIMEOUT = 5000;

function getPage() {
  const path = window.location.pathname;
  if (path.startsWith('/app/explore/')) return 'explore-group';
  if (path === '/app/explore' || path === '/app/explore/') return 'explore';
  return 'recs';
}

function getVisibleDialog() {
  const dialogs = document.querySelectorAll('div[role="dialog"]');
  for (const dialog of dialogs) {
    const rect = dialog.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && dialog.innerText.trim()) {
      // "Back to Explore" is the end-of-group screen, not an upsell
      if (dialog.innerText.includes('Back to Explore')) continue;
      return dialog;
    }
  }
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

function getLikeButton() {
  const spans = document.querySelectorAll('span.Hidden');
  for (const span of spans) {
    if (span.textContent === 'Like') return span.closest('button');
  }
  return null;
}

async function clickLikeButton() {
  const btn = getLikeButton();
  if (!btn) return false;
  btn.setAttribute('data-autoswipe-target', '');
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'CLICK_ELEMENT',
      selector: 'button[data-autoswipe-target]',
    });
    console.log('[AS] Like click result:', result);
    return result?.ok ?? false;
  } catch (e) {
    console.log('[AS] Like click error:', e.message);
    return false;
  } finally {
    btn.removeAttribute('data-autoswipe-target');
  }
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

  async beforeSwipe() {
    const page = getPage();
    console.log(`[AS] beforeSwipe page=${page}, url=${window.location.pathname}, groupIndex=${groupIndex}, waitingForGroupLoad=${waitingForGroupLoad}`);

    const matchH1 = [...document.querySelectorAll('h1')].find(
      (h1) => h1.textContent.startsWith('You matched with')
    );
    if (matchH1) {
      console.log('[AS] match popup detected — dismissing');
      try {
        await chrome.runtime.sendMessage({
          type: 'CLICK_ELEMENT',
          selector: 'button[title="Back to Tinder"]',
        });
      } catch (e) {
        console.log('[AS] Back to Tinder click error:', e.message);
      }
      return 'skip';
    }

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
      const ok = await clickLikeButton();
      if (!ok) return false;
      return 'skip';
    }

    if (page === 'explore' || page === 'explore-group') {
      // After clicking a group, wait for profiles to load (beacon to disappear)
      if (waitingForGroupLoad) {
        const beacon = hasBeacon();
        const elapsed = Date.now() - groupLoadStartTime;
        console.log(`[AS] waitingForGroupLoad: hasBeacon=${beacon}, elapsed=${elapsed}ms`);
        if (beacon) {
          if (elapsed > GROUP_LOAD_TIMEOUT) {
            console.log(`[AS] group ${groupIndex} timed out, trying next`);
            waitingForGroupLoad = false;
            groupIndex++;
            // Fall through to the hasBeacon() block below to click next group
          } else {
            return 'skip';
          }
        } else {
          console.log(`[AS] group ${groupIndex} loaded, resuming swipes`);
          waitingForGroupLoad = false;
          groupIndex++;
          const ok = await clickLikeButton();
          if (!ok) return false;
          return 'skip';
        }
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
        groupLoadStartTime = Date.now();
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
      const ok = await clickLikeButton();
      if (!ok) return false;
      return 'skip';
    }
  },

});

function needsRefresh() {
  const btn = document.querySelector('button[aria-label="Love"]');
  if (!btn) return false;
  const canvas = btn.querySelector('canvas');
  const style = canvas?.style;
  const result = canvas && style?.width === '0px' && style?.height === '0px';
  if (result) console.log('[AS] needsRefresh: canvas is 0x0');
  return result;
}

function hasLoveButton() {
  return !!document.querySelector('button[aria-label="Love"]');
}

function hasMoreSoulsCard() {
  const visibleText = document.body.innerText.replace(/\s+/g, ' ');
  return /more souls are online right now/i.test(visibleText);
}

async function waitForLoveButton() {
  console.log('[AS] Love button missing, waiting 1 day...');
  await new Promise((r) => setTimeout(r, 86400000));
  const found = hasLoveButton();
  console.log(`[AS] after 30s wait: btn=${found}`);
  return found;
}

const engine = new AutoSwipeEngine({
  platformId: 'boo',

  async beforeSwipe() {
    if (hasMoreSoulsCard()) {
      console.log('[AS] "More souls" detected, clicking Pass');
      try {
        const result = await chrome.runtime.sendMessage({
          type: 'CLICK_ELEMENT',
          selector: 'button[aria-label="Pass"]',
        });
        if (!result?.ok) console.log('[AS] Pass click failed:', result?.error);
      } catch (e) {
        console.log('[AS] Pass click error:', e.message);
      }
      return 'skip';
    }

    const refreshNeeded = needsRefresh();
    console.log(`[AS] beforeSwipe: btn=${hasLoveButton()}, needsRefresh=${refreshNeeded}`);

    if (refreshNeeded) {
      console.log('[AS] scheduling reload');
      engine.scheduleReload();
      return 'skip';
    }

    if (!hasLoveButton()) {
      const came_back = await waitForLoveButton();
      if (!came_back) return false;
      return 'skip';
    }

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'CLICK_ELEMENT',
        selector: 'button[aria-label="Love"]',
      });
      console.log('[AS] CLICK_ELEMENT result:', result);
      if (!result?.ok) return false;
    } catch (e) {
      console.log('[AS] CLICK_ELEMENT error:', e.message);
      return false;
    }

    return 'skip';
  },

  async afterSwipe() {
    if (hasMoreSoulsCard()) return;

    if (needsRefresh()) {
      engine.scheduleReload();
      return;
    }
    if (!hasLoveButton()) {
      const came_back = await waitForLoveButton();
      if (!came_back) return false;
    }
  },
});

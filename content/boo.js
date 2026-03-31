function needsRefresh() {
  const btn = document.querySelector('button[aria-label="Love"]');
  if (!btn) return false;
  const canvas = btn.querySelector('canvas');
  const result = canvas && canvas.width === 0 && canvas.height === 0;
  if (result) console.log('[AS] needsRefresh: canvas is 0x0');
  return result;
}

function hasLoveButton() {
  return !!document.querySelector('button[aria-label="Love"]');
}

async function waitForLoveButton() {
  console.log('[AS] Love button missing, waiting 30s...');
  await new Promise((r) => setTimeout(r, 30000));
  const found = hasLoveButton();
  console.log(`[AS] after 30s wait: btn=${found}`);
  return found;
}

const engine = new AutoSwipeEngine({
  platformId: 'boo',

  async beforeSwipe() {
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
    const moreSouls = [...document.querySelectorAll('p')].some(
      (p) => p.textContent.includes('More souls are online right now!')
    );
    if (moreSouls) {
      console.log('[AS] "More souls" detected, clicking Pass');
      try {
        await chrome.runtime.sendMessage({
          type: 'CLICK_ELEMENT',
          selector: 'button[aria-label="Pass"]',
        });
      } catch (e) {
        console.log('[AS] Pass click error:', e.message);
      }
      return;
    }

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

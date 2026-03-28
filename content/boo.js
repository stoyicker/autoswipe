function needsRefresh() {
  const btn = document.querySelector('button[aria-label="Love"]');
  if (!btn) return false;
  const canvas = btn.querySelector('canvas');
  const result = canvas && canvas.width === 0 && canvas.height === 0;
  if (result) console.log('[AS] needsRefresh: canvas is 0x0');
  return result;
}

const engine = new AutoSwipeEngine({
  platformId: 'boo',

  async beforeSwipe() {
    const refreshNeeded = needsRefresh();
    const btn = document.querySelector('button[aria-label="Love"]');
    console.log(`[AS] beforeSwipe: btn=${!!btn}, needsRefresh=${refreshNeeded}`);

    if (refreshNeeded) {
      console.log('[AS] scheduling reload');
      engine.scheduleReload();
      return 'skip';
    }

    if (!btn) {
      console.log('[AS] no Love button — stopping');
      return false;
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

  afterSwipe() {
    const refreshNeeded = needsRefresh();
    const btn = document.querySelector('button[aria-label="Love"]');
    console.log(`[AS] afterSwipe: btn=${!!btn}, needsRefresh=${refreshNeeded}`);

    if (refreshNeeded) {
      engine.scheduleReload();
      return;
    }
    if (!btn) {
      console.log('[AS] afterSwipe: no Love button — stopping');
      return false;
    }
  },
});

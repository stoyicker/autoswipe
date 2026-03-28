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

    const rect = btn.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    console.log(`[AS] clicking Love at (${x}, ${y})`, rect);

    try {
      const result = await chrome.runtime.sendMessage({ type: 'SEND_CLICK', x, y });
      console.log('[AS] SEND_CLICK result:', result);
      if (!result?.ok) return false;
    } catch (e) {
      console.log('[AS] SEND_CLICK error:', e.message);
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

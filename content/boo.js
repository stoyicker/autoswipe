function needsRefresh() {
  const btn = document.querySelector('button[aria-label="Love"]');
  if (!btn) return false;
  const canvas = btn.querySelector('canvas');
  return canvas && canvas.width === 0 && canvas.height === 0;
}

const engine = new AutoSwipeEngine({
  platformId: 'boo',

  async beforeSwipe() {
    if (needsRefresh()) {
      engine.scheduleReload();
      return 'skip';
    }

    const btn = document.querySelector('button[aria-label="Love"]');
    if (!btn) return false;

    const rect = btn.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);

    try {
      const result = await chrome.runtime.sendMessage({ type: 'SEND_CLICK', x, y });
      if (!result?.ok) return false;
    } catch {
      return false;
    }

    return 'skip';
  },

  afterSwipe() {
    if (needsRefresh()) {
      engine.scheduleReload();
      return;
    }
    if (!document.querySelector('button[aria-label="Love"]')) return false;
  },
});

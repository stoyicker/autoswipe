const engine = new AutoSwipeEngine({
  platformId: 'badoo',

  async beforeSwipe() {
    const btn = document.querySelector('button[data-qa="profile-card-action-vote-yes"]');
    console.log(`[AS] beforeSwipe: btn=${!!btn}`);
    if (!btn) return false;

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'CLICK_ELEMENT',
        selector: 'button[data-qa="profile-card-action-vote-yes"]',
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
    const allDone = document.body.innerText.includes("That's all for now!");
    console.log(`[AS] afterSwipe: allDone=${allDone}`);
    if (allDone) return false;
  },
});

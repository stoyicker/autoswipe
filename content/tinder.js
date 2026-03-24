const engine = new AutoSwipeEngine({
  platformId: 'tinder',
  key: 'ArrowRight',
  beforeSwipe() {
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) {
      console.log('[AutoSwipe] Tinder upsell popup detected — stopping');
      return false;
    }
  },
});

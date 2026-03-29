const engine = new AutoSwipeEngine({
  platformId: 'bumble',
  key: 'ArrowRight',

  afterSwipe() {
    const blocker = !!document.querySelector('div.encounters-user__blocker');
    console.log(`[AS] afterSwipe: blocker=${blocker}`);
    if (blocker) return false;
  },
});

const engine = new AutoSwipeEngine({
  platformId: 'bumble',
  key: 'ArrowRight',

  afterSwipe() {
    const caughtUp = document.body.innerText.includes("You're all caught up!");
    console.log(`[AS] afterSwipe: caughtUp=${caughtUp}`);
    if (caughtUp) return false;
  },
});

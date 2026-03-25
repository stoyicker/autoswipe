const engine = new AutoSwipeEngine({
  platformId: 'bumble',
  key: 'ArrowRight',

  beforeSwipe() {
    if (document.body.innerText.includes("You're all caught up!")) return false;
  },
});

const engine = new AutoSwipeEngine({
  platformId: 'bumble',
  key: 'ArrowRight',

  afterSwipe() {
    if (document.body.innerText.includes("You're all caught up!")) return false;
  },
});

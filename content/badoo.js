const engine = new AutoSwipeEngine({
  platformId: 'badoo',
  key: 'ArrowRight',

  beforeSwipe() {
    if (document.body.innerText.includes("That's all for now!")) return false;
  },
});

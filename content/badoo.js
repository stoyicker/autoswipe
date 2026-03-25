const engine = new AutoSwipeEngine({
  platformId: 'badoo',
  key: 'ArrowRight',

  beforeSwipe() {
    if (document.body.innerText.includes("That's all for now!")) return false;

    // TODO: Verify that ArrowRight keypress actually works for swiping on Badoo
    alert('[AutoSwipe] Badoo support is not yet verified.\nSwiping may not work correctly.');
    return false;
  },
});

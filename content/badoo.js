const engine = new AutoSwipeEngine({
  platformId: 'badoo',
  key: 'ArrowRight',

  beforeSwipe() {
    const allDone = document.body.innerText.includes("That's all for now!");
    console.log(`[AS] beforeSwipe: allDone=${allDone}`);
    if (allDone) return false;

    // TODO: Verify that ArrowRight keypress actually works for swiping on Badoo
    alert('[AutoSwipe] Badoo support is not yet verified.\nSwiping may not work correctly.');
    return false;
  },
});

/**
 * SelectorEngine — cascading fallback selector resolver.
 * Tries multiple strategies in order and returns the first visible match.
 */
window.SelectorEngine = (() => {
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function dispatchKey(key) {
    const event = new KeyboardEvent('keydown', {
      key,
      code: key,
      keyCode: key === 'ArrowRight' ? 39 : key === 'ArrowLeft' ? 37 : 0,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
  }

  function find(strategies) {
    for (const strategy of strategies) {
      let el = null;

      switch (strategy.type) {
        case 'selector':
          el = document.querySelector(strategy.value);
          console.log(`[AutoSwipe][selector] "${strategy.value}" =>`, el);
          break;

        case 'aria':
          el = document.querySelector(
            `button[aria-label="${strategy.value}"], [role="button"][aria-label="${strategy.value}"]`
          );
          console.log(`[AutoSwipe][aria] "${strategy.value}" =>`, el);
          break;

        case 'testid':
          el = document.querySelector(`[data-testid="${strategy.value}"], [data-qa="${strategy.value}"]`);
          console.log(`[AutoSwipe][testid] "${strategy.value}" =>`, el);
          break;

        case 'textContent': {
          const scope = strategy.scope || 'button';
          const candidates = document.querySelectorAll(scope);
          const text = strategy.value.toLowerCase();
          el = Array.from(candidates).find(
            (btn) => btn.textContent.trim().toLowerCase().includes(text)
          );
          console.log(`[AutoSwipe][textContent] "${strategy.value}" in "${scope}" =>`, el);
          break;
        }

        case 'keyboard':
          console.log(`[AutoSwipe][keyboard] "${strategy.key}" (synthetic)`);
          return {
            click() {
              dispatchKey(strategy.key);
            },
            _synthetic: true,
          };
      }

      if (el) {
        const visible = isVisible(el);
        console.log(`[AutoSwipe] Found element, visible=${visible}, tag=${el.tagName}, classes="${el.className}"`);
        if (visible) {
          const clickable = el.closest('button, a, [role="button"]');
          const target = clickable || el;
          console.log(`[AutoSwipe] Click target: tag=${target.tagName}, classes="${target.className}"`);
          return target;
        }
      }
    }

    console.log('[AutoSwipe] No strategy matched a visible element');
    return null;
  }

  return { find };
})();

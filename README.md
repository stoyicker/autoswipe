# AutoSwipe

Chrome extension that auto-swipes (likes) profiles on Tinder, Bumble, Badoo, and Boo.

## Platform support

| Site | Swipe method | Out-of-profiles detection | Special actions | Verified? |
|---|---|---|---|---|
| Tinder (recs) | ArrowRight keypress | `<output>` with `span[class*="beacon__"]`; upsell `div[role="dialog"]` (visible only) | — | Yes |
| Tinder (explore) | ArrowRight keypress | Same beacon detection | Cycles through groups: clicks next group button when current exhausted; waits for group to load before swiping | Partially (group clicking needs more testing) |
| Bumble | ArrowRight keypress | `div.encounters-user__blocker` present | — | Yes |
| Badoo | ArrowRight keypress | "That's all for now!" text on page | Blocked with alert — not yet verified | No |
| Boo | Click `button[aria-label="Love"]` via CDP | Love button not found in DOM | Reloads page when Love button's `<canvas>` child has 0x0 dimensions; auto-resumes after reload | Yes |

## Privacy

See [PRIVACY.md](PRIVACY.md).

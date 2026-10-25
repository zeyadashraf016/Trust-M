# Cleanup and motion pass

- `styles.css`: logical RTL properties (margin/padding/border inline-start/end, text-align start/end), merged duplicate tokens, single header definition, removed dead rules, added spacing/type/easing tokens, shorter loader animation.
- `assets/`: logo cropped to `trust-m-logo.webp` (792KB -> 39KB, no sprite offsets); fonts subset to Arabic+Latin as `.woff` (~1MB -> ~335KB); old `.ttf` and `.png` removed. Preload hints added to every page.
- `motion.css` + `motion.js` (new, additive): staggered section reveal, KPI count-up, donut and ring sweep, bar-chart growth, progress/balance fills, timeline bars, dialog entrance, card hover lift, sliding nav indicator, status-message pop, loading skeletons. All off under `prefers-reduced-motion`. Delete both files and the two tags in each page's `<head>` to revert.
- Accessibility: project cards are no longer `role="button"` wrappers around a real button; the inner button is the keyboard control and carries `aria-haspopup`.
- `vercel.json`: 7-day cache for `/assets/*`.

## Preview-only mode
- `supabase-config.js`: `PREVIEW_ONLY=true` skips `/api/config` and Supabase entirely.
- `auth.js`: preview flag treated like local review, so deployed pages no longer redirect to the login error.
- `login.html/js`: in preview, the form is replaced by links to every portal.
- Login logo blends into the panel (no dark box).

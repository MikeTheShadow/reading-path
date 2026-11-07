# Working on Reading Path

Read the design (`docs/superpowers/specs/`) and the current plan
(`docs/superpowers/plans/`) before writing code.

- **How we work:** Claude writes each step test first, then walks Michael
  through the test and the code. Michael approves before the commit. A step
  isn't done until Michael can explain it.
- **Commits:** conventional prefixes (`feat:`, `test:`, `docs:`, `chore:`,
  `ci:`). No AI attribution trailers (no `Co-Authored-By`, no "Generated
  with").
- **Licence:** GPL-3.0-or-later.
- **Language:** Canadian English everywhere, including announcement strings
  (behaviour, colour, centre, licence as a noun; keep -ize).
- **Dependencies:** exact versions only, no `^`. A new dependency needs a
  written reason in the README's "Dependencies" section.
- **TypeScript:** `strict`. Node 24 or newer.
- **Core code (`src/core/`) works on documents from any window**, because
  tests run pages inside iframes:
  - never `instanceof HTMLElement` and the like
  - never the global `window` or `document`
  - use `node.nodeType` checks and
    `el.ownerDocument.defaultView!.getComputedStyle(el)`
- The core makes no network requests and uses no extension APIs.
- The overlay marker attribute is `data-reading-path-root`; the walker skips
  anything carrying it.
- Announcements are approximate, NVDA-style, and all their wording (and all
  warning wording) lives in `src/core/strings.ts`.
- `docs/how-it-works.md` gains a section with every step.
- Checks before committing: `npm run typecheck`, `npm run lint`,
  `npm run format:check`, `npm test`.

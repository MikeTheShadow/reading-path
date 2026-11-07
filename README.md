# Reading Path

See how a screen reader will read your web page.

Reading Path is a browser extension for Chrome and Firefox. It draws the route
a screen reader follows through a page as a glowing line, shows roughly what
would be announced at each stop, and flags anything that won't read well, with
a suggested fix.

## The goal

Let developers find and fix nearly all of their screen-reader problems
**before** they sit down with a real screen reader. The final pass with NVDA or
VoiceOver then becomes a quick confirmation, not a slow loop of "listen, find a
problem, fix it, listen again". Reading Path doesn't replace that final pass. It
makes it short.

The target is 99% of problems. That's a target, not a claim: once the real
screen-reader check exists, this README will state the measured figure, with
its date and the pages it was measured on.

## Status

In development; not yet installable.

## Announcements are approximate

The announcements Reading Path shows are its own approximation, in one
consistent style modelled loosely on NVDA's browse mode. Real screen readers
differ: they have verbosity settings, and VoiceOver words things differently
from NVDA. How close the approximation gets will be measured against real
screen readers, and the result published here.

## How it's built

Written by Claude (AI) one small test-first step at a time; Michael Pape
reviews and approves every step and can explain it. The reasoning behind each
step is written up in [docs/how-it-works.md](docs/how-it-works.md), and the
design is in [docs/superpowers/specs](docs/superpowers/specs).

To work on it you need Node 24 or newer:

```sh
npm ci
npx playwright install chromium firefox
npm test
```

`npm test` runs every test inside real Chromium and Firefox. `npm run
typecheck`, `npm run lint` and `npm run format:check` run the other checks.

## Dependencies

Reading Path has one runtime dependency, chosen deliberately:

- **[`dom-accessibility-api`](https://github.com/eps1lon/dom-accessibility-api)
  0.7.1** works out an element's role and accessible name (the text a screen
  reader says for it), following the W3C algorithms. Writing those from scratch
  would be a project of its own. Checked on 6 November 2026: MIT licence
  (compatible with the GPL), no dependencies of its own, about 180 million
  downloads a week (Testing Library uses it), maintained by Sebastian
  Silbermann, version 0.7.1 published 27 November 2025.

Everything else is a development tool (TypeScript, esbuild, Vitest, Playwright,
ESLint, Prettier), pinned to an exact version in `package.json`.

## Licence

[GPL-3.0-or-later](LICENSE). Copyright © 2026 Michael Pape.

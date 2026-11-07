# Reading Path, Plan 1: Foundation and Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tested TypeScript core that turns any rendered web page into an
ordered list of screen-reader stops with approximate announcements and
warnings. It runs in real Chromium and Firefox, is checked against Chrome's
own accessibility tree, and has a GitHub Actions pipeline from the first push.

**Architecture:** Pure DOM TypeScript in `src/core/`, with no
browser-extension code. A walker produces `Stop`s from the page's flattened
tree. `announce()` turns a stop into text. Separate check functions return
findings, and `readPage()` combines them into a `Reading`. Unit tests run
inside real browsers through Vitest browser mode, each against a fresh
`<iframe srcdoc>` document. A Playwright suite compares the core's output with
Chrome's accessibility tree from the DevTools protocol.

**Tech Stack:** TypeScript 6.0.3, esbuild 0.28.2, Vitest 5.1.0 browser mode
(`@vitest/browser-playwright` 5.1.0, Playwright 1.65.0), `@playwright/test`
1.65.0, ESLint 10.14.0 with typescript-eslint 8.72.1, Prettier 3.9.10,
`dom-accessibility-api` 0.7.1.

**Spec:** `docs/superpowers/specs/2026-11-06-reading-path-design.md`

**Plan series:** The spec is delivered in five plans, each written after the
previous one is finished. (1) Foundation and core, this plan. (2) Chrome
extension and Inspect mode. (3) Tour mode. (4) Firefox, plus the Developer
build with Accurate mode. (5) Real screen-reader check (Guidepup: NVDA and
Orca).

## Global Constraints

- How we work: Claude writes each task test first, then walks Michael through
  the test and the code. **Michael approves before the commit.** A task isn't
  done until Michael can explain it.
- Commits: conventional prefixes (`feat:`, `test:`, `docs:`, `chore:`,
  `ci:`). **No AI attribution trailers** (no `Co-Authored-By`, no "Generated
  with").
- Licence: `GPL-3.0-or-later` (`package.json` `"license"`, plus the full GPL
  v3 text in `LICENSE`).
- Canadian English in all wording, documentation and announcement strings
  (behaviour, colour, centre, licence as a noun; keep -ize).
- Exact pinned versions (no `^`). These are the only runtime and dev
  dependencies:
  - `typescript` 6.0.3
  - `esbuild` 0.28.2
  - `vitest` 5.1.0
  - `@vitest/browser-playwright` 5.1.0
  - `playwright` 1.65.0
  - `@playwright/test` 1.65.0
  - `eslint` 10.14.0
  - `@eslint/js` 10.0.1
  - `typescript-eslint` 8.72.1
  - `prettier` 3.9.10
  - `dom-accessibility-api` 0.7.1 (the only runtime dependency)

  Any new dependency needs a written reason in the README's "Dependencies"
  section.
- Node: develop on the installed Node (26.x). CI uses Node 24. `"type":
  "module"`, `"engines": { "node": ">=24" }`.
- TypeScript `strict: true`.
- Core code must work on documents from **any window** (tests use iframes):
  - never `instanceof HTMLElement` and the like
  - never the global `window` or `document`
  - use `node.nodeType` checks and
    `el.ownerDocument.defaultView!.getComputedStyle(el)`
- The core makes no network requests and has no extension APIs.
- The overlay marker attribute is `data-reading-path-root`. The walker skips
  any element carrying it.
- Announcements are approximate, NVDA-style, and live in `src/core/strings.ts`
  with all warning wording.
- `docs/how-it-works.md` gains a section in each task, written for Michael's
  interview preparation.

## Review Focus

1. **Empty or fully hidden page.** `readPage` returns zero stops and only page
   warnings, without throwing. Test in Task 10.
2. **Messy whitespace** (newlines, tabs, repeated spaces) in text and names.
   These become single spaces, trimmed. Test in Task 4.
3. **Large pages** (5,000 stops). `readPage` finishes in under 1,000 ms in
   each browser. Test in Task 10.
4. **Unknown custom elements and `display: contents` wrappers.** These are
   transparent, and the text inside is still read in place. Test in Task 6.
5. **Several containers closing at once** (a list in a navigation landmark in
   a banner, then `main`). `leaving` is innermost first and `entering` is
   outermost first, on the same stop. Test in Task 5.

---

## File structure

```
reading-path/
  package.json, package-lock.json, tsconfig.json, eslint.config.js,
  .prettierrc.json, .prettierignore, .gitignore, vitest.config.ts,
  playwright.config.ts, LICENSE, README.md, AGENTS.md
  .github/workflows/ci.yml          pipeline
  docs/how-it-works.md              grows every task
  docs/ci.md                        line-by-line pipeline guide
  scripts/build-core.mjs            esbuild: src/core → dist/core.js (IIFE, global ReadingPath)
  src/core/types.ts                 Stop, Container, Segment, Warning, Reading, constants
  src/core/dom.ts                   cross-window helpers, flattened-tree children
  src/core/text.ts                  normalizeSpace
  src/core/role.ts                  roleOf: library role + context rules
  src/core/walk.ts                  walk(doc): Stop[]
  src/core/geometry.ts              boxOf, isShown
  src/core/strings.ts               every announcement and warning string
  src/core/announce.ts              announce(stop)
  src/core/checks/stop-checks.ts    names, images, headings, vague links
  src/core/checks/order.ts          reading order vs visual order
  src/core/checks/page-checks.ts    language, h1, focusable-but-hidden
  src/core/read-page.ts             readPage(doc): Reading
  src/core/index.ts                 public exports
  src/core/*.test.ts                Vitest browser tests next to the code
  tests/support/mount.ts            mount(html) → rendered iframe Document
  tests/support/setup.ts            removes test iframes after each test
  tests/support/raw.d.ts            types for `?raw` imports
  tests/fixtures/shop.html          the mockup's broken shop page
  tests/fixtures/portfolio-home.html the mockup's portfolio home page
  tests/chrome-tree/chrome-tree.spec.ts   core vs Chrome accessibility tree
```

---

### Task 1: Repository, tooling and the test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `eslint.config.js`,
  `.prettierrc.json`, `.prettierignore`, `.gitignore`, `vitest.config.ts`,
  `LICENSE`, `README.md`, `AGENTS.md`, `docs/how-it-works.md`
- Create: `tests/support/mount.ts`, `tests/support/setup.ts`,
  `tests/support/raw.d.ts`
- Test: `tests/support/mount.test.ts`

**Interfaces:**
- Produces: `mount(html: string, options?: { lang?: string | null }):
  Promise<Document>`. It wraps `html` in `<!doctype html><html
  lang="en-CA"><head><meta charset="utf-8"></head><body>…</body></html>`
  (`lang: null` omits the attribute; a string replaces it), unless `html`
  starts with `<!doctype` (case-insensitive), in which case it's used as is.
  It renders the result in a 1024×768 borderless `<iframe srcdoc>` marked
  `data-test-mount`, waits for `load`, and returns its `contentDocument`.
- Produces: npm scripts `typecheck` (`tsc --noEmit`), `lint` (`eslint .`),
  `format` (`prettier --write .`), `format:check` (`prettier --check .`),
  `test` (`vitest run`), `test:watch` (`vitest`).

- [ ] **Step 1: Initialise the repo and install pinned dependencies**

Run in `~/projects/reading-path`: `git init -b main`, `npm init -y`, then
`npm install --save-exact` for each package and version in Global
Constraints (`dom-accessibility-api` as a dependency, the rest as dev
dependencies). Set `name` to `reading-path`, `private: true`, `type`,
`engines` and `license` as in Global Constraints. Then run `npx playwright
install chromium firefox`.
Expected: `package-lock.json` exists, and `npm ls --depth=0` lists exactly
those packages.

- [ ] **Step 2: Write configuration files**

- `tsconfig.json`:
  - `strict`, `target`/`lib` `ES2023` + `DOM` + `DOM.Iterable`
  - `module` `ESNext`, `moduleResolution` `Bundler`
  - `noEmit`, `types: ["vite/client"]`
  - include `src`, `tests`, `*.ts`
- `eslint.config.js`: flat config with `@eslint/js` recommended and
  `typescript-eslint` `configs.recommended`, ignoring `dist`, `node_modules`
  and `docs/superpowers/specs/mockups`.
- `.prettierrc.json`: `{}` (defaults).
- `.prettierignore`: `dist`, `package-lock.json`, `LICENSE`,
  `docs/superpowers/specs/mockups`.
- `.gitignore`: `node_modules/`, `dist/`, `test-results/`,
  `playwright-report/`, `.vitest-attachments/`, `__screenshots__/`.
- `vitest.config.ts`:
  - `test.include: ["src/**/*.test.ts", "tests/support/**/*.test.ts"]`
  - `setupFiles: ["tests/support/setup.ts"]`
  - `browser: { enabled: true, headless: true, provider: playwright(),
    instances: [{ browser: "chromium" }, { browser: "firefox" }] }`
- `tests/support/raw.d.ts`: `declare module "*.html?raw" { const html:
  string; export default html; }`

- [ ] **Step 3: Write the failing harness test**

```ts
// tests/support/mount.test.ts
import { expect, it } from "vitest";
import { mount } from "./mount";

it("renders real layout inside the mounted document", async () => {
  const doc = await mount(`<p style="width: 100px; margin: 0">x</p>`);
  expect(doc.querySelector("p")!.getBoundingClientRect().width).toBe(100);
  expect(doc.documentElement.getAttribute("lang")).toBe("en-CA");
});

it("can omit or replace the page language", async () => {
  expect((await mount("<p>x</p>", { lang: null })).documentElement.hasAttribute("lang")).toBe(false);
  expect((await mount("<p>x</p>", { lang: "fr-CA" })).documentElement.lang).toBe("fr-CA");
});

it("uses a full document as is", async () => {
  const doc = await mount("<!DOCTYPE html><html><body><h1>Raw</h1></body></html>");
  expect(doc.documentElement.hasAttribute("lang")).toBe(false);
  expect(doc.querySelector("h1")!.textContent).toBe("Raw");
});
```

- [ ] **Step 4: Run it to make sure it fails**

Run: `npm test`
Expected: FAIL in both `chromium` and `firefox`, because `./mount` can't be
resolved.

- [ ] **Step 5: Implement `mount` in `tests/support/mount.ts` and the cleanup in `tests/support/setup.ts`**

`setup.ts` registers `afterEach` and removes every `iframe[data-test-mount]`.

- [ ] **Step 6: Run the tests and the other checks**

Run: `npm test && npm run typecheck && npm run lint && npm run format:check`
Expected: 3 tests pass in chromium and 3 in firefox, and all checks are
clean. If Playwright's Firefox won't start on Arch, record the error in
`docs/how-it-works.md` under "Known local issues", then continue with
`--browser.name=chromium` locally. CI (Task 2) still runs both.

- [ ] **Step 7: Write the project documents**

- `LICENSE`: the GPL v3 text from `https://www.gnu.org/licenses/gpl-3.0.txt`.
- `README.md`:
  - what Reading Path is and its goal (from the spec's "The goal")
  - status: "In development; not yet installable"
  - "Announcements are approximate"
  - "How it's built": "Written by Claude (AI) one small test-first step at a
    time; Michael Pape reviews and approves every step and can explain it"
  - "Dependencies": the `dom-accessibility-api` vetting from the spec
  - licence
- `AGENTS.md`: the Global Constraints above, condensed, plus "read the spec
  and the current plan before coding".
- `docs/how-it-works.md`: a "Testing in real browsers" section explaining
  Vitest browser mode, why it uses iframes rather than a fake DOM, and what
  `mount` does.

- [ ] **Step 8: Walk Michael through it, and wait for approval**

Cover:
- what each config file does
- why the versions are pinned exactly
- what browser mode is, compared with jsdom
- why tests use iframes, and why that forces cross-window code

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: set up the repository, tooling and browser test harness"
```

---

### Task 2: GitHub Actions pipeline and the public repository

**Files:**
- Create: `.github/workflows/ci.yml`, `docs/ci.md`

**Interfaces:**
- Produces: the workflow `CI` with job `check`. Later tasks append steps to
  it.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium firefox
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm test
```

- [ ] **Step 2: Write `docs/ci.md`**

Go through every line of `ci.yml` in order. Each entry says what the line
does and why it's there, in plain terms (no comparisons with other CI tools;
Michael's call).

Also explain where results appear (the Actions tab, and the checks on commits
and pull requests) and how to rerun a failed job.

- [ ] **Step 3: Walk Michael through `ci.yml` and `docs/ci.md`, and wait for approval**

- [ ] **Step 4: Commit**

```bash
git add .github docs/ci.md
git commit -m "ci: run checks and browser tests on every push"
```

- [ ] **Step 5: Create the public repo and push. Confirm with Michael first.**

Ask Michael before running anything: this publishes the repository. Then run:
`gh repo create MikeTheShadow/reading-path --public --source . --remote origin
--push --description "See how a screen reader will read your web page"`

- [ ] **Step 6: Watch the first run**

Run: `gh run watch --exit-status`
Expected: the `check` job succeeds. Open the run page with Michael and match
each log section to its line in `ci.yml`.

---

### Task 3: The stop model, roles, and the walker for headings and controls

**Files:**
- Create: `src/core/types.ts`, `src/core/dom.ts`, `src/core/text.ts`,
  `src/core/role.ts`, `src/core/walk.ts`
- Test: `src/core/role.test.ts`, `src/core/walk.test.ts`

**Interfaces:**
- Produces, in `src/core/types.ts`:

```ts
export const OVERLAY_ATTRIBUTE = "data-reading-path-root";
export type StopKind = "heading" | "link" | "button" | "control" | "image" | "text" | "frame";
export type ContainerRole =
  | "banner" | "navigation" | "main" | "complementary" | "contentinfo"
  | "region" | "form" | "search" | "list" | "table";
export interface Container { role: ContainerRole; name: string; size?: number }
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "widget"; role: string; name: string; element: Element };
export interface Stop {
  element: Element;            // anchor: the stop's element, or the block owning a text run
  kind: StopKind;
  role: string;                // ARIA role, e.g. "heading", "link", "textbox", "img"; "text" for runs
  name: string;                // accessible name, or the run's normalised text
  level?: number;              // headings only
  segments: Segment[];         // text runs and headings; [] otherwise
  extent?: { first: Node; last: Node }; // text runs: first and last node of the run
  entering: Container[];       // outermost first
  leaving: Container[];        // innermost first
  visible: boolean;            // false = read but not shown
  warnings: Warning[];
}
export type CheckId =
  | "no-name" | "image-no-alt" | "heading-skip" | "heading-empty" | "vague-link"
  | "order-mismatch" | "no-lang" | "no-h1" | "focusable-hidden";
export interface Warning { check: CheckId; title: string; why: string; fix: string; element?: Element }
export interface Reading { source: "approximate" | "chrome"; stops: Stop[]; pageWarnings: Warning[] }
export interface StopFinding { index: number; warning: Warning }
```

- Produces:
  - `styleOf(el: Element): CSSStyleDeclaration`
  - `isElement(node: Node): node is Element`
  - `isText(node: Node): node is Text`
  - `childrenOf(node: Element): Node[]`, in `src/core/dom.ts`
  - `normalizeSpace(text: string): string`, in `src/core/text.ts`
  - `roleOf(el: Element): string | null`, in `src/core/role.ts`
  - `walk(doc: Document): Stop[]`, in `src/core/walk.ts`

  In this task, `walk` fills `entering`/`leaving` with `[]`, sets `visible:
  true` and `warnings: []`, and ignores loose text.

- [ ] **Step 1: Write the failing role tests**

```ts
// src/core/role.test.ts
import { expect, it } from "vitest";
import { mount } from "../../tests/support/mount";
import { roleOf } from "./role";

it("applies the context rules the library leaves out", async () => {
  const doc = await mount(`
    <header id="top"></header>
    <article><header id="inner"></header><footer id="innerfoot"></footer></article>
    <section id="plain"></section><section id="named" aria-label="Work"></section>
    <form id="anon"></form><form id="signup" aria-label="Sign up"></form>
    <div id="nav" role="navigation"></div>`);
  const role = (id: string) => roleOf(doc.getElementById(id)!);
  expect(role("top")).toBe("banner");
  expect(role("inner")).toBeNull();
  expect(role("innerfoot")).toBeNull();
  expect(role("plain")).toBeNull();
  expect(role("named")).toBe("region");
  expect(role("anon")).toBeNull();
  expect(role("signup")).toBe("form");
  expect(role("nav")).toBe("navigation");
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/core/role.test.ts`
Expected: FAIL, because `./role` can't be resolved.

- [ ] **Step 3: Implement `roleOf` in `src/core/role.ts`**

Start from `getRole(el)` from `dom-accessibility-api`, then:
- `section` → `region` only if `computeAccessibleName(el) !== ""`
- `form` → `form` only if it has a name
- `header`/`footer` → `banner`/`contentinfo` only if
  `!el.parentElement?.closest("article, aside, main, nav, section")`

- [ ] **Step 4: Run it to make sure it passes**

Run: `npx vitest run src/core/role.test.ts`
Expected: PASS in both browsers.

- [ ] **Step 5: Write the failing walker tests**

```ts
// src/core/walk.test.ts
import { expect, it } from "vitest";
import { mount } from "../../tests/support/mount";
import { walk } from "./walk";

export const summary = (doc: Document) => walk(doc).map((s) => [s.kind, s.name]);

it("reads headings, links, buttons, controls and images in document order", async () => {
  const doc = await mount(`
    <h1>Spring sale</h1>
    <a href="/shop">Shop</a>
    <button>Buy</button>
    <input type="email" aria-label="Email">
    <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="A red shovel">`);
  expect(summary(doc)).toEqual([
    ["heading", "Spring sale"], ["link", "Shop"], ["button", "Buy"],
    ["control", "Email"], ["image", "A red shovel"],
  ]);
});

it("records heading levels from the tag or aria-level", async () => {
  const doc = await mount(`<h2>Work</h2><div role="heading" aria-level="4">Custom</div><div role="heading">Default</div>`);
  expect(walk(doc).map((s) => s.level)).toEqual([2, 4, 2]);
});

it("skips content hidden from screen readers and the overlay", async () => {
  const doc = await mount(`
    <button>Kept</button>
    <div style="display:none"><button>Display none</button></div>
    <div hidden><button>Hidden attribute</button></div>
    <div aria-hidden="true"><button>Aria hidden</button></div>
    <div inert><button>Inert</button></div>
    <div data-reading-path-root><button>Overlay</button></div>
    <template><button>Template</button></template>
    <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="">`);
  expect(summary(doc)).toEqual([["button", "Kept"]]);
});
```

- [ ] **Step 6: Run them to make sure they fail**

Run: `npx vitest run src/core/walk.test.ts`
Expected: FAIL, because `./walk` can't be resolved.

- [ ] **Step 7: Implement `types.ts`, `dom.ts`, `text.ts` and `walk` (headings, widgets, images, hiding)**

Kinds by role:
- `heading` → heading
- `link` → link
- `button` → button
- `img` → image
- an `iframe` element → frame (stop in Task 6)
- these roles → control: `textbox`, `searchbox`, `combobox`, `listbox`,
  `checkbox`, `radio`, `slider`, `spinbutton`, `switch`, `tab`, `menuitem`,
  `menuitemcheckbox`, `menuitemradio`, `option`

Names use `computeAccessibleName` then `normalizeSpace`. Level is `aria-level`
if it's a valid integer, otherwise the `h1`–`h6` digit, otherwise 2.

Stops don't descend into their children.

Skip a subtree when any of these is true:
- its local name is `script`, `style`, `template`, `noscript` or `head`
- it has `OVERLAY_ATTRIBUTE`
- `aria-hidden="true"`
- `inert`
- computed `display: none` (this also covers `hidden`)

- [ ] **Step 8: Run them to make sure they pass**

Run: `npx vitest run src/core`
Expected: PASS in both browsers.

- [ ] **Step 9: Add "How the walker decides what's read" and "Roles and the library" to `docs/how-it-works.md`, then walk Michael through it and wait for approval**

- [ ] **Step 10: Commit**

```bash
git add src/core docs/how-it-works.md
git commit -m "feat: walk the page for headings, links, buttons, controls and images"
```

---

### Task 4: Text runs and inline widgets

**Files:**
- Modify: `src/core/walk.ts`
- Test: `src/core/walk.test.ts` (append)

**Interfaces:**
- Consumes: Task 3's `walk`, `Stop`, `Segment`, `normalizeSpace`, `styleOf`.
- Produces: text stops (`kind: "text"`, `role: "text"`) with `segments` and
  `extent`. Heading stops gain `segments` describing their contents.

- [ ] **Step 1: Write the failing tests**

```ts
const segs = (s: { segments: Array<{ kind: string; text?: string; role?: string; name?: string }> }) =>
  s.segments.map((g) => (g.kind === "text" ? ["text", g.text] : [g.role, g.name]));

it("reads a paragraph as one text stop", async () => {
  expect(summary(await mount(`<p>Save on every garden tool.</p>`))).toEqual([["text", "Save on every garden tool."]]);
});

it("keeps an inline link inside its paragraph's stop", async () => {
  const [stop, ...rest] = walk(await mount(`<p>See the full list? <a href="#">Click here</a>.</p>`));
  expect(rest).toEqual([]);
  expect(stop.name).toBe("See the full list? Click here.");
  expect(segs(stop)).toEqual([["text", "See the full list?"], ["link", "Click here"], ["text", "."]]);
});

it("makes a link that is alone in its block a link stop", async () => {
  expect(summary(await mount(`<ul><li><a href="#">Shop</a></li></ul>`))).toEqual([["link", "Shop"]]);
});

it("splits runs around block children, in reading order", async () => {
  const stops = walk(await mount(`<div>Intro <p>Middle</p> Outro</div>`));
  expect(stops.map((s) => s.name)).toEqual(["Intro", "Middle", "Outro"]);
  expect(stops[0].extent!.first.textContent).toBe("Intro ");
});

it("merges inline formatting into one run", async () => {
  expect(summary(await mount(`<p>Fast <strong>and</strong> <em>small</em></p>`))).toEqual([["text", "Fast and small"]]);
});

it("records a heading made of a single link", async () => {
  const [h] = walk(await mount(`<h3><a href="#">Moonwhales</a></h3>`));
  expect(segs(h)).toEqual([["link", "Moonwhales"]]);
});

it("normalises messy whitespace in text and names", async () => {
  expect(summary(await mount(`<p>  Lots\n   of\t space  </p><button>\n  Save \n draft </button>`)))
    .toEqual([["text", "Lots of space"], ["button", "Save draft"]]);
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/core/walk.test.ts`
Expected: the new tests FAIL (no text stops yet). Task 3's tests still pass.

- [ ] **Step 3: Implement text runs in `walk`**

When walking an element that isn't itself a stop, go through its children in
order:
- **Text nodes**, and **inline children** (computed `display` starting with
  `inline`, or `display: contents`, recursed into in place) are added to the
  current run. Inside a run:
  - text is collected as text segments
  - a child whose role makes it a stop becomes a widget segment and isn't
    descended into
  - hidden subtrees (Task 3 rules) are skipped
- **Any other child** (block, flex, grid and so on) ends the current run
  first, and is then walked as usual.

Ending a run:
- If it has no non-whitespace text, drop it.
- If it holds exactly one widget and no other non-whitespace text, emit that
  widget as its own stop (link, button and so on).
- Otherwise, emit a text stop:
  - `element` is the block being walked
  - `name` is `normalizeSpace` of the run's raw text, with widgets
    contributing their accessible name
  - `segments` hold trimmed, normalised text pieces (empty ones dropped) and
    the widget segments
  - `extent` is the first and last node of the run

Heading stops build `segments` from their contents with the same collector.

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run src/core`
Expected: PASS in both browsers.

- [ ] **Step 5: Add "Text runs: how a page becomes lines" to `docs/how-it-works.md`, then walk Michael through it and wait for approval**

- [ ] **Step 6: Commit**

```bash
git add src/core docs/how-it-works.md
git commit -m "feat: read text in runs with inline links kept in their sentence"
```

---

### Task 5: Containers announced on entry and exit

**Files:**
- Modify: `src/core/walk.ts`
- Test: `src/core/walk.test.ts` (append)

**Interfaces:**
- Consumes: `roleOf`, `Container`, `ContainerRole`.
- Produces: `entering`/`leaving` filled on stops. List `size` is the count of
  child elements with role `listitem`. Table `size` is `rows.length` for
  `<table>`, otherwise the count of descendants with role `row`.

- [ ] **Step 1: Write the failing tests**

```ts
const tag = (c: { role: string; name: string; size?: number }) =>
  c.role + (c.name ? `:${c.name}` : "") + (c.size !== undefined ? `#${c.size}` : "");
const flow = (doc: Document) =>
  walk(doc).map((s) => [s.name, s.leaving.map(tag), s.entering.map(tag)]);

it("announces nested containers on entry and exit in the right order", async () => {
  const doc = await mount(`
    <header><a href="/">Acme</a>
      <nav aria-label="Primary"><ul><li><a href="#">Shop</a></li><li><a href="#">Contact</a></li></ul></nav>
    </header>
    <main><h1>Spring sale</h1></main>`);
  expect(flow(doc)).toEqual([
    ["Acme", [], ["banner"]],
    ["Shop", [], ["navigation:Primary", "list#2"]],
    ["Contact", [], []],
    ["Spring sale", ["list", "navigation:Primary", "banner"], ["main"]],
  ]);
});

it("doesn't announce containers with nothing read inside", async () => {
  expect(flow(await mount(`<nav aria-label="Empty"></nav><p>After</p>`))).toEqual([["After", [], []]]);
});

it("treats only named sections as regions", async () => {
  const doc = await mount(`<section><p>A</p></section><section aria-label="Work"><p>B</p></section>`);
  expect(flow(doc)).toEqual([["A", [], []], ["B", [], ["region:Work"]]]);
});

it("announces tables with their row count", async () => {
  const doc = await mount(`<table><tr><td>One</td></tr><tr><td>Two</td></tr></table><p>After</p>`);
  expect(flow(doc)).toEqual([["One", [], ["table#2"]], ["Two", [], []], ["After", ["table"], []]]);
});
```

Note: `leaving` lists every container closed since the previous stop,
innermost first. The test's "Spring sale" row also leaves the banner.

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/core/walk.test.ts`
Expected: the new tests FAIL.

- [ ] **Step 3: Implement container tracking in `walk`**

The walker keeps `pendingEnter` and `pendingLeave` lists:
- On entering an element whose `roleOf` is a `ContainerRole`, push it to
  `pendingEnter`.
- On leaving it: if it's still in `pendingEnter` (nothing was read inside),
  remove it there; otherwise push it to `pendingLeave`.
- Each emitted stop takes both lists as `entering`/`leaving`, then clears
  them.
- Containers still open at the end of the document are dropped.

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run src/core`
Expected: PASS in both browsers.

- [ ] **Step 5: Add "Landmarks, lists and tables" to `docs/how-it-works.md`, then walk Michael through it and wait for approval**

- [ ] **Step 6: Commit**

```bash
git add src/core docs/how-it-works.md
git commit -m "feat: announce landmarks, lists and tables on entry and exit"
```

---

### Task 6: Shadow DOM, visibility, visually hidden text and frames

**Files:**
- Create: `src/core/geometry.ts`
- Modify: `src/core/dom.ts` (`childrenOf` follows the flattened tree),
  `src/core/walk.ts`
- Test: `src/core/walk.test.ts` (append), `src/core/geometry.test.ts`

**Interfaces:**
- Produces: `boxOf(stop: Pick<Stop, "element" | "extent">): DOMRect` (for
  text runs, the union rect of a `Range` from `extent.first` to
  `extent.last`, otherwise the element's rect) and `isShown(stop:
  Pick<Stop, "element" | "extent">): boolean`, in `src/core/geometry.ts`.
- Produces: `childrenOf(el)`, which returns:
  - an element with an open `shadowRoot` → the shadow root's `childNodes`
  - a `slot` → `assignedNodes({ flatten: true })`, or its own `childNodes`
    if none are assigned
  - anything else → `childNodes`

- [ ] **Step 1: Write the failing tests**

```ts
it("reads open shadow roots where they render", async () => {
  const doc = await mount(`<p>Before</p><x-card></x-card><p>After</p>`);
  doc.querySelector("x-card")!.attachShadow({ mode: "open" }).innerHTML = "<h2>Inside</h2>";
  expect(summary(doc)).toEqual([["text", "Before"], ["heading", "Inside"], ["text", "After"]]);
});

it("reads slotted content at its slot", async () => {
  const doc = await mount(`<x-card><p>Slotted</p></x-card>`);
  doc.querySelector("x-card")!.attachShadow({ mode: "open" }).innerHTML = "<h2>Title</h2><slot></slot>";
  expect(summary(doc)).toEqual([["heading", "Title"], ["text", "Slotted"]]);
});

it("reads a visible child of a visibility: hidden parent", async () => {
  const doc = await mount(`<div style="visibility:hidden"><p>Gone</p><p style="visibility:visible">Shown</p></div>`);
  expect(summary(doc)).toEqual([["text", "Shown"]]);
});

it("marks visually hidden and off-screen content as read but not shown", async () => {
  const doc = await mount(`
    <a href="#main" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Skip to content</a>
    <span style="position:absolute;left:-10000px">Off screen</span>
    <p>Shown</p>`);
  expect(walk(doc).map((s) => [s.name, s.visible])).toEqual([
    ["Skip to content", false], ["Off screen", false], ["Shown", true],
  ]);
});

it("makes an iframe one frame stop without entering it", async () => {
  expect(summary(await mount(`<iframe title="Map" srcdoc="<p>Inside</p>"></iframe>`))).toEqual([["frame", "Map"]]);
});

it("treats custom elements and display: contents as transparent", async () => {
  const doc = await mount(`
    <x-wrap><p>Custom</p></x-wrap>
    <div style="display:contents"><p>Contents</p></div>
    <p>Fast <span style="display:contents">and</span> small</p>`);
  expect(summary(doc)).toEqual([["text", "Custom"], ["text", "Contents"], ["text", "Fast and small"]]);
});
```

```ts
// src/core/geometry.test.ts
import { expect, it } from "vitest";
import { mount } from "../../tests/support/mount";
import { walk } from "./walk";
import { boxOf } from "./geometry";

it("measures a text run by its own text, not its whole block", async () => {
  const doc = await mount(`<div style="width:600px">Intro<p style="margin:0;height:200px">Middle</p></div>`);
  const [intro] = walk(doc);
  expect(boxOf(intro).height).toBeLessThan(40);
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/core`
Expected: the new tests FAIL.

- [ ] **Step 3: Implement the flattened-tree `childrenOf`, visibility handling, `boxOf`/`isShown`, and frame stops**

`walk` now sets each stop's `visible` to `isShown(stop)`.

- **Visibility:** check it per stop and per text node (using the parent
  element's style) rather than skipping subtrees. A stop or text node is
  dropped when its computed `visibility` isn't `visible`.
- **`isShown`** is false when any of these is true:
  - the box's area is ≤ 1 px²
  - its right edge is ≤ `-scrollX` or its bottom edge is ≤ `-scrollY`
  - the anchor's computed `clip` is `rect(0px, 0px, 0px, 0px)` or its
    `clip-path` is `inset(50%)`
- **Frames:** an `iframe` or `frame` becomes a `frame` stop named by its
  accessible name, and isn't descended into.

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run src/core`
Expected: PASS in both browsers.

- [ ] **Step 5: Add "Shadow DOM, hidden text and frames" to `docs/how-it-works.md`, then walk Michael through it and wait for approval**

- [ ] **Step 6: Commit**

```bash
git add src/core docs/how-it-works.md
git commit -m "feat: follow shadow DOM, mark visually hidden text and stop at frames"
```

---

### Task 7: Announcements

**Files:**
- Create: `src/core/strings.ts`, `src/core/announce.ts`
- Test: `src/core/announce.test.ts`

**Interfaces:**
- Produces: `announce(stop: Stop): string` in `src/core/announce.ts`.
  `strings.ts` exports every phrase used below, plus Task 8's warning copy.

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/announce.test.ts
import { expect, it } from "vitest";
import { mount } from "../../tests/support/mount";
import { walk } from "./walk";
import { announce } from "./announce";

const said = async (html: string) => walk(await mount(html)).map(announce);

it("announces landmarks, lists and their exits", async () => {
  expect(await said(`
    <header><a href="/">Acme</a>
      <nav aria-label="Primary"><ul><li><a href="#">Shop</a></li><li><a href="#">Contact</a></li></ul></nav>
    </header>
    <main><h1>Spring sale</h1></main>`)).toEqual([
    "Banner landmark. Link, Acme",
    "Navigation landmark, Primary. List, 2 items. Link, Shop",
    "Link, Contact",
    "Out of list. Main landmark. Heading level 1, Spring sale",
  ]);
});

it("announces each kind of stop", async () => {
  expect(await said(`
    <section aria-label="Work"><h2>Work</h2></section>
    <h3><a href="#">Moonwhales</a></h3>
    <p>See the full list? <a href="#">Click here</a>.</p>
    <button></button>
    <input type="email" aria-label="Email">
    <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="A red shovel">
    <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
    <iframe title="Map"></iframe>
    <ul><li>Only</li></ul>
    <table><tr><td>One</td></tr><tr><td>Two</td></tr></table>`)).toEqual([
    "Work region. Heading level 2, Work",
    "Heading level 3, link, Moonwhales",
    "See the full list? Link, Click here.",
    "Button",
    "Edit, Email",
    "Graphic, A red shovel",
    "Graphic",
    "Frame, Map. Contents not traced in this version.",
    "List, 1 item. Only",
    "Out of list. Table, 2 rows. One",
    "Two",
  ]);
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/core/announce.test.ts`
Expected: FAIL, because `./announce` can't be resolved.

- [ ] **Step 3: Implement `strings.ts` and `announce`**

Announcement order: leaving phrases, then entering phrases, then the body,
each sentence ending in `.` and joined by spaces.

- **Leaving:** only lists (`Out of list.`) and tables (`Out of table.`).
- **Entering:**

  | Container | Phrase |
  | --- | --- |
  | banner | `Banner landmark` |
  | navigation | `Navigation landmark` |
  | main | `Main landmark` |
  | complementary | `Complementary landmark` |
  | contentinfo | `Content information landmark` |
  | form | `Form landmark` |
  | search | `Search landmark` |
  | region | `{name} region` |
  | list | `List, {n} item(s)` |
  | table | `Table, {n} row(s)` |

  Any other non-empty name is appended as `, {name}`.
- **Body:**

  | Stop | Wording |
  | --- | --- |
  | heading | `Heading level {n}, {name}`, or `Heading level {n}, link, {name}` when its segments are exactly one link |
  | link | `Link, {name}` |
  | button | `Button, {name}`, or `Button` when unnamed |
  | control | `{label}, {name}` |
  | image | `Graphic, {name}`, or `Graphic` |
  | frame | `Frame, {name}. Contents not traced in this version.` |
  | text | segments joined by spaces, widgets as `{Label}, {name}`, then any space before `.,!?;:` removed |

- **Control labels:**

  | Role | Label |
  | --- | --- |
  | textbox | Edit |
  | searchbox | Search edit |
  | combobox | Combo box |
  | listbox | List box |
  | checkbox | Check box |
  | radio | Radio button |
  | slider | Slider |
  | spinbutton | Spin button |
  | switch | Switch |
  | tab | Tab |
  | menuitem | Menu item |
  | menuitemcheckbox | Menu item check box |
  | menuitemradio | Menu item radio button |
  | option | Option |

  Links use `Link` and buttons use `Button`.

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run src/core`
Expected: PASS in both browsers.

- [ ] **Step 5: Add "What the announcements are, and aren't" to `docs/how-it-works.md`, then walk Michael through it and wait for approval**

- [ ] **Step 6: Commit**

```bash
git add src/core docs/how-it-works.md
git commit -m "feat: approximate what a screen reader announces at each stop"
```

---

### Task 8: Stop checks and page checks

**Files:**
- Create: `src/core/checks/stop-checks.ts`, `src/core/checks/page-checks.ts`
- Modify: `src/core/strings.ts` (warning copy)
- Test: `src/core/checks/stop-checks.test.ts`,
  `src/core/checks/page-checks.test.ts`

**Interfaces:**
- Produces, in `stop-checks.ts`, each `(stops: Stop[]) => StopFinding[]`:
  - `checkNames`
  - `checkImages`
  - `checkHeadings`
  - `checkVagueLinks`
- Produces, in `page-checks.ts`: `checkPage(doc: Document, stops: Stop[]):
  Warning[]`, ordered as no-lang, then no-h1, then each focusable-hidden
  element in document order.

**Warning copy** (in `strings.ts`; `title` / `why` / `fix`):

| check | title | why | fix |
| --- | --- | --- | --- |
| no-name | `{Button\|Link\|Field} has no name` | `A screen reader says only "{button\|link\|edit}", so nobody knows what it does.` | button: `Add visible text, or an aria-label such as aria-label="Search".` link: `Give the link text, or an aria-label saying where it goes.` field: `Connect a <label for="…"> to the field, or add an aria-label.` |
| image-no-alt | `Image has no text alternative` | `A screen reader says "graphic" or reads out the file name, so the image's meaning is lost.` | `Add alt text that says what the image shows, or alt="" if it's only decoration.` |
| heading-skip | `Heading level skipped` | `Goes from level {a} to level {b}. People moving by heading will think something is missing.` | `Use an <h{a+1}> here, and style it to look however you like.` |
| heading-empty | `Empty heading` | `A screen reader announces a heading with nothing in it.` | `Put text in the heading, or remove it if it's only there for spacing.` |
| vague-link | `Link text doesn't say where it goes` | `Out of context, as in a screen reader's list of links, it's just "{name}".` | `Make the link text describe where it goes, for example "See the full garden tool list".` |
| no-lang | `No page language` | `Without it, a screen reader may read the page with the wrong voice and pronunciation.` | `Add lang to <html>, for example <html lang="en-CA">.` |
| no-h1 | `No main heading` | `Many screen-reader users jump to the level 1 heading to find where the content starts.` | `Add one <h1> that names the page.` |
| focusable-hidden | `Focusable but silent` | `Keyboard users can tab to this, but a screen reader says nothing about it.` | `Remove aria-hidden="true" from around it, or take it out of the tab order with tabindex="-1" or inert.` |
| order-mismatch (Task 9) | `Read in a different order than shown` | `This is read before the next item but shown after it. The layout uses {cause}.` | `Put the elements in the HTML in the order they should be read, and remove the reordering.` |

**Vague link text:** `["click here", "here", "read more", "more", "learn
more", "link", "this", "continue"]`. Before comparing, the name is lowercased
and whitespace-normalised, with trailing `.…!:` and `>`/`→`/`»` removed. The
check covers link stops and link widget segments inside text stops (the
finding goes on the text stop).

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/checks/stop-checks.test.ts
import { expect, it } from "vitest";
import { mount } from "../../../tests/support/mount";
import { walk } from "../walk";
import { checkHeadings, checkImages, checkNames, checkVagueLinks } from "./stop-checks";
import type { Stop, StopFinding } from "../types";

const run = async (html: string, check: (s: Stop[]) => StopFinding[]) =>
  check(walk(await mount(html))).map((f) => [f.index, f.warning.check, f.warning.title]);
const GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

it("flags links, buttons and fields with no name", async () => {
  expect(await run(`<button></button><a href="#"></a><input><button>Fine</button>`, checkNames)).toEqual([
    [0, "no-name", "Button has no name"], [1, "no-name", "Link has no name"], [2, "no-name", "Field has no name"],
  ]);
});

it("flags images with no text alternative, but not decorative ones", async () => {
  expect(await run(`<img src="${GIF}"><img src="${GIF}" alt=""><img src="${GIF}" alt="Shovel">`, checkImages))
    .toEqual([[0, "image-no-alt", "Image has no text alternative"]]);
});

it("flags skipped and empty headings, but not going back up", async () => {
  expect(await run(`<h1>A</h1><h3>B</h3><h2>C</h2><h3>D</h3><h2></h2>`, checkHeadings)).toEqual([
    [1, "heading-skip", "Heading level skipped"], [4, "heading-empty", "Empty heading"],
  ]);
});

it("says which levels a skip goes between", async () => {
  const [f] = checkHeadings(walk(await mount(`<h1>A</h1><h3>B</h3>`)));
  expect(f.warning.why).toContain("level 1 to level 3");
  expect(f.warning.fix).toContain("<h2>");
});

it("flags vague link text, including inside a sentence, unless the name says more", async () => {
  expect(await run(`
    <a href="#">Read more…</a>
    <p>See it <a href="#">here</a>.</p>
    <a href="#" aria-label="Read more about Moonwhales">Read more</a>`, checkVagueLinks)).toEqual([
    [0, "vague-link", "Link text doesn't say where it goes"], [1, "vague-link", "Link text doesn't say where it goes"],
  ]);
});
```

```ts
// src/core/checks/page-checks.test.ts
import { expect, it } from "vitest";
import { mount } from "../../../tests/support/mount";
import { walk } from "../walk";
import { checkPage } from "./page-checks";

const page = async (html: string, lang?: string | null) => {
  const doc = await mount(html, { lang });
  return checkPage(doc, walk(doc));
};

it("flags a missing page language and a missing h1", async () => {
  expect((await page("<h2>Only</h2>", null)).map((w) => w.check)).toEqual(["no-lang", "no-h1"]);
  expect(await page("<h1>Fine</h1>")).toEqual([]);
});

it("flags focusable elements hidden from screen readers, pointing at them", async () => {
  const warnings = await page(`<h1>T</h1>
    <div aria-hidden="true"><a href="#" id="bad">Hidden link</a><button tabindex="-1">Skipped</button></div>
    <div aria-hidden="true" inert><button>Inert is fine</button></div>`);
  expect(warnings.map((w) => [w.check, w.title, (w.element as Element).id])).toEqual([
    ["focusable-hidden", "Focusable but silent", "bad"],
  ]);
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/core/checks`
Expected: FAIL, because the modules can't be resolved.

- [ ] **Step 3: Implement the stop checks and `checkPage`**

- **Focusable:** matches `a[href], area[href], button:not([disabled]),
  input:not([disabled]):not([type="hidden"]), select:not([disabled]),
  textarea:not([disabled]), [tabindex]:not([tabindex="-1"]),
  [contenteditable=""], [contenteditable="true"]`.
- **Counts as focusable-hidden** when it's inside or on an
  `[aria-hidden="true"]`, not inside `[inert]`, and `el.checkVisibility()` is
  true.
- **Heading skip:** compares each heading with the previous heading stop
  only.

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run src/core`
Expected: PASS in both browsers.

- [ ] **Step 5: Add "The checks, and why each one matters to a listener" to `docs/how-it-works.md`, then walk Michael through it and wait for approval**

- [ ] **Step 6: Commit**

```bash
git add src/core docs/how-it-works.md
git commit -m "feat: warn about unnamed controls, images, headings, vague links and page setup"
```

---

### Task 9: Reading order vs visual order

**Files:**
- Create: `src/core/checks/order.ts`
- Modify: `src/core/dom.ts` (add `composedParent`)
- Test: `src/core/checks/order.test.ts`

**Interfaces:**
- Consumes: `boxOf` (Task 6), `styleOf`, the order-mismatch copy (Task 8).
- Produces: `checkOrder(stops: Stop[]): StopFinding[]`, and
  `composedParent(el: Element): Element | null` (returns `parentElement`, or
  the shadow host when the parent is a shadow root).

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/checks/order.test.ts
import { expect, it } from "vitest";
import { mount } from "../../../tests/support/mount";
import { walk } from "../walk";
import { checkOrder } from "./order";

const order = async (html: string) =>
  checkOrder(walk(await mount(html))).map((f) => [f.index, f.warning.title, f.warning.why]);

it("flags a row-reversed flex layout and names the cause", async () => {
  const [[index, title, why]] = await order(`
    <div style="display:flex;flex-direction:row-reverse;justify-content:flex-end">
      <p style="width:200px">Second: Hoses</p><p style="width:200px">First: Shovels</p></div>`);
  expect([index, title]).toEqual([0, "Read in a different order than shown"]);
  expect(why).toContain("flex-direction: row-reverse");
});

it("names the CSS order property", async () => {
  const [[index, , why]] = await order(`
    <div style="display:flex"><p style="order:2;width:200px">A</p><p style="order:1;width:200px">B</p></div>`);
  expect(index).toBe(0);
  expect(why).toContain("the CSS order property");
});

it("names explicit grid placement", async () => {
  const [[index, , why]] = await order(`
    <div style="display:grid;grid-template-columns:200px 200px">
      <p style="grid-column:2;grid-row:1">A</p><p style="grid-column:1;grid-row:1">B</p></div>`);
  expect(index).toBe(0);
  expect(why).toContain("explicit grid placement");
});

it("stays quiet when order matches or no cause can be named", async () => {
  expect(await order(`<div style="display:flex"><p style="width:200px">A</p><p style="width:200px">B</p></div>`)).toEqual([]);
  expect(await order(`<p style="position:relative;top:100px">Moved down</p><p>Next</p>`)).toEqual([]);
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run src/core/checks/order.test.ts`
Expected: FAIL, because `./order` can't be resolved.

- [ ] **Step 3: Implement `checkOrder`**

For each pair of consecutive stops `a`, `b`, with boxes `A = boxOf(a)` and
`B = boxOf(b)`:

1. `b` **is shown before** `a` when either:
   - `B.bottom <= A.top`, or
   - their vertical overlap is more than half the smaller height, and
     `B.left < A.left`
2. If so, find the nearest common ancestor `C` of the two elements through
   `composedParent`. Let `ca` and `cb` be `C`'s children on each element's
   path.
3. Name the cause from `styleOf(C)`:
   - `display` is `flex`/`inline-flex` and `flexDirection` ends in
     `-reverse` → cause `` `flex-direction: ${value}` ``
   - otherwise, `display` is `flex`/`inline-flex` and the `order` of `ca` or
     `cb` isn't `"0"` → `the CSS order property`
   - otherwise, `display` is `grid`/`inline-grid` and `gridRowStart` or
     `gridColumnStart` of `ca` or `cb` isn't `auto` → `explicit grid
     placement`
4. If there's a cause, add a finding on `a`'s index. Otherwise, nothing.

- [ ] **Step 4: Run them to make sure they pass**

Run: `npx vitest run src/core`
Expected: PASS in both browsers.

- [ ] **Step 5: Add "Spotting order problems without false alarms" to `docs/how-it-works.md`, then walk Michael through it and wait for approval**

- [ ] **Step 6: Commit**

```bash
git add src/core docs/how-it-works.md
git commit -m "feat: warn when CSS shows content in a different order than it's read"
```

---

### Task 10: `readPage`, the shop fixture and the public entry point

**Files:**
- Create: `src/core/read-page.ts`, `src/core/index.ts`,
  `tests/fixtures/shop.html`
- Test: `src/core/read-page.test.ts`

**Interfaces:**
- Produces: `readPage(doc: Document): Reading`, which:
  - walks the page (`walk` already sets `visible` with `isShown`, from Task 6)
  - runs `checkNames`, `checkImages`, `checkHeadings`, `checkVagueLinks` and
    `checkOrder`, appending each finding's warning to `stops[index].warnings`
    in that order
  - sets `pageWarnings = checkPage(doc, stops)` and `source: "approximate"`
- Produces: `src/core/index.ts`, which exports `readPage`, `announce`,
  `OVERLAY_ATTRIBUTE` and all types.

- [ ] **Step 1: Create `tests/fixtures/shop.html`**

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8"><title>Acme Hardware</title>
<style>.row{display:flex;flex-direction:row-reverse;justify-content:flex-end;gap:1rem}.tile{width:12rem}</style>
</head>
<body>
<header>
  <a href="/">Acme Hardware</a>
  <nav aria-label="Primary"><ul><li><a href="/shop">Shop</a></li><li><a href="/contact">Contact</a></li></ul></nav>
  <button><svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6"/></svg></button>
</header>
<main>
  <h1>Spring sale</h1>
  <h3>This week only</h3>
  <p>Save on every garden tool in the store.</p>
  <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="240" height="96">
  <p>See the full list? <a href="/list">Click here</a>.</p>
  <div class="row"><p class="tile">Second: Hoses</p><p class="tile">First: Shovels</p></div>
</main>
</body>
</html>
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/core/read-page.test.ts
import { expect, it } from "vitest";
import { mount } from "../../tests/support/mount";
import shop from "../../tests/fixtures/shop.html?raw";
import { readPage } from "./read-page";

it("reads the shop page with every planted problem found", async () => {
  const reading = readPage(await mount(shop));
  expect(reading.source).toBe("approximate");
  expect(reading.stops.map((s) => [s.kind, s.name, s.warnings.map((w) => w.check)])).toEqual([
    ["link", "Acme Hardware", []],
    ["link", "Shop", []],
    ["link", "Contact", []],
    ["button", "", ["no-name"]],
    ["heading", "Spring sale", []],
    ["heading", "This week only", ["heading-skip"]],
    ["text", "Save on every garden tool in the store.", []],
    ["image", "", ["image-no-alt"]],
    ["text", "See the full list? Click here.", ["vague-link"]],
    ["text", "Second: Hoses", ["order-mismatch"]],
    ["text", "First: Shovels", []],
  ]);
  expect(reading.pageWarnings.map((w) => w.check)).toEqual(["no-lang"]);
});

it("handles an empty or fully hidden page", async () => {
  const reading = readPage(await mount(`<div hidden><p>x</p></div>`));
  expect(reading.stops).toEqual([]);
  expect(reading.pageWarnings.map((w) => w.check)).toEqual(["no-h1"]);
});

it("reads a 5,000-stop page in under a second", async () => {
  const section = (i: number) =>
    `<section aria-label="S${i}"><h2>Title ${i}</h2><p>Text <a href="#">link ${i}</a>.</p>` +
    `<ul><li><a href="#">A</a></li><li><a href="#">B</a></li></ul></section>`;
  const doc = await mount(`<h1>Big</h1>` + Array.from({ length: 1250 }, (_, i) => section(i)).join(""));
  const start = performance.now();
  const reading = readPage(doc);
  const elapsed = performance.now() - start;
  expect(reading.stops.length).toBe(5001);
  expect(elapsed).toBeLessThan(1000);
});
```

- [ ] **Step 3: Run them to make sure they fail**

Run: `npx vitest run src/core/read-page.test.ts`
Expected: FAIL, because `./read-page` can't be resolved.

- [ ] **Step 4: Implement `readPage` and `index.ts`**

- [ ] **Step 5: Run the whole suite and the checks**

Run: `npm test && npm run typecheck && npm run lint && npm run format:check`
Expected: all tests pass in both browsers. If the 5,000-stop test is over
budget, profile before changing anything (`getComputedStyle` calls are the
likely cost), and show Michael the numbers.

- [ ] **Step 6: Add "Putting it together: readPage" to `docs/how-it-works.md`, with the shop page as the worked example, then walk Michael through it and wait for approval**

- [ ] **Step 7: Commit**

```bash
git add src/core tests/fixtures docs/how-it-works.md
git commit -m "feat: read a whole page into stops, announcements and warnings"
```

---

### Task 11: Check the core against Chrome's accessibility tree

**Files:**
- Create: `scripts/build-core.mjs`, `playwright.config.ts`,
  `tests/chrome-tree/chrome-tree.spec.ts`,
  `tests/fixtures/portfolio-home.html`
- Modify: `package.json` (scripts), `.github/workflows/ci.yml`, `docs/ci.md`,
  `vitest.config.ts` (exclude `tests/chrome-tree`)

**Interfaces:**
- Consumes: `readPage` from `src/core/index.ts`.
- Produces:
  - `npm run build:core`: esbuild bundles `src/core/index.ts` to
    `dist/core.js`, format `iife`, `globalName: "ReadingPath"`, target
    `chrome120`/`firefox120`
  - `npm run test:chrome-tree`: `npm run build:core && playwright test`
- Produces, the comparable item `{ role: string; name: string; level?: number
  }`:
  - **From the core:** for each stop, the stop itself unless it's a text stop
    (heading `level` included, and the image role written as `img`), followed
    by each widget segment `{ role, name }`.
  - **From Chrome:** a depth-first walk of `Accessibility.getFullAXTree` from
    the root. It keeps nodes that aren't `ignored` whose `role.value` is in
    `heading, link, button, textbox, searchbox, combobox, listbox, checkbox,
    radio, slider, spinbutton, switch, tab, menuitem, menuitemcheckbox,
    menuitemradio, option, image`, maps `image` → `img`, and reads `level`
    from `properties`. Names are whitespace-normalised.

- [ ] **Step 1: Create `tests/fixtures/portfolio-home.html`**

This is the tour mockup's page as a fixture, with no scripts or mockup
controls:
- `<html lang="en-CA">`
- a header with the site-name link and a `nav aria-label="Primary"` list of
  four links
- `<main>` holding:
  - an `h1`, a role line and an intro paragraph
  - a `section aria-label="Work"` with an `h2` and a `ul` of three cards
    (`h3 > a` title plus a `p` description each)
- a footer with a `mailto:` link

- [ ] **Step 2: Write the failing comparison test**

```ts
// tests/chrome-tree/chrome-tree.spec.ts
import { expect, test } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

type Item = { role: string; name: string; level?: number };
const FIXTURES = ["shop.html", "portfolio-home.html"];

for (const fixture of FIXTURES) {
  test(`core matches Chrome's accessibility tree: ${fixture}`, async ({ page }) => {
    await page.goto(pathToFileURL(resolve("tests/fixtures", fixture)).href);
    await page.addScriptTag({ path: "dist/core.js" });
    const predicted: Item[] = await page.evaluate(() => { /* readPage(document) → items, see Interfaces */ });
    const session = await page.context().newCDPSession(page);
    const { nodes } = await session.send("Accessibility.getFullAXTree");
    const actual: Item[] = chromeItems(nodes); // depth-first, see Interfaces
    expect(predicted).toEqual(actual);
  });
}
```

Inside `page.evaluate`, the body maps `ReadingPath.readPage(document).stops`
with the core rule in Interfaces. `chromeItems` sits in the same file and
follows the Chrome rule.

- [ ] **Step 3: Write `build-core.mjs`, `playwright.config.ts` (testDir `tests/chrome-tree`, chromium only, headless) and the scripts, then run them to see the result**

Run: `npm run test:chrome-tree`
Expected: the tests run. Any mismatch prints a readable diff of the two
lists.

- [ ] **Step 4: Resolve every mismatch**

For each difference, decide with Michael:
- **Core is wrong:** add a failing unit test that reproduces it in the
  relevant `src/core/*.test.ts`, then fix the core.
- **A justified, Chrome-specific difference:** adjust the comparison in
  `chromeItems` with a comment, and record it in the "Known differences from
  Chrome" section of `docs/how-it-works.md`.

Run: `npm test && npm run test:chrome-tree`
Expected: everything passes.

- [ ] **Step 5: Add the comparison to CI and document it**

Append `- run: npm run test:chrome-tree` to the `check` job in `ci.yml`. Add
its line-by-line entry to `docs/ci.md`.

- [ ] **Step 6: Add "Checking ourselves against Chrome" to `docs/how-it-works.md`, then walk Michael through it and wait for approval**

- [ ] **Step 7: Commit, push and watch the run**

```bash
git add -A
git commit -m "test: compare the core's reading with Chrome's accessibility tree"
git push
gh run watch --exit-status
```

Expected: the CI `check` job passes with the new step.

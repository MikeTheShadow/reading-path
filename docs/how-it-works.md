# How Reading Path works

This document grows with every step of the build. Each section explains what
was built, how it works, and why it was done that way.

## Testing in real browsers

### The problem

Reading Path reads a web page the way a screen reader would. To do that it
needs things only a real browser knows:

- **Computed styles.** Is this element `display: none`? Is the row
  `flex-direction: row-reverse`?
- **Layout.** Where is this element on screen, and how big is it? The
  reading-order check compares the order things are read in with where they
  appear.

The usual way to test browser code in Node is **jsdom**, a fake DOM written in
JavaScript. jsdom parses HTML and builds a DOM tree, but it doesn't do layout:
every element's size is 0 × 0, and it only partly understands CSS. Tests run
against jsdom would pass while the real extension got layout wrong.

### The answer: Vitest browser mode

[Vitest](https://vitest.dev) is the test runner. In **browser mode** it starts
real browsers through [Playwright](https://playwright.dev) (a tool that drives
browsers from code) and runs each test file inside them. `vitest.config.ts`
asks for two browsers:

- **Chromium**, the open-source core of Chrome
- **Firefox**

So every test runs twice, once per browser. `npm test` reports
`|chromium|` and `|firefox|` results separately, which is how a difference
between the two browsers shows up.

### `mount`: a fresh page for every test

`tests/support/mount.ts` gives each test its own page:

1. It takes some HTML, for example `<h1>Spring sale</h1>`.
2. Unless the HTML is already a full document (it starts with `<!doctype`), it
   wraps it in one: `<html lang="en-CA">`, a `<head>` that sets the character
   set to UTF-8, and the HTML inside `<body>`. A test can ask for no `lang` (to
   test the "no page language" warning) or a different one.
3. It creates an `<iframe>` (a page inside the page), 1024 × 768 pixels with no
   border, and puts the document in it with `srcdoc`.
4. It waits for the iframe's `load` event, so the page is parsed, styled and
   laid out.
5. It returns the iframe's `document`, which the test then reads.

`tests/support/setup.ts` runs after every test and removes the iframes, so no
test can see another test's page.

Why an iframe rather than putting the HTML straight into the test page? The
test runner's own page has its own elements, styles and `lang`. An iframe is a
separate, clean document with a known size, much like a real tab.

### What that means for the core code

A page inside an iframe belongs to a different **window** from the test code.
Each window has its own copies of the built-in classes, so an element from the
iframe is an instance of the _iframe's_ `HTMLElement`, not the test window's.
That breaks two common habits:

- `el instanceof HTMLElement` returns `false` for an element from another
  window.
- The global `window.getComputedStyle` belongs to the wrong window.

So the core never uses `instanceof` for DOM types and never touches the global
`window` or `document`. It checks `node.nodeType` instead, and reaches the
right window through the element itself:
`el.ownerDocument.defaultView.getComputedStyle(el)`. This has a second
benefit: the extension's content script can run on frames and pages without
assuming anything about where it was loaded.

### Pinned versions

Every package in `package.json` is pinned to an exact version (`"vitest":
"5.1.0"`, not `"^5.1.0"`). With `^`, a fresh install could pull in a newer
version than the one tested, and the build could change without any change to
the code. With exact versions plus `package-lock.json`, everyone (and the CI
pipeline) installs exactly the same thing. Updating is a deliberate change with
its own commit.

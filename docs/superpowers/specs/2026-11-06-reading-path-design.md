# Reading Path: design

Date: 2026-11-06
Status: awaiting Michael's approval
Working name: Reading Path (folder `~/projects/reading-path`)

## Intent

Reading Path is a browser extension that helps people see how a screen reader
will take in their web page. It draws the route a screen reader follows
through the page as a glowing line, shows roughly what would be announced at
each stop, and flags anything that won't read well, with a suggested fix.

### The goal (Michael's words, condensed)

Let developers find and fix nearly all of their screen-reader problems
(Michael's target is 99%) **before** they sit down with a real screen reader.
The final pass with NVDA or VoiceOver then becomes a quick confirmation, not
a slow loop of "listen, find a problem, fix it, listen again". Reading Path
doesn't replace that final pass. It makes it short.

This goal sets the bar for the rest of the design:

- **Inspect mode is the main working tool.** It has to be fast, and every
  warning has to come with a fix someone can act on immediately.
- **Checks are chosen for what a screen-reader pass would actually catch**,
  ranked by how often they come up and how much they hurt.
- **The 99% is a target, not a claim.** The real screen-reader check
  measures how close Reading Path gets. The README states the measured figure
  with its date and its test pages, and never "fixes 99% of problems" until
  the evidence supports it. When the real check finds something Reading Path
  missed, that becomes a new check or a fix to the core.

It has two jobs, served by two modes:

- **Tour** is a presentation. The line travels through the page and pauses on
  problems to explain them. It is for showing people, and for showing off.
- **Inspect** is the working tool for developers. The whole route appears
  instantly, with a list of stops, warnings and suggested corrections.

### Why

Michael is applying for a Full Stack Developer role at Foci (Ottawa, remote).
His portfolio at michaelpape.ca needs projects that show a caring, creative
developer. His recent large projects were mostly AI-written and he has not
read their code, so he can't present them in depth. This project is built
differently on purpose: **Michael and Claude build it together, step by
step, test first, so that Michael can explain every file, decision and line
in extreme detail.** That requirement shapes the technical choices below as
much as the feature list does.

It also covers ground the Foci posting asks for and his current projects
don't show: automated testing and a CI/CD pipeline.

## Goals

1. Run on any web page from a toolbar button in **Chrome, then Firefox**.
2. Work out the page's screen-reader reading order from the page itself (not
   a hand-written list) and show it as a trace.
3. **Tour mode** (approved in mockup `mockups/tour.html`, plus pauses):
   - One continuous glowing line with a pink → purple → cyan gradient, drawn
     with **straight, direct lines** from stop to stop at a **steady speed**.
     It never stops except at problems (below).
   - The line meets each stop at its **left edge, mid-height** (where reading
     starts). This avoids the line folding back over itself on rows of items.
   - **The trail stays**, so the whole route is visible at the end.
   - **No bright tip or dot** at the head. The line itself grows, with an even
     glow.
   - The current stop gets a **soft highlight**: a thin outline with a small
     gap and a faint glow (not a strong halo). Visited stops keep a faint
     dashed outline.
   - A caption bar shows the **approximate announcement** for the current
     stop.
   - **At a problem the line pauses**: the stop gets an amber outline and a
     callout beside it explains the problem in plain words. Then it carries
     on.
   - No flash of the full route on start (a bug found in the mockup). The
     first frame must show nothing drawn.
4. **Inspect mode** (approved in mockup `mockups/inspect.html`):
   - The whole route appears instantly, with numbered stops. Stops with a
     problem are amber with a ⚠ marker.
   - A panel lists every stop in order: number, approximate announcement, and
     for problems a warning made of **what's wrong, why it matters to someone
     listening, and how to fix it**.
   - Hovering or selecting an entry highlights that piece on the page and
     scrolls it into view. A filter shows all stops or warnings only.
   - A switch between Tour and Inspect sits at the top of the panel.
5. **Stops are individual announced pieces**, never whole sections. A card is
   its title link, then its description. Containers (lists, navigation,
   landmarks, regions) are not stops. They're announced as part of the first
   item inside them ("List, 3 items. Heading level 3, link, Moonwhales") and
   on leaving ("Out of list").
6. Flag anything that won't read well. Starting list in "Checks" below.
7. **Checked against real screen readers.** Reading Path's predicted
   announcements are compared automatically with what real screen readers
   (NVDA and Orca) actually say on a set of test pages. Agreement is measured
   and reported, not assumed. See "Real screen-reader check".
8. **Accurate mode (Chrome, Developer build).** An option to read Chrome's own
   accessibility tree, the data Chrome hands to screen readers, instead of
   Reading Path's approximation of it. See "Accurate mode".
9. Test-driven throughout, with a GitHub Actions pipeline, explained line by
   line to Michael.

## Non-goals (for now)

- **Saving or sharing runs**, and showcasing other sites on michaelpape.ca.
  Discussed and deliberately removed from this version.
- **Safari.** Dropped (Michael's decision). No Safari build, tests or
  packaging.
- **Publishing to the stores** (Chrome Web Store, Firefox Add-ons). It would
  be a plus later. Version one is installed from the repo or a build
  artifact.
- **Integration with michaelpape.ca** (a case study, a demo, a Reading path
  button on the site). That is a separate, later project that will reuse
  this one's code.
- **A full accessibility audit.** Reading Path checks how a page *reads*. It
  does not check colour contrast, target sizes and so on. Tools like axe and
  Lighthouse already do that, and staying focused keeps the code small enough
  to explain in depth.
- **Keyboard (Tab) order.** That's a different route from reading order. It
  could be a later mode.
- **Exact screen-reader output.** Announcements are approximations (see
  "Honesty").
- Word-by-word tracing inside sentences, and the numbered whole-route Tour
  variant. Both were tried in mockups and dropped.
- Contents of iframes in version one (see "Edge cases").

## Anti-goals: failure even if it technically works

- **Code Michael can't explain.** No extension framework, no large
  dependencies whose behaviour matters but can't be described. Every
  dependency needs a written reason.
- **Overclaiming.** The tool must never present its announcements as what
  NVDA, JAWS or VoiceOver will actually say, or call a page "accessible".
- **The tool being inaccessible itself.** Its own panel, controls and
  callouts must be usable by keyboard and screen reader, and it must not
  trace its own overlay.
- **Breaking or changing the page.** It may add its overlay, but must not
  change the page's content, layout or behaviour, and must remove everything
  cleanly on exit.
- **Sending page data anywhere.** Everything runs locally. No network
  requests, no analytics.
- **Permission creep.** It runs only on the tab where the button is pressed.
  The standard build never asks for "read and change all your data on all
  websites". The heavier `debugger` permission exists only in the separately
  installed Developer build (see "Accurate mode").

## Honesty

- Every surface that shows announcements labels them as approximate, for
  example "Approximate speech, NVDA-style" in the panel header.
- The announcement wording follows one consistent style, modelled loosely on
  NVDA's browse mode, in Canadian English. A short note in the README explains
  how real screen readers differ (verbosity settings, and VoiceOver's
  different wording).
- How closely the approximations match real screen readers is **measured**
  by the real screen-reader check, and the README states the current
  agreement figure and its date, not a general claim. Michael accepts that
  approximations are good enough for nearly all cases. The check exists to
  prove that and to find where they aren't.
- Anything checked by hand (for example, listening to a page in NVDA) is
  recorded as verified only after someone has actually done it.

## How it works (decided)

### Pieces

The code is split so the interesting logic has no browser-extension
dependencies and can be tested anywhere:

1. **Core: reading order and checks** (pure TypeScript, runs on any DOM).
   Given a document, it returns an ordered list of stops. Each stop has:
   - the element it belongs to
   - its role (heading, link, button, text and so on) and level where
     relevant
   - its accessible name or text
   - the containers entered and left at this point
   - the announcement string
   - its on-screen box (or a note that it has none)
   - any warnings

   It also returns page-level warnings.
2. **Overlay: drawing** (TypeScript, DOM/SVG). Draws the trace, highlights,
   callouts, panel and caption over the page. Runs the Tour animation and the
   Inspect view.
3. **Extension shell.** The manifest, the toolbar button handler and the
   script injection. Kept as thin as possible.

### Two sources of the same stops

The core's job is "page → ordered stops". There are two ways to produce the
stops, and everything after that point (the checks, the overlay, Tour and
Inspect) works the same on either:

- **Approximate (default, both browsers).** The core walks the DOM and
  computes roles and names itself (with `dom-accessibility-api`).
- **Accurate (Chrome, Developer build only).** Roles, names, levels,
  hidden-ness and order come from Chrome's computed accessibility tree.

The stop model is defined once and both sources must produce it, so the rest
of the code never knows which source it's looking at, apart from a label
saying which one is in use.

### Running on a page

- Pressing the toolbar button injects the content script into the **current
  tab only**, using the `activeTab` and `scripting` permissions. There are no
  host permissions. Pressing again, or Esc, exits and removes everything.
- The overlay's UI lives inside a **Shadow DOM** root so the page's CSS can't
  break it and its CSS can't leak into the page. The trace SVG is marked
  `aria-hidden`. The panel is a labelled region and keyboard operable.
- The core skips the extension's own overlay when walking the page.

### Reading order (the core)

Walk the page in document order, as a screen reader's virtual cursor does in
browse mode:

- Follow the **flattened tree**: open shadow roots and slotted content are
  read where they render.
- **Skip** anything hidden from screen readers: `display: none`,
  `visibility: hidden`, the `hidden` attribute, `aria-hidden="true"` and
  `inert`.
- **Emit a stop** for each readable piece:
  - headings
  - links
  - buttons
  - form controls
  - images with alternative text
  - each block of text, such as a paragraph or list-item text
  - inline links inside a paragraph: v1 treats a paragraph with inline links
    as one stop that mentions its links, as shown in the mockup ("See the
    full list? Link, Click here.")
- **Containers** (`nav`, `main`, `header`/banner, `footer`/contentinfo,
  `aside`, labelled `section`/region, lists, tables) emit entry text onto
  their first stop and exit text onto the stop after them.
- **Visually-hidden text** (read but not seen, such as "skip to content" or
  `sr-only` text) still produces a stop. Since it has no meaningful box, it's
  drawn as a small marker at its position and labelled "read but not shown".
  This is a nice teaching moment, not an error.
- Roles and accessible names follow the WAI-ARIA and accname rules. ARIA
  roles override native ones.

### Checks (version one)

Each warning has a short title, a plain-language "why it matters to someone
listening", and a concrete suggested fix. Starting set:

1. **No name**: a link, button, form field or ARIA widget with an empty
   accessible name ("This button has no name. A screen reader just says
   'button'.").
2. **Image without alternative text**: an `<img>` (or `role="img"`) with no
   `alt` or label. `alt=""` means decorative and is fine.
3. **Heading problems**:
   - the level jumps down by more than one (h1 → h3)
   - an empty heading
   - no `h1` on the page (page-level)
4. **Vague link text**: link names like "click here", "here", "read more",
   "more" or "learn more", when the link has no fuller accessible name.
5. **Read in a different order than shown**: a stop is read before something
   that appears earlier on screen, *and* the cause can be identified:
   - `flex-direction`/`flex-flow` `*-reverse`
   - a non-zero CSS `order`
   - explicit grid placement that reorders items

   The warning names the cause. A visual jump without an identifiable cause
   isn't flagged, to avoid false alarms.
6. **Focusable but hidden from screen readers**: a focusable element inside
   `aria-hidden="true"`. Keyboard users land on something silent.
7. **No page language**: `<html>` has no `lang` (page-level). This affects
   pronunciation.

Wording for warnings and announcements lives in one place (a strings module)
so it can be reviewed and adjusted.

### Tour behaviour details

- Speed is constant in pixels per second. Start at about 230 px/s (the
  mockup's value) and expose a speed control.
- Controls: play/pause, previous/next stop, speed, exit. Esc exits.
- The page scrolls smoothly to keep the line's head in view.
- Pauses at problems last until the user continues, or for a few seconds when
  auto-continue is on.
- **Reduced motion**: if the user's system asks for reduced motion, there is
  no animation. The full route is shown and stepping goes stop by stop.
- The overlay redraws on resize and on layout changes.

### Technology (decided)

- **TypeScript**, strict.
- **No extension framework** (such as WXT or Plasmo). The manifest and
  scripts are written by hand so each part can be explained.
- **Manifest V3** for both browsers. Chrome needs a service-worker
  background and Firefox needs a background script, so the build produces a
  manifest per browser from one source.
- **One small bundler** (esbuild) to turn TypeScript into the files each
  browser loads.
- **Test-driven development.** A failing test comes first, then the code that
  passes it.
- **npm** for packages, matching the portfolio.
- **Canadian English** in all UI text and documentation.

### Testing (decided in principle)

- **Unit tests** for the core reading order and every check. They use small
  HTML fixtures, including deliberately broken pages like the mockup's shop
  page.
- **Engine tests.** Because the core and overlay have no extension
  dependencies, the same tests can run as plain page scripts in real
  **Chromium and Firefox** through Playwright.
- **Extension tests.** Load the built extension into Chrome automatically and
  check that the button injects, traces and exits cleanly. Lint the Firefox
  build with Mozilla's `web-ext` tool.
- **A test for the start-of-tour flash.** The first frame draws nothing.

### Accurate mode (decided)

- **What it reads:** Chrome's full accessibility tree for the tab, through the
  `chrome.debugger` API and the Chrome DevTools Protocol's `Accessibility`
  domain (`getFullAXTree`). Each tree node is mapped back to its DOM element
  so the overlay can draw its box. Nodes Chrome marks as ignored are skipped.
- **What it doesn't change:** the spoken wording is still Reading Path's
  approximation. Chrome's tree says *what* something is, and the screen reader
  decides *how to say it*. The panel label changes to say so, for example
  "Chrome accessibility tree · approximate speech".
- **Why a separate build (Michael's decision):** the `debugger` permission
  can't be requested only when needed (Chrome's documentation lists it among
  the permissions that can't be optional). Any install that includes it shows
  a warning like "Access the page debugger backend", and Chrome shows a
  "started debugging this browser" bar while it's attached. So the build
  produces **two Chrome packages from the same code**:
  - **Reading Path**: minimal permissions (`activeTab`, `scripting`) and no
    Accurate mode.
  - **Reading Path Developer**: adds `debugger` and an Accurate switch in the
    panel. People choose which level of trust they install.

  The difference is the manifest and a build-time flag. No duplicated source.
- **Behaviour:**
  - The debugger is attached only while Accurate is switched on and the
    overlay is open on that tab, and detached as soon as it's turned off or
    closed.
  - If attaching fails, or Chrome detaches it (for example, when DevTools
    opens on that tab), the panel says so and falls back to Approximate. It
    never fails silently.
- **Firefox:** not available. Firefox doesn't give extensions access to its
  accessibility tree.
- **In the tests regardless of build:** browser tests read Chrome's tree
  directly through Playwright. Every test page is checked as "Approximate
  stops vs Chrome's tree" for order, roles, names and levels. This catches
  core bugs cheaply, before the slower real screen-reader check.

### Real screen-reader check (decided in principle)

Michael wants this to be a genuinely useful tool, not just a résumé piece, so
its central claim ("this is roughly what a screen reader will say") is tested
against the real thing.

- **Guidepup** is an open-source (MIT, about 80,000 downloads a week) library that drives real screen readers
  from code and records what they say: NVDA on Windows, Orca on Linux and
  VoiceOver on macOS. Its companion `@guidepup/setup` prepares a machine,
  including CI machines.
- A **parity suite** opens each test page in a real browser with a real screen
  reader running. It steps through the page the way a user would (next item,
  next item…), recording each spoken phrase. It then compares those phrases
  with Reading Path's predicted stops for the same page.
- The comparison checks, per page:
  - that stops come in the same **order**
  - that the same **names** are spoken
  - that the same **roles and levels** are announced

  Exact wording isn't compared (each screen reader phrases things
  differently). The result is a per-page and overall agreement figure, plus a
  readable diff of the differences.
- **Where it runs:**
  - **NVDA** on a GitHub-hosted Windows machine in the pipeline.
  - **Orca** on Linux, both in the pipeline and on Michael's own machine
    (Arch Linux), so he can watch and listen to it run.
- **What it's for:** tuning the core and its wording where it disagrees,
  catching regressions, and backing the README's accuracy figure with
  evidence.
- It runs on test pages in the repo, not arbitrary websites. Real screen
  readers take over the machine's keyboard and speech, so this is a
  developer and pipeline tool, not something end users run.
- **Order:** this comes after the core reading order and checks work and
  have unit tests, and before polishing the overlay. If NVDA proves unreliable
  on hosted machines, it's marked as non-blocking (reported but not failing
  the build) rather than dropped, and that's written down.

**Later idea, not in this version:** a "listen for real" command that runs a
given URL through a real screen reader on the developer's own machine and
overlays the actual spoken phrases next to Reading Path's predictions. This is
the realistic form of the "desktop app that emulates a screen reader" idea.
Emulating a screen reader isn't feasible, but driving a real one is.

### CI/CD with GitHub Actions (decided)

On every push and pull request:

- type checking, linting and format checks
- unit and engine tests
- the extension test
- building the Chrome (standard and Developer) and Firefox packages
- the real screen-reader check: NVDA on Windows and Orca on Linux, as separate
  jobs

Each build is attached to the run as a downloadable artifact.

A `docs/ci.md` walks through **every line** of the workflow file in plain
terms: what each line does and why it's there. It's written with Michael, not
handed over. (Michael's call: no comparisons with TeamCity.)

### How we build it

- **Claude writes, Michael reviews each step (Michael's decision).** Claude
  writes each small step test first. Then Claude walks Michael through the
  test and the code, and Michael approves before the next step starts. A step
  isn't done until Michael can explain it.
- Small steps. Each step ends with something runnable, its tests, and a
  walkthrough where Michael can ask anything before moving on.
- **Public on GitHub from day one (Michael's decision)** at
  `github.com/MikeTheShadow/reading-path`, so the pipeline runs from the first
  push and the history shows the work as it happened. Creating the repo and
  pushing are confirmed with Michael at the time they happen.
- Alongside the code, a `docs/how-it-works.md` grows with each step. It
  explains the design in Michael's own understanding, so it's ready for
  interviews.

## Commits

Plain commit messages with no AI attribution trailers (Michael's
preference). AI assistance is disclosed in the README and the portfolio case
study instead.

## Edge cases the builder must handle

- **Accurate mode on a tab where DevTools or another debugger is already
  attached, or a page Chrome won't let it debug.** Report it and fall back to
  Approximate.

- **Pages taller than the screen.** The overlay covers the whole document,
  not just the viewport.
- **Fixed and sticky elements.** Their boxes move with scroll. Draw them
  relative to the viewport while the rest of the trace scrolls with the page.
- **iframes.** Not entered in v1. The frame appears as one stop with a note
  ("Frame: contents not traced in this version").
- **Huge pages** (thousands of stops). Inspect stays responsive, and Tour
  speed is adjustable.
- **Pages whose content changes while open.** A Refresh button re-runs the
  walk, so it doesn't need to track live changes.
- **Pages that block injected scripts** or restricted browser pages (the
  store, settings and so on). Show a clear message.
- **Right-to-left pages.** At minimum, don't crash. Matching the visual
  direction for the order check is a later improvement.

## Left to the builder

- Module and file layout, naming, and the exact build scripts.
- The unit-test runner (Vitest is the natural fit with TypeScript), and the
  Playwright setup.
- The exact panel styling within the mockups' look, its placement (docked
  right, as in the mockup) and how it behaves on small screens.
- Exact animation timing and pause length, within the decisions above.
- The full wording of announcements and warnings, within the style decided
  above. Michael reviews it.
- The order of build steps, as long as each step is small, tested and
  explained.

## Calls made by Claude

Michael reviewed these on 2026-11-06 and accepted them, with the changes
noted.

- **Name** "Reading Path" and folder `~/projects/reading-path`.
- **`dom-accessibility-api` for accessible names and roles** (approved by
  Michael, subject to vetting). Vetting as of 2026-11-06: MIT licence
  (compatible with GPL), no runtime dependencies, about 180 million downloads
  a week (it's what Testing Library uses), maintained by Sebastian Silbermann,
  last published November 2025. The pinned version and these checks are
  recorded in the README. Working out an
  element's accessible name is a long, fiddly W3C algorithm. Writing it from
  scratch would be a project on its own. This small, widely used library
  implements it, and Michael would learn and explain *what* it computes and
  *why*, not reimplement it. If he'd rather write it himself as a learning
  exercise, that's a valid swap, but it roughly doubles the core work.
- **GPL-3.0-or-later licence** for the public repo (Michael's decision).
- **Inline paragraph links** handled as one stop that mentions the links,
  rather than splitting the paragraph.
- **The order check only flags reordering it can explain** (CSS reversal,
  `order` and grid placement), trading some missed cases for no false alarms.
- **Panel in the page** (Shadow DOM overlay), not a browser developer-tools
  panel. It's the same on both browsers and visible to people watching a
  Tour.
- **Chrome first, then Firefox** (Michael's decision). Safari dropped.
- **Tour auto-continues by default** after pausing about three seconds on a
  problem (it's a presentation), with a toggle to wait for the user instead.
- **Page-level warnings** (no `h1`, no page language) appear as an opening
  callout before the line starts in Tour, and at the top of the panel in
  Inspect.
- **Browser targets**: current stable Chrome and Firefox. No effort
  goes into older versions.

# The CI pipeline, line by line

Every push to `main`, and every pull request, runs the project's checks on a
fresh machine at GitHub. The whole pipeline is one file:
`.github/workflows/ci.yml`. This guide goes through it from top to bottom.

A few words first:

- A **workflow** is one YAML file in `.github/workflows/`. GitHub reads every
  file in that folder.
- A **run** is one execution of a workflow, started by an event such as a
  push.
- A **job** is a group of steps that run in order on one machine. Jobs in the
  same workflow run in parallel on separate machines unless told otherwise.
  This workflow has one job.
- A **runner** is the machine a job runs on. GitHub provides fresh virtual
  machines; each job gets a new one, which is thrown away afterwards. Nothing
  carries over between runs unless it's cached on purpose.
- A **step** is one command, or one **action** (a reusable, published piece of
  pipeline code).

## The file

```yaml
name: CI
```

The workflow's display name. It's what appears in the repository's **Actions**
tab and next to each commit.

```yaml
on:
  push:
    branches: [main]
  pull_request:
```

When the workflow runs, called its **triggers**:

- `push` with `branches: [main]`: whenever commits land on `main`. Pushes to
  other branches don't trigger it on their own; they get checked when a pull
  request is opened for them.
- `pull_request`: whenever a pull request is opened, or new commits are pushed
  to one. GitHub tests the result of merging the pull request into its target
  branch, so a pull request is checked as it would be after merging. Pull
  requests from forks (other people's copies of the repo) run with a read-only
  token and no access to secrets, so outside code can't use the pipeline to
  change the repository.

```yaml
permissions:
  contents: read
```

Every run gets a temporary access token, `GITHUB_TOKEN`, that lasts only as
long as the run. This line limits it to reading the repository's contents. It
can't push code, create releases or comment on issues. The pipeline only needs
to read the code, so that's all it gets: if any step were ever compromised, the
token would be nearly useless to it.

```yaml
jobs:
  check:
```

The list of jobs, and the one job, named `check`. The name appears on pull
requests as "CI / check", and later plans add more jobs beside it (building the
extension packages, the real screen-reader check).

```yaml
runs-on: ubuntu-24.04
```

Which runner to use: a GitHub-hosted Ubuntu 24.04 virtual machine. Naming the
exact version (rather than `ubuntu-latest`) means the machine only changes when
we change this line. For public repositories these runners are free.

```yaml
timeout-minutes: 15
```

If the job hasn't finished in 15 minutes, GitHub stops it and marks it failed.
The default is 6 hours, so a stuck browser test would otherwise sit there for
hours. A normal run takes a few minutes.

```yaml
steps:
```

The steps, run in order. If one fails, the rest are skipped and the job fails.

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  with:
    persist-credentials: false
```

**Get the code.** The runner starts empty; `actions/checkout` is GitHub's own
action that clones this repository onto it at the commit being tested.

- `uses:` means "run this published action" instead of a shell command.
- `@3d3c42e…` pins the action to one exact commit of its code. Actions are
  usually referred to by a tag such as `@v7`, but a tag can be moved to point
  at different code, so a hacked or careless release could change what runs
  in our pipeline. A commit ID can't be moved. The `# v7.0.1` comment records
  which release that commit is. This matches how `package.json` pins exact
  versions.
- `persist-credentials: false`: by default, checkout leaves the access token
  saved in the cloned repo's git settings so later steps can push. Nothing here
  pushes, so we don't leave it lying around.

```yaml
- uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
  with:
    node-version: 24
    cache: npm
```

**Install Node.js.** `actions/setup-node` installs Node and puts it on the
path. Pinned to a commit, as above.

- `node-version: 24`: the oldest Node version the project supports
  (`package.json` says 24 or newer). Node 24 gets security fixes until April 2028. Development happens on a newer version, and testing on the oldest
  supported one catches code that accidentally relies on something newer.
- `cache: npm`: saves npm's download folder (`~/.npm`) at the end of a run, and
  restores it at the start of the next. The saved copy is labelled with a
  fingerprint of `package-lock.json`, so it's reused only while the
  dependencies are unchanged. A restored cache means packages come from the
  saved copy instead of being downloaded again. It only saves time; the
  install that follows is the same either way.

```yaml
- run: npm ci
```

**Install the dependencies.** `run:` runs a shell command. `npm ci` ("clean
install") is the install command meant for pipelines:

- It installs exactly what `package-lock.json` lists, every package at its
  recorded version.
- It fails if `package.json` and `package-lock.json` disagree, instead of
  quietly updating the lock file the way `npm install` would.
- It deletes any existing `node_modules` first.

`package.json`'s `allowScripts` setting denies esbuild's install script, and
recent versions of npm (11.21 and newer) respect that here too, so the pipeline
installs exactly what a local install does. (Tested with npm 11.21.2: the script
didn't run.) An older npm would ignore the setting and run the script, which is
harmless: it only makes esbuild start a little faster.

```yaml
- run: npx playwright install --with-deps chromium firefox
```

**Install the test browsers.** The tests run in real Chromium and Firefox,
which aren't part of npm's install. `npx` runs the `playwright` command from the
project's own `node_modules`, so the browser builds match Playwright 1.65.0
exactly. `--with-deps` also installs the Linux system libraries the browsers
need (fonts, graphics and audio libraries), which a bare runner doesn't have.

```yaml
- run: npm run typecheck
- run: npm run lint
- run: npm run format:check
- run: npm test
```

**The checks**, the same four commands run locally before each commit (they're
defined in `package.json`'s `scripts`):

1. `typecheck`: TypeScript checks every file for type errors.
2. `lint`: ESLint looks for likely bugs.
3. `format:check`: Prettier checks that every file is formatted. It only
   checks; it never rewrites files in the pipeline.
4. `test`: Vitest runs every test in Chromium and Firefox.

Each is its own step so a failure says which check failed, and its log is
separate. They're ordered fastest first, so a typo fails in seconds rather than
after the browser tests.

## Where the results appear

- **The Actions tab** on the repository lists every run. Open one to see its
  jobs, and open a job to see each step's log. A step's log expands to show its
  full output.
- **Next to each commit** on GitHub: a green tick, a red cross, or an amber dot
  while running. Clicking it links to the run.
- **On pull requests**, the "Checks" section shows "CI / check" with its
  result. Branch protection (set up later) can block merging until it passes.
- From the terminal: `gh run list` shows recent runs, `gh run watch` follows
  one live, and `gh run view --log-failed` prints the logs of the steps that
  failed.

## When a run fails

1. Open the failed run and the failed step. The log's last lines usually say
   what went wrong.
2. Run the same command locally (for example `npm test`) to reproduce it.
3. Push a fix. The new commit starts a new run.

If a run failed for a reason outside the code (GitHub having a problem, a
download timing out), press **Re-run jobs** on the run's page. From the
terminal, `gh run rerun --failed` followed by the run's ID does the same. That
runs the same commit again. A failure that only sometimes happens is a bug in
the tests, though, and should be fixed rather than re-run until it passes.

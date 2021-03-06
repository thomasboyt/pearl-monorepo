# Pearl

[![Build Status](https://travis-ci.org/thomasboyt/pearl.svg?branch=master)](https://travis-ci.org/thomasboyt/pearl)

Pearl is a small framework for creating video games in the browser. It's written in TypeScript, but can be used in any language that compiles to JavaScript.

Pearl aims to be a a simpler, code-only alternative to full-scale frameworks like [Unity](http://unity3d.com/) or [Superpowers](http://superpowers-html5.com/). Like those frameworks, Pearl uses the [Component](http://gameprogrammingpatterns.com/component.html) pattern to avoid complex object hierarchies and difficult-to-decompose entities. Unlike those frameworks, Pearl is a _code-only framework_, and does not include any editor or special tooling.

**Pearl is in very early alpha stages,** and will probably undergo many significant breaking changes before the first `0.1.0` release. There are many unanswered questions in the current design.

## [Docs](https://pearl-docs.disco.zone/)

## Development Overview

Pearl is in a monorepo powered by [Lerna](https://github.com/lerna/lerna), which has a lot of quirks. It's currently using Lerna v3 which just entered RC, but still seems very underdocumented and in flux. If you've used Lerna before, note that this repo *does not use the normal `lerna bootstrap` method*, instead linking everything together via NPM's `file:` specifiers. See [this Lerna GitHub issue](https://github.com/lerna/lerna/issues/1462#issuecomment-410536290) for a little more detail on this.

### Build

To install:

```text
npm install
```

Then to actually build:

```text
npx lerna run build
```

There's no harm to running individual builds for individual projects as you work on them, but watch out for dependency ordering issues.

### Test

Tests can be run through the root of the project (for all packages), or through an individual package, with `npm test`:

```text
npm test
```

Everything uses Jest for testing.

Note that packages that import other packages are importing their _build artifacts_, not their original source. This means that you should make sure to rebuild with `npm run build` before re-running your test if you change a dependency.

### Release

To publish to NPM:

```text
npx lerna publish
```

### Caveats

#### Linking local projects to local Pearl packages

If you're working on an addition to Pearl in tandem with a game or two, you'll want to link your game's dependencies to your local Pearl repo. **Don't use `npm link`!**  `npm link` is incompatible with the way this monorepo works, in which packages never install their own dependencies - the root package always does. `npm link` _runs `npm install`_ when creating the link, which obviously breaks this.

Never fear, though, because at the end of the day, all `npm link` does is create a symlink to directory, which is very easy to do in a shell script. At the root of your project, add a `link.sh` script:

```sh
# link.sh

# the 2> /dev/null bit here ignores errors
rm node_modules/pearl node_modules/pearl-networking 2> /dev/null

# replace /Users/tboyt/Coding/pearl with the path to your local repo here:
ln -s /Users/tboyt/Coding/pearl/packages/pearl node_modules/pearl
# ...any other packages you want to  link go here, e.g.
# ln -s /Users/tboyt/Coding/pearl/packages/pearl-networking node_modules/pearl-networking
```

Just run this script once to create the link, and *re-run it every time you re-run `npm install`*. I know that latter bit is annoying, but it's currently an issue with `npm link` too.

All of this should go away with the simplified [npm link usage in NPM 7](https://github.com/npm/rfcs/pull/3), so look forward to that.

#### npx

`npx` isn't able to resolve `.bin/` dependencies from a parent folder (see https://github.com/zkat/npx/issues/118), meaning if you want to run a hoisted dependency's bin script inside a specific package's folder, you'll need to use `../../node_modules/.bin/<command>`  instead of `npx`.

#### Using sibling packages in tests

Remember that packages in this repo import the `dist` folders of sibling packages, even in development. If you change a sibling package, you'll want to rebuild it before e.g. re-running tests. Root-level `npm test` handles this for you.

Pearl currently ships certain packages as ES6 modules to allow for fancy code-shaking. This is one of those things that's totally fine until you try to use the wrong tool that can't handle ES modules, and one of those tools is Jest. There's a workaround for this that basically boils down to "run the TypeScript compiler on certain JS files in `node_modules/`"; see `jest.config.js` and `jest.tsconfig.json` for details. Note that this is also an issue with adding tests to any Pearl game, and this documentation should be included in a section on testing at some point.

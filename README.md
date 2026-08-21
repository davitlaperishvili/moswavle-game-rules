# @moswavle/game-rules

How authored Moswavle game data becomes something playable: which fields are read, what the
defaults are, how lives, timers and correctness are decided.

Shared by the web player (`iswavle-wp/frontend`) and the mobile app (`moswavle-app`) on purpose.
Renderers stay platform-specific — Phaser and the DOM on one side, `react-native-svg` on the
other — but both must interpret an authored game **identically**, or the same game scores
differently depending on the device a child happens to use.

## Install

There is no registry. Both consumers depend on a tag of this repository:

```json
"@moswavle/game-rules": "github:davitlaperishvili/moswavle-game-rules#v1.0.0"
```

`dist/` is committed, so nothing is built at install time.

## Changing a rule

1. Edit `src/`, add a test, then `npm run build && npm test`.
2. Commit, tag, push:

```bash
npm run build && npm test && git commit -am "..." && git tag v1.1.0 && git push --follow-tags
```

3. Bump the tag in `iswavle-wp/frontend/package.json` and `moswavle-app/package.json`, run
   `npm install` in each, and commit the lockfile change.

Three commits instead of one — that is the price of two deployable repositories sharing code.
It buys one implementation of every rule instead of two silently drifting apart, which pays for
itself from about the second game type onward.

**The repositories are briefly inconsistent between steps 2 and 3.** A rule change that also
needs a change in a player cannot land atomically. If that starts to hurt, the answer is a
monorepo, not more tooling here.

## What belongs here

Yes: reading authored config, defaults and fallbacks, correctness, lives, timers, shuffling,
resolving a game type to a renderer kind.

No: anything that draws, animates, plays audio, or touches the DOM or React Native. Those differ
per platform by design, and dragging them in here would force one platform's idea of rendering
onto the other.

## Tests

`npm test` — plain Node, no framework. They pin the decisions both players have to agree on, so
a change that would make the two behave differently fails here first.

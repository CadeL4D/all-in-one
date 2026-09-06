# One Hub website

A mobile-friendly task library with an installable offline hub.

## Run locally

From the repository root, run `python -m http.server 4173 --directory website` and open http://localhost:4173/.

## Verify

Run `node --test website/site-build.test.mjs`. For browser checks, install dependencies in website with `npm ci`, install Chromium with `npx playwright install chromium`, then run `npm run test:published`.

## Publish

The GitHub Pages workflow tests and assembles the static website when changes are pushed to main.

Public site: https://cadel4d.github.io/all-in-one/

Tasks are saved in the browser. Install One Hub through its install button for a home-screen shortcut; offline access requires an initial online visit.

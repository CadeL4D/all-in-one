# One Hub website

An HTML, CSS, and JavaScript collection published to GitHub Pages. One Hub is a mobile library with its own PWA; Destiny To Yours is a separately installable, original village survival game.

## Run locally

From the repository root:

```sh
python3 -m http.server 4173 --directory website
```

Open http://localhost:4173/. JavaScript modules require a server; opening files directly from disk is unsupported.

## Verify

```sh
node --test website/destiny/world.test.js
cd website
npm ci
npx playwright install chromium
npm run test:browser
```

The browser test expects the local server above. It checks library filters, placement confirmation, construction, priorities, save/load, invalid import protection, export, powers, offline reload, pinch zoom without accidental construction, harvest brushes, and portrait/landscape viewport fit. Set TEST_URL to test another deployment.

## Install and play offline

Open the game once online and wait for “Offline ready” in its menu. On supporting Chromium browsers, the Install game button opens the install prompt. On iPhone/iPad, the button explains Safari's Share → Add to Home Screen flow. Installation availability remains controlled by the browser.

Both apps have manifests, 192/512 PNG icons, maskable icons, Apple touch icons, standalone display, and scoped service workers. The game caches its whole shell. Its worker waits for the player's “Save & update” action before activating a new version; a failed local save blocks that action. Increase the cache version when shipping a shell update.

The game uses a fixed viewport with safe-area spacing, a bottom action dock, scrollable drawers, two-step placement, one-finger panning, and two-finger pinch zoom. Menus, app backgrounding, and hidden tabs pause simulation. Export/import lets players move a village between browsers or devices. Existing v1 saves gain default influence and work priorities on load.

Hub and game installs have distinct manifest IDs and scopes. Some mobile platforms isolate storage between browser and installed apps; export a backup before switching. Offline play requires a completed first online visit. It does not install a native App Store binary.

App icons are generated from original code with `node generate-icons.mjs` in this directory. Playwright is only a development dependency.

## Deployment and domains

The workflow at ../.github/workflows/pages.yml tests the simulation and publishes only static assets. Dependencies, tests, and planning documents are excluded.

Default hub: https://cadel4d.github.io/all-in-one/

Game: https://cadel4d.github.io/all-in-one/destiny/

GitHub Pages supplies an account subdomain (cadel4d.github.io) and this repository path. Each card opens a relative subdirectory or HTML page. GitHub Pages does not create arbitrary per-game subdomains automatically.

A custom subdomain requires a domain the owner controls. Add the hostname to repository Pages settings and point its DNS CNAME to cadel4d.github.io, following [GitHub's custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). No custom hostname is configured until one is provided.

## Game scope

This is an early playable, not the complete design guide implemented. It includes seeded island illustration and three separately seeded local maps, founding location choice, thirteen placeable types, rotated footprints, six initial citizens, physical harvesting/delivery, food and water production, housing-driven arrivals, morale, worker priorities, a garden milestone, walls and supplied towers, raiders and slower brutes, and peaceful mode. Deliveries generate influence for Mend, Starfall, and Wildseed; a Wishing spire increases influence capacity and generates it slowly.

The island overview conveys region selection; its coast and rivers are not yet continuous with local map boundaries. Only one settlement is active and saved. Trade, linked regional simulation, multiple persistent towns, full ecology, families, advanced services, and civic Promise choices remain planned.

Art is original procedural pixel drawing in art.js; the hub cover and building palette use the same renderer. There are no copied game sprites or runtime image services. Hub and game use system fonts for complete offline rendering. The older Tasks tool still has optional web fonts with local fallbacks. Sound is an optional synthesized interaction cue.

Progress saves to localStorage under destiny-to-yours-v1. No account or backend is needed. The Save button reports unavailable storage; clearing browser data removes the save. Exported JSON files are an independent backup; clearing service-worker caches does not clear village saves.

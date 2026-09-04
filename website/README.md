# One Hub website

An HTML, CSS, and JavaScript collection published to GitHub Pages. The home page links to the existing Tasks tool and the original Destiny To Yours browser prototype.

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

The browser test expects the local server above and checks navigation, founding, construction, local save/load, pause, keyboard input, mobile touch, and viewport overflow. Set TEST_URL to test another deployment.

## Deployment and domains

The workflow at ../.github/workflows/pages.yml tests the simulation and publishes only static assets. Dependencies, tests, and planning documents are excluded.

Default hub: https://cadel4d.github.io/all-in-one/

Game: https://cadel4d.github.io/all-in-one/destiny/

GitHub Pages supplies an account subdomain (cadel4d.github.io) and this repository path. Each card opens a relative subdirectory or HTML page. GitHub Pages does not create arbitrary per-game subdomains automatically.

A custom subdomain requires a domain the owner controls. Add the hostname to repository Pages settings and point its DNS CNAME to cadel4d.github.io, following [GitHub's custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site). No custom hostname is configured until one is provided.

## Game scope

This is the first playable prototype, not the complete design guide implemented. It includes seeded island illustration and three separately seeded local maps, founding location choice, eleven placeable types, rotated footprints, six initial citizens, physical harvesting/delivery, food and water production, housing-driven arrivals, morale, a garden milestone, walls and supplied towers, small raids, and peaceful mode.

The island overview conveys region selection; its coast and rivers are not yet continuous with local map boundaries. Only one settlement is active and saved. Trade, linked regional simulation, multiple persistent towns, full ecology, families, advanced services, and civic Promise choices remain planned.

Art is original procedural pixel drawing in art.js; the hub cover uses the same renderer. There are no copied game sprites or runtime image services. Fonts use Google Fonts with local serif/sans-serif fallbacks. Sound is a small optional synthesized interaction cue.

Progress saves to localStorage under destiny-to-yours-v1. No account or backend is needed. The Save button reports unavailable storage; clearing browser data removes the save.

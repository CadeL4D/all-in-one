// Visual check: capture the hub card and the game at key moments.
import { chromium } from "playwright";
const outDir = new URL("./test-output/", import.meta.url).pathname;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 900, height: 480 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Hub card art
  await page.goto("http://localhost:4173/");
  await page.waitForTimeout(1200);
  await page.locator("#library").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: outDir + "hub-card.png" });

  // Game: fresh start (clear storage first)
  await page.goto("http://localhost:4173/ruins/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: outDir + "game-start.png" });

  // Build flow: open build sheet
  await page.getByRole("button", { name: /Build/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: outDir + "build-sheet.png" });

  // Pick the farm, place near camp via ghost + confirm
  await page.locator(".build-card", { hasText: "Farm" }).click();
  await page.waitForTimeout(300);
  // tap-ish: pointer down/move/up on open grass above the hint card
  const canvas = await page.locator("#world").boundingBox();
  const cx = canvas.x + canvas.width / 2;
  const cy = canvas.y + canvas.height / 2 - 40;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 24, cy + 8, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.screenshot({ path: outDir + "placement.png" });
  await page.getByRole("button", { name: "Confirm ✓" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: outDir + "placed.png" });

  // Jobs sheet
  await page.getByRole("button", { name: /Jobs/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: outDir + "jobs.png" });
  await page.locator('#jobs-sheet .sheet-close').click();

  // Speed up and let the village work
  await page.locator('.speed button[data-speed="3"]').click();
  await page.waitForTimeout(20000);
  await page.screenshot({ path: outDir + "village-day.png" });

  // Inspector: pause, put a villager under the camera center, tap it
  await page.evaluate(() => {
    window.__ruins.setSpeed(0);
    const { state, camera } = window.__ruins;
    const v = state.villagers[0];
    v.x = camera.x;
    v.y = camera.y;
  });
  await page.mouse.click(cx, canvas.y + canvas.height / 2);
  await page.waitForTimeout(600);
  await page.screenshot({ path: outDir + "inspector.png" });

  // Night look: fast-forward into the night phase
  await page.evaluate(() => {
    const { state, fastForward } = window.__ruins;
    const nightStart = 5 * 24000 + 16080; // start of night on day 6
    fastForward(Math.max(0, nightStart - state.clock.tick));
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: outDir + "night.png" });

  console.log("errors:", errors.length ? errors : "none");
  console.log("done");
} finally {
  await browser.close();
}

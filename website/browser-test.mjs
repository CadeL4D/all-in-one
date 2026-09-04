import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://localhost:4173";
const browser = await chromium.launch({ headless: true });
const errors = [];
const read = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("destiny-to-yours-v1")));
async function menu(page) {
  if (!(await page.locator("#menu").evaluate((e) => e.open)))
    await page.locator("#open-menu").click();
}
async function closeMenu(page) {
  await page.locator("#menu [data-close-dialog]").click();
}
async function save(page) {
  await menu(page);
  await page.locator("#save").click();
  await closeMenu(page);
  return read(page);
}
async function found(page, touch = false) {
  await page.locator(".region-card").first().click();
  await page.locator("#start-guide").click();
  const box = await page.locator("#world").boundingBox(),
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  assert.equal(await page.locator("#confirm-placement").isEnabled(), true);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("destiny-to-yours-v1")),
    null,
  );
  await page.locator("#confirm-placement").click();
  if (await page.locator("#mobile-speed").isVisible()) {
    await page.locator("#mobile-speed").click();
    await page.locator("#mobile-speed").click();
  } else await page.locator('[data-speed="4"]').click();
  await page.waitForFunction(() =>
    document.querySelector("#objective").textContent.includes("cottage"),
  );
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.screenshot({ path: "/tmp/onehub-v2-desktop.png", fullPage: true });
  await page.locator('[data-filter="tool"]').click();
  assert.equal(await page.locator(".game-card").isVisible(), false);
  await page.locator('[data-filter="all"]').click();
  await page.locator(".art-link").click();
  await page.screenshot({ path: "/tmp/destiny-v2-title.png", fullPage: true });
  await found(page);
  let village = await save(page);
  assert.equal(village.people.length, 6);
  assert.equal(village.buildings[0].progress, 1);
  await page.locator("#build-open").click();
  await page.locator('[data-category="work"]').click();
  assert.equal(await page.locator('[data-build="quarry"]').isVisible(), true);
  await page.locator('[data-build="quarry"]').click();
  assert.equal(await page.locator("#build-sheet").isVisible(), false);
  await page.locator("#cancel-placement").click();
  await page.locator("#village-open").click();
  await page.locator("#work-focus").selectOption("food");
  await page.locator("#village-sheet [data-close-sheet]").click();
  village = await save(page);
  assert.equal(village.focus, "food");
  await page.reload();
  await page.locator("#resume").click();
  assert.equal(await page.locator("#work-focus").inputValue(), "food");
  await page.locator("#pause").click();
  const time = await save(page);
  await page.waitForTimeout(400);
  assert.equal((await save(page)).time, time.time);
  await menu(page);
  const before = await read(page);
  await page.locator("#import-file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  assert.deepEqual(await read(page), before);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-save").click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /destiny-village/);
  await closeMenu(page);
  await page.locator("#powers-open").click();
  await page.locator('[data-power="mend"]').click();
  assert.match(await page.locator("#placement-name").textContent(), /Mend/);
  await page.locator("#cancel-placement").click();
  await page.screenshot({
    path: "/tmp/destiny-v2-desktop.png",
    fullPage: true,
  });
  // A saved village must reload and run from its installed shell with no network.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const manifest = await page.evaluate(
    async () => await (await fetch("manifest.webmanifest")).json(),
  );
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.length, 3);
  await page.context().setOffline(true);
  await page.reload();
  await page.locator("#resume").click();
  assert.match(await page.locator("#objective").textContent(), /cottage/);
  await save(page);
  await page.context().setOffline(false);
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(base);
  await mobile.screenshot({
    path: "/tmp/onehub-v2-mobile.png",
    fullPage: true,
  });
  await mobile.locator(".art-link").click();
  await found(mobile, true);
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
    true,
  );
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const mb = await mobile.locator("#world").boundingBox();
  assert.ok(
    mb.height >= 698,
    "Compact phone HUD leaves at least 698px for the map",
  );
  const timeHud = await mobile.locator(".time-hud").boundingBox();
  assert.ok(timeHud.height <= 46, "Time controls use a single compact row");
  await mobile.locator("#goal-open").click();
  assert.equal(await mobile.locator("#village-sheet").isVisible(), true);
  assert.equal(
    await mobile.locator("#village-objective").textContent(),
    await mobile.locator("#objective").textContent(),
  );
  await mobile.locator("#village-sheet [data-close-sheet]").click();
  for (const selector of [
    "#pause",
    "#mobile-speed",
    "#center",
    "#build-open",
  ]) {
    const box = await mobile.locator(selector).boundingBox();
    assert.ok(
      box.width >= 44 && box.height >= 44,
      `${selector} remains easy to tap`,
    );
  }
  const client = await mobile.context().newCDPSession(mobile);
  const mx = mb.x + mb.width / 2,
    my = mb.y + mb.height / 2;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: mx - 25, y: my, id: 1 },
      { x: mx + 25, y: my, id: 2 },
    ],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: mx - 65, y: my, id: 1 },
      { x: mx + 65, y: my, id: 2 },
    ],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.ok(
    Number(await mobile.locator("#world").getAttribute("data-zoom")) > 1.6,
  );
  assert.equal((await save(mobile)).buildings.length, 1);
  await mobile.locator("#build-open").click();
  await mobile.screenshot({
    path: "/tmp/destiny-v2-build-mobile.png",
    fullPage: true,
  });
  await mobile.locator("#build-sheet [data-close-sheet]").click();
  await mobile.screenshot({
    path: "/tmp/destiny-v2-mobile.png",
    fullPage: true,
  });
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.screenshot({
    path: "/tmp/destiny-v2-landscape.png",
    fullPage: true,
  });
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
    true,
  );
  await mobile.locator("#harvest").click();
  await mobile.locator('[data-brush="5"]').click();
  assert.equal(await mobile.locator("#harvest-sheet").isVisible(), false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: library filters, preview/confirm, construction, priorities, save migration, invalid import, export, pause, powers, offline reload, pinch without placement, portrait/landscape, harvest brushes.",
  );
} finally {
  await browser.close();
}

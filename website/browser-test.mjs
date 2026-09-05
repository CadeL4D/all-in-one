import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL(".", import.meta.url)));
import { mkdirSync } from "node:fs";
mkdirSync("test-output", { recursive: true });
import { chromium } from "playwright";
import assert from "node:assert/strict";
import * as sim from "./destiny/world.js";
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
  await page.locator("#territory-detail .primary").click();
  assert.equal(await page.locator("#guide").evaluate(e => e.open), false);
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
  await page.screenshot({ path: "./test-output/onehub-v2-desktop.png", fullPage: true });
  await page.locator('[data-filter="tool"]').click();
  assert.equal(await page.locator(".game-card").isVisible(), false);
  await page.locator('[data-filter="all"]').click();
  await page.locator(".art-link").click();
  await page.locator(".territory").last().waitFor();
  await page.screenshot({ path: "./test-output/destiny-v2-title.png", fullPage: true });
  assert.equal(await page.locator("#atlas-canvas").count(), 1);
  assert.equal(await page.locator(".territory canvas").count(), 0, "Regions overlay one shared map");
  await page.locator("#difficulty").selectOption("settler");
  assert.match(await page.locator(".scout-threat").textContent(), /day 5/);
  await page.locator("#difficulty").selectOption("onslaught");
  assert.match(await page.locator(".scout-threat").textContent(), /day 2/);
  assert.match(await page.locator(".scout-stock").textContent(), /75 timber/);
  await page.locator("#difficulty").selectOption("peaceful");
  assert.match(await page.locator(".scout-threat").textContent(), /No monster raids/);
  await page.locator("#difficulty").selectOption("survival");
  await page.locator(".region-neighbors button").first().click();
  assert.equal(await page.locator("#territory-detail h3").textContent(), "Elderwood");
  await page.locator(".territory").first().click();
  const atlasWidth = await page.locator("#atlas-board").evaluate(el => el.clientWidth);
  const atlasHeight = await page.locator("#atlas-board").evaluate(el => el.clientHeight);
  assert.ok(Math.abs(await page.locator("#atlas-scroll").evaluate(el => el.clientHeight) - atlasHeight) <= 2, "Atlas viewer fits the landscape without a false ocean below it");
  const stableAtlas = async () => page.evaluate(async () => {
    const sizes = [];
    for (let i = 0; i < 30; i++) {
      await new Promise(requestAnimationFrame);
      const r = document.querySelector("#atlas-board").getBoundingClientRect();
      sizes.push(`${r.width},${r.height}`);
    }
    return new Set(sizes).size;
  });
  assert.equal(await stableAtlas(), 1, "Atlas dimensions stay fixed across frames");
  assert.equal(await page.locator("#atlas-scroll").evaluate(el => getComputedStyle(el).overflow), "hidden", "Whole-world view cannot trigger scrollbar resize loops");
  await page.locator("#atlas-in").click();
  assert.equal(await stableAtlas(), 1, "Zoomed atlas dimensions stay fixed across frames");
  assert.ok(await page.locator("#atlas-board").evaluate(el => el.clientWidth) > atlasWidth);
  await page.locator("#atlas-fit").click();
  await found(page);
  let village = await save(page);
  assert.equal(village.people.length, 6);
  assert.equal(village.difficulty, "survival");
  assert.equal(village.territory, 0);
  assert.equal(village.worldSeed, "HEARTH-742");
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
    path: "./test-output/destiny-v2-desktop.png",
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
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(base);
  await mobile.screenshot({
    path: "./test-output/onehub-v2-mobile.png",
    fullPage: true,
  });
  await mobile.locator(".art-link").click();
  await mobile.locator(".territory").last().waitFor();
  await mobile.screenshot({ path: "./test-output/destiny-atlas-mobile.png", fullPage: true });
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
  assert.equal(await mobile.locator("#world").evaluate(c => c.width), Math.round(mb.width * 3), "Map renders at native phone resolution");
  const timeHud = await mobile.locator(".time-hud").boundingBox();
  assert.ok(timeHud.height <= 46, "Time controls use a single compact row");
  await mobile.locator("#goal-open").click();
  assert.equal(await mobile.locator("#placement-name").textContent(), "Hearth cottage");
  assert.equal(await mobile.locator("#confirm-placement").isEnabled(), true, "Objective offers a legal building site immediately");
  assert.match(await mobile.locator("#placement-info").textContent(), /Four more beds/);
  await mobile.locator("#cancel-placement").click();
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
  await mobile.locator("#pause").click();
  await mobile.locator("#center").click();
  const harvestState = await save(mobile);
  const hearth = harvestState.buildings[0];
  const scale = Number(await mobile.locator("#world").getAttribute("data-zoom"));
  const deposit = harvestState.tiles.map((t, i) => ({t, x: i % 64, y: Math.floor(i / 64)})).find(p => {
    const x = mb.width / 2 + (p.x + .5 - hearth.x - 2) * 12 * scale;
    const y = mb.height / 2 + (p.y + .5 - hearth.y - 1) * 12 * scale;
    return [3, 4].includes(p.t) && x > 12 && x < mb.width - 12 && y > 80 && y < mb.height - 100;
  });
  assert.ok(deposit, "A harvest deposit is visible");
  await mobile.locator("#harvest").click();
  await mobile.touchscreen.tap(mb.x + mb.width / 2 + (deposit.x + .5 - hearth.x - 2) * 12 * scale, mb.y + mb.height / 2 + (deposit.y + .5 - hearth.y - 1) * 12 * scale);
  assert.equal(await mobile.locator("#confirm-placement").isVisible(), false);
  assert.ok((await save(mobile)).marks.length > 0, "One tap marks harvest resources");
  await mobile.locator("#undo-harvest").click();
  assert.equal((await save(mobile)).marks.length, 0);
  await mobile.locator("#cancel-placement").click();
  const client = await mobile.context().newCDPSession(mobile);
  // Paint a continuous touch stroke, commit on release, and undo it as one action.
  await mobile.locator("#harvest").click();
  const paintX = mb.x + mb.width / 2 + (deposit.x + .5 - hearth.x - 2) * 12 * scale;
  const paintY = mb.y + mb.height / 2 + (deposit.y + .5 - hearth.y - 1) * 12 * scale;
  await client.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x: paintX, y: paintY, id: 1}]});
  await client.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x: Math.min(mb.x + mb.width - 15, paintX + 65), y: paintY, id: 1}]});
  assert.equal((await read(mobile)).marks.length, 0, "Unfinished painting is not committed to the save");
  await client.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  const painted = await save(mobile);
  assert.ok(painted.marks.includes(deposit.y * 64 + deposit.x), "Stroke includes its starting deposit even after dragging away");
  await mobile.locator("#undo-harvest").click();
  assert.equal((await save(mobile)).marks.length, 0, "Undo removes the whole painted stroke");
  await mobile.locator("#cancel-placement").click();
  await mobile.locator("#goal-open").click();
  const buildingsBeforeDrag = (await read(mobile)).buildings.length;
  await client.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x: mb.x + mb.width / 2, y: mb.y + mb.height / 2, id: 1}]});
  await client.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x: mb.x + mb.width / 2 + 45, y: mb.y + mb.height / 2 + 25, id: 1}]});
  await client.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  assert.equal(await mobile.locator("#placement").isVisible(), true);
  assert.equal((await save(mobile)).buildings.length, buildingsBeforeDrag, "Dragging a building only previews it until Build is pressed");
  await mobile.locator("#cancel-placement").click();
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
    path: "./test-output/destiny-v2-build-mobile.png",
    fullPage: true,
  });
  await mobile.locator("#build-sheet [data-close-sheet]").click();
  await mobile.screenshot({
    path: "./test-output/destiny-v2-mobile.png",
    fullPage: true,
  });
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.screenshot({
    path: "./test-output/destiny-v2-landscape.png",
    fullPage: true,
  });
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
    true,
  );
  await mobile.locator("#harvest").click();
  await mobile.locator("#brush-cycle").click();
  assert.equal(await mobile.locator("#brush-cycle").textContent(), "5 \u00d7 5");
  assert.equal(await mobile.locator("#harvest-sheet").isVisible(), false);
  // Each atlas territory keeps a separate village, including after reload.
  await mobile.locator("#cancel-placement").click();
  await menu(mobile);
  await mobile.locator("#atlas").click();
  assert.equal(await mobile.locator(".territory").count(), 24);
  await mobile.locator(".territory").nth(1).click();
  await mobile.locator("#territory-detail .primary").click();
  await mobile.locator("#confirm-placement").click();
  await menu(mobile);
  assert.equal(await mobile.locator("#saved-villages button").count(), 2);
  await mobile.locator("#saved-villages button").first().click();
  const original = await save(mobile);
  assert.equal(original.region, 0);
  await mobile.reload();
  await menu(mobile);
  assert.equal(await mobile.locator("#saved-villages button").count(), 2);
  await closeMenu(mobile);
  await mobile.locator("#difficulty").selectOption("onslaught");
  await mobile.locator(".territory").first().click();
  assert.match(await mobile.locator("#territory-detail .primary").textContent(), /Settle/);
  await mobile.locator("#territory-detail .primary").click();
  await mobile.locator("#confirm-placement").click();
  const hard = await save(mobile);
  assert.equal(hard.difficulty, "onslaught");
  assert.equal(hard.stock.wood, 75);
  await menu(mobile);
  assert.equal(await mobile.locator("#saved-villages button").count(), 3, "Modes keep independent progress in the same region");
  await closeMenu(mobile);
  await mobile.locator("#village-open").click();
  assert.match(await mobile.locator("#survival-status").textContent(), /Day 2 dusk/);
  await mobile.locator("#village-sheet [data-close-sheet]").click();
  const fixture = sim.createWorld("progress-preview", 0, true);
  fixture.tiles.fill(0); sim.place(fixture, "hearth", 30, 22);
  for (let i = 0; i < 120; i++) sim.tick(fixture, .1);
  fixture.stock = {wood: 150, stone: 150, food: 80, water: 80};
  sim.place(fixture, "farm", 25, 28);
  for (let i = 0; i < 250; i++) sim.tick(fixture, .1);
  const progressPage = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 3, isMobile: true, hasTouch: true});
  progressPage.on("pageerror", e => errors.push(e.message));
  await progressPage.addInitScript(value => localStorage.setItem("destiny-to-yours-v1", value), sim.serialize(fixture));
  await progressPage.goto(base + "/destiny/");
  await progressPage.locator("#resume").click();
  await progressPage.locator("#pause").click();
  await progressPage.locator("#village-open").click();
  assert.equal(await progressPage.locator("#campaign-roadmap details").count(), 6);
  assert.match(await progressPage.locator("#season-status").textContent(), /Spring/);
  await progressPage.locator("#campaign-roadmap details").nth(2).locator("summary").click();
  await progressPage.waitForTimeout(600);
  assert.equal(await progressPage.locator("#campaign-roadmap details").nth(2).getAttribute("open"), "");
  await progressPage.screenshot({path: "./test-output/destiny-chapters-mobile.png", fullPage: true});
  await progressPage.locator("#village-sheet [data-close-sheet]").click();
  await progressPage.locator("#center").click();
  const pb = await progressPage.locator("#world").boundingBox();
  const pz = Number(await progressPage.locator("#world").getAttribute("data-zoom"));
  await progressPage.touchscreen.tap(pb.x + pb.width / 2 + (26 - 32) * 12 * pz, pb.y + pb.height / 2 + (29 - 23) * 12 * pz);
  assert.equal(await progressPage.locator("#upgrade-building").isVisible(), true);
  await progressPage.locator("#upgrade-building").click();
  assert.equal(await progressPage.locator("#upgrade-building").isDisabled(), true);
  const queued = await save(progressPage);
  assert.equal(queued.buildings.find(b => b.type === "farm").project.kind, "upgrade");
  await progressPage.screenshot({path: "./test-output/destiny-upgrade-mobile.png", fullPage: true});
  await progressPage.locator("#inspect-sheet [data-close-sheet]").click();
  await progressPage.locator("#build-open").click();
  const rail = progressPage.locator("#buildings");
  const railBox = await rail.boundingBox();
  const touchClient = await progressPage.context().newCDPSession(progressPage);
  await touchClient.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x: railBox.x + railBox.width - 20, y: railBox.y + 35, id: 1}]});
  for (let i = 1; i <= 8; i++) await touchClient.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x: railBox.x + railBox.width - 20 - i * 25, y: railBox.y + 35, id: 1}]});
  await touchClient.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  await progressPage.waitForTimeout(250);
  assert.ok(await rail.evaluate(el => el.scrollLeft) > 50, "Building cards swipe horizontally without selecting a building");
  assert.equal(await progressPage.locator("#build-sheet").isVisible(), true);
  await progressPage.locator('[data-build="path"]').click();
  const start = {x: pb.x + pb.width / 2 - 5 * 12 * pz, y: pb.y + pb.height / 2 - 5 * 12 * pz};
  await touchClient.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{...start, id: 1}]});
  await touchClient.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x: start.x + 3 * 12 * pz, y: start.y, id: 1}]});
  await touchClient.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  assert.match(await progressPage.locator("#placement-info").textContent(), /4 tiles/);
  assert.equal((await save(progressPage)).roads.length, 0, "Dragging only previews the line");
  await progressPage.locator("#confirm-placement").click();
  assert.equal((await save(progressPage)).roads.length, 4, "One confirmation lays the whole trail");
  await progressPage.locator("#cancel-placement").click();
  await progressPage.locator("#build-open").click();
  const mouseRail = await rail.boundingBox();
  const oldScroll = await rail.evaluate(el => el.scrollLeft);
  await progressPage.mouse.move(mouseRail.x + 35, mouseRail.y + 35);
  await progressPage.mouse.down();
  await progressPage.mouse.move(mouseRail.x + 230, mouseRail.y + 35, {steps: 8});
  await progressPage.mouse.up();
  assert.ok(await rail.evaluate(el => el.scrollLeft) < oldScroll, "Mouse drag scrolls the building rail");
  assert.equal(await progressPage.locator("#build-sheet").isVisible(), true, "Dragging cards does not pick one");
  await progressPage.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: library filters, preview/confirm, construction, priorities, save migration, invalid import, export, pause, powers, offline reload, pinch without placement, portrait/landscape, direct harvest and undo, native-resolution art, connected atlas, difficulty previews, independent region and difficulty saves.",
  );
} finally {
  await browser.close();
}

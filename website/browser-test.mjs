import { chromium } from "playwright";
import assert from "node:assert/strict";
// Run a static server first: python3 -m http.server 4173 --directory website
const base = process.env.TEST_URL || "http://localhost:4173";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator(".game-card").click();
  assert.match(page.url(), /destiny/);
  await page.locator(".region-card").first().click();
  await page.locator("#start-guide").click();
  const box = await page.locator("#world").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator('[data-speed="4"]').click();
  await page.waitForFunction(() =>
    document.querySelector("#objective").textContent.includes("cottage"),
  );
  assert.match(await page.locator("#population").textContent(), /6 villagers/);
  await page.locator("#save").click();
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("destiny-to-yours-v1")),
  );
  assert.equal(save.buildings[0].type, "hearth");
  assert.equal(save.people.length, 6);
  await page.reload();
  await page.locator("#resume").click();
  assert.match(await page.locator("#population").textContent(), /6 villagers/);
  await page.locator("#pause").click();
  const dayBefore = await page.locator("#day-progress").getAttribute("style");
  await page.waitForTimeout(350);
  assert.equal(
    await page.locator("#day-progress").getAttribute("style"),
    dayBefore,
  );
  await page.locator("#world").focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "/tmp/destiny-play-tested.png",
    fullPage: true,
  });
  await page.goto(base + "/tasks.html");
  assert.ok(await page.locator("body").innerText());
  assert.deepEqual(errors, []);
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(base);
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await mobile.screenshot({ path: "/tmp/onehub-mobile.png", fullPage: true });
  await mobile.locator(".game-card").click();
  await mobile.screenshot({
    path: "/tmp/destiny-island-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await mobile.locator(".region-card").nth(1).click();
  await mobile.locator("#start-guide").click();
  const mb = await mobile.locator("#world").boundingBox();
  await mobile.touchscreen.tap(mb.x + mb.width / 2, mb.y + mb.height / 2);
  assert.match(await mobile.locator("#resources").innerText(), /TIMBER/);
  await mobile.locator("#save").click();
  assert.equal(
    await mobile.evaluate(
      () =>
        JSON.parse(localStorage.getItem("destiny-to-yours-v1")).people.length,
    ),
    6,
  );
  await mobile.screenshot({ path: "/tmp/destiny-mobile.png", fullPage: true });
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: hub navigation, founding, construction, save/reload, pause, keyboard, tasks, and mobile touch/overflow.",
  );
} finally {
  await browser.close();
}

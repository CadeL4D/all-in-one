// Build the Pocket Ruins app icons: a little settler's hut and sapling.
// Run from website/: node ruins/generate-icons.mjs
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const dir = new URL("./icons/", import.meta.url).pathname;
  await mkdir(dir, { recursive: true });
  for (const [name, size] of [
    ["icon-192", 192],
    ["icon-512", 512],
    ["maskable-512", 512],
    ["apple-touch-icon", 180],
  ]) {
    const png = await page.evaluate(
      ({ size }) => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const g = c.getContext("2d");
        g.imageSmoothingEnabled = false;
        g.scale(size / 64, size / 64);
        const r = (color, x, y, w, h) => {
          g.fillStyle = color;
          g.fillRect(x, y, w, h);
        };
        r("#1c2a20", 0, 0, 64, 64); // forest floor backdrop
        // ground
        r("#2c4230", 0, 46, 64, 18);
        r("#38523a", 0, 46, 64, 2);
        // hut
        r("#8a5a34", 20, 30, 24, 16); // walls
        r("#a4713f", 20, 30, 24, 3);
        r("#b5563e", 14, 20, 36, 10); // roof
        r("#c96a4f", 14, 20, 36, 3);
        r("#5f4025", 28, 36, 8, 10); // door
        r("#ffd97a", 38, 36, 4, 4); // window
        // sapling
        r("#7a5230", 48, 38, 2, 6);
        r("#4f9450", 44, 32, 10, 6);
        r("#5fae5e", 46, 30, 6, 3);
        // campfire
        r("#7c8288", 10, 46, 6, 2);
        r("#ffb454", 12, 42, 2, 4);
        r("#ff8b3d", 13, 40, 1, 2);
        // stars
        r("#e8e3cf", 10, 10, 2, 2);
        r("#e8e3cf", 50, 8, 2, 2);
        r("#e8e3cf", 30, 6, 2, 2);
        return c.toDataURL("image/png").split(",")[1];
      },
      { size },
    );
    await writeFile(dir + name + ".png", Buffer.from(png, "base64"));
  }
  console.log("Generated ruins icons.");
} finally {
  await browser.close();
}

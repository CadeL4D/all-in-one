// Build our own pixel-art app icons. Run from website/: node generate-icons.mjs.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const app of ["hub"]) {
    const dir = "icons";
    await mkdir(dir, { recursive: true });
    for (const [name, size] of [
      ["icon-192", 192],
      ["icon-512", 512],
      ["maskable-512", 512],
      ["apple-touch-icon", 180],
    ]) {
      const png = await page.evaluate(
        ({ app, size }) => {
          const c = document.createElement("canvas");
          c.width = c.height = size;
          const g = c.getContext("2d");
          g.imageSmoothingEnabled = false;
          g.scale(size / 64, size / 64);
          const r = (color, x, y, w, h) => {
            g.fillStyle = color;
            g.fillRect(x, y, w, h);
          };
          r("#161b28", 0, 0, 64, 64);
          {
            for (const [x, y, color] of [
              [17, 17, "#c4d595"],
              [34, 17, "#e2bd79"],
              [17, 34, "#899ec2"],
              [34, 34, "#c4d595"],
            ]) {
              r("#080e18", x + 2, y + 3, 13, 13);
              r(color, x, y, 13, 13);
              r("#ffffff44", x, y, 13, 2);
            }
          }
          return c.toDataURL("image/png").split(",")[1];
        },
        { app, size },
      );
      await writeFile(dir + "/" + name + ".png", Buffer.from(png, "base64"));
    }
  }
} finally {
  await browser.close();
}

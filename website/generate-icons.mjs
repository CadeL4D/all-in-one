// Build our own pixel-art app icons. Run from website/: node generate-icons.mjs.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const app of ["destiny", "hub"]) {
    const dir = app === "destiny" ? "destiny/icons" : "icons";
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
          r(app === "destiny" ? "#15282c" : "#161b28", 0, 0, 64, 64);
          if (app === "destiny") {
            r("#344d3f", 10, 43, 44, 7);
            r("#60784c", 14, 40, 36, 6);
            r("#c7b081", 21, 29, 24, 17);
            r("#a17e51", 40, 30, 5, 16);
            r("#5c4031", 16, 26, 34, 7);
            r("#b26c48", 19, 23, 28, 7);
            r("#dfa665", 23, 19, 20, 5);
            r("#f2d295", 27, 16, 12, 4);
            r("#665039", 29, 35, 7, 11);
            r("#efd397", 23, 34, 4, 5);
            r("#9b987b", 39, 17, 4, 9);
            r("#77975c", 12, 30, 6, 11);
            r("#abc780", 13, 27, 4, 6);
            r("#d8c789", 47, 15, 2, 13);
            r("#edc975", 49, 15, 7, 5);
            r("#e5ca80", 30, 8, 2, 4);
            r("#e5ca80", 29, 9, 4, 2);
          } else {
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

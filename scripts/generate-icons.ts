import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const publicDir = join(process.cwd(), "public");
const appDir = join(process.cwd(), "app");
const sourceLogo = join(publicDir, "branding", "NostrMashLogoTransparentDarkMode.png");

const ICON_BG = { r: 0, g: 0, b: 0, alpha: 1 };

interface IconSpec {
  name: string;
  size: number;
  dir: string;
}

const icons: IconSpec[] = [
  { name: "favicon.ico", size: 48, dir: appDir },
  { name: "apple-touch-icon.png", size: 180, dir: publicDir },
  { name: "icon-192.png", size: 192, dir: publicDir },
  { name: "icon-512.png", size: 512, dir: publicDir },
];

async function generateIcons() {
  try {
    const sourceBuffer = readFileSync(sourceLogo);

    for (const icon of icons) {
      const buffer = await sharp(sourceBuffer)
        .resize(icon.size, icon.size, {
          fit: "contain",
          background: ICON_BG,
        })
        .png()
        .toBuffer();

      writeFileSync(join(icon.dir, icon.name), buffer);
      console.log(`  Generated ${icon.name} (${icon.size}x${icon.size})`);
    }

    console.log("\nAll icons generated successfully.");
  } catch (error) {
    console.error("Error generating icons:", error);
    process.exit(1);
  }
}

void generateIcons();

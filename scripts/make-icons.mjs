// Renders the PWA icons from one SVG. Run: npm run icons
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BLUE = "#1d4ed8";
const lorry = `
  <g fill="#fff">
    <rect x="72" y="156" width="236" height="164" rx="14"/>
    <path d="M322 196h72l50 58v66H322z"/>
    <rect x="72" y="320" width="372" height="22" rx="6"/>
  </g>
  <path d="M342 214h44l34 40h-78z" fill="${BLUE}"/>
  <g fill="#fff" stroke="${BLUE}" stroke-width="14">
    <circle cx="150" cy="350" r="40"/><circle cx="370" cy="350" r="40"/>
  </g>
  <g fill="${BLUE}"><circle cx="150" cy="350" r="13"/><circle cx="370" cy="350" r="13"/></g>`;

// "any": rounded tile. "maskable": full bleed, lorry shrunk into the 80% safe zone.
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${BLUE}"/>${lorry}</svg>`;
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${BLUE}"/><g transform="translate(64 64) scale(0.75)">${lorry}</g></svg>`;

await mkdir("public/icons", { recursive: true });
const render = (svg, size, out) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
await render(anySvg, 192, "public/icons/icon-192.png");
await render(anySvg, 512, "public/icons/icon-512.png");
await render(maskableSvg, 512, "public/icons/icon-maskable-512.png");
await render(maskableSvg, 180, "src/app/apple-icon.png");
await writeFile("src/app/icon.svg", anySvg);
console.log("icons written");

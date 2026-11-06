import { readFileSync, writeFileSync, existsSync } from "node:fs";
const [src, out, icons] = process.argv.slice(2);
let html = readFileSync(src, "utf8");
html = html.replace(/\{\{icon:([a-z0-9-]+)\}\}/g, (_, n) => {
  const f = `${icons}/${n}.svg`;
  if (!existsSync(f)) { console.log("missing icon", n); return ""; }
  return readFileSync(f, "utf8").replace(/<!--.*?-->/s, "").replace(/width="24"/, 'width="100%"').replace(/height="24"/, 'height="100%"');
});
writeFileSync(out, html);

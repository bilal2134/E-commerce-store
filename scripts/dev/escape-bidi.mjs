// Dev helper: replace invisible bidi isolate characters in a source file with
// visible \u2066 / \u2069 escapes.   node scripts/dev/escape-bidi.mjs <file>
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
const src = readFileSync(file, "utf8");
const out = src.replaceAll("\u2066", "\\u2066").replaceAll("\u2069", "\\u2069");
writeFileSync(file, out);
console.log(src === out ? "no changes" : "escaped");

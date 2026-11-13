const fs = require("fs");
const p = "scripts/prepare-v19.js";
if (!fs.existsSync(p)) throw new Error("scripts/prepare-v19.js is missing");
let s = fs.readFileSync(p, "utf8");
// The uploaded V19 script accidentally double-escaped regex tokens.
// Convert the literal two-backslash forms to normal regex escapes.
s = s.split("\\\\d").join("\\d");
s = s.split("\\\\s").join("\\s");
fs.writeFileSync(p, s);
console.log("V19.1 hotfix: corrected regex escapes for cache name, app title and Android version.");

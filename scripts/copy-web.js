const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "www");
const destination = path.join(__dirname, "..", "dist");

if (!fs.existsSync(source)) {
  throw new Error("The www folder was not found.");
}

fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });

console.log("TravelMate web files copied successfully.");

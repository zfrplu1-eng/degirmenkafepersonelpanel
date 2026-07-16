const fs = require('fs');

const js = fs.readFileSync('scratch/bundle.js', 'utf8');

// Look for id:`sicak` or label:`SICAK KAHVELER` or similar
let pos = js.indexOf("label:`SICAK KAHVELER`");
if (pos === -1) pos = js.indexOf("id:`sicak`");
if (pos === -1) pos = js.indexOf("id:`soguk`");
if (pos === -1) pos = js.indexOf("id:`ice`");

if (pos !== -1) {
    console.log("Found at position:", pos);
    console.log("Context around:");
    console.log(js.substring(Math.max(0, pos - 100), Math.min(js.length, pos + 2500)));
} else {
    console.log("No category declarations found in JS bundle.");
}

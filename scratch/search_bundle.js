const fs = require('fs');
const https = require('https');

const url = 'https://degirmen-kafe-sistem.vercel.app/assets/index-kZ3A0MFW.js';
const dest = 'scratch/bundle.js';

if (!fs.existsSync('scratch')) {
    fs.mkdirSync('scratch');
}

console.log("Downloading Vite JS bundle...");
const file = fs.createWriteStream(dest);
https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
        file.close(() => {
            console.log("Download complete. Analyzing bundle...");
            const content = fs.readFileSync(dest, 'utf8');
            console.log("File length:", content.length);
            
            // Search for some recipe keywords
            const keywords = ['Americano', 'Latte', 'Espresso', 'Flat White', 'White Chocolate Mocha', 'Cool Lime', 'Frappe', 'Frozen'];
            keywords.forEach(kw => {
                const index = content.indexOf(kw);
                if (index !== -1) {
                    console.log(`Found keyword "${kw}" at index ${index}. Context:`);
                    console.log(content.substring(Math.max(0, index - 300), Math.min(content.length, index + 300)));
                    console.log("-----------------------------------------");
                } else {
                    console.log(`Keyword "${kw}" not found.`);
                }
            });
        });
    });
}).on('error', function(err) {
    fs.unlink(dest, () => {});
    console.error("Error downloading bundle:", err);
});

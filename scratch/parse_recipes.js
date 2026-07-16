const fs = require('fs');

const js = fs.readFileSync('scratch/bundle.js', 'utf8');

// Find the declaration of Ti
const startMarker = 'var Ti=[';
const startIndex = js.indexOf(startMarker);

if (startIndex === -1) {
    console.error("Could not find start marker 'var Ti=['");
    process.exit(1);
}

const arrayStartIndex = startIndex + startMarker.length - 1; // index of the opening '['
let openBrackets = 1;
let index = arrayStartIndex + 1;

while (openBrackets > 0 && index < js.length) {
    const char = js[index];
    if (char === '[') {
        openBrackets++;
    } else if (char === ']') {
        openBrackets--;
    }
    index++;
}

const arrayString = js.substring(arrayStartIndex, index);

console.log("Extracted string length:", arrayString.length);

// Now, the string contains JS syntax, e.g. backticks for strings. We can evaluate it inside a VM or simple eval to convert it to a real JS object, then serialize to JSON.
// WARNING: Only evaluate known safe local files. Here, bundle.js is downloaded from the user's Vercel deployment which they supplied in the prompt.
try {
    const categories = eval(arrayString);
    console.log("Successfully parsed array. Categories count:", categories.length);
    
    // Normalize IDs to match catalog.js expectations (sicak, ice, frappe, frozen, fresh)
    const normalizedCategories = categories.map(cat => {
        let newId = cat.id;
        if (cat.id === 'hot_coffee') newId = 'sicak';
        else if (cat.id === 'ice_coffee') newId = 'ice';
        else if (cat.id === 'frappe') newId = 'frappe';
        else if (cat.id === 'frozen') newId = 'frozen';
        else if (cat.id === 'fresh') newId = 'fresh';
        
        return {
            id: newId,
            label: cat.label,
            items: cat.items.map(item => ({
                name: item.name,
                ingredients: item.ingredients || [],
                instructions: item.instructions || 'Tarif adımları girilmemiş.',
                gramaj: item.gramaj || 'Standart'
            }))
        };
    });

    fs.writeFileSync('menu_recipes.json', JSON.stringify(normalizedCategories, null, 4), 'utf8');
    console.log("Written categories to menu_recipes.json successfully!");
} catch (e) {
    console.error("Error parsing or writing:", e);
}

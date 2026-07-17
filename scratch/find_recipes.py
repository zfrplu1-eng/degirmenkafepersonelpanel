import re
import json

with open("scratch/bundle.js", "r", encoding="utf-8") as f:
    js = f.read()

# Let's search for patterns like: id:`sicak`, label:`...` or id:'sicak', label:'...' or id:"sicak", label:"..."
# Vite build bundles use backticks, single quotes, or double quotes.
# In the search output we saw: id:`frozen`,label:`FROZEN ÇEŞİTLERİ`,items:
# Let's locate the start of the categories array.
# Let's search for "sicak" or "soguk" in the bundle.
# In the search output we saw:
# id:`frozen`,label:`FROZEN ÇEŞİTLERİ`,items:[{name:`Orman Meyveli Frozen`...

# Let's write a python regex or search code to extract the array of categories
# It seems there is an array: [ {id:`...`, label:`...`, items:[...]}, ... ]
# Let's find where the array starts. It likely starts with `id:` and has categories like `sicak`, `soguk` or `ice`, `frappe`, `frozen`, `fresh` etc.

# Let's search for the position of the keyword "sicak" in the bundle and print context around it to understand the exact structure
pos = 0
while True:
    pos = js.find("id:`sicak`", pos)
    if pos == -1:
        pos = js.find("id:'sicak'", pos)
    if pos == -1:
        pos = js.find('id:"sicak"', pos)
    if pos == -1:
        # try search for label:`SICAK KAHVELER` or similar
        pos = js.find("label:`SICAK KAHVELER`", pos)
    if pos == -1:
        break
    print(f"Found at {pos}")
    print(js[max(0, pos-200):min(len(js), pos+1500)])
    print("="*60)
    pos += 10

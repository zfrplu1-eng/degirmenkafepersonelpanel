const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

const baseDir = process.cwd();
const UPLOADS_DIR = path.resolve(baseDir, 'uploads');
const RECIPES_IMAGES_DIR = path.join(UPLOADS_DIR, 'recipes');

// Gerekli klasörleri oluştur (Sadece yerelde veya yazılabilir ortamlarda çalışır)
if (!process.env.VERCEL) {
    try {
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        if (!fs.existsSync(RECIPES_IMAGES_DIR)) {
            fs.mkdirSync(RECIPES_IMAGES_DIR, { recursive: true });
        }
    } catch (e) {
        console.warn("Dosya sistemi salt okunur, klasör oluşturma atlandı.");
    }
}

// JSON veritabanlarını statik require ile yükle (Vercel Lambda paketine otomatik dahil olur)
let usersData = require('./users.json');
let recipesData = require('./recipes.json');
let menuRecipesData = require('./menu_recipes.json');
let slidesData = require('./slides.json');
let inventoryLogsData = require('./inventory_logs.json');
let rawMaterialsData = require('./raw_materials.json');
let settingsData = require('./settings.json');
let stkConfirmedData = require('./stk_confirmed.json');
let ordersData = require('./orders.json');

// Dosya yolları (Yazma işlemleri için)
const DB_PATH = path.resolve(__dirname, 'users.json');
const RECIPES_PATH = path.resolve(__dirname, 'recipes.json');
const MENU_RECIPES_PATH = path.resolve(__dirname, 'menu_recipes.json');
const SLIDES_PATH = path.resolve(__dirname, 'slides.json');
const INVENTORY_LOGS_PATH = path.resolve(__dirname, 'inventory_logs.json');
const RAW_MATERIALS_PATH = path.resolve(__dirname, 'raw_materials.json');
const ORDERS_PATH = path.resolve(__dirname, 'orders.json');
const SETTINGS_FILE = path.resolve(__dirname, 'settings.json');
const STK_CONFIRMED_FILE = path.resolve(__dirname, 'stk_confirmed.json');

function readRawMaterials() {
    return rawMaterialsData;
}
function writeRawMaterials(materials) {
    rawMaterialsData = materials;
    try { fs.writeFileSync(RAW_MATERIALS_PATH, JSON.stringify(materials, null, 4), 'utf8'); } catch (err) {}
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (req.path === '/api/upload-recipe-image' || req.path === '/api/upload-overview') {
            cb(null, RECIPES_IMAGES_DIR);
        } else {
            cb(null, UPLOADS_DIR);
        }
    },
    filename: (req, file, cb) => {
        if (req.path === '/api/upload-overview') {
            cb(null, 'overview.png');
        } else {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    }
});
const upload = multer({ storage: storage });

function readUsers() { return usersData; }
function writeUsers(users) {
    usersData = users;
    try { fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf8'); } catch (err) {}
}

function readRecipes() { return recipesData; }
function writeRecipes(recipes) {
    recipesData = recipes;
    try { fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 4), 'utf8'); } catch (err) {}
}

function readMenuRecipes() { return menuRecipesData; }
function writeMenuRecipes(recipes) {
    menuRecipesData = recipes;
    try { fs.writeFileSync(MENU_RECIPES_PATH, JSON.stringify(recipes, null, 4), 'utf8'); } catch (err) {}
}

function readInventoryLogs() { return inventoryLogsData; }
function writeInventoryLogs(logs) {
    inventoryLogsData = logs;
    try { fs.writeFileSync(INVENTORY_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8'); } catch (err) {}
}

function readSlides() { return slidesData; }
function writeSlides(slides) {
    slidesData = slides;
    try { fs.writeFileSync(SLIDES_PATH, JSON.stringify(slides, null, 4), 'utf8'); } catch (err) {}
}

function readOrders() { return ordersData; }
function writeOrders(orders) {
    ordersData = orders;
    try { fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 4), 'utf8'); } catch (err) {}
}

function readSettings() { return settingsData; }
function writeSettings(s) {
    settingsData = s;
    try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 4), 'utf8'); } catch (err) {}
}

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Giriş API'si
app.post('/api/login', (req, res) => {
    const { role, username, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.role === role);
    if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı!' });
    }
    res.json({
        success: true,
        user: { 
            username: user.username, 
            role: user.role,
            region: user.region || 'Hepsi',
            menus: user.menus || ["Sipariş Arayüzü", "Reçeteler Kataloğu", "Sistem Ayarları", "Envanter Takip"]
        }
    });
});

app.post('/api/signup', (req, res) => {
    const { role, username, password } = req.body;
    const users = readUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten alınmış!' });
    }
    users.push({ username, password, role });
    writeUsers(users);
    res.json({ success: true });
});

app.get('/api/users', (req, res) => { res.json(readUsers()); });
app.put('/api/users/:username', (req, res) => {
    const { username } = req.params;
    const { password, role, region, menus } = req.body;
    let users = readUsers();
    const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (idx !== -1) {
        if (password) users[idx].password = password;
        if (role) users[idx].role = role;
        if (region !== undefined) users[idx].region = region;
        if (menus) users[idx].menus = menus;
        writeUsers(users);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});
app.delete('/api/users/:username', (req, res) => {
    const { username } = req.params;
    let users = readUsers();
    users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    writeUsers(users);
    res.json({ success: true });
});

app.get('/api/raw-materials', (req, res) => { res.json(readRawMaterials()); });
app.post('/api/raw-materials', (req, res) => {
    const { id, label, items } = req.body;
    let materials = readRawMaterials();
    const idx = materials.findIndex(c => c.id === id);
    if (idx !== -1) { materials[idx].items = items; } else { materials.push({ id, label, items }); }
    writeRawMaterials(materials);
    res.json({ success: true });
});

app.get('/api/recipes', (req, res) => { res.json(readRecipes()); });
app.post('/api/recipes', (req, res) => {
    writeRecipes(req.body.recipes);
    res.json({ success: true });
});

app.get('/api/menu-recipes', (req, res) => { res.json(readMenuRecipes()); });
app.post('/api/menu-recipes', (req, res) => {
    writeMenuRecipes(req.body);
    res.json({ success: true });
});

app.get('/api/slides', (req, res) => { res.json(readSlides()); });
app.post('/api/slides', (req, res) => {
    writeSlides(req.body.slides);
    res.json({ success: true });
});

app.get('/api/inventory-logs', (req, res) => { res.json(readInventoryLogs()); });
app.post('/api/inventory-logs', (req, res) => {
    const logs = readInventoryLogs();
    const newLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('tr-TR'),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        ...req.body
    };
    logs.push(newLog);
    writeInventoryLogs(logs);
    res.json({ success: true, log: newLog });
});

app.get('/api/stk/confirmed', (req, res) => { res.json(stkConfirmedData); });
app.get('/api/settings', (req, res) => { res.json(readSettings()); });
app.post('/api/settings', (req, res) => {
    const current = readSettings();
    const updated = { ...current, ...req.body };
    writeSettings(updated);
    res.json({ success: true, settings: updated });
});
app.get('/api/settings/music', (req, res) => {
    res.json({ youtubePlaylist: readSettings().youtubePlaylist || "" });
});

const NOTES_FILE = path.resolve(__dirname, 'notes.json');
let notesData = require('./notes.json');
function readNotes() { return notesData; }
function writeNotes(n) {
    notesData = n;
    try { fs.writeFileSync(NOTES_FILE, JSON.stringify(n, null, 4), 'utf8'); } catch (err) {}
}

app.get('/api/notes', (req, res) => { res.json(readNotes()); });
app.post('/api/notes', (req, res) => {
    const notes = readNotes();
    const newNote = {
        id: Date.now().toString(),
        likes: 0, pinned: false, replies: [],
        date: new Date().toLocaleDateString('tr-TR'),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        ...req.body
    };
    notes.push(newNote);
    writeNotes(notes);
    res.status(201).json({ success: true, note: newNote });
});

app.get('/api/orders', (req, res) => { res.json(readOrders()); });
app.post('/api/orders', (req, res) => {
    const orders = readOrders();
    orders.push(req.body);
    writeOrders(orders);
    res.json({ success: true });
});

module.exports = app;

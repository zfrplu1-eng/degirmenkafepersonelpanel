const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// Vercel Lambda veya Yerel ortam için ana dizini çöz
const baseDir = process.cwd();

// Kesin dosya yolları (Ana dizindeki tekil dosyalara işaret eder)
const DB_PATH = path.resolve(baseDir, 'users.json');
const RECIPES_PATH = path.resolve(baseDir, 'recipes.json');
const MENU_RECIPES_PATH = path.resolve(baseDir, 'menu_recipes.json');
const SLIDES_PATH = path.resolve(baseDir, 'slides.json');
const INVENTORY_LOGS_PATH = path.resolve(baseDir, 'inventory_logs.json');
const RAW_MATERIALS_PATH = path.resolve(baseDir, 'raw_materials.json');
const ORDERS_PATH = path.resolve(baseDir, 'orders.json');
const SETTINGS_FILE = path.resolve(baseDir, 'settings.json');
const STK_CONFIRMED_FILE = path.resolve(baseDir, 'stk_confirmed.json');
const NOTES_FILE = path.resolve(baseDir, 'notes.json');

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

// Dosya okuma yardımcı fonksiyonları (Hata fırlatmaz, çökme korumalı)
function safeReadJSON(filePath, defaultVal = []) {
    try {
        if (!fs.existsSync(filePath)) return defaultVal;
        const data = fs.readFileSync(filePath, 'utf8').trim();
        return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
        console.error("Dosya okuma hatası:", filePath, e);
        return defaultVal;
    }
}

function safeWriteJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        return true;
    } catch (e) {
        console.error("Dosya yazma hatası:", filePath, e);
        return false;
    }
}

function readUsers() { return safeReadJSON(DB_PATH, []); }
function writeUsers(users) { safeWriteJSON(DB_PATH, users); }

function readRecipes() { return safeReadJSON(RECIPES_PATH, []); }
function writeRecipes(recipes) { safeWriteJSON(RECIPES_PATH, recipes); }

function readMenuRecipes() { return safeReadJSON(MENU_RECIPES_PATH, []); }
function writeMenuRecipes(recipes) { safeWriteJSON(MENU_RECIPES_PATH, recipes); }

function readInventoryLogs() { return safeReadJSON(INVENTORY_LOGS_PATH, []); }
function writeInventoryLogs(logs) { safeWriteJSON(INVENTORY_LOGS_PATH, logs); }

function readSlides() { return safeReadJSON(SLIDES_PATH, []); }
function writeSlides(slides) { safeWriteJSON(SLIDES_PATH, slides); }

function readRawMaterials() { return safeReadJSON(RAW_MATERIALS_PATH, []); }
function writeRawMaterials(materials) { safeWriteJSON(RAW_MATERIALS_PATH, materials); }

function readOrders() { return safeReadJSON(ORDERS_PATH, []); }
function writeOrders(orders) { safeWriteJSON(ORDERS_PATH, orders); }

function readSettings() { return safeReadJSON(SETTINGS_FILE, {}); }
function writeSettings(s) { safeWriteJSON(SETTINGS_FILE, s); }

function readNotes() { return safeReadJSON(NOTES_FILE, []); }
function writeNotes(n) { safeWriteJSON(NOTES_FILE, n); }

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

app.get('/api/stk/confirmed', (req, res) => { res.json(safeReadJSON(STK_CONFIRMED_FILE, {})); });
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

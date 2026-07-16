const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// Vercel üzerinde dosyalar process.cwd() kök dizininde yer alır
const baseDir = process.cwd();

const DB_PATH = path.resolve(baseDir, 'users.json');
const RECIPES_PATH = path.resolve(baseDir, 'recipes.json');
const MENU_RECIPES_PATH = path.resolve(baseDir, 'menu_recipes.json');
const SLIDES_PATH = path.resolve(baseDir, 'slides.json');
const INVENTORY_LOGS_PATH = path.resolve(baseDir, 'inventory_logs.json');
const RAW_MATERIALS_PATH = path.resolve(baseDir, 'raw_materials.json');
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

function readRawMaterials() {
    try {
        if (!fs.existsSync(RAW_MATERIALS_PATH)) {
            fs.writeFileSync(RAW_MATERIALS_PATH, JSON.stringify([], null, 4), 'utf8');
        }
        let fileContent = fs.readFileSync(RAW_MATERIALS_PATH, 'utf8').trim();
        return JSON.parse(fileContent || "[]");
    } catch (err) {
        console.error("Hammaddeleri okuma hatası:", err);
        return [];
    }
}

function writeRawMaterials(materials) {
    try {
        fs.writeFileSync(RAW_MATERIALS_PATH, JSON.stringify(materials, null, 4), 'utf8');
    } catch (err) {
        console.error("Hammaddeleri yazma hatası:", err);
    }
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

function readUsers() {
    try {
        if (!fs.existsSync(DB_PATH)) return [];
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || "[]");
    } catch (err) { return []; }
}

function writeUsers(users) {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf8'); } catch (err) {}
}

function readRecipes() {
    try {
        if (!fs.existsSync(RECIPES_PATH)) return [];
        return JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8') || "[]");
    } catch (err) { return []; }
}

function writeRecipes(recipes) {
    try { fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 4), 'utf8'); } catch (err) {}
}

function readMenuRecipes() {
    try {
        if (!fs.existsSync(MENU_RECIPES_PATH)) return [];
        return JSON.parse(fs.readFileSync(MENU_RECIPES_PATH, 'utf8') || "[]");
    } catch (err) { return []; }
}

function writeMenuRecipes(recipes) {
    try { fs.writeFileSync(MENU_RECIPES_PATH, JSON.stringify(recipes, null, 4), 'utf8'); } catch (err) {}
}

function readInventoryLogs() {
    try {
        if (!fs.existsSync(INVENTORY_LOGS_PATH)) return [];
        return JSON.parse(fs.readFileSync(INVENTORY_LOGS_PATH, 'utf8') || "[]");
    } catch (err) { return []; }
}

function writeInventoryLogs(logs) {
    try { fs.writeFileSync(INVENTORY_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8'); } catch (err) {}
}

function readSlides() {
    try {
        if (!fs.existsSync(SLIDES_PATH)) return [];
        return JSON.parse(fs.readFileSync(SLIDES_PATH, 'utf8') || "[]");
    } catch (err) { return []; }
}

function writeSlides(slides) {
    try { fs.writeFileSync(SLIDES_PATH, JSON.stringify(slides, null, 4), 'utf8'); } catch (err) {}
}

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// 1. Giriş API'si
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

// 2. Kayıt API'si
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

const SETTINGS_FILE = path.resolve(baseDir, 'settings.json');
function readSettings() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) return {};
        return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (e) { return {}; }
}
function writeSettings(s) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 4)); }

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

const NOTES_FILE = path.resolve(baseDir, 'user_notes.json');
function readNotes() {
    try {
        if (!fs.existsSync(NOTES_FILE)) return [];
        return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8') || "[]");
    } catch (e) { return []; }
}
function writeNotes(n) { fs.writeFileSync(NOTES_FILE, JSON.stringify(n, null, 4)); }

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

module.exports = app;

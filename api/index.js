const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// Vercel Lambda veya Yerel ortam için ana dizin çözümleri
const baseDir = process.cwd();
const UPLOADS_DIR = path.resolve(baseDir, 'uploads');
const RECIPES_IMAGES_DIR = path.join(UPLOADS_DIR, 'recipes');

// 🔑 VARSAYILAN VERİTABANLARI (Vercel'de dosya okunamadığında kullanılacak yedek veriler)
const DEFAULT_USERS = [
  { "username": "zafer", "password": "1908", "role": "yönetici", "region": "Hepsi", "menus": ["Sipariş Arayüzü", "Reçeteler Kataloğu", "Sistem Ayarları", "Envanter Takip"] },
  { "username": "admin", "password": "123", "role": "yönetici", "region": "Hepsi", "menus": ["Sipariş Arayüzü", "Reçeteler Kataloğu", "Sistem Ayarları", "Envanter Takip"] }
];

const DEFAULT_SETTINGS = {
  "youtubePlaylist": "https://www.youtube.com/embed/videoseries?list=PL4fGSI1pDJn5kI81J1m1qyPfyS5aP_Qp6"
};

const DEFAULT_MATERIALS = [
  {
    "id": "suruplar",
    "label": "ŞURUPLAR",
    "items": [
      { "name": "HM-BAHÇE NANE AROMALI KOKTEYL ŞURUBU", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-BERRY HIBISCUS AROMALI KOKTEYL ŞURUBU", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-BÖĞÜRTLEN AROMALI KOKTEYL ŞURUBU", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-COOL LIME AROMALI KOKTEYL ŞURUBU", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-ÇARKIFELEK (PASSION FRUIT) AROMALI KOKTEYL ŞURUBU", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-ÇİLEK AROMALI KOKTEYL ŞURUBU", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-FINDIK AROMALI KOKTEYL ŞURUBU", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-KARAMEL AROMALI KOKTEYL ŞURUBU", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-VANİLYA AROMALI KOKTEYL ŞURUBU", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} }
    ]
  },
  {
    "id": "kahveler",
    "label": "KAHVELER",
    "items": [
      { "name": "HM-ESPRESSO ÇEKİRDEĞİ (ORTA KAVRULMUŞ)", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-FİLTRE KAHVE", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} },
      { "name": "HM-TÜRK KAHVESİ (ORTA KAVRULMUŞ)", "cal": "Hammadde", "image": "menu.jpg", "weight": 0.9, "limit": 5, "stock": 10, "expiry": "Belirtilmedi", "region_stocks": {} }
    ]
  }
];

// Dosya yolları (Sadece yerelde yazmak için)
const DB_PATH = path.resolve(baseDir, 'users.json');
const RECIPES_PATH = path.resolve(baseDir, 'recipes.json');
const RAW_MATERIALS_PATH = path.resolve(baseDir, 'raw_materials.json');
const ORDERS_PATH = path.resolve(baseDir, 'orders.json');
const SETTINGS_FILE = path.resolve(baseDir, 'settings.json');

// Bellek içi (in-memory) değişkenler
let memoryUsers = null;
let memoryRecipes = null;
let memoryMaterials = null;
let memorySettings = null;
let memoryOrders = [];

// Dosya okuma sarmalayıcıları (Vercel çökmesini önler)
function readUsers() {
    if (memoryUsers) return memoryUsers;
    try {
        if (fs.existsSync(DB_PATH)) {
            memoryUsers = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            return memoryUsers;
        }
    } catch (e) {}
    memoryUsers = DEFAULT_USERS;
    return memoryUsers;
}

function writeUsers(users) {
    memoryUsers = users;
    try { fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf8'); } catch (e) {}
}

function readRawMaterials() {
    if (memoryMaterials) return memoryMaterials;
    try {
        if (fs.existsSync(RAW_MATERIALS_PATH)) {
            memoryMaterials = JSON.parse(fs.readFileSync(RAW_MATERIALS_PATH, 'utf8'));
            return memoryMaterials;
        }
    } catch (e) {}
    memoryMaterials = DEFAULT_MATERIALS;
    return memoryMaterials;
}

function writeRawMaterials(materials) {
    memoryMaterials = materials;
    try { fs.writeFileSync(RAW_MATERIALS_PATH, JSON.stringify(materials, null, 4), 'utf8'); } catch (e) {}
}

function readRecipes() {
    if (memoryRecipes) return memoryRecipes;
    try {
        if (fs.existsSync(RECIPES_PATH)) {
            memoryRecipes = JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8'));
            return memoryRecipes;
        }
    } catch (e) {}
    memoryRecipes = DEFAULT_MATERIALS; // Reçeteler de hammadde kategorilerini temel alır
    return memoryRecipes;
}

function writeRecipes(recipes) {
    memoryRecipes = recipes;
    try { fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 4), 'utf8'); } catch (e) {}
}

function readSettings() {
    if (memorySettings) return memorySettings;
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            memorySettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            return memorySettings;
        }
    } catch (e) {}
    memorySettings = DEFAULT_SETTINGS;
    return memorySettings;
}

function writeSettings(s) {
    memorySettings = s;
    try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 4), 'utf8'); } catch (e) {}
}

function readOrders() {
    try {
        if (fs.existsSync(ORDERS_PATH)) {
            return JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));
        }
    } catch (e) {}
    return memoryOrders;
}

function writeOrders(orders) {
    memoryOrders = orders;
    try { fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 4), 'utf8'); } catch (e) {}
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

app.get('/api/stk/confirmed', (req, res) => { res.json({}); });
app.get('/api/settings', (req, res) => { res.json(readSettings()); });
app.post('/api/settings', (req, res) => {
    const current = readSettings();
    const updated = { ...current, ...req.body };
    writeSettings(updated);
    res.json({ success: true, settings: updated });
});

app.get('/api/orders', (req, res) => { res.json(readOrders()); });
app.post('/api/orders', (req, res) => {
    const orders = readOrders();
    orders.push(req.body);
    writeOrders(orders);
    res.json({ success: true });
});

module.exports = app;

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// Vercel ve yerel için dinamik ana dizin seçimi
const baseDir = process.env.VERCEL ? process.cwd() : __dirname;

const DB_PATH = path.resolve(baseDir, 'users.json');
const RECIPES_PATH = path.resolve(baseDir, 'recipes.json');
const MENU_RECIPES_PATH = path.resolve(baseDir, 'menu_recipes.json');
const SLIDES_PATH = path.resolve(baseDir, 'slides.json');
const INVENTORY_LOGS_PATH = path.resolve(baseDir, 'inventory_logs.json');
const RAW_MATERIALS_PATH = path.resolve(baseDir, 'raw_materials.json');
const UPLOADS_DIR = path.resolve(baseDir, 'uploads');
const RECIPES_IMAGES_DIR = path.join(UPLOADS_DIR, 'recipes');

// Gerekli klasörleri oluştur
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(RECIPES_IMAGES_DIR)) {
    fs.mkdirSync(RECIPES_IMAGES_DIR, { recursive: true });
}

function readRawMaterials() {
    try {
        if (!fs.existsSync(RAW_MATERIALS_PATH)) {
            fs.writeFileSync(RAW_MATERIALS_PATH, JSON.stringify([], null, 4), 'utf8');
        }
        let fileContent = fs.readFileSync(RAW_MATERIALS_PATH, 'utf8').trim();
        if (fileContent === "[]" || fileContent === "" || fileContent === "{}") {
            // Eğer dosya boşsa, menu_recipes.json içindeki hammaddeleri çıkarıp otomatik dolduralım
            const recipes = readMenuRecipes();
            let autoMaterials = [];
            
            // Reçete malzemelerini topla
            recipes.forEach(cat => {
                let itemsList = [];
                if (cat.items) {
                    cat.items.forEach(item => {
                        if (item.ingredients) {
                            item.ingredients.forEach(ing => {
                                const rawName = ing.product || ing.name || "";
                                if (rawName) {
                                    const pName = rawName.toUpperCase();
                                    if (!itemsList.some(m => m.name === pName)) {
                                        itemsList.push({
                                            name: pName,
                                            cal: "Hammadde",
                                            image: "menu.jpg",
                                            weight: 0.900,
                                            limit: 5,
                                            stock: 10,
                                            expiry: "Belirtilmedi"
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
                
                if (itemsList.length > 0) {
                    autoMaterials.push({
                        id: cat.id,
                        label: cat.label.toUpperCase(),
                        items: itemsList
                    });
                }
            });

            fs.writeFileSync(RAW_MATERIALS_PATH, JSON.stringify(autoMaterials, null, 4), 'utf8');
            return autoMaterials;
        }
        return JSON.parse(fileContent);
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

// Multer yapılandırması
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Reçete resmi ise farklı klasör
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

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB video desteği için limit artırıldı
    fileFilter: (req, file, cb) => {
        if (req.path === '/api/upload-recipe-image' || req.path === '/api/upload-overview') {
            // Yalnızca resimleri kabul et
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Sadece görsel dosyaları (.jpg, .png vb.) yüklenebilir!'), false);
            }
        } else {
            // Yalnızca video kabul et
            if (file.mimetype.startsWith('video/mp4') || file.originalname.endsWith('.mp4')) {
                cb(null, true);
            } else {
                cb(new Error('Sadece MP4 videoları yüklenebilir!'), false);
            }
        }
    }
});

// Helper okuma/yazma fonksiyonları
function readUsers() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify([]));
        }
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Veritabanı okuma hatası:", err);
        return [];
    }
}

function writeUsers(users) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf8');
    } catch (err) {
        console.error("Veritabanı yazma hatası:", err);
    }
}

function readRecipes() {
    try {
        if (!fs.existsSync(RECIPES_PATH)) {
            fs.writeFileSync(RECIPES_PATH, JSON.stringify([]));
        }
        const data = fs.readFileSync(RECIPES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Reçeteleri okuma hatası:", err);
        return [];
    }
}

function writeRecipes(recipes) {
    try {
        fs.writeFileSync(RECIPES_PATH, JSON.stringify(recipes, null, 4), 'utf8');
    } catch (err) {
        console.error("Reçeteleri yazma hatası:", err);
    }
}

function readMenuRecipes() {
    try {
        if (!fs.existsSync(MENU_RECIPES_PATH)) {
            fs.writeFileSync(MENU_RECIPES_PATH, JSON.stringify([]));
        }
        const data = fs.readFileSync(MENU_RECIPES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Menü reçeteleri okuma hatası:", err);
        return [];
    }
}

function writeMenuRecipes(recipes) {
    try {
        fs.writeFileSync(MENU_RECIPES_PATH, JSON.stringify(recipes, null, 4), 'utf8');
    } catch (err) {
        console.error("Menü reçeteleri yazma hatası:", err);
    }
}

function readInventoryLogs() {
    try {
        if (!fs.existsSync(INVENTORY_LOGS_PATH)) {
            fs.writeFileSync(INVENTORY_LOGS_PATH, JSON.stringify([]));
        }
        const data = fs.readFileSync(INVENTORY_LOGS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Envanter günlükleri okuma hatası:", err);
        return [];
    }
}

function writeInventoryLogs(logs) {
    try {
        fs.writeFileSync(INVENTORY_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8');
    } catch (err) {
        console.error("Envanter günlükleri yazma hatası:", err);
    }
}

function readSlides() {
    try {
        if (!fs.existsSync(SLIDES_PATH)) {
            fs.writeFileSync(SLIDES_PATH, JSON.stringify([]));
        }
        const data = fs.readFileSync(SLIDES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Slaytlar okuma hatası:", err);
        return [];
    }
}

function writeSlides(slides) {
    try {
        fs.writeFileSync(SLIDES_PATH, JSON.stringify(slides, null, 4), 'utf8');
    } catch (err) {
        console.error("Slaytları yazma hatası:", err);
    }
}

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Önbellek engelleme middleware
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Statik dosya sunumu (Sadece yerelde aktif, Vercel'de CDN sunar)
if (!process.env.VERCEL) {
    app.use(express.static(path.join(__dirname), {
        etag: false,
        lastModified: false,
        setHeaders: (res) => {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }));
}
app.use('/uploads', express.static(UPLOADS_DIR));


// 1. Giriş API'si
app.post('/api/login', (req, res) => {
    const { role, username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir!' });
    }

    const users = readUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.role === role);

    if (!user) {
        return res.status(401).json({ success: false, message: `Bu rol ile eşleşen '${username}' adında bir kullanıcı bulunamadı.` });
    }

    if (user.password !== password) {
        return res.status(401).json({ success: false, message: 'Şifre hatalı!' });
    }

    res.json({
        success: true,
        message: `Giriş başarılı! Hoş geldiniz ${user.username}.`,
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

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir!' });
    }

    const users = readUsers();
    const userExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());

    if (userExists) {
        return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten alınmış!' });
    }

    const newUser = { 
        username, 
        password, 
        role,
        region: 'Hepsi',
        menus: ["Sipariş Arayüzü", "Reçeteler Kitabı", "Sistem Ayarları", "Envanter Takip"]
    };
    users.push(newUser);
    writeUsers(users);

    res.status(201).json({
        success: true,
        message: `Kayıt başarılı! Artık '${role}' olarak giriş yapabilirsiniz.`
    });
});

// 3. Şifremi Unuttum API'si
app.post('/api/forgot-password', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ success: false, message: 'Lütfen kullanıcı adınızı girin!' });
    }

    const users = readUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
        return res.status(404).json({ success: false, message: 'Bu kullanıcı adına sahip bir üye bulunamadı!' });
    }

    res.json({
        success: true,
        message: `Şifreniz sıfırlandı! Mevcut şifreniz: '${user.password}'`
    });
});

// 4. Sistem Ayarları: Tüm Kullanıcıları Getir
app.get('/api/users', (req, res) => {
    res.json(readUsers());
});

// 5. Sistem Ayarları: Kullanıcı Güncelle / Ekle
app.post('/api/users/save', (req, res) => {
    const { username, password, role, region, menus, isEdit } = req.body;
    let users = readUsers();
    
    const userIdx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (userIdx !== -1) {
        users[userIdx].password = password;
        users[userIdx].role = role;
        users[userIdx].region = region || 'Hepsi';
        users[userIdx].menus = menus || ["Sipariş Arayüzü", "Reçeteler Kataloğu", "Sistem Ayarları", "Envanter Takip"];
    } else {
        if (isEdit) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }
        users.push({ 
            username, 
            password, 
            role,
            region: region || 'Hepsi',
            menus: menus || ["Sipariş Arayüzü", "Reçeteler Kataloğu", "Sistem Ayarları", "Envanter Takip"]
        });
    }
    
    writeUsers(users);
    res.json({ success: true, message: 'Kullanıcı başarıyla kaydedildi!' });
});

// 6. Sistem Ayarları: Kullanıcı Sil
app.delete('/api/users/:username', (req, res) => {
    const { username } = req.params;
    let users = readUsers();
    users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    writeUsers(users);
    res.json({ success: true, message: 'Kullanıcı silindi.' });
});

// 7. Sistem Ayarları: Reçeteleri Getir
app.get('/api/recipes', (req, res) => {
    res.json(readRecipes());
});

// 8. Sistem Ayarları: Hammadde Reçetelerini Kaydet (eski format - geriye uyumluluk)
app.post('/api/recipes/save', (req, res) => {
    const recipes = req.body;
    writeRecipes(recipes);
    res.json({ success: true, message: 'Reçeteler başarıyla kaydedildi!' });
});

// 8b. Menü Reçeteleri (Reçeteler Kitabı & Editörü)
app.get('/api/menu-recipes', (req, res) => {
    res.json(readMenuRecipes());
});

app.post('/api/menu-recipes/save', (req, res) => {
    const recipes = req.body;
    writeMenuRecipes(recipes);
    res.json({ success: true, message: 'Menü reçeteleri başarıyla kaydedildi!' });
});

// 8c. Kategori Ekle
app.post('/api/menu-recipes/category/add', (req, res) => {
    const { id, label } = req.body;
    if (!id || !label) return res.status(400).json({ success: false, message: 'ID ve etiket gereklidir.' });
    const data = readMenuRecipes();
    if (data.find(c => c.id === id)) {
        return res.status(409).json({ success: false, message: 'Bu ID ile zaten bir kategori var.' });
    }
    data.push({ id, label: label.toUpperCase(), items: [] });
    writeMenuRecipes(data);
    res.json({ success: true, message: 'Kategori eklendi.' });
});

// 8d. Kategori Düzenle
app.put('/api/menu-recipes/category/:id', (req, res) => {
    const { id } = req.params;
    const { label } = req.body;
    const data = readMenuRecipes();
    const cat = data.find(c => c.id === id);
    if (!cat) return res.status(404).json({ success: false, message: 'Kategori bulunamadı.' });
    cat.label = label.toUpperCase();
    writeMenuRecipes(data);
    res.json({ success: true, message: 'Kategori güncellendi.' });
});

// 8e. Kategori Sil
app.delete('/api/menu-recipes/category/:id', (req, res) => {
    const { id } = req.params;
    let data = readMenuRecipes();
    const before = data.length;
    data = data.filter(c => c.id !== id);
    if (data.length === before) return res.status(404).json({ success: false, message: 'Kategori bulunamadı.' });
    writeMenuRecipes(data);
    res.json({ success: true, message: 'Kategori silindi.' });
});

// 8f. Ürün Ekle veya Güncelle
app.post('/api/menu-recipes/:catId/item', (req, res) => {
    const { catId } = req.params;
    const { item, originalName } = req.body; // originalName: düzenleme sırasında eski adı
    if (!item || !item.name) return res.status(400).json({ success: false, message: 'Ürün adı gereklidir.' });
    const data = readMenuRecipes();
    const cat = data.find(c => c.id === catId);
    if (!cat) return res.status(404).json({ success: false, message: 'Kategori bulunamadı.' });

    if (originalName) {
        // Güncelleme modunda: eski kaydı bul ve üzerine yaz
        const idx = cat.items.findIndex(i => i.name === originalName);
        if (idx !== -1) {
            cat.items[idx] = item;
        } else {
            cat.items.push(item);
        }
    } else {
        // Ekleme modu
        cat.items.push(item);
    }
    writeMenuRecipes(data);
    res.json({ success: true, message: 'Ürün kaydedildi.' });
});

// 8g. Ürün Sil
app.delete('/api/menu-recipes/:catId/item/:itemName', (req, res) => {
    const { catId, itemName } = req.params;
    const name = decodeURIComponent(itemName);
    const data = readMenuRecipes();
    const cat = data.find(c => c.id === catId);
    if (!cat) return res.status(404).json({ success: false, message: 'Kategori bulunamadı.' });
    const before = cat.items.length;
    cat.items = cat.items.filter(i => i.name !== name);
    if (cat.items.length === before) return res.status(404).json({ success: false, message: 'Ürün bulunamadı.' });
    writeMenuRecipes(data);
    res.json({ success: true, message: 'Ürün silindi.' });
});

// 9. Tanıtım Slaytları API'leri
app.get('/api/slides', (req, res) => {
    res.json(readSlides());
});

app.post('/api/slides/save', (req, res) => {
    const slides = req.body;
    writeSlides(slides);
    res.json({ success: true, message: 'Slaytlar başarıyla kaydedildi!' });
});

// 10. Video Yükleme API'si
app.post('/api/upload-video', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Video yüklenemedi!' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, fileUrl });
});

// 11. Reçete Resmi Yükleme API'si (Kırpılmış resim gönderimi için)
app.post('/api/upload-recipe-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Görsel yüklenemedi!' });
    }
    const fileUrl = `/uploads/recipes/${req.file.filename}`;
    res.json({ success: true, fileUrl });
});

// 11b. Kapak Resmini overview.png Olarak Yükleme API'si
app.post('/api/upload-overview', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Görsel yüklenemedi!' });
    }
    const fileUrl = '/uploads/recipes/overview.png';
    res.json({ success: true, fileUrl });
});

// 12. Envanter Günlükleri API'leri
app.get('/api/inventory/logs', (req, res) => {
    res.json(readInventoryLogs());
});

app.post('/api/inventory/log', (req, res) => {
    const { username, region, itemName, oldStock, newStock, change } = req.body;
    const logs = readInventoryLogs();
    const newLog = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        username: username || 'Bilinmeyen Kullanıcı',
        region: region || 'Hepsi',
        itemName: itemName || 'Bilinmeyen Ürün',
        oldStock: oldStock !== undefined ? parseInt(oldStock) : 0,
        newStock: newStock !== undefined ? parseInt(newStock) : 0,
        change: change !== undefined ? parseInt(change) : 0
    };
    logs.push(newLog);
    writeInventoryLogs(logs);
    res.json({ success: true, log: newLog });
});

// 13. Hammadde Stok & Ürün API'leri
app.get('/api/products', (req, res) => {
    try {
        let rawData = [];
        try {
            rawData = readRawMaterials();
        } catch(e) {
            console.error("Hammaddeler okunamadı, varsayılan boş dizi atanıyor:", e);
        }
        let flatMaterials = [];
        
        if (Array.isArray(rawData)) {
            rawData.forEach(cat => {
                if (cat && cat.items && Array.isArray(cat.items)) {
                    cat.items.forEach(item => {
                        if (item && item.name) {
                            flatMaterials.push({
                                id: item.name.toLowerCase().replace(/\s+/g, "_"),
                                name: item.name,
                                category: cat.label || cat.id || "Diğer",
                                catId: cat.id || "diger",
                                weight: item.weight || 0.900,
                                limit: item.limit || 5,
                                stock: item.stock || 10,
                                expiry: item.expiry || "Belirtilmedi",
                                image: item.image || "menu.jpg"
                            });
                        }
                    });
                }
            });
        }
        
        // Eğer hiçbir hammadde yoksa varsayılan boş listeyi güvenle döndür
        res.json(flatMaterials);
    } catch (err) {
        console.error("API products okuma hatası:", err);
        res.json([]);
    }
});

app.post('/api/products', (req, res) => {
    const newMaterial = req.body;
    let rawData = readRawMaterials();

    const targetCatLabel = newMaterial.category.toUpperCase();
    let cat = rawData.find(c => c.label.toUpperCase() === targetCatLabel || c.id.toLowerCase() === targetCatLabel.toLowerCase());
    
    if (!cat) {
        // Eğer kategori yoksa yeni kategori oluştur
        const catId = targetCatLabel.toLowerCase().replace(/\s+/g, "_");
        cat = {
            id: catId,
            label: targetCatLabel,
            items: []
        };
        rawData.push(cat);
    }

    // Aynı isimde hammadde varsa ekleme
    if (cat.items.some(i => i.name.toLowerCase() === newMaterial.name.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Bu hammadde zaten mevcut!' });
    }

    cat.items.push({
        name: newMaterial.name,
        cal: "Hammadde",
        image: newMaterial.image || "menu.jpg",
        weight: newMaterial.weight || 0.900,
        limit: newMaterial.limit || 5,
        stock: newMaterial.stock || 10,
        expiry: newMaterial.expiry || "Belirtilmedi"
    });

    writeRawMaterials(rawData);
    res.json({ success: true, message: 'Hammadde başarıyla eklendi!' });
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    let rawData = readRawMaterials();

    // ID hammadde isminin normalize edilmiş haliydi, eşleşen hammaddeyi sil
    rawData.forEach(cat => {
        if (cat.items) {
            cat.items = cat.items.filter(item => {
                const itemId = item.name.toLowerCase().replace(/\s+/g, "_");
                return itemId !== id;
            });
        }
    });

    writeRawMaterials(rawData);
    res.json({ success: true, message: 'Hammadde silindi.' });
});

// 14. Sipariş API'leri
const ORDERS_PATH = path.join(__dirname, 'orders.json');
const ARCHIVE_DIR = path.join(__dirname, 'archive');

// Arşiv klasörlerini oluştur
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

function readOrders() {
    try {
        if (!fs.existsSync(ORDERS_PATH)) {
            fs.writeFileSync(ORDERS_PATH, JSON.stringify([], null, 4), 'utf8');
        }
        return JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
}
function writeOrders(data) {
    fs.writeFileSync(ORDERS_PATH, JSON.stringify(data, null, 4), 'utf8');
}

app.get('/api/orders', (req, res) => {
    const { region } = req.query;
    let orders = readOrders();
    // Bölge filtrelemesi (eğer sınırlama varsa)
    if (region && region !== 'Hepsi') {
        orders = orders.filter(o => o.branch === region);
    }
    res.json(orders);
});

app.post('/api/orders', (req, res) => {
    try {
        const order = req.body;
        let orders = readOrders();
        orders.push(order);
        writeOrders(orders);

        // Kullanıcı bazlı klasör arşivleme
        const username = order.username || 'ortak';
        const userFolder = path.join(ARCHIVE_DIR, username);
        if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });

        const filename = `${order.id || 'ORD-' + Date.now()}.json`;
        fs.writeFileSync(path.join(userFolder, filename), JSON.stringify({ ...order, type: 'orders', timestamp: new Date().toISOString() }, null, 4), 'utf8');

        res.json({ success: true, message: 'Sipariş başarıyla kaydedildi ve arşivlendi!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Envanter Günlüğü ve Kullanıcı Klasörü Arşivleme
app.post('/api/inventory/log', (req, res) => {
    const { username, region, itemName, oldStock, newStock, change } = req.body;
    const logs = readInventoryLogs();
    const newLog = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        username: username || 'Bilinmeyen Kullanıcı',
        region: region || 'Hepsi',
        itemName: itemName || 'Bilinmeyen Ürün',
        oldStock: oldStock !== undefined ? parseInt(oldStock) : 0,
        newStock: newStock !== undefined ? parseInt(newStock) : 0,
        change: change !== undefined ? parseInt(change) : 0
    };
    logs.push(newLog);
    writeInventoryLogs(logs);

    // Kullanıcı bazlı klasör arşivleme
    const userFolder = path.join(ARCHIVE_DIR, newLog.username);
    if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });

    const filename = `INV-${newLog.id}.json`;
    fs.writeFileSync(path.join(userFolder, filename), JSON.stringify({ ...newLog, type: 'inventory' }, null, 4), 'utf8');

    res.json({ success: true, log: newLog });
});

// 15. Arşiv Klasörleri ve Dosyaları API'leri
app.get('/api/archive/list', (req, res) => {
    try {
        // archive klasörü içindeki tüm kullanıcı klasörlerini listele
        const folders = fs.readdirSync(ARCHIVE_DIR).filter(file => {
            return fs.statSync(path.join(ARCHIVE_DIR, file)).isDirectory();
        });

        const userFoldersData = folders.map(folderName => {
            const userFolderPath = path.join(ARCHIVE_DIR, folderName);
            const files = fs.readdirSync(userFolderPath).filter(f => f.endsWith('.json'));
            
            return {
                username: folderName,
                fileCount: files.length,
                files: files.map(file => {
                    const data = JSON.parse(fs.readFileSync(path.join(userFolderPath, file), 'utf8'));
                    return {
                        filename: file,
                        type: data.type || (file.startsWith('INV-') ? 'inventory' : 'orders'),
                        timestamp: data.timestamp || data.date,
                        details: data.itemName 
                            ? `${data.itemName} (${data.change > 0 ? '+' : ''}${data.change} Değişim)`
                            : `${data.id || 'ORD'} - ${data.items ? data.items.length : 0} Çeşit Ürün`
                    };
                }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            };
        });

        res.json({
            success: true,
            folders: userFoldersData
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Arşivlenmiş Tekil Kullanıcı Dosyası Oku
app.get('/api/archive/file/:username/:filename', (req, res) => {
    try {
        const { username, filename } = req.params;
        const filePath = path.join(ARCHIVE_DIR, username, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Arşiv dosyası bulunamadı.' });
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json({ success: true, content: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 16. STK Onaylama API'leri (STK Bildirim Kontrolü)
const STK_CONFIRMED_PATH = path.join(__dirname, 'stk_confirmed.json');
function readStkConfirmed() {
    try {
        if (!fs.existsSync(STK_CONFIRMED_PATH)) {
            fs.writeFileSync(STK_CONFIRMED_PATH, JSON.stringify([], null, 4), 'utf8');
        }
        return JSON.parse(fs.readFileSync(STK_CONFIRMED_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
}
function writeStkConfirmed(data) {
    fs.writeFileSync(STK_CONFIRMED_PATH, JSON.stringify(data, null, 4), 'utf8');
}

app.get('/api/stk/confirmed', (req, res) => {
    res.json(readStkConfirmed());
});

app.post('/api/stk/confirm', (req, res) => {
    const { itemName, region } = req.body;
    let list = readStkConfirmed();
    const key = `${itemName}_${region}`;
    if (!list.includes(key)) {
        list.push(key);
        writeStkConfirmed(list);
    }
    res.json({ success: true, message: 'Kontrol onaylandı.' });
});

// 17. Çalma Listesi Müzik Ayarları API'si
const SETTINGS_PATH = path.join(__dirname, 'settings.json');
function readSettings() {
    try {
        if (!fs.existsSync(SETTINGS_PATH)) {
            fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ youtubePlaylist: "" }, null, 4), 'utf8');
        }
        return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    } catch (e) {
        return { youtubePlaylist: "" };
    }
}
function writeSettings(data) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 4), 'utf8');
}

app.get('/api/settings/music', (req, res) => {
    res.json(readSettings());
});

app.post('/api/settings/music', (req, res) => {
    const { youtubePlaylist } = req.body;
    const settings = readSettings();
    settings.youtubePlaylist = youtubePlaylist || "";
    writeSettings(settings);
    res.json({ success: true, message: 'Çalma listesi ayarları kaydedildi.' });
});

// 18. Ortak Kullanıcı Notları API'si (Zenginleştirilmiş Speech Bubble UI API Rotaları)
const NOTES_PATH = path.join(__dirname, 'notes.json');
function readNotes() {
    try {
        if (!fs.existsSync(NOTES_PATH)) {
            fs.writeFileSync(NOTES_PATH, JSON.stringify([], null, 4), 'utf8');
        }
        return JSON.parse(fs.readFileSync(NOTES_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
}
function writeNotes(data) {
    fs.writeFileSync(NOTES_PATH, JSON.stringify(data, null, 4), 'utf8');
}

app.get('/api/notes', (req, res) => {
    res.json(readNotes());
});

app.post('/api/notes', (req, res) => {
    const { username, content, role } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'İçerik gereklidir.' });
    const notes = readNotes();
    const newNote = {
        id: Date.now().toString(),
        username: username || "Anonim",
        role: role || "Personel",
        content,
        date: new Date().toLocaleDateString('tr-TR'),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        likes: 0,
        pinned: false,
        replies: []
    };
    notes.push(newNote);
    writeNotes(notes);
    res.status(201).json({ success: true, note: newNote });
});

app.post('/api/notes/:id/like', (req, res) => {
    const { id } = req.params;
    const notes = readNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return res.status(404).json({ success: false, message: 'Not bulunamadı.' });
    note.likes = (note.likes || 0) + 1;
    writeNotes(notes);
    res.json({ success: true, likes: note.likes });
});

app.post('/api/notes/:id/pin', (req, res) => {
    const { id } = req.params;
    const notes = readNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return res.status(404).json({ success: false, message: 'Not bulunamadı.' });
    note.pinned = !note.pinned;
    writeNotes(notes);
    res.json({ success: true, pinned: note.pinned });
});

app.post('/api/notes/:id/reply', (req, res) => {
    const { id } = req.params;
    const { username, content, role } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Cevap içeriği boş olamaz.' });
    const notes = readNotes();
    const note = notes.find(n => n.id === id);
    if (!note) return res.status(404).json({ success: false, message: 'Not bulunamadı.' });
    
    if (!note.replies) note.replies = [];
    note.replies.push({
        id: Date.now().toString(),
        username: username || "Anonim",
        role: role || "Personel",
        content,
        date: new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    });
    
    writeNotes(notes);
    res.json({ success: true, replies: note.replies });
});

app.delete('/api/notes/:id', (req, res) => {
    const { id } = req.params;
    let notes = readNotes();
    notes = notes.filter(n => n.id !== id);
    writeNotes(notes);
    res.json({ success: true, message: 'Not silindi.' });
});

const STK_CONFIRMED_FILE = path.resolve(baseDir, 'stk_confirmed.json');
app.get('/api/stk/confirmed', (req, res) => {
    try {
        if (!fs.existsSync(STK_CONFIRMED_FILE)) {
            return res.json({});
        }
        res.json(JSON.parse(fs.readFileSync(STK_CONFIRMED_FILE, 'utf8') || "{}"));
    } catch (e) {
        res.json({});
    }
});

const ORDERS_FILE = path.resolve(baseDir, 'orders.json');
function readLocalOrders() {
    try {
        if (!fs.existsSync(ORDERS_FILE)) return [];
        return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8') || "[]");
    } catch (e) { return []; }
}
function writeLocalOrders(o) {
    try { fs.writeFileSync(ORDERS_FILE, JSON.stringify(o, null, 4), 'utf8'); } catch (e) {}
}
app.get('/api/orders', (req, res) => { res.json(readLocalOrders()); });
app.post('/api/orders', (req, res) => {
    const o = readLocalOrders();
    o.push(req.body);
    writeLocalOrders(o);
    res.json({ success: true });
});

// Root ve Dinamik HTML Sayfa Yönlendirmeleri (Sadece yerelde aktif, Vercel'de CDN sunar)
if (!process.env.VERCEL) {
    app.get('/', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'index.html'));
    });

    app.get('/:page.html', (req, res) => {
        const pageName = req.params.page + '.html';
        const filePath = path.resolve(__dirname, pageName);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send('Sayfa bulunamadı.');
        }
    });
}

// Global Hata Yakalama
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: 'Dosya yükleme hatası: ' + err.message });
    }
    res.status(500).json({ success: false, message: err.message });
});

if (process.env.VERCEL) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Sunucu http://localhost:${PORT} adresinde aktif.`);
    });
}
module.exports = app;

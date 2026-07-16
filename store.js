document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    // Modern Tost Bildirim Fonksiyonu
    function showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        let icon = "🔔";
        if (type === "success") icon = "✅";
        if (type === "error") icon = "❌";
        
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        // Slide-in animasyonunu tetikle
        setTimeout(() => toast.classList.add("show"), 50);

        // 3.5 saniye sonra kaldır
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // Theme Management (catalog.html uyumlu)
    const htmlElement = document.documentElement;
    const btnLight = document.getElementById("theme-btn-light");
    const btnDark = document.getElementById("theme-btn-dark");

    function applyTheme(theme) {
        htmlElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);

        if (theme === "dark") {
            if (btnDark) {
                btnDark.classList.add("active");
                btnDark.style.background = "var(--accent)";
                btnDark.style.color = "#fff";
            }
            if (btnLight) {
                btnLight.classList.remove("active");
                btnLight.style.background = "transparent";
                btnLight.style.color = "var(--text-secondary)";
            }
        } else {
            if (btnLight) {
                btnLight.classList.add("active");
                btnLight.style.background = "var(--accent)";
                btnLight.style.color = "#fff";
            }
            if (btnDark) {
                btnDark.classList.remove("active");
                btnDark.style.background = "transparent";
                btnDark.style.color = "var(--text-secondary)";
            }
        }
    }

    if (btnLight) btnLight.addEventListener("click", () => applyTheme("light"));
    if (btnDark) btnDark.addEventListener("click", () => applyTheme("dark"));

    // Apply saved or default theme
    applyTheme(localStorage.getItem("theme") || "dark");

    // 0. Oturum Açan Kullanıcı Bilgisi
    const loggedInUser = JSON.parse(localStorage.getItem("user")) || {};
    const userRegion = loggedInUser.region || "Hepsi";

    const branchInput = document.getElementById("order-branch-select");
    if (branchInput) {
        if (userRegion === "Hepsi") {
            branchInput.value = "Merkez Şube";
            branchInput.removeAttribute("readonly");
            branchInput.style.pointerEvents = "auto";
        } else {
            // Şubeyi kullanıcı bölgesine otomatik ve değiştirilemez şekilde sabitler
            branchInput.value = userRegion;
            branchInput.setAttribute("readonly", "true");
            branchInput.style.pointerEvents = "none";
            branchInput.style.opacity = "0.8";
        }
    }

    let rawMaterials = [];    // API'den gelen hammaddeler listesi
    let categoriesList = [];  // Hammaddelerden türetilen benzersiz kategoriler
    let basket = [];          // Sipariş Sepeti Durumu

    // Modal Elemanları
    const unitModal = document.getElementById("unit-selection-modal");
    const modalProductName = document.getElementById("modal-product-name");
    const btnSelectPiece = document.getElementById("btn-select-piece");
    const btnSelectBox = document.getElementById("btn-select-box");
    const modalQtyVal = document.getElementById("modal-qty-val");
    const btnQtyDec = document.getElementById("modal-qty-dec");
    const btnQtyInc = document.getElementById("modal-qty-inc");
    const btnCloseModal = document.getElementById("btn-close-unit-modal");
    const btnSaveModal = document.getElementById("btn-save-unit-modal");

    let currentSelectedProduct = null;
    let currentSelectedUnit = "Adet"; // "Adet" veya "Koli"
    let currentSelectedQty = 1;

    // DOM Elemanları
    const categoriesGrid = document.getElementById("categories-grid-list");
    const productsAreaContainer = document.getElementById("products-area-container");
    const lnkBackDashboard = document.getElementById("lnk-back-dashboard");
    const btnBackCategories = document.getElementById("btn-back-categories");
    const storeTitleText = document.getElementById("store-title-text");

    // Sunucudan Hammaddeleri (raw_materials.json) Çek
    function loadRawMaterialsData() {
        fetch("/api/raw-materials?t=" + Date.now())
            .then(res => res.json())
            .then(data => {
                // Eğer gelen veri kategorize edilmiş yapıdaysa düz array'e dönüştür
                let flatMaterials = [];
                let categories = [];
                
                if (Array.isArray(data)) {
                    data.forEach(cat => {
                        if (cat.items && Array.isArray(cat.items)) {
                            cat.items.forEach(item => {
                                flatMaterials.push({
                                    ...item,
                                    category: cat.label || "DİĞER ÜRÜNLER"
                                });
                            });
                            categories.push({
                                id: cat.label || cat.id,
                                label: cat.label || cat.id,
                                emoji: getCategoryEmoji(cat.label || cat.id)
                            });
                        } else {
                            flatMaterials.push(cat);
                        }
                    });
                }
                
                rawMaterials = flatMaterials;
                categoriesList = categories.length > 0 ? categories : [{
                    id: "DİĞER ÜRÜNLER",
                    label: "DİĞER ÜRÜNLER",
                    emoji: "📦"
                }];

                console.log("Hammadde Sipariş Veritabanı yüklendi:", rawMaterials, categoriesList);
                showCategoriesMenu(); // Kategorileri listele
            })
            .catch(err => console.error("Hammaddeler yüklenirken hata:", err));
    }

    loadRawMaterialsData();

    function getCategoryEmoji(catName) {
        const lower = catName.toLowerCase();
        if (lower.includes("şurup")) return "🍹";
        if (lower.includes("kahve")) return "☕";
        if (lower.includes("sos")) return "🍫";
        if (lower.includes("çay")) return "🍵";
        if (lower.includes("milkshake")) return "🥤";
        if (lower.includes("püre") || lower.includes("meyve")) return "🍓";
        return "📦"; // Varsayılan
    }

    // 1. Kategorileri Büyük Kartlar Olarak Listele (Reçeteler Kitabı stili)
    function showCategoriesMenu() {
        currentSelectedProduct = null;
        storeTitleText.textContent = "Kategoriler";

        categoriesGrid.style.display = "grid";
        productsAreaContainer.style.display = "none";
        lnkBackDashboard.style.display = "inline-flex";
        btnBackCategories.style.display = "none";

        categoriesGrid.innerHTML = "";

        categoriesList.forEach(cat => {
            const card = document.createElement("div");
            card.className = "category-card";

            card.innerHTML = `
                <div class="product-icon" style="margin-bottom: 12px;">
                    <span style="font-size: 26px;">${cat.emoji}</span>
                </div>
                <span>${cat.label}</span>
            `;

            card.addEventListener("click", () => {
                selectCategory(cat.id, cat.label);
            });

            categoriesGrid.appendChild(card);
        });
    }

    // Kategori Seçim İşlemi
    function selectCategory(catId, catLabel) {
        storeTitleText.textContent = catLabel;

        categoriesGrid.style.display = "none";
        productsAreaContainer.style.display = "block";
        lnkBackDashboard.style.display = "none";
        btnBackCategories.style.display = "inline-flex";

        renderProducts(catId);
    }

    btnBackCategories.addEventListener("click", () => {
        showCategoriesMenu();
    });

    // 2. Seçilen Kategoriye Ait Hammadde Ürünlerini Listele
    function renderProducts(catId) {
        const grid = document.getElementById("products-grid-list");
        grid.innerHTML = "";

        // Kategoriye ait hammaddeleri filtrele
        const filteredItems = rawMaterials.filter(item => {
            const itemCat = (item.category || "").trim().toLowerCase();
            const searchCat = (catId || "").trim().toLowerCase();
            return itemCat === searchCat || itemCat.replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c') === searchCat.replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');
        });

        filteredItems.forEach(item => {
            // Sepetteki adedi kontrol et
            const basketItems = basket.filter(b => b.name === item.name);
            let displayQtyText = "0 Adet";
            if (basketItems.length > 0) {
                const parts = basketItems.map(b => `${b.quantity} ${b.unit}`);
                displayQtyText = parts.join(", ");
            }

            const card = document.createElement("div");
            card.className = `product-card ${basketItems.length > 0 ? 'has-items' : ''}`;

            const emoji = getCategoryEmoji(catId);

            card.innerHTML = `
                <div class="product-icon">
                    <span style="font-size: 26px;">${emoji}</span>
                </div>
                <span class="product-name">${item.name}</span>
                <div class="product-card-qty-row">
                    <span class="product-card-qty-badge">${displayQtyText}</span>
                    <button class="product-add-btn">+</button>
                </div>
            `;

            card.addEventListener("click", () => {
                openUnitSelectionModal(item, emoji);
            });

            grid.appendChild(card);
        });
    }

    // Modal Açılış ve Birim Seçim Dinamikleri
    function openUnitSelectionModal(product, emoji) {
        currentSelectedProduct = { ...product, emoji: emoji };
        currentSelectedUnit = "Adet";
        currentSelectedQty = 1;

        modalProductName.textContent = product.name;
        document.getElementById("modal-product-emoji").textContent = emoji;
        modalQtyVal.textContent = currentSelectedQty;

        // Varsayılan Adet Seçim Stili
        btnSelectPiece.style.borderColor = "var(--accent)";
        btnSelectPiece.style.background = "rgba(129, 79, 255, 0.15)";
        btnSelectBox.style.borderColor = "rgba(255,255,255,0.08)";
        btnSelectBox.style.background = "transparent";

        unitModal.style.display = "flex";
    }

    // Adet / Koli Seçim Butonları
    btnSelectPiece.addEventListener("click", () => {
        currentSelectedUnit = "Adet";
        btnSelectPiece.style.borderColor = "var(--accent)";
        btnSelectPiece.style.background = "rgba(129, 79, 255, 0.15)";
        btnSelectBox.style.borderColor = "rgba(255,255,255,0.08)";
        btnSelectBox.style.background = "transparent";
    });

    btnSelectBox.addEventListener("click", () => {
        currentSelectedUnit = "Koli";
        btnSelectBox.style.borderColor = "var(--accent)";
        btnSelectBox.style.background = "rgba(129, 79, 255, 0.15)";
        btnSelectPiece.style.borderColor = "rgba(255,255,255,0.08)";
        btnSelectPiece.style.background = "transparent";
    });

    // Miktar Kontrolleri
    btnQtyDec.addEventListener("click", () => {
        if (currentSelectedQty > 1) {
            currentSelectedQty--;
            modalQtyVal.textContent = currentSelectedQty;
        }
    });

    btnQtyInc.addEventListener("click", () => {
        currentSelectedQty++;
        modalQtyVal.textContent = currentSelectedQty;
    });

    btnCloseModal.addEventListener("click", () => {
        unitModal.style.display = "none";
    });

    // Modaldan Sepete Kaydet
    btnSaveModal.addEventListener("click", () => {
        if (!currentSelectedProduct) return;

        const existing = basket.find(b => b.name === currentSelectedProduct.name && b.unit === currentSelectedUnit);
        if (existing) {
            existing.quantity += currentSelectedQty;
        } else {
            basket.push({
                name: currentSelectedProduct.name,
                emoji: currentSelectedProduct.emoji,
                quantity: currentSelectedQty,
                unit: currentSelectedUnit
            });
        }

        unitModal.style.display = "none";
        updateBasketUI();
        
        // Aktif kategorideki ürün listesini ve adetleri yenile
        const activeCat = rawMaterials.find(m => m.name === currentSelectedProduct.name);
        if (activeCat) {
            renderProducts(activeCat.category);
        }
    });

    // Sepet Görünümü ve Hesaplamalar
    function updateBasketUI() {
        const container = document.getElementById("cart-items-container");
        container.innerHTML = "";

        if (basket.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 50px;" id="empty-cart-msg">
                    Sepetiniz henüz boş.
                </div>
            `;
            document.getElementById("cart-item-count").textContent = "0 Ürün";
            document.getElementById("total-price").textContent = "0 Ürün";
            return;
        }

        let summaryParts = [];
        let totalItems = 0;
        let pieceSum = 0;
        let boxSum = 0;

        basket.forEach((item, index) => {
            totalItems += item.quantity;
            if (item.unit === "Adet") pieceSum += item.quantity;
            if (item.unit === "Koli") boxSum += item.quantity;

            const div = document.createElement("div");
            div.className = "cart-item";
            div.innerHTML = `
                <div class="cart-item-emoji-placeholder" style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                    ${item.emoji || "📦"}
                </div>
                <div class="cart-item-details">
                    <span class="cart-item-name">${item.name}</span>
                    <div class="cart-item-controls">
                        <button class="cart-qty-btn dec-qty" data-index="${index}">-</button>
                        <span class="cart-qty-val">${item.quantity} ${item.unit}</span>
                        <button class="cart-qty-btn inc-qty" data-index="${index}">+</button>
                    </div>
                </div>
                <button class="cart-item-delete remove-item" data-index="${index}">&times;</button>
            `;

            container.appendChild(div);
        });

        if (pieceSum > 0) summaryParts.push(`${pieceSum} Adet`);
        if (boxSum > 0) summaryParts.push(`${boxSum} Koli`);

        document.getElementById("cart-item-count").textContent = `${totalItems} Birim`;
        document.getElementById("total-price").textContent = summaryParts.join(", ");

        // Sepet içi kontrolleri bağla
        container.querySelectorAll(".dec-qty").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute("data-index"));
                const item = basket[idx];
                if (item.quantity > 1) {
                    item.quantity--;
                } else {
                    basket.splice(idx, 1);
                }
                updateBasketUI();
                
                const matched = rawMaterials.find(m => m.name === item.name);
                if (matched) renderProducts(matched.category);
            });
        });

        container.querySelectorAll(".inc-qty").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute("data-index"));
                const item = basket[idx];
                item.quantity++;
                updateBasketUI();
                
                const matched = rawMaterials.find(m => m.name === item.name);
                if (matched) renderProducts(matched.category);
            });
        });

        container.querySelectorAll(".remove-item").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute("data-index"));
                const item = basket[idx];
                basket.splice(idx, 1);
                updateBasketUI();
                
                const matched = rawMaterials.find(m => m.name === item.name);
                if (matched) renderProducts(matched.category);
            });
        });
    }

    // Sipariş Gönderimi (WhatsApp & API)
    document.getElementById("btn-complete-order").addEventListener("click", () => {
        if (basket.length === 0) {
            showToast("Sepetiniz boş! Önce sol taraftan ürün seçin.", "error");
            return;
        }

        const branchName = branchInput ? branchInput.value : "Merkez Şube";
        
        // Şubeye özel Sipariş Kodu Üreteci:
        let prefix = "ORD-";
        const bNameLower = branchName.toLowerCase();
        if (bNameLower.includes("değirmen")) {
            prefix = "DĞR-";
        } else if (bNameLower.includes("13 eylül") || bNameLower.includes("vargel")) {
            prefix = "13V-";
        } else if (bNameLower.includes("millet bahçesi")) {
            prefix = "MilV-";
        }
        
        const orderId = prefix + Math.floor(1000 + Math.random() * 9000);
        const orderDateStr = new Date().toLocaleString("tr-TR");

        const orderData = {
            id: orderId,
            branch: branchName,
            username: loggedInUser.username || "ortak",
            status: "pending",
            date: orderDateStr,
            items: basket.map(item => ({
                name: item.name,
                qty: item.quantity,
                unit: item.unit
            }))
        };

        fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showToast("Sipariş başarıyla kaydedildi, WhatsApp'a yönlendiriliyorsunuz...", "success");

                // WhatsApp Mesaj Şablonu:
                let message = `*Değirmen Kafe - Yeni Sipariş Talebi*\n`;
                message += `*Şube:* ${branchName}\n`;
                message += `*Sipariş Kodu:* ${orderId}\n`;
                message += `*Tarih:* ${orderDateStr}\n`;
                message += `*ÜRÜNLER:*\n`;
                
                basket.forEach(item => {
                    message += `- ${item.name} : *${item.quantity} ${item.unit}*\n`;
                });

                const totalText = document.getElementById("total-price").textContent;
                message += `*Toplam Miktar:* ${totalText}`;

                const encodedMsg = encodeURIComponent(message);
                
                // Telefon tanımlı olmasa bile genel gönderme API'sini yeni sekmede tetikler
                const waUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
                
                // Sepeti temizle
                basket = [];
                updateBasketUI();
                showCategoriesMenu();

                setTimeout(() => {
                    // Iframe sandbox'ından kaçmak için yeni sekmede temizce açar
                    window.open(waUrl, "_blank");
                }, 800);
            } else {
                showToast("Hata: " + (result.message || "Sipariş kaydedilemedi."), "error");
            }
        })
        .catch(err => {
            console.error("Sipariş hatası:", err);
            showToast("Sistem Hatası: " + err.message, "error");
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {
    let allData = [];

    // Theme Management
    const htmlElement = document.documentElement;
    const btnLight = document.getElementById("theme-btn-light");
    const btnDark = document.getElementById("theme-btn-dark");

    function applyTheme(theme) {
        htmlElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);

        if (theme === "dark") {
            if (btnDark) btnDark.classList.add("active");
            if (btnLight) btnLight.classList.remove("active");
        } else {
            if (btnLight) btnLight.classList.add("active");
            if (btnDark) btnDark.classList.remove("active");
        }
    }

    if (btnLight) btnLight.addEventListener("click", () => applyTheme("light"));
    if (btnDark) btnDark.addEventListener("click", () => applyTheme("dark"));

    applyTheme(localStorage.getItem("theme") || "dark");

    const OFFLINE_MENU_RECIPES = [
        {
            "id": "sicak",
            "label": "SICAK İÇECEKLER",
            "items": [
                {
                    "name": "FİLTRE KAHVE (BREWED COFFEE)",
                    "gramaj": "Standart Kupa (240ml)",
                    "icon": "☕",
                    "ingredients": [
                        { "name": "HM-FİLTRE KAHVE", "amount": "15 gr" },
                        { "name": "Sıcak Su (92 Derece)", "amount": "220 ml" }
                    ],
                    "prep": [
                        "Filtre kağıdını sıcak su ile ıslatın ve hazneyi temizleyin.",
                        "15 gram taze öğütülmüş filtre kahveyi kağıt filtreye ekleyin.",
                        "92 derece sıcak suyu dairesel hareketlerle kahvenin üzerine yavaşça dökerek demleyin."
                    ]
                },
                {
                    "name": "TÜRK KAHVESİ (TURKISH COFFEE)",
                    "gramaj": "Fincan (70ml)",
                    "icon": "☕",
                    "ingredients": [
                        { "name": "HM-TÜRK KAHVESİ (ORTA KAVRULMUŞ)", "amount": "7 gr" },
                        { "name": "İçme Suyu", "amount": "65 ml" }
                    ],
                    "prep": [
                        "Cezveye 7 gram taze Türk kahvesini ve 65 ml oda sıcaklığındaki suyu ekleyin.",
                        "Kahveyi ve suyu cezvede yavaşça karıştırın.",
                        "Kısık ateşte köpüklenene kadar pişirin ve köpüğünü fincana aldıktan sonra servis edin."
                    ]
                }
            ]
        },
        {
            "id": "cold_coffee",
            "label": "SOĞUK KAHVELER",
            "items": [
                {
                    "name": "ICE LATTE",
                    "gramaj": "Büyük Boy Bardak (350ml)",
                    "icon": "🥤",
                    "ingredients": [
                        { "name": "HM-ESPRESSO ÇEKİRDEĞİ (ORTA KAVRULMUŞ)", "amount": "2 Shot (60ml)" },
                        { "name": "Soğuk Süt", "amount": "200 ml" },
                        { "name": "Buz Küpü", "amount": "6 Adet" }
                    ],
                    "prep": [
                        "Bardağa 6 adet buz küpünü ekleyin.",
                        "Buzların üzerine 200 ml soğuk sütü doldurun.",
                        "En son taze çekilmiş 2 shot espressoyu bardağın üzerinden yavaşça dökerek katmanlı servis yapın."
                    ]
                }
            ]
        }
    ];

    // 1. Verileri Çek
    fetch("/api/menu-recipes?t=" + Date.now())
        .then(r => r.json())
        .then(data => {
            allData = data;
            localStorage.setItem("menu_recipes_local", JSON.stringify(data));
            renderCategoryOverviewCards();
        })
        .catch(err => {
            console.warn("Sunucu bulunamadı, yerel reçeteler yükleniyor...");
            let localRecipes = JSON.parse(localStorage.getItem("menu_recipes_local"));
            if (!localRecipes) {
                localRecipes = OFFLINE_MENU_RECIPES;
                localStorage.setItem("menu_recipes_local", JSON.stringify(localRecipes));
            }
            allData = localRecipes;
            renderCategoryOverviewCards();
        });

    // Sayfa Yönetimi
    window.showPage = function(pageId) {
        document.querySelectorAll('.menu-page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('page-' + pageId);
        if (target) {
            target.classList.add('active');
        }
    };

    // Dinamik Kategori Kartları Eşleşme İkon & Renkleri
    const colorMap = {
        "sicak":       { bg: "rgba(255, 92, 53, 0.2)", text: "#ff5c35", icon: "☕", tag: "Sıcak Menü" },
        "cold_coffee": { bg: "rgba(59, 130, 246, 0.2)", text: "#3b82f6", icon: "❄️", tag: "Soğuk Menü" },
        "frappe":      { bg: "rgba(236, 72, 153, 0.2)", text: "#ec4899", icon: "🍨", tag: "Blender" },
        "frozen":      { bg: "rgba(249, 115, 22, 0.2)", text: "#f97316", icon: "🍧", tag: "Buzlu Püre" },
        "fresh_drink": { bg: "rgba(20, 184, 166, 0.2)", text: "#14b8a6", icon: "🍋", tag: "Ferahlatıcı" },
        "milkshake":   { bg: "rgba(167, 139, 250, 0.2)", text: "#a78bfa", icon: "🥤", tag: "Shake" },
        "alt_fresh":   { bg: "rgba(34, 197, 94, 0.2)", text: "#22c55e", icon: "🌿", tag: "Doğal" }
    };

    function getCategoryStyle(dbId) {
        return colorMap[dbId] || { bg: "rgba(129, 79, 255, 0.2)", text: "#814fff", icon: "☕", tag: "Yeni Kategori" };
    }

    // Ana Overview Kategori Kartlarını Render Et
    function renderCategoryOverviewCards() {
        const grid = document.getElementById("overview-categories-grid");
        if (!grid) return;
        grid.innerHTML = "";

        allData.forEach(cat => {
            const style = getCategoryStyle(cat.id);
            const card = document.createElement("div");
            card.className = "card-container-3d";
            card.style.cursor = "pointer";

            // Kategori özelliklerini al (ilk iki ürün adı gibi)
            let featuresHtml = "";
            if (cat.items && cat.items.length > 0) {
                cat.items.slice(0, 2).forEach(item => {
                    featuresHtml += `
                        <div class="feature-item-3d">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <span>${item.name}</span>
                        </div>
                    `;
                });
            } else {
                featuresHtml = `
                    <div class="feature-item-3d">
                        <span>Henüz ürün eklenmemiş</span>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="main-card-3d">
                    <div class="header-3d">
                        <div class="icon-box-3d" style="background: ${style.bg}; color: ${style.text};">
                            <span style="font-size: 20px;">${style.icon}</span>
                        </div>
                        <div class="header-text-3d">
                            <h3>${cat.label}</h3>
                            <p>${cat.items ? cat.items.length : 0} Ürün Tarifi</p>
                        </div>
                    </div>
                    <div class="features-3d">
                        ${featuresHtml}
                    </div>
                    <div class="footer-3d">
                        <div class="price-box-3d">
                            <h4>Kitap</h4>
                            <p>Kategori</p>
                        </div>
                        <div class="tag-3d" style="background: ${style.bg}; color: ${style.text};">
                            <span>${style.tag}</span>
                        </div>
                    </div>
                </div>
                <div class="cta-button-layer-3d" style="background: ${style.text}; color: #fff !important; box-shadow: 0 4px 15px ${style.bg};">
                    <span>İncele</span>
                </div>
            `;

            card.addEventListener("click", () => {
                openCategoryPage(cat);
            });

            grid.appendChild(card);
        });
        lucide.createIcons();
    }

    // Dinamik Kategori Sayfasını Aç ve Ürünlerini Listele
    function openCategoryPage(cat) {
        const style = getCategoryStyle(cat.id);
        
        document.getElementById("dynamic-category-title").innerHTML = `<span style="color: ${style.text}; font-size: 32px; margin-right: 8px;">${style.icon}</span> ${cat.label.toUpperCase()}`;
        document.getElementById("dynamic-category-subtitle").textContent = `${cat.label} kategorisi altındaki taze ürün hazırlama tarifleri.`;

        const grid = document.getElementById("dynamic-category-grid");
        grid.innerHTML = "";

        if (!cat.items || cat.items.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center text-slate-400 py-10 font-bold">
                    Bu kategoride henüz reçete veya ürün bulunmuyor.
                </div>
            `;
            showPage("dynamic-category");
            return;
        }

        cat.items.forEach(item => {
            const cardContainer = document.createElement("div");
            cardContainer.className = "card-container-3d";
            cardContainer.style.cursor = "pointer";

            let ingredientsHtml = "";
            if (item.ingredients && item.ingredients.length > 0) {
                item.ingredients.slice(0, 3).forEach(ing => {
                    const pName = ing.product || ing.name || "";
                    ingredientsHtml += `
                        <div class="feature-item-3d">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <span>${pName} (${ing.amount} ${ing.unit || 'gr'})</span>
                        </div>
                    `;
                });
                if (item.ingredients.length > 3) {
                    ingredientsHtml += `
                        <div class="feature-item-3d">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                            <span>+ ${item.ingredients.length - 3} malzeme daha</span>
                        </div>
                    `;
                }
            } else {
                ingredientsHtml = `
                    <div class="feature-item-3d">
                        <span>Malzeme detayları girilmemiş.</span>
                    </div>
                `;
            }

            cardContainer.innerHTML = `
                <div class="main-card-3d">
                    <div class="header-3d">
                        <div class="icon-box-3d" style="background: ${style.bg}; color: ${style.text};">
                            <span style="font-size: 18px;">${style.icon}</span>
                        </div>
                        <div class="header-text-3d">
                            <h3>${item.name}</h3>
                            <p>Hazırlama Tarifi</p>
                        </div>
                    </div>

                    <div class="features-3d">
                        ${ingredientsHtml}
                    </div>

                    <div class="footer-3d">
                        <div class="price-box-3d">
                            <h4>${item.gramaj || 'Standard'}</h4>
                            <p>Porsiyon</p>
                        </div>
                        <div class="tag-3d" style="background: ${style.bg}; color: ${style.text};">
                            <span>Reçete Portalı</span>
                        </div>
                    </div>
                </div>
                <div class="cta-button-layer-3d" style="background: ${style.text}; color: #fff !important; box-shadow: 0 4px 15px ${style.bg};">
                    <span>Tarifi Gör</span>
                </div>
            `;

            cardContainer.addEventListener("click", () => openModal(item, style.icon));
            grid.appendChild(cardContainer);
        });

        showPage("dynamic-category");
    }

    // Modal Fonksiyonları
    window.openModal = function(recipe, categoryIcon) {
        if (!recipe) return;

        const modalIcon = document.getElementById('modal-icon');
        if (modalIcon) modalIcon.textContent = categoryIcon || "☕";

        document.getElementById('modal-name').textContent = recipe.name;
        document.getElementById('modal-gramaj').textContent = recipe.gramaj || "Standart Porsiyon";

        const ingredientsContainer = document.getElementById('modal-ingredients');
        ingredientsContainer.innerHTML = "";

        if (recipe.ingredients && recipe.ingredients.length > 0) {
            recipe.ingredients.forEach(ing => {
                const pName = ing.product || ing.name || "";
                const tag = document.createElement("span");
                tag.className = "ingredient-tag";
                tag.innerHTML = `
                    <span>${pName}</span>
                    <span class="tag-amount">${ing.amount} ${ing.unit || 'gr'}</span>
                `;
                ingredientsContainer.appendChild(tag);
            });
        } else {
            ingredientsContainer.innerHTML = `
                <span class="ingredient-tag">
                    <span>Malzeme belirtilmemiş</span>
                </span>
            `;
        }

        const prepContainer = document.getElementById('modal-prep');
        prepContainer.innerHTML = "";

        const rawInstructions = recipe.instructions || recipe.prep || "";
        if (rawInstructions) {
            const steps = rawInstructions
                .split(/\.\s+|\n/)
                .map(s => s.trim().replace(/^\d+[\.\)]\s*/, ""))
                .filter(s => s.length > 3);

            if (steps.length > 0) {
                steps.forEach((step, i) => {
                    const stepEl = document.createElement("div");
                    stepEl.className = "step-item";
                    stepEl.innerHTML = `
                        <div class="step-number">${i + 1}</div>
                        <div class="step-text">${step}.</div>
                    `;
                    prepContainer.appendChild(stepEl);
                });
            } else {
                prepContainer.innerHTML = `
                    <div class="step-item">
                        <div class="step-number">1</div>
                        <div class="step-text">${rawInstructions}</div>
                    </div>
                `;
            }
        } else {
            prepContainer.innerHTML = `
                <div class="step-item">
                    <div class="step-number">–</div>
                    <div class="step-text">Hazırlanış adımları henüz eklenmemiş.</div>
                </div>
            `;
        }

        document.getElementById('drink-modal').classList.add('active');
    };

    window.closeModal = function(e) {
        if (e.target === document.getElementById('drink-modal')) {
            document.getElementById('drink-modal').classList.remove('active');
        }
    };

    window.closeModalDirect = function() {
        document.getElementById('drink-modal').classList.remove('active');
    };
});

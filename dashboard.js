document.addEventListener("DOMContentLoaded", () => {
    const themeToggleBtn = document.getElementById("theme-toggle");
    const htmlElement = document.documentElement;
    const btnLogout = document.getElementById("btn-logout");
    const btnSettings = document.getElementById("btn-settings");
    const settingsCard = document.getElementById("settings-card");
    const welcomeSection = document.getElementById("welcome-section");

    // Tasarım Geçmişi Buton ve Listesi
    const btnSaveSettings = document.getElementById("btn-save-settings");
    const btnUndoSettings = document.getElementById("btn-undo-settings");
    const savedDesignsList = document.getElementById("saved-designs-list");

    // 1. Oturum Açan Kullanıcı Bilgisi
    let loggedInUser = JSON.parse(localStorage.getItem("user"));
    if (!loggedInUser) {
        window.location.href = "index.html";
        return;
    }

    // Güvenli Çıkış Yap Butonu Olayı (index.html sarmalayıcısına haber verir)
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            window.parent.postMessage({ type: "LOGOUT" }, "*");
        });
    }

    // Eski menü yetkilerini otomatik olarak "Reçeteler Kataloğu"na geçir
    if (loggedInUser && loggedInUser.menus) {
        let changed = false;
        if (loggedInUser.menus.includes("Reçeteler Kitabı")) {
            loggedInUser.menus = loggedInUser.menus.filter(m => m !== "Reçeteler Kitabı");
            changed = true;
        }
        if (!loggedInUser.menus.includes("Reçeteler Kataloğu")) {
            loggedInUser.menus.push("Reçeteler Kataloğu");
            changed = true;
        }
        if (changed) {
            localStorage.setItem("user", JSON.stringify(loggedInUser));
        }
    }

    // Varsayılan Arayüz Durumu (State)
    let configState = {
        headerHeight: 4,
        fontSize: 1.35,
        fontWeight: "700",
        systemTitle: "Değirmen Kafe Panel Sistemi",
        username: loggedInUser.username,
        headerImgBase64: "",
        imgWidth: 120,
        imgHeight: 120,
        imgLeft: 0,
        imgTop: 0,
        imgShadowBlur: 0,
        imgShadowColor: "#000000"
    };

    // LocalStorage'dan oku
    const savedConfig = localStorage.getItem("kafe_config");
    if (savedConfig) {
        configState = { ...configState, ...JSON.parse(savedConfig) };
    }

    // Geçici yedek (Geri Al tuşu için)
    let backupState = { ...configState };

    // 2. Arayüzü Duruma (State) Göre Güncelleyen Fonksiyon
    function applyConfig(config) {
        configState = { ...config };
        
        // CSS Değişkenleri
        htmlElement.style.setProperty("--header-height", `${config.headerHeight}cm`);
        htmlElement.style.setProperty("--title-size", `${config.fontSize}rem`);
        htmlElement.style.setProperty("--title-weight", config.fontWeight);

        // Metinler ve Değerler
        const sysTitle = document.getElementById("system-title-text");
        if (sysTitle) sysTitle.textContent = config.systemTitle;
        const uDisp = document.getElementById("user-display");
        if (uDisp) uDisp.textContent = loggedInUser.username;
        const wUsername = document.getElementById("welcome-username");
        if (wUsername) wUsername.textContent = loggedInUser.username;

        // Dinamik Üst Panel Görseli Kaldırıldı
        let existingImg = document.getElementById("header-custom-logo");
        if (existingImg) {
            existingImg.remove();
        }
    }

    // İlk yüklemede veriyi ayarla
    applyConfig(configState);
    
    // 1.5. Bölge Sabitleme ve Başlık Güncelleme
    const userRegion = (loggedInUser && loggedInUser.region) || "Hepsi";
    const subtitleEl = document.querySelector(".subtitle");
    if (subtitleEl) {
        subtitleEl.textContent = `Yönetmek istediğiniz ${userRegion === 'Hepsi' ? 'Değirmen Kafe' : userRegion} modülünü seçerek hemen içeriye giriş yapın.`;
    }

    const roleDisplay = document.getElementById("role-display");
    const regionDisplay = document.getElementById("region-display");
    if (roleDisplay && loggedInUser && loggedInUser.role) {
        roleDisplay.textContent = loggedInUser.role.toUpperCase();
        roleDisplay.classList.add(loggedInUser.role === 'yönetici' ? 'role-admin' : 'role-staff');
    }
    if (regionDisplay) {
        regionDisplay.textContent = userRegion === "Hepsi" ? "TÜM BÖLGELER" : userRegion.toUpperCase();
    }

    // Yetkilendirme & Menü Kısıtlamaları Kontrolü
    let userMenus = loggedInUser.menus || ["Sipariş Arayüzü", "Reçeteler Kataloğu", "Sistem Ayarları", "Envanter Takip"];
    
    // Eğer bölge kısıtlaması varsa, sistem ayarlarını ve tasarım ayarlarını tamamen kaldırıyoruz
    if (userRegion !== "Hepsi") {
        userMenus = userMenus.filter(m => m !== "Sistem Ayarları" && m !== "Arayüz Tasarımı");
    }

    // 3D Modül Kartlarının Yetki Kontrolü
    const cardInventory = document.getElementById("card-inventory");
    if (cardInventory) {
        if (userMenus.includes("Envanter Takip")) {
            cardInventory.style.display = "block";
        } else {
            cardInventory.style.display = "none";
        }
    }
    const cardRecipes = document.getElementById("card-recipes");
    if (cardRecipes) {
        if (userMenus.includes("Reçeteler Kataloğu") || userMenus.includes("Reçeteler Kitabı")) {
            cardRecipes.style.display = "block";
        } else {
            cardRecipes.style.display = "none";
        }
    }

    const cardStore = document.getElementById("card-store");
    if (cardStore) {
        if (userMenus.includes("Sipariş Arayüzü")) {
            cardStore.style.display = "block";
        } else {
            cardStore.style.display = "none";
        }
    }

    const userRole = (loggedInUser.role || "").toLowerCase();
    const isAdminOrManager = userRole === "admin" || userRole === "yönetici" || userRole === "yonetici" || userRole === "manager";

    const cardArchive = document.getElementById("card-archive");
    if (cardArchive) {
        // Arşivi sadece yönetici rolüne sahip veya "Sistem Ayarları" menüsü açık olan kullanıcılar görsün
        if (isAdminOrManager && userRegion === "Hepsi") {
            cardArchive.style.display = "block";
        } else {
            cardArchive.style.display = "none";
        }
    }

    // Üst Bar Butonlarının Yetki Kontrolü
    const btnSettingsHeader = document.getElementById("btn-settings");
    if (btnSettingsHeader) {
        if (isAdminOrManager) {
            btnSettingsHeader.style.display = "flex";
        } else {
            btnSettingsHeader.style.display = "none";
        }
    }
    const btnRecipesHeader = document.querySelector('a[href="catalog.html"]');
    if (btnRecipesHeader && !userMenus.includes("Reçeteler Kataloğu")) {
        btnRecipesHeader.style.display = "none";
    }
    const btnStoreHeader = document.querySelector('a[href="store.html"]');
    if (btnStoreHeader && !userMenus.includes("Sipariş Arayüzü")) {
        btnStoreHeader.style.display = "none";
    }

    // 3. Tema Yönetimi (Segmented Switcher)
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
        
        // Slayt metin renklerini tema değişiminde hemen yenile
        if (typeof renderCurrentSlide === "function" && promoSlides.length > 0) {
            renderCurrentSlide();
        }
    }

    // Click Event Dinleyicileri
    if (btnLight) btnLight.addEventListener("click", () => applyTheme("light"));
    if (btnDark) btnDark.addEventListener("click", () => applyTheme("dark"));

    // İlk yüklemede temayı ayarla
    applyTheme(localStorage.getItem("theme") || "dark");

    window.addEventListener("storage", (e) => {
        if (e.key === "theme") {
            applyTheme(e.newValue || "dark");
        }
        if (e.key === "kafe_config") {
            applyConfig(JSON.parse(e.newValue));
        }
    });

    // 4. Yetkili Şifresi Doğrulama Modali & Yönlendirmeler
    const authModal = document.getElementById("settings-auth-modal");
    const authPasswordInput = document.getElementById("auth-modal-password");
    const btnAuthVerify = document.getElementById("btn-auth-modal-verify");
    const btnAuthCancel = document.getElementById("btn-auth-modal-cancel");
    let pendingRedirectUrl = "";

    function promptAuth(targetUrl) {
        if (localStorage.getItem("systemAuth") === "1908") {
            window.location.href = targetUrl;
            return;
        }
        pendingRedirectUrl = targetUrl;
        authModal.style.display = "flex";
        authPasswordInput.value = "";
        authPasswordInput.focus();
    }

    if (btnSettings) {
        btnSettings.addEventListener("click", (e) => {
            e.preventDefault();
            promptAuth("setup.html");
        });
    }

    // Kartların click olaylarını yakala
    document.querySelectorAll(".main-card-3d").forEach(card => {
        const href = card.getAttribute("href");
        if (href && href.startsWith("setup")) {
            card.addEventListener("click", (e) => {
                e.preventDefault();
                promptAuth(href);
            });
        }
    });

    btnAuthVerify.addEventListener("click", () => {
        if (authPasswordInput.value.trim() === "1908") {
            localStorage.setItem("systemAuth", "1908");
            authModal.style.display = "none";
            if (pendingRedirectUrl) window.location.href = pendingRedirectUrl;
        } else {
            alert("Hatalı Yetkili Şifresi!");
            authPasswordInput.value = "";
            authPasswordInput.focus();
        }
    });

    authPasswordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") btnAuthVerify.click();
    });

    btnAuthCancel.addEventListener("click", () => {
        authModal.style.display = "none";
    });

    // URL'den yönlendirme şifre isteği gelmişse otomatik aç
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("promptAuth") === "1") {
        promptAuth("setup.html");
    }

    // Arayüz ayarları başlangıçta yüklendiği için bu mükerrer blok kaldırıldı.

    // ==========================================
    // TANITIM ALANI (SLIDE CAROUSEL) DİNAMİK YÖNETİMİ
    // ==========================================
    let promoSlides = [];
    let currentSlideIndex = 0;
    let slideTimer = null;

    const promoTitle = document.getElementById("promo-title");
    const promoDesc = document.getElementById("promo-desc");
    const promoDesc2 = document.getElementById("promo-desc2");
    const promoVideoPlayer = document.getElementById("promo-video-player");
    const promoIndicator = document.getElementById("promo-indicator");

    const DEFAULT_SLIDES = [
        {
            "title": "Değirmen Kafe Portalı",
            "desc": "Personel ve hammadde yönetim paneline hoş geldiniz.",
            "desc2": "Menülerden yapmak istediğiniz işlemleri seçebilirsiniz.",
            "titleFontFamily": "Outfit",
            "titleFontSize": 38,
            "titleFontWeight": "800",
            "titleColor": "#ffffff",
            "titleAlign": "left"
        }
    ];

    function fetchAndRenderPromoBanner() {
        fetch("/api/slides?t=" + Date.now())
            .then(res => res.json())
            .then(slides => {
                processSlides(slides);
            })
            .catch(err => {
                console.warn("Sunucu bulunamadı, varsayılan slayt yükleniyor...");
                processSlides(DEFAULT_SLIDES);
            });
    }

    function processSlides(slides) {
        promoSlides = slides;
        if (promoSlides.length === 0) {
            if(promoTitle) promoTitle.textContent = "Değirmen Kafe Portalı";
            if(promoDesc) promoDesc.textContent = "Personel ve hammadde yönetim paneline hoş geldiniz.";
            if (promoDesc2) promoDesc2.textContent = "";
            return;
        }
        if (promoVideoPlayer) promoVideoPlayer.style.display = "block";
        
        renderIndicators();
        showSlide(0);
        startSlideTimer();
    }

    function renderIndicators() {
        if (!promoIndicator) return;
        promoIndicator.innerHTML = "";
        promoSlides.forEach((_, idx) => {
            const dot = document.createElement("span");
            dot.className = `indicator-dot ${idx === 0 ? 'active' : ''}`;
            dot.setAttribute("data-index", idx);
            dot.addEventListener("click", () => {
                stopSlideTimer();
                showSlide(idx);
                startSlideTimer();
            });
            promoIndicator.appendChild(dot);
        });
    }

    function showSlide(index) {
        if (!promoVideoPlayer || promoSlides.length === 0) return;
        currentSlideIndex = index;
        const slide = promoSlides[index];
        
        // Yumuşak geçiş animasyonu
        if(promoTitle) promoTitle.style.opacity = "0";
        if(promoDesc) promoDesc.style.opacity = "0";
        if(promoDesc2) promoDesc2.style.opacity = "0";
        
        setTimeout(() => {
            if(promoTitle) promoTitle.textContent = slide.title;
            if(promoDesc) promoDesc.textContent = slide.desc || "";
            if(promoDesc2) promoDesc2.textContent = slide.desc2 || "";

            // Başlık Font ve Hizalama Ayarları
            let titleFont = `'${slide.titleFontFamily || "Inter"}', sans-serif`;
            if (slide.titleFontFamily === "Cinzel") titleFont = "'Cinzel', serif";
            if (slide.titleFontFamily === "Pacifico") titleFont = "'Pacifico', cursive";
            if (slide.titleFontFamily === "Righteous") titleFont = "'Righteous', sans-serif";
            if (slide.titleFontFamily === "Sacramento") titleFont = "'Sacramento', cursive";
            if (slide.titleFontFamily === "Cormorant Garamond") titleFont = "'Cormorant Garamond', serif";
            if (slide.titleFontFamily === "Makcasa") titleFont = "'Makcasa', cursive";
            if (slide.titleFontFamily === "Mitshuka") titleFont = "'Mitshuka', cursive";
            if (slide.titleFontFamily === "Modern Romance") titleFont = "'Modern Romance', serif";
            if (slide.titleFontFamily === "Utendo") titleFont = "'Utendo', sans-serif";

            const currentTheme = htmlElement.getAttribute("data-theme") || "light";
            const defaultTextColor = currentTheme === "dark" ? "#ffffff" : "#1e293b";
            const defaultSubTextColor = currentTheme === "dark" ? "#cbd5e1" : "#475569";

            if (promoTitle) {
                promoTitle.style.fontFamily = titleFont;
                promoTitle.style.fontSize = `${slide.titleFontSize || 38}px`;
                promoTitle.style.fontWeight = slide.titleFontWeight || "900";
                promoTitle.style.color = (slide.titleColor && slide.titleColor !== "#ffffff") ? slide.titleColor : defaultTextColor;
            }

            const alignVal = slide.titleAlign || "left";
            const textBlock = document.querySelector(".promo-text-block");
            if (textBlock) {
                textBlock.style.textAlign = alignVal;
                if (alignVal === "center") {
                    textBlock.style.alignItems = "center";
                    textBlock.style.justifyContent = "center";
                } else if (alignVal === "right") {
                    textBlock.style.alignItems = "flex-end";
                    textBlock.style.justifyContent = "flex-end";
                } else {
                    textBlock.style.alignItems = "flex-start";
                    textBlock.style.justifyContent = "flex-start";
                }
            }

            // Font Stilleri (Açıklama 1)
            let descFont = `'${slide.descFontFamily || "Inter"}', sans-serif`;
            if (slide.descFontFamily === "Cinzel") descFont = "'Cinzel', serif";
            if (slide.descFontFamily === "Pacifico") descFont = "'Pacifico', cursive";
            if (slide.descFontFamily === "Righteous") descFont = "'Righteous', sans-serif";
            if (slide.descFontFamily === "Sacramento") descFont = "'Sacramento', cursive";
            if (slide.descFontFamily === "Cormorant Garamond") descFont = "'Cormorant Garamond', serif";
            if (slide.descFontFamily === "Makcasa") descFont = "'Makcasa', cursive";
            if (slide.descFontFamily === "Mitshuka") descFont = "'Mitshuka', cursive";
            if (slide.descFontFamily === "Modern Romance") descFont = "'Modern Romance', serif";
            if (slide.descFontFamily === "Utendo") descFont = "'Utendo', sans-serif";

            if (promoDesc) {
                promoDesc.style.fontFamily = descFont;
                promoDesc.style.fontSize = `${slide.descFontSize || 13}px`;
                promoDesc.style.fontWeight = slide.descFontWeight || "400";
                promoDesc.style.color = (slide.descColor && slide.descColor !== "#ffffff") ? slide.descColor : defaultSubTextColor;
            }

            // Font Stilleri (Açıklama 2)
            if (promoDesc2) {
                let desc2Font = `'${slide.desc2FontFamily || "Inter"}', sans-serif`;
                if (slide.desc2FontFamily === "Cinzel") desc2Font = "'Cinzel', serif";
                if (slide.desc2FontFamily === "Pacifico") desc2Font = "'Pacifico', cursive";
                if (slide.desc2FontFamily === "Righteous") desc2Font = "'Righteous', sans-serif";
                if (slide.desc2FontFamily === "Sacramento") desc2Font = "'Sacramento', cursive";
                if (slide.desc2FontFamily === "Cormorant Garamond") desc2Font = "'Cormorant Garamond', serif";
                if (slide.desc2FontFamily === "Makcasa") desc2Font = "'Makcasa', cursive";
                if (slide.desc2FontFamily === "Mitshuka") desc2Font = "'Mitshuka', cursive";
                if (slide.desc2FontFamily === "Modern Romance") desc2Font = "'Modern Romance', serif";
                if (slide.desc2FontFamily === "Utendo") desc2Font = "'Utendo', sans-serif";

                promoDesc2.style.fontFamily = desc2Font;
                promoDesc2.style.fontSize = `${slide.desc2FontSize || 12}px`;
                promoDesc2.style.fontWeight = slide.desc2FontWeight || "400";
                promoDesc2.style.color = (slide.desc2Color && slide.desc2Color !== "#ffffff") ? slide.desc2Color : defaultSubTextColor;
            }
            
            // Video yerleşimi (fit)
            promoVideoPlayer.style.objectFit = slide.videoFit || "cover";
            promoVideoPlayer.muted = true;
            promoVideoPlayer.playsInline = true;
            
            // Tarayıcı güvenlik kısıtlamalarını aşmak için özellikleri tekrar zorla uyguluyoruz
            promoVideoPlayer.muted = true;
            promoVideoPlayer.defaultMuted = true;
            promoVideoPlayer.autoplay = true;
            promoVideoPlayer.loop = true;
            
            // Video kaynağı statik remote olarak kalsın, üzerine yazmayı engelliyoruz.
            if (!promoVideoPlayer.src || promoVideoPlayer.src.includes("intro_video_primary.mp4")) {
                promoVideoPlayer.src = "https://assets.mixkit.co/videos/preview/mixkit-coffee-beans-falling-in-a-glass-jar-40545-large.mp4";
            }
            
            // Doğrudan oynatmayı dene
            const playPromise = promoVideoPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("Video başarıyla oynatılıyor.");
                }).catch(error => {
                    console.log("Auto-play was prevented. Retrying on click...", error);
                    const startVideoOnInteraction = () => {
                        promoVideoPlayer.muted = true;
                        promoVideoPlayer.play().then(() => {
                            document.removeEventListener('click', startVideoOnInteraction);
                        }).catch(e => console.log(e));
                    };
                    document.addEventListener('click', startVideoOnInteraction);
                });
            }
            
            if (promoTitle) promoTitle.style.opacity = "1";
            if (promoDesc) promoDesc.style.opacity = "1";
            if (promoDesc2) promoDesc2.style.opacity = "1";
        }, 200);

        // Aktif noktayı güncelle
        if (promoIndicator) {
            const dots = promoIndicator.querySelectorAll(".indicator-dot");
            dots.forEach((dot, idx) => {
                if (idx === index) {
                    dot.classList.add("active");
                } else {
                    dot.classList.remove("active");
                }
            });
        }
    }

    function startSlideTimer() {
        if (slideTimer) clearInterval(slideTimer);
        slideTimer = setInterval(() => {
            if (promoSlides.length > 0) {
                let nextIndex = (currentSlideIndex + 1) % promoSlides.length;
                showSlide(nextIndex);
            }
        }, 8000);
    }

    function stopSlideTimer() {
        if (slideTimer) clearInterval(slideTimer);
    }

    // İlk yüklemede bannerı hazırla
    fetchAndRenderPromoBanner();

    // Video bittiğinde sonraki slayta otomatik geç
    if (promoVideoPlayer) {
        promoVideoPlayer.addEventListener("ended", () => {
            if (promoSlides.length > 0) {
                let nextIndex = (currentSlideIndex + 1) % promoSlides.length;
                showSlide(nextIndex);
            }
        });
    }


    // Sistem Kurulumu alt pencereleri müstakil sayfalara taşındı.


    // 8. Çıkış Yap İşlemi
    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "index.html";
    });

    // 9. Dinamik STK (Son Kullanma Tarihi) & Kritik Limit Uyarı Sistemi
    // 9. Dinamik STK (Son Kullanma Tarihi) & Kritik Limit Uyarı Sistemi
    fetch("/api/recipes?t=" + Date.now())
        .then(res => res.json())
        .then(data => {
            processSTKAlerts(data);
        })
        .catch(err => {
            console.warn("STK kontrolü yerel hammadde veritabanı üzerinden yapılıyor...");
            // Yerel çevrimdışı hammadde veritabanı yedeği
            const localMaterials = JSON.parse(localStorage.getItem("raw_materials_local")) || [];
            processSTKAlerts(localMaterials);
        });

    function processSTKAlerts(data) {
        if (!Array.isArray(data)) return;
        let alerts = [];
        const today = new Date();
        data.forEach(cat => {
            if (cat.items && Array.isArray(cat.items)) {
                cat.items.forEach(item => {
                    if (item.stk) {
                        const stkDate = new Date(item.stk);
                        const diffTime = stkDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays <= 7) {
                            alerts.push({
                                name: item.name,
                                days: diffDays,
                                date: item.stk
                            });
                        }
                    }
                });
            }
        });

        if (alerts.length > 0) {
            const alertCard = document.createElement("div");
            alertCard.style.cssText = "background: rgba(239, 68, 68, 0.1); border: 1.5px solid #ef4444; border-radius: 20px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.05);";
            
            let html = `<h4 style="color: #ef4444; margin: 0 0 10px 0; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                            ⚠️ KRİTİK STK UYARISI: SON KULLANMA TARİHİ YAKLAŞAN HAMMADDELER VAR!
                        </h4>`;
            html += `<ul style="margin: 0; padding-left: 20px; color: var(--text-primary); font-size: 13px; line-height: 1.6; list-style-type: square;">`;
            alerts.forEach(a => {
                if (a.days < 0) {
                    html += `<li><strong style="color: #ef4444;">${a.name}</strong> - Son Kullanım Tarihi GEÇTİ! (STK: ${a.date})</li>`;
                } else {
                    html += `<li><strong style="color: #f59e0b;">${a.name}</strong> - Son Kullanım Tarihine <strong style="text-decoration: underline;">${a.days} gün</strong> kaldı! (STK: ${a.date})</li>`;
                }
            });
            html += `</ul>`;
            alertCard.innerHTML = html;
            
            const welcomeHeader = document.querySelector(".welcome-header-box");
            if (welcomeHeader) {
                welcomeHeader.after(alertCard);
            }
        }
    }

    // Müzik kontrolü artık üst parent layout (index.html) üzerinden global yönetilmektedir.

    // ==========================================
    // 💬 Ortak Kullanıcı Not Panosu (Speech Bubble / Floating Comment Bubble UI)
    // ==========================================
    window.loadNotes = function() {
        fetch('/api/notes')
            .then(res => res.json())
            .then(notes => {
                renderNotesBubbles(notes);
            })
            .catch(err => {
                console.warn("Ortak notlar yerel hafızadan (localStorage) yükleniyor...");
                const localNotes = JSON.parse(localStorage.getItem("local_notes")) || [];
                renderNotesBubbles(localNotes);
            });
    };

    function renderNotesBubbles(notes) {
        const container = document.getElementById("notes-speech-bubbles-container");
        if (!container) return;
        container.innerHTML = "";

        if (!Array.isArray(notes) || notes.length === 0) {
            container.innerHTML = `<p style="font-size: 13px; color: var(--text-secondary); font-style: italic; font-weight: 500; width: 100%;">Henüz panoya asılmış bir kullanıcı notu bulunmuyor.</p>`;
            return;
        }

        // Sabitlenen notları en üste alacak şekilde sırala
        notes.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

                notes.forEach(note => {
                    const bubble = document.createElement("div");
                    bubble.className = "speech-bubble-item";
                    bubble.style.cssText = "width: 100%; max-width: 330px; display: inline-block; vertical-align: top;";
                    
                    // Avatar harfleri ve rastgele renk paleti
                    const initial = (note.username || "U").charAt(0).toUpperCase();
                    const colors = ["#814fff", "#ff5c35", "#10b981", "#3b82f6", "#ec4899", "#f59e0b"];
                    const avatarColor = colors[note.username.length % colors.length];

                    // Yetki rozeti
                    const userRole = (note.role || "Personel").toLowerCase();
                    let badgeClass = "badge-staff";
                    let badgeStyle = "background: rgba(255,255,255,0.06); color: var(--text-secondary);";
                    if (userRole === "admin" || userRole === "yönetici") {
                        badgeStyle = "background: rgba(129, 79, 255, 0.12); color: #814fff;";
                    } else if (userRole === "bölge sorumlusu") {
                        badgeStyle = "background: rgba(255, 92, 53, 0.12); color: #ff5c35;";
                    }

                    // Not içeriğini formatla: Mention, Hashtag, Linkler
                    let formattedContent = note.content
                        .replace(/(@\w+)/g, '<span class="note-mention">$1</span>')
                        .replace(/(#\w+)/g, '<span class="note-hashtag">$1</span>')
                        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="note-link">$1</a>');

                    // Giriş yapan kullanıcı yetkileri
                    const loginRole = (loggedInUser.role || "").toLowerCase();
                    const isOwnerOrAdmin = loggedInUser.username === note.username || loginRole === "admin" || loginRole === "yönetici";
                    const pinIconColor = note.pinned ? "#ff5c35" : "rgba(255,255,255,0.4)";

                    // Yanıtları render et
                    let repliesHtml = "";
                    if (note.replies && note.replies.length > 0) {
                        repliesHtml = `<div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--border-color); display: flex; flex-direction: column; gap: 8px;">`;
                        note.replies.forEach(rep => {
                            repliesHtml += `
                                <div style="font-size: 11px; line-height: 1.4;">
                                    <strong style="color: var(--accent); font-weight: 700;">${rep.username}:</strong> 
                                    <span style="color: var(--text-primary); font-weight: 500;">${rep.content}</span>
                                    <span style="font-size: 9px; color: var(--text-secondary); display: block; margin-top: 2px;">${rep.date}</span>
                                </div>
                            `;
                        });
                        repliesHtml += `</div>`;
                    }

                    bubble.innerHTML = `
                        <!-- Konuşma Balonu (Speech Bubble Card) -->
                        <div class="speech-bubble-card" style="${note.pinned ? 'border-color: #ff5c35; box-shadow: 0 10px 30px rgba(255, 92, 53, 0.08);' : ''}">
                            <!-- Üst Bilgi Alanı -->
                            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 4px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${avatarColor}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; text-transform: uppercase;">
                                        ${initial}
                                    </div>
                                    <div>
                                        <strong style="font-size: 13px; font-weight: 800; color: var(--text-primary); display: block; line-height: 1.2;">${note.username}</strong>
                                        <span style="font-size: 9px; font-weight: 700; border-radius: 4px; padding: 2px 6px; display: inline-block; margin-top: 2px; ${badgeStyle}">${note.role.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <span style="font-size: 10px; font-weight: 600; color: var(--text-secondary); display: block; line-height: 1.2;">${note.date}</span>
                                    <span style="font-size: 9px; font-weight: 600; color: var(--text-secondary); display: block; margin-top: 2px;">${note.time}</span>
                                </div>
                            </div>

                            <!-- Orta Not İçerik Alanı -->
                            <p style="font-size: 14px; font-weight: 600; color: var(--text-primary); line-height: 1.5; margin: 4px 0; white-space: pre-wrap; word-break: break-word;">${formattedContent}</p>

                            <!-- Yanıtlar Alanı -->
                            ${repliesHtml}

                            <!-- Alt Bölüm: Etkileşim Butonları -->
                            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: 4px;">
                                <button onclick="likeNote('${note.id}')" style="background: none; border: none; font-size: 12px; font-weight: 700; color: #ef4444; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                    <span>❤️</span> <span>${note.likes || 0}</span>
                                </button>
                                
                                <button onclick="promptReply('${note.id}')" style="background: none; border: none; font-size: 12px; font-weight: 700; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                    <span>💬</span> <span>Cevapla</span>
                                </button>

                                <button onclick="pinNote('${note.id}')" style="background: none; border: none; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                    <span style="color: ${pinIconColor}; font-weight:700;">📌</span>
                                </button>

                                ${isOwnerOrAdmin ? `
                                    <button onclick="deleteNote('${note.id}')" style="background: none; border: none; font-size: 12px; color: #94a3b8; cursor: pointer;">
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <!-- Alt Avatar İkon Kutusu -->
                        <div class="speech-bubble-avatar-box">
                            💡
                        </div>
                    `;
                    container.appendChild(bubble);
                });
    }

    window.addNewNote = function() {
        const textEl = document.getElementById("new-note-textarea");
        if (!textEl) return;
        const val = textEl.value.trim();
        if (!val) {
            showToast("Lütfen not alanını boş bırakmayın!", "error");
            return;
        }

        const newNoteObj = {
            id: Date.now().toString(),
            username: loggedInUser.username,
            role: loggedInUser.role,
            content: val,
            likes: 0,
            pinned: false,
            replies: [],
            date: new Date().toLocaleDateString('tr-TR'),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };

        fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newNoteObj)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                textEl.value = "";
                showToast("Not başarıyla eklendi!", "success");
                loadNotes();
            }
        })
        .catch(err => {
            // Çevrimdışı/Statik Modda Yerel Hafızaya Notu Ekle
            const localNotes = JSON.parse(localStorage.getItem("local_notes")) || [];
            localNotes.push(newNoteObj);
            localStorage.setItem("local_notes", JSON.stringify(localNotes));
            textEl.value = "";
            showToast("Not başarıyla yerel panoya asıldı!", "success");
            loadNotes();
        });
    };

    window.likeNote = function(id) {
        fetch(`/api/notes/${id}/like`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) loadNotes();
            })
            .catch(err => {
                const localNotes = JSON.parse(localStorage.getItem("local_notes")) || [];
                const note = localNotes.find(n => n.id === id);
                if (note) {
                    note.likes = (note.likes || 0) + 1;
                    localStorage.setItem("local_notes", JSON.stringify(localNotes));
                    loadNotes();
                }
            });
    };

    window.pinNote = function(id) {
        fetch(`/api/notes/${id}/pin`, { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) loadNotes();
            })
            .catch(err => {
                const localNotes = JSON.parse(localStorage.getItem("local_notes")) || [];
                const note = localNotes.find(n => n.id === id);
                if (note) {
                    note.pinned = !note.pinned;
                    localStorage.setItem("local_notes", JSON.stringify(localNotes));
                    loadNotes();
                }
            });
    };

    window.promptReply = function(id) {
        const replyText = prompt("Bu nota cevap yazın:");
        if (!replyText || !replyText.trim()) return;

        const replyObj = {
            username: loggedInUser.username,
            role: loggedInUser.role,
            content: replyText.trim(),
            date: new Date().toLocaleDateString('tr-TR'),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };

        fetch(`/api/notes/${id}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(replyObj)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("Cevabınız eklendi.", "success");
                loadNotes();
            }
        })
        .catch(err => {
            const localNotes = JSON.parse(localStorage.getItem("local_notes")) || [];
            const note = localNotes.find(n => n.id === id);
            if (note) {
                if (!note.replies) note.replies = [];
                note.replies.push(replyObj);
                localStorage.setItem("local_notes", JSON.stringify(localNotes));
                showToast("Cevabınız yerel olarak eklendi.", "success");
                loadNotes();
            }
        });
    };

    window.deleteNote = function(id) {
        if (!confirm("Bu notu panodan kaldırmak istediğinize emin misiniz?")) return;
        fetch('/api/notes/' + id, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast("Not silindi.", "success");
                    loadNotes();
                }
            })
            .catch(err => {
                let localNotes = JSON.parse(localStorage.getItem("local_notes")) || [];
                localNotes = localNotes.filter(n => n.id !== id);
                localStorage.setItem("local_notes", JSON.stringify(localNotes));
                showToast("Not yerel panodan silindi.", "success");
                loadNotes();
            });
    };

    // İlk yüklemede notları çek
    loadNotes();
});

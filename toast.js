// Emil Kowalski style Sonner Toast Notification Manager
(function() {
    // DOM yüklendiğinde veya script yüklendiğinde container'ı hazır et
    function initToastContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    // Genel Toast gösterme fonksiyonu
    window.showToast = function(title, desc = '', type = 'info') {
        const container = initToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast-card toast-${type}`;

        // Tipine göre Lucide/SVG ikon yerleştir
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (type === 'error') {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else {
            // info / generic alert
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `
            <div class="toast-icon">${iconSvg}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${desc ? `<div class="toast-desc">${desc}</div>` : ''}
            </div>
        `;

        container.appendChild(toast);

        // Slide/Spring giriş animasyonunu tetikle
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // 4 saniye sonra kapat ve kaldır
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 400);
        }, 4000);
    };

    // Klasik window.alert fonksiyonunu override et!
    window.alert = function(message) {
        let title = "Sistem Bildirimi";
        let desc = message;
        let type = "info";

        // Mesajın içeriğine göre tipini ve başlığını tahmin et
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes("başarılı") || lowerMessage.includes("güncellendi") || lowerMessage.includes("yüklendi") || lowerMessage.includes("silindi") || lowerMessage.includes("kaydedildi") || lowerMessage.includes("eklendi")) {
            title = "İşlem Başarılı";
            type = "success";
        } else if (lowerMessage.includes("hata") || lowerMessage.includes("başarısız") || lowerMessage.includes("yanlış") || lowerMessage.includes("değil") || lowerMessage.includes("kısıtlaması")) {
            title = "İşlem Hatası";
            type = "error";
        }

        window.showToast(title, desc, type);
    };

    // Sayfa yüklendiğinde otomatik olarak container'ı kur
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initToastContainer);
    } else {
        initToastContainer();
    }
})();

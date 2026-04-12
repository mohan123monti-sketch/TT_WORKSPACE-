// Language Selector Component
// Multi-language support

class LanguageSelector {
    constructor() {
        this.currentLang = localStorage.getItem('tt_lang') || 'en';
        this.translations = {};
        this.init();
    }

    init() {
        this.renderSelector();
        this.loadTranslations();
        this.attachEventListeners();
    }

    renderSelector() {
        const header = document.querySelector('header') || document.querySelector('nav');
        if (!header) return;

        const selectorHTML = `
            <div class="language-selector relative inline-block">
                <button id="lang-selector-btn" class="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                    </svg>
                    <span id="current-lang" class="font-semibold">${this.getLangName(this.currentLang)}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <div id="lang-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div class="py-2">
                        <button data-lang="en" class="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-3">
                            <span class="text-2xl">🇺🇸</span>
                            <span>English</span>
                        </button>
                        <button data-lang="es" class="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-3">
                            <span class="text-2xl">🇪🇸</span>
                            <span>Español</span>
                        </button>
                        <button data-lang="fr" class="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-3">
                            <span class="text-2xl">🇫🇷</span>
                            <span>Français</span>
                        </button>
                        <button data-lang="de" class="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-3">
                            <span class="text-2xl">🇩🇪</span>
                            <span>Deutsch</span>
                        </button>
                        <button data-lang="zh" class="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-3">
                            <span class="text-2xl">🇨🇳</span>
                            <span>中文</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Find a good spot in the header
        const navList = header.querySelector('ul') || header.querySelector('.flex');
        if (navList) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = selectorHTML;
            navList.appendChild(tempDiv.firstElementChild);
        }
    }

    attachEventListeners() {
        const btn = document.getElementById('lang-selector-btn');
        const dropdown = document.getElementById('lang-dropdown');

        // Toggle dropdown
        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown?.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown?.classList.add('hidden');
        });

        // Language selection
        document.querySelectorAll('[data-lang]').forEach(langBtn => {
            langBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const lang = langBtn.dataset.lang;
                await this.changeLanguage(lang);
                dropdown?.classList.add('hidden');
            });
        });
    }

    async changeLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('tt_lang', lang);
        document.getElementById('current-lang').textContent = this.getLangName(lang);
        
        await this.loadTranslations();
        this.applyTranslations();
    }

    getLangName(code) {
        const names = {
            'en': 'English',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch',
            'zh': '中文'
        };
        return names[code] || 'English';
    }

    async loadTranslations() {
        try {
            // Load translations from backend
            const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.protocol === 'file:';
            const fallbackApiBase = isLocalDev ? 'http://localhost:8080/api' : '/api';
            const response = await fetch(`${window.API_BASE_URL || fallbackApiBase}/translations/${this.currentLang}`);
            if (response.ok) {
                this.translations = await response.json();
            } else {
                // Fallback to client-side translations
                this.translations = this.getClientSideTranslations(this.currentLang);
            }
        } catch (error) {
            console.error('Translation load error:', error);
            this.translations = this.getClientSideTranslations(this.currentLang);
        }
    }

    getClientSideTranslations(lang) {
        const translations = {
            en: {
                'nav.home': 'Home',
                'nav.products': 'Products',
                'nav.about': 'About',
                'nav.contact': 'Contact',
                'nav.cart': 'Cart',
                'nav.login': 'Login',
                'nav.register': 'Register',
                'btn.addToCart': 'Add to Cart',
                'btn.buyNow': 'Buy Now',
                'cart.empty': 'Your cart is empty',
                'cart.total': 'Total',
                'checkout.title': 'Checkout',
                'footer.copyright': '© 2026 Tech Turf. All rights reserved.'
            },
            es: {
                'nav.home': 'Inicio',
                'nav.products': 'Productos',
                'nav.about': 'Acerca de',
                'nav.contact': 'Contacto',
                'nav.cart': 'Carrito',
                'nav.login': 'Iniciar sesión',
                'nav.register': 'Registrarse',
                'btn.addToCart': 'Agregar al carrito',
                'btn.buyNow': 'Comprar ahora',
                'cart.empty': 'Tu carrito está vacío',
                'cart.total': 'Total',
                'checkout.title': 'Pagar',
                'footer.copyright': '© 2026 Tech Turf. Todos los derechos reservados.'
            },
            fr: {
                'nav.home': 'Accueil',
                'nav.products': 'Produits',
                'nav.about': 'À propos',
                'nav.contact': 'Contact',
                'nav.cart': 'Panier',
                'nav.login': 'Connexion',
                'nav.register': 'S\'inscrire',
                'btn.addToCart': 'Ajouter au panier',
                'btn.buyNow': 'Acheter maintenant',
                'cart.empty': 'Votre panier est vide',
                'cart.total': 'Total',
                'checkout.title': 'Commander',
                'footer.copyright': '© 2026 Tech Turf. Tous droits réservés.'
            },
            de: {
                'nav.home': 'Startseite',
                'nav.products': 'Produkte',
                'nav.about': 'Über uns',
                'nav.contact': 'Kontakt',
                'nav.cart': 'Warenkorb',
                'nav.login': 'Anmelden',
                'nav.register': 'Registrieren',
                'btn.addToCart': 'In den Warenkorb',
                'btn.buyNow': 'Jetzt kaufen',
                'cart.empty': 'Ihr Warenkorb ist leer',
                'cart.total': 'Gesamt',
                'checkout.title': 'Kasse',
                'footer.copyright': '© 2026 Tech Turf. Alle Rechte vorbehalten.'
            },
            zh: {
                'nav.home': '首页',
                'nav.products': '产品',
                'nav.about': '关于',
                'nav.contact': '联系',
                'nav.cart': '购物车',
                'nav.login': '登录',
                'nav.register': '注册',
                'btn.addToCart': '加入购物车',
                'btn.buyNow': '立即购买',
                'cart.empty': '您的购物车是空的',
                'cart.total': '总计',
                'checkout.title': '结账',
                'footer.copyright': '© 2026 Tech Turf. 版权所有。'
            }
        };

        return translations[lang] || translations.en;
    }

    applyTranslations() {
        // Apply translations to elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            if (this.translations[key]) {
                element.textContent = this.translations[key];
            }
        });

        // Apply to placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.dataset.i18nPlaceholder;
            if (this.translations[key]) {
                element.placeholder = this.translations[key];
            }
        });
    }

    // Helper function to translate text
    t(key) {
        return this.translations[key] || key;
    }
}

// Initialize language selector
window.addEventListener('DOMContentLoaded', () => {
    window.languageSelector = new LanguageSelector();
});

export default LanguageSelector;

/* ========================================================================
   Tech Turf Layout Logic
   Phase 7: Final Integration (Firebase + Dynamic UI + Cursor)
   - Procedural 3D Scrollytelling
   - Magnetic UI
   - Global Toasts & Cart
   - Dynamic Auth State Updating
   - Custom Cursor Logic
   ======================================================================== */

const apiOverride = localStorage.getItem('tt_api_base');
const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.protocol === 'file:';
const defaultApiBase = isLocalDev ? 'http://localhost:8080/api' : '/api';
window.API_BASE_URL = window.API_BASE_URL || apiOverride || window.__TECHTURF_API_BASE__ || defaultApiBase;

// --- Real-time Order Updates (Socket.io) ---
function initOrderSocket() {
    if (!window.io) return;

    const socketBaseUrl = window.API_BASE_URL.replace(/\/api$/, '');
    const socket = window.io(socketBaseUrl, {
        transports: ['websocket', 'polling']
    });

    socket.on('order_updated', (payload) => {
        window.dispatchEvent(new CustomEvent('orderUpdated', { detail: payload }));
    });
}

function ensureSocketIo() {
    if (window.io) {
        initOrderSocket();
        return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.onload = initOrderSocket;
    document.head.appendChild(script);
}

ensureSocketIo();

// --- 1. Global Message Handler (Toast) ---
function showMessage(type, message) {
    let container = document.getElementById('message-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'message-container';
        container.className = 'fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none w-full max-w-sm';
        document.body.appendChild(container);
    }

    const id = 'msg-' + Date.now();
    let icon = '';
    let color = '';

    switch (type) {
        case 'success':
            icon = 'check-circle';
            color = 'bg-green-600';
            break;
        case 'error':
            icon = 'x-octagon';
            color = 'bg-red-600';
            break;
        case 'info':
            icon = 'info';
            color = 'bg-blue-600';
            break;
        default:
            icon = 'message-square';
            color = 'bg-gray-600';
    }

    const msgHTML = `
           <div id="${id}" class="flex items-center p-4 rounded-xl shadow-lg ${color} text-white transition-all duration-300 transform translate-x-full opacity-0 pointer-events-auto">
               <i data-lucide="${icon}" class="w-5 h-5 mr-3 flex-shrink-0"></i>
               <span>${message}</span>
               <button onclick="document.getElementById('${id}').remove()" class="ml-auto text-white/70 hover:text-white">
                    <i data-lucide="x" class="w-4 h-4"></i>
               </button>
           </div>
       `;

    container.insertAdjacentHTML('beforeend', msgHTML);
    const msgElement = document.getElementById(id);

    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        msgElement.classList.remove('translate-x-full', 'opacity-0');
        msgElement.classList.add('translate-x-0', 'opacity-100');
    }, 50);

    setTimeout(() => {
        if (msgElement) {
            msgElement.classList.add('translate-x-full', 'opacity-0');
            msgElement.classList.remove('translate-x-0', 'opacity-100');
            setTimeout(() => msgElement.remove(), 300);
        }
    }, 5000);
}
window.showMessage = showMessage;

// --- 2. Cart Logic (Shopping) ---
function getCart() {
    try {
        const cartJson = localStorage.getItem('tt_cart');
        return cartJson ? JSON.parse(cartJson) : [];
    } catch (error) {
        console.error("Error reading cart:", error);
        return [];
    }
}
window.getCart = getCart;

function saveCart(cart) {
    localStorage.setItem('tt_cart', JSON.stringify(cart));
    window.updateCartDisplay();
}
window.saveCart = saveCart;

function updateCartDisplay() {
    const cart = getCart();
    const cartCountElements = document.querySelectorAll('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartCountElements.forEach(el => {
        el.textContent = totalItems > 9 ? '9+' : totalItems.toString();
        el.classList.toggle('hidden', totalItems === 0);
    });
}
window.updateCartDisplay = updateCartDisplay;

function getWishlistIds() {
    try {
        const wishlistJson = localStorage.getItem('tt_wishlist');
        return wishlistJson ? JSON.parse(wishlistJson) : [];
    } catch (error) {
        console.error('Error reading wishlist:', error);
        return [];
    }
}
window.getWishlistIds = getWishlistIds;

function updateWishlistDisplay() {
    const wishlist = getWishlistIds();
    const wishlistCountElements = document.querySelectorAll('.wishlist-count');
    const totalItems = wishlist.length;
    wishlistCountElements.forEach(el => {
        el.textContent = totalItems > 9 ? '9+' : totalItems.toString();
        el.classList.toggle('hidden', totalItems === 0);
    });
}
window.updateWishlistDisplay = updateWishlistDisplay;

function addToCart(product) {
    const cart = getCart();
    // Check if item already exists
    const existingItem = cart.find(item =>
        (product.id && item.id === product.id) || item.name === product.name
    );
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart(cart);
    if (window.showMessage) window.showMessage('success', `${product.name} added to cart!`);
}
window.addToCart = addToCart;

// --- 3. Auth State Management ---

function getAuthToken() { return localStorage.getItem('tt_token'); }
window.getAuthToken = getAuthToken;
function isLoggedIn() { return !!getAuthToken(); }
window.isLoggedIn = isLoggedIn;

window.addEventListener('orderUpdated', (event) => {
    if (!isLoggedIn() || !window.showMessage) return;
    const status = event && event.detail ? event.detail.status : null;
    window.showMessage('info', status ? `Order status updated: ${status}` : 'Order status updated.');
});

function handleLogout() {
    if (typeof window.firebaseAuthLogout === 'function') {
        window.firebaseAuthLogout();
    } else {
        localStorage.removeItem('tt_token');
        window.showMessage('info', 'Logged out successfully.');
        setTimeout(() => window.location.href = '/index.html', 1000);
    }
    localStorage.removeItem('tt_cart');
    window.updateCartDisplay();
}
window.handleLogout = handleLogout;

// --- 4. Header & Footer Generation ---

function generateHeader() {
    const currentPageFile = window.location.pathname.split('/').pop();

    const divisions = [
        { name: 'Tech Turf', href: '/index.html' },
        { name: 'Quinta', href: '/pages/quinta.html' },
        { name: 'Trend Hive', href: '/pages/trend_hive.html' },
        { name: 'Click Sphere', href: '/pages/click_sphere.html' },
        { name: 'Shop', href: '/pages/shopping.html' }
    ];

    const loggedIn = isLoggedIn();
    renderNavHTML(loggedIn, divisions, currentPageFile);
}

function renderNavHTML(isUserLoggedIn, divisions, currentPageFile) {
    const authLinks = isUserLoggedIn ?
        `<a href="/pages/account.html" class="transition-link text-white/70 hover:text-white px-3 py-2 rounded-lg transition-colors font-medium text-sm border border-transparent hover:border-white/10">
               <i data-lucide="user" class="w-5 h-5 inline-block mr-1 align-sub"></i> Account
           </a>
           <button onclick="window.handleLogout()" class="magnetic-btn transition-link px-4 py-2 bg-red-600/70 text-white font-semibold rounded-lg hover:bg-red-500 transition-all text-sm">
               Sign Out
           </button>` :
        `<a href="/pages/login.html" class="transition-link text-white/70 hover:text-white px-3 py-2 rounded-lg transition-colors font-medium text-sm">Sign In</a>
           <a href="/pages/register.html" class="magnetic-btn transition-link px-4 py-2 bg-orange-600/70 text-white font-semibold rounded-lg hover:bg-orange-500 transition-all text-sm">
               Register
           </a>`;

    const navHTML = `
       <nav class="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50 transition-all duration-500 liquid-glass" id="site-header">
           <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div class="flex justify-between items-center h-16">
                   <a href="/index.html" class="flex-shrink-0 flex items-center transition-link">
                       <i data-lucide="rocket" class="w-7 h-7 text-orange-500 mr-2"></i>
                       <span class="text-xl font-bold tracking-wider text-white hidden sm:block">TECH TURF</span>
                       <span class="text-xl font-bold tracking-wider text-white sm:hidden">TT</span>
                   </a>
   
                   <div class="hidden md:flex md:items-center space-x-1">
                       ${divisions.map(d => `
                           <a href="${d.href}" class="transition-link text-white/70 hover:text-white px-3 py-2 rounded-lg transition-colors font-medium text-sm
                           ${d.href.endsWith('/' + currentPageFile) ? 'bg-orange-600/20 text-white' : ''}">
                               ${d.name}
                           </a>
                       `).join('')}
                   </div>
                   
                   <!-- Desktop Wishlist Button -->
                   <a href="/pages/wishlist.html" class="hidden md:flex relative items-center gap-2 text-white/80 hover:text-white px-3 py-2 mr-2 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
                       <i data-lucide="heart" class="w-5 h-5"></i>
                       <span class="text-[11px] font-black uppercase tracking-widest">Wishlist</span>
                       <span class="wishlist-count absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-white bg-red-600 rounded-full hidden transform translate-x-1/4 -translate-y-1/4">0</span>
                   </a>

                   <!-- Desktop Cart Button -->
                   <a href="/pages/cart.html" class="hidden md:flex relative items-center gap-2 text-white/80 hover:text-white px-3 py-2 mr-2 rounded-lg border border-white/10 hover:border-white/30 transition-colors">
                       <i data-lucide="shopping-bag" class="w-5 h-5"></i>
                       <span class="text-[11px] font-black uppercase tracking-widest">Cart</span>
                       <span class="cart-count absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-white bg-orange-600 rounded-full hidden transform translate-x-1/4 -translate-y-1/4">0</span>
                   </a>
                   
                   <div class="hidden md:flex md:items-center space-x-3" id="desktop-auth-container">
                        ${authLinks}
                   </div>
   
                   <div class="md:hidden flex items-center gap-4">
                       <a href="/pages/wishlist.html" class="relative text-white hover:text-red-400">
                           <i data-lucide="heart" class="w-6 h-6"></i>
                           <span class="wishlist-count absolute -top-2 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full hidden">0</span>
                       </a>
                       <a href="/pages/cart.html" class="relative text-white hover:text-orange-400">
                           <i data-lucide="shopping-bag" class="w-6 h-6"></i>
                           <span class="cart-count absolute -top-2 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full hidden">0</span>
                       </a>
                       <button id="mobile-menu-btn" class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                           <i data-lucide="menu" class="w-6 h-6"></i>
                       </button>
                   </div>
               </div>
           </div>
           
           <div class="md:hidden absolute w-full bg-[#05080f]/95 border-b border-white/5 shadow-2xl" id="mobile-menu" style="display: none;">
               <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                   ${divisions.map(d => `
                       <a href="${d.href}" class="transition-link block text-white/70 hover:text-white px-3 py-2 rounded-md font-medium
                       ${d.href.endsWith('/' + currentPageFile) ? 'bg-orange-600/20 text-white' : ''}">
                           ${d.name}
                       </a>
                   `).join('')}
                   <div class="pt-4 border-t border-white/10 space-y-2" id="mobile-auth-container">
                       ${authLinks.replace(/magnetic-btn/g, 'magnetic-btn w-full justify-center').replace(/px-\d+ py-\d+/g, 'px-4 py-3 block text-center')}
                   </div>
               </div>
           </div>
       </nav>
       `;

    const container = document.getElementById('header-container');
    if (container) {
        container.innerHTML = navHTML;
        if (window.lucide) lucide.createIcons();
        window.updateCartDisplay();
        if (window.updateWishlistDisplay) window.updateWishlistDisplay();

        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                const isExpanded = mobileMenu.style.display === 'block';
                mobileMenu.style.display = isExpanded ? 'none' : 'block';
                mobileMenuBtn.querySelector('i').setAttribute('data-lucide', isExpanded ? 'menu' : 'x');

                // Toggle rounded shape
                const header = document.getElementById('site-header');
                if (header) {
                    if (!isExpanded) {
                        header.classList.add('menu-open');
                    } else {
                        header.classList.remove('menu-open');
                    }
                }
                if (window.lucide) lucide.createIcons();
            });
        }
    }
}

window.updateAuthUI = function (user) {
    const divisions = [
        { name: 'Tech Turf', href: '/index.html' },
        { name: 'Quinta', href: '/pages/quinta.html' },
        { name: 'Trend Hive', href: '/pages/trend_hive.html' },
        { name: 'Click Sphere', href: '/pages/click_sphere.html' },
        { name: 'Shop', href: '/pages/shopping.html' }
    ];
    const currentPageFile = window.location.pathname.split('/').pop();
    renderNavHTML(!!user, divisions, currentPageFile);
};

function generateFooter() {
    const footerHTML = `
       <footer class="relative z-10 border-t border-white/5 pt-12 pb-8 bg-[#05080f]/90">
           <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div class="grid grid-cols-2 md:grid-cols-5 gap-8">
                   <div class="col-span-2 md:col-span-1">
                       <a href="/index.html" class="flex items-center transition-link">
                           <i data-lucide="rocket" class="w-6 h-6 text-orange-500 mr-2"></i>
                           <span class="text-xl font-bold tracking-wider text-white">TECH TURF</span>
                       </a>
                       <p class="mt-4 text-gray-400 text-sm max-w-xs">
                           Innovate • Inspire • Ignite. Building the future, one project at a time.
                       </p>
                   </div>
                   <div>
                       <h3 class="text-lg font-semibold text-white mb-4">Company</h3>
                       <ul class="space-y-3 text-sm">
                           <li><a href="/pages/about.html" class="text-gray-400 hover:text-orange-400 transition-link">About Us</a></li>
                           <li><a href="/pages/projects.html" class="text-gray-400 hover:text-orange-400 transition-link">Projects</a></li>
                           <li><a href="/pages/contact.html" class="text-gray-400 hover:text-orange-400 transition-link">Contact</a></li>
                       </ul>
                   </div>
                   <div>
                       <h3 class="text-lg font-semibold text-white mb-4">Divisions</h3>
                       <ul class="space-y-3 text-sm">
                           <li><a href="/pages/quinta.html" class="text-gray-400 hover:text-orange-400 transition-link">Quinta</a></li>
                           <li><a href="/pages/trend_hive.html" class="text-gray-400 hover:text-orange-400 transition-link">Trend Hive</a></li>
                           <li><a href="/pages/click_sphere.html" class="text-gray-400 hover:text-orange-400 transition-link">Click Sphere</a></li>
                           <li><a href="/pages/shopping.html" class="text-gray-400 hover:text-orange-400 transition-link">Shop</a></li>
                       </ul>
                   </div>
                   <div>
                       <h3 class="text-lg font-semibold text-white mb-4">Legal</h3>
                       <ul class="space-y-3 text-sm">
                           <li><a href="/pages/terms_of_service.html" class="text-gray-400 hover:text-orange-400 transition-link">Terms</a></li>
                           <li><a href="/pages/privacy_policy.html" class="text-gray-400 hover:text-orange-400 transition-link">Privacy</a></li>
                       </ul>
                   </div>
                   <div>
                        <h3 class="text-lg font-semibold text-white mb-4">Connect</h3>
                        <ul class="space-y-3 text-sm">
                            <li><a href="/pages/nexus_ai.html" class="text-gray-400 hover:text-orange-400 transition-link">Nexus AI</a></li>
                            <li><a href="/pages/estimator.html" class="text-gray-400 hover:text-orange-400 transition-link">Estimator</a></li>
                        </ul>
                        <p class="text-gray-400 text-sm mt-6">Coimbatore, India</p>
                   </div>
               </div>
               <div class="mt-12 pt-8 border-t border-white/5 text-center">
                   <p class="text-gray-500 text-sm">&copy; ${new Date().getFullYear()} Tech Turf. All rights reserved.</p>
               </div>
           </div>
       </footer>
       `;
    document.getElementById('footer-container').innerHTML = footerHTML;
    if (window.lucide) lucide.createIcons();
}

function initNexusWidget() {
    if (document.getElementById('nexus-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'nexus-widget';
    widget.innerHTML = `
        <div id="nexus-panel" class="fixed bottom-24 right-6 w-[360px] h-[520px] bg-[#0b1537]/95 border border-white/10 rounded-3xl shadow-3xl overflow-hidden hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div class="flex items-center gap-2">
                    <i data-lucide="bot" class="w-4 h-4 text-orange-400"></i>
                    <span class="text-xs font-black uppercase tracking-widest text-white">Nexus AI</span>
                </div>
                <button id="nexus-close" class="text-white/60 hover:text-white">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <iframe src="nexus_ai.html" class="w-full h-full border-0" title="Nexus AI"></iframe>
        </div>
        <button id="nexus-toggle" class="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-orange-600 text-white shadow-2xl flex items-center justify-center hover:bg-orange-500 transition-all">
            <i data-lucide="message-circle" class="w-6 h-6"></i>
        </button>
    `;

    document.body.appendChild(widget);
    if (window.lucide) lucide.createIcons();

    const panel = document.getElementById('nexus-panel');
    const toggle = document.getElementById('nexus-toggle');
    const close = document.getElementById('nexus-close');

    const openPanel = () => {
        panel.classList.remove('hidden');
    };

    const closePanel = () => {
        panel.classList.add('hidden');
    };

    toggle.addEventListener('click', () => {
        if (panel.classList.contains('hidden')) {
            openPanel();
        } else {
            closePanel();
        }
    });

    close.addEventListener('click', closePanel);
}

/**
 * --- 5. ADVANCED UI EFFECTS ---
 */

// NEW: Initialize Custom Cursor
function initCustomCursor() {
    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
    });

    const hoverElements = document.querySelectorAll('a, button, .cursor-hover');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
    });
}

function handle3DTilt() {
    const tiltElements = document.querySelectorAll('.tilt-3d');
    if (tiltElements.length === 0) return;

    document.addEventListener('mousemove', (e) => {
        tiltElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const maxTilt = 5;
            const x = (e.clientX - centerX) / (rect.width / 2);
            const y = (e.clientY - centerY) / (rect.height / 2);

            const rotateX = -y * maxTilt;
            const rotateY = x * maxTilt;

            el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
    });

    tiltElements.forEach(el => {
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        });
    });
}

function handleMagneticButtons() {
    const magneticButtons = document.querySelectorAll('.magnetic-btn');
    if (magneticButtons.length === 0) return;

    magneticButtons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const middleX = rect.width / 2;
            const middleY = rect.height / 2;
            const offsetX = ((x - middleX) / middleX) * 15;
            const offsetY = ((y - middleY) / middleY) * 15;

            btn.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = `translate(0, 0)`;
        });
    });
}

function handleSpotlight() {
    const groups = document.querySelectorAll('.spotlight-group');
    groups.forEach(group => {
        group.addEventListener('mousemove', (e) => {
            const rect = group.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            group.style.setProperty('--mouse-x', `${x}px`);
            group.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

let lastScrollTop = 0;
function handleScrollReveal() {
    const reveals = document.querySelectorAll('.reveal-hidden');
    const windowHeight = window.innerHeight;
    const elementVisible = 50;

    reveals.forEach((reveal) => {
        const rect = reveal.getBoundingClientRect();
        const elementTop = rect.top;

        if (elementTop < windowHeight - elementVisible) {
            reveal.classList.add('reveal-active');
        }
    });

    // Hide Scroll Indicator if scrolled
    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) {
        if (window.scrollY > 100) {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translate(-50%, 20px)';
            indicator.style.pointerEvents = 'none';
        } else {
            indicator.style.opacity = '0.6';
            indicator.style.transform = 'translate(-50%, 0)';
            indicator.style.pointerEvents = 'all';
        }
    }

    // SCROLLYTELLING: Update 3D Scene based on scroll
    // DISABLED: User requested original Earth behavior

    // HEADER SCROLL LOGIC
    const header = document.getElementById('site-header');
    if (header) {
        // Don't hide if mobile menu is open
        if (header.classList.contains('menu-open')) {
            header.classList.remove('header-hidden');
            return;
        }

        const currentScroll = window.scrollY;

        // Hide on scroll down, show on scroll up
        if (currentScroll > lastScrollTop && currentScroll > 150) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }

    // PARALLAX EFFECT
    const parallaxElements = document.querySelectorAll('.parallax-layer');
    parallaxElements.forEach(element => {
        const speed = element.dataset.speed || 0.5;
        const yPos = -(window.scrollY * speed);
        element.style.transform = `translateY(${yPos}px)`;
    });
}
window.handleScrollReveal = handleScrollReveal;

function handlePageTransitions() {
    document.querySelectorAll('a.transition-link').forEach(link => {
        // Only apply to anchor tags, not buttons
        if (link.tagName !== 'A') return;

        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Skip if no href, hash link, mailto, external, or modifier key pressed
            if (!href || href.startsWith('#') || href.startsWith('mailto') ||
                href.startsWith('http') || e.metaKey || e.ctrlKey || e.shiftKey) {
                return;
            }

            // Don't interfere with default browser behavior for these
            if (this.hasAttribute('download') || this.target === '_blank') {
                return;
            }

            e.preventDefault();
            document.body.classList.add('page-transition-out');
            setTimeout(() => {
                window.location.href = href;
            }, 300);
        });
    });
}

function ensureSEO() {
    if (typeof window.applySEO === 'function') {
        window.applySEO();
        return;
    }

    if (!document.querySelector('script[data-seo="true"]')) {
        const script = document.createElement('script');
        script.src = 'js/seo.js';
        script.defer = true;
        script.dataset.seo = 'true';
        script.onload = () => {
            if (typeof window.applySEO === 'function') {
                window.applySEO();
            }
        };
        document.head.appendChild(script);
    }
}

function enableLazyLoading() {
    document.querySelectorAll('img:not([loading])').forEach((img) => {
        img.setAttribute('loading', 'lazy');
    });
}

// --- 6. 3D BACKGROUND (THREE.JS) ---
let scene, camera, renderer;
let earthMesh, cloudMesh, starMesh;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;

function initThreeJS() {
    const container = document.getElementById('three-container');
    if (!container || !window.THREE) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 1.5; // Zoomed in to see details
    window.camera = camera; // Expose for scrollytelling

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.setClearColor(0x000000, 1); // Dark background
    container.appendChild(renderer.domElement);

    // --- LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // --- TEXTURE LOADER ---
    const loader = new THREE.TextureLoader();
    // Using standard high-res earth textures
    // Using standard high-res earth textures from reliable sources
    const baseUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/';

    const mapIo = loader.load(baseUrl + 'earth_atmos_2048.jpg');
    const mapSpecular = loader.load(baseUrl + 'earth_specular_2048.jpg');
    const mapNormal = loader.load(baseUrl + 'earth_normal_2048.jpg');
    const mapClouds = loader.load(baseUrl + 'earth_clouds_1024.png');

    // --- EARTH ---
    const geometry = new THREE.SphereGeometry(0.5, 64, 64); // 0.5 radius
    const material = new THREE.MeshPhongMaterial({
        map: mapIo,
        specularMap: mapSpecular,
        normalMap: mapNormal,
        specular: new THREE.Color(0x333333),
        shininess: 5
    });
    earthMesh = new THREE.Mesh(geometry, material);
    window.earthMesh = earthMesh; // Expose for scrollytelling
    scene.add(earthMesh);

    // --- CLOUDS ---
    const cloudGeometry = new THREE.SphereGeometry(0.505, 64, 64);
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: mapClouds,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudMesh);

    // --- STARS BACKGROUND ---
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPos = [];
    for (let i = 0; i < starCount; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100; // Far background
        starPos.push(x, y, z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
    starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    animate();
}

function onWindowResize() {
    if (!camera || !renderer) return;
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.1;
    mouseY = (event.clientY - windowHalfY) * 0.1;
}

function animate() {
    requestAnimationFrame(animate);

    if (earthMesh) {
        earthMesh.rotation.y += 0.001; // Slow rotation of earth
    }
    if (cloudMesh) {
        cloudMesh.rotation.y += 0.0012; // Clouds rotate slightly faster
        cloudMesh.rotation.x += 0.0001;
    }
    if (starMesh) {
        starMesh.rotation.y -= 0.0002;
    }

    // Gentle mouse interaction (parallax)
    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    if (earthMesh) {
        earthMesh.rotation.y += 0.05 * (targetX - earthMesh.rotation.y);
        earthMesh.rotation.x += 0.05 * (targetY - earthMesh.rotation.x);
    }

    renderer.render(scene, camera);
}

// --- 7. CONTENT PROTECTION ---
function initContentProtection() {
    // Disable context menu (Right Click) - but allow on input fields
    document.addEventListener('contextmenu', (e) => {
        // Allow right-click on input fields for paste, etc.
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        e.preventDefault();
        showMessage('error', 'Content copying is restricted.');
    });

    // Disable specific keyboard shortcuts (but allow essential ones)
    document.addEventListener('keydown', (e) => {
        // ALWAYS allow F5, Ctrl+R (Refresh), Ctrl+Shift+R (Hard Refresh)
        if (e.key === 'F5' ||
            (e.ctrlKey && e.key === 'r') ||
            (e.ctrlKey && e.key === 'R') ||
            (e.ctrlKey && e.shiftKey && e.key === 'R')) {
            return; // Allow refresh
        }

        // Allow Ctrl+A (Select All) in input fields
        if (e.ctrlKey && (e.key === 'a' || e.key === 'A') &&
            (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            return;
        }

        // Block copy, view source, save, print
        if (
            e.ctrlKey &&
            (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U' ||
                e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')
        ) {
            e.preventDefault();
            showMessage('error', 'Keyboard shortcuts are restricted.');
            return;
        }

        // Optionally block F12 and DevTools (commented out to not annoy developers)
        // if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        //     e.preventDefault();
        // }
    });

    // Disable Dragging of images/content
    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
            e.preventDefault();
        }
    });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    generateHeader();
    generateFooter();
    updateCartDisplay();

    // Initialize cursor if not mobile
    if (window.matchMedia("(min-width: 768px)").matches) {
        initCustomCursor();
    }

    // Initialize scroll reveal on all pages
    handleScrollReveal();
    window.addEventListener('scroll', handleScrollReveal);

    if (document.body.getAttribute('data-3d-enabled') === 'true') {
        initThreeJS();
    }

    handle3DTilt();
    handleSpotlight();
    handleMagneticButtons();
    handlePageTransitions();
    initContentProtection(); // Enable content protection
    initNexusWidget();
    ensureSEO();
    enableLazyLoading();

    if (window.lucide) lucide.createIcons();
});
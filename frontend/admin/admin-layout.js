// Admin Layout Logic
const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.protocol === 'file:';
const API_BASE_URL = isLocalDev ? 'http://localhost:8080/api' : '/api';

// --- Toast Notification System (Made global for module scripts) ---
window.showToast = function (message, type = 'info') {
    const toast = document.createElement('div');
    const typeClasses = {
        'success': 'border-green-500/50',
        'error': 'border-red-500/50',
        'info': 'border-blue-500/50'
    };
    const borderClass = typeClasses[type] || typeClasses['info'];

    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-2xl iphone-glass shadow-2xl text-white border ${borderClass} transition-all duration-300 opacity-0 z-50 translate-y-4`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(4px)';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

// Make API_BASE_URL global
window.API_BASE_URL = API_BASE_URL;

function ensureSEO() {
    if (typeof window.applySEO === 'function') {
        window.applySEO();
        return;
    }

    if (!document.querySelector('script[data-seo="true"]')) {
        const script = document.createElement('script');
        script.src = '../js/seo.js';
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

// --- Auth Check ---
function checkAuth() {
    const token = localStorage.getItem('tt_token');
    if (!token) {
        console.log('[AUTH CHECK] No token found in localStorage');
        console.log('[AUTH CHECK] localStorage keys:', Object.keys(localStorage));
        window.location.href = '../login.html';
        return null;
    }
    console.log('[AUTH CHECK] Token found:', token.substring(0, 20) + '...');
    // In a real app, we would verify the token/role with the backend here
    return token;
}

// --- Sidebar Generation ---
function renderSidebar() {
    const sidebar = document.getElementById('sidebar-container');
    if (!sidebar) return;

    const menuItems = [
        { name: 'Dashboard', icon: 'layout-dashboard', href: 'dashboard.html' },
        { name: 'Products', icon: 'package', href: 'products.html' },
        { name: 'Orders', icon: 'shopping-cart', href: 'orders.html' },
        { name: 'Users', icon: 'users', href: 'users.html' },
        { name: 'Launches', icon: 'rocket', href: 'launches.html' },
        { name: 'Content', icon: 'file-text', href: 'content.html' },
        { name: 'Support', icon: 'life-buoy', href: 'support.html' },
        { name: 'Settings', icon: 'settings', href: 'settings.html' },
    ];

    const currentPath = window.location.pathname.split('/').pop();

    sidebar.innerHTML = `
        <div class="p-8">
            <h1 class="text-2xl font-black text-white flex items-center tracking-tighter">
                <i data-lucide="zap" class="w-6 h-6 mr-3 text-white"></i> TECH<span class="text-white/50">TURF</span>
            </h1>
        </div>
        <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            ${menuItems.map(item => `
                <a href="${item.href}" class="flex items-center px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all group ${currentPath === item.href ? 'iphone-glass text-white' : ''}">
                    <i data-lucide="${item.icon}" class="w-5 h-5 mr-3 transition-colors ${currentPath === item.href ? 'text-white' : 'group-hover:text-white'}"></i>
                    <span class="font-bold text-sm tracking-wide text-inherit">${item.name}</span>
                </a>
            `).join('')}
        </nav>
        <div class="p-6 border-t border-white/5">
            <button id="logout-button" class="w-full flex items-center justify-center iphone-glass text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-all border border-white/5">
                <i data-lucide="log-out" class="w-4 h-4 mr-2"></i> Log Out
            </button>
        </div>
    `;

    if (window.lucide) lucide.createIcons();

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('tt_token');
        window.location.href = '../login.html';
    });
}

// --- Topbar Generation ---
function renderTopbar() {
    const topbar = document.getElementById('topbar-container');
    if (!topbar) return;

    const currentPath = window.location.pathname.split('/').pop();
    let title = 'Admin Dashboard';
    if (currentPath === 'products.html') title = 'Products & Inventory';
    else if (currentPath === 'orders.html') title = 'Orders & Requests';
    else if (currentPath === 'users.html') title = 'Team & Roles';
    else if (currentPath === 'launches.html') title = 'Aerospace Launches & Logs';
    else if (currentPath === 'content.html') title = 'Content Management System';
    else if (currentPath === 'support.html') title = 'Support Tickets';
    else if (currentPath === 'settings.html') title = 'System Settings';

    topbar.innerHTML = `
        <h2 class="text-xl font-black text-white tracking-tight" id="page-title">${title}</h2>
        <div class="flex items-center space-x-6">
            <button class="relative text-gray-400 hover:text-white transition-colors">
                <i data-lucide="bell" class="w-6 h-6"></i>
                <span class="absolute top-0 right-0 w-2 h-2 bg-white rounded-full"></span>
            </button>
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl iphone-glass border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                    AD
                </div>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

// --- Core Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        renderSidebar();
        renderTopbar();
    }

    ensureSEO();
});
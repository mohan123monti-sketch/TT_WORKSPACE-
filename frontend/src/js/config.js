/**
 * CONFIG.JS
 * Centralized configuration for Tech Turf
 */

const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.protocol === 'file:';

const CONFIG = {
  // API Configuration
  API: {
    BASE_URL: window.__TECHTURF_API_BASE__ || localStorage.getItem('tt_api_base') || (isLocalDev ? 'http://localhost:8080/api' : '/api'),
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3
  },
  
  // App Settings
  APP: {
    NAME: 'Tech Turf',
    VERSION: '2.0.0',
    TAGLINE: 'Aerospace Innovation Marketplace',
    SUPPORT_EMAIL: 'support@techturf.com'
  },
  
  // Feature Flags
  FEATURES: {
    NEXUS_AI: true,
    SOCIAL_LOGIN: true,
    REAL_TIME_UPDATES: true,
    ADVANCED_SEARCH: true,
    PRODUCT_COMPARISON: true,
    WISHLIST: true,
    REVIEWS: true,
    NEWSLETTER: true
  },
  
  // UI Configuration
  UI: {
    ITEMS_PER_PAGE: 12,
    MAX_CART_ITEMS: 50,
    MAX_WISHLIST_ITEMS: 100,
    TOAST_DURATION: 3000,
    ANIMATION_DURATION: 300
  },
  
  // Cache Settings
  CACHE: {
    PRODUCTS_TTL: 300000, // 5 minutes
    USER_DATA_TTL: 600000, // 10 minutes
    STATIC_RESOURCES_TTL: 86400000 // 24 hours
  },
  
  // Payment Configuration
  PAYMENT: {
    CURRENCY: 'INR',
    SUPPORTED_METHODS: ['card', 'upi', 'netbanking', 'wallet', 'cod'],
    COD_LIMIT: 50000
  },
  
  // Search Configuration
  SEARCH: {
    MIN_QUERY_LENGTH: 2,
    DEBOUNCE_DELAY: 300,
    MAX_RESULTS: 10
  },
  
  // Image Configuration
  IMAGES: {
    MAX_SIZE: 5242880, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    PLACEHOLDER: '/public/images/placeholder.jpg'
  },
  
  // Validation Rules
  VALIDATION: {
    PASSWORD_MIN_LENGTH: 8,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_PATTERN: /^[6-9]\d{9}$/
  },
  
  // Social Media Links
  SOCIAL: {
    FACEBOOK: 'https://facebook.com/techturf',
    TWITTER: 'https://twitter.com/techturf',
    INSTAGRAM: 'https://instagram.com/techturf',
    LINKEDIN: 'https://linkedin.com/company/techturf',
    YOUTUBE: 'https://youtube.com/techturf'
  },
  
  // Analytics (if integrated)
  ANALYTICS: {
    ENABLED: false,
    TRACKING_ID: 'UA-XXXXXXXXX-X'
  }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else {
  window.CONFIG = CONFIG;
}

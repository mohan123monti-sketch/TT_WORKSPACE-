// Global Socket.io Client initialization

document.addEventListener('DOMContentLoaded', () => {
    if (window.socketInitialized) return;
    window.socketInitialized = true;

    if (typeof io !== 'undefined') {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
        
        // Connect with auth token if available (for future secured events)
        window.socket = io({
            auth: { token }
        });

        window.socket.on('connect', () => {
            console.log('[Socket] Connected to realtime server');
        });

        window.socket.on('disconnect', () => {
            console.log('[Socket] Disconnected from realtime server');
        });

        // Setup live reloading of Policy Registry
        window.socket.on('policyUpdated', (data) => {
            console.log('[Socket] Policy Updated:', data);
            
            // If the user is on the policy_center page, reload the registry automatically
            if (window.location.pathname.includes('policy_center.html') || window.location.pathname.includes('admin_control.html')) {
                if (typeof window.loadPolicies === 'function') {
                    window.loadPolicies();
                }
            }
        });

        // Setup live reloading of Help Articles
        window.socket.on('articleCreated', (data) => {
            console.log('[Socket] New Help Article Created:', data);
            
            // If the user is on the help_center page, reload the articles list
            if (window.location.pathname.includes('help_center.html') || window.location.pathname.includes('admin_control.html')) {
                if (typeof window.loadArticles === 'function') {
                    window.loadArticles();
                }
            }
        });
    }
});

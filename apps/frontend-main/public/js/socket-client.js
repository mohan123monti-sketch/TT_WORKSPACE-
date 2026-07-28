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

        // Setup live reloading of Tasks and Dashboard
        window.socket.on('taskUpdated', () => {
            console.log('[Socket] Tasks Updated - Refreshing Views');
            
            if (window.location.pathname.includes('tasks.html')) {
                if (typeof window.loadTasks === 'function') window.loadTasks();
                if (typeof window.fetchTasks === 'function') window.fetchTasks(); 
            }
            if (window.location.pathname.includes('dashboard.html')) {
                if (typeof window.loadDashboardStats === 'function') window.loadDashboardStats();
                if (typeof window.initDashboard === 'function') window.initDashboard();
            }
        });

        // Setup live reloading of Submissions and Dashboard Leaderboards
        window.socket.on('submissionUpdated', () => {
            console.log('[Socket] Submissions Updated');
            
            if (window.location.pathname.includes('submissions.html')) {
                if (typeof window.loadSubmissions === 'function') window.loadSubmissions();
            }
            if (window.location.pathname.includes('dashboard.html')) {
                if (typeof window.loadDashboardStats === 'function') window.loadDashboardStats();
                if (typeof window.initDashboard === 'function') window.initDashboard();
            }
        });

        // Setup live reloading of Drive
        window.socket.on('driveUpdated', () => {
            console.log('[Socket] Drive Updated');
            
            if (window.location.pathname.includes('drive.html')) {
                if (typeof window.loadDriveItems === 'function') window.loadDriveItems();
            }
        });

        window.socket.on('notificationReceived', () => {
            console.log('[Socket] New Notification Received');
            if (typeof window.loadNotifications === 'function') {
                window.loadNotifications();
            }
        });
    }
});

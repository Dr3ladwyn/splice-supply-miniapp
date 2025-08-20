// Splice Supply Bot Mini App - GitHub Pages Configuration

// Configuration object for GitHub Pages deployment
window.SpliceSupplyConfig = {
    // GitHub Pages Configuration
    GITHUB_PAGES: {
        enabled: true,
        repository: 'splice-supply-miniapp', // Replace with your repository name
        username: 'Dr3ladwyn', // Replace with your GitHub username
        branch: 'main', // or 'gh-pages' if using gh-pages branch
        customDomain: null // Set to your custom domain if using one, e.g., 'miniapp.yourdomain.com'
    },

    // API Configuration
    API: {
        // Backend API URL - Replace with your actual API server URL
        baseUrl: 'https://your-api-domain.com', // Your VPS or cloud API server
        
        // Fallback API URLs for redundancy
        fallbackUrls: [
            'https://your-backup-api.com',
            'https://your-secondary-api.com'
        ],
        
        // API endpoints
        endpoints: {
            userStatus: '/api/user/status',
            fileCounts: '/api/files/counts',
            files: '/api/files',
            fileDetails: '/api/files/{id}/details',
            download: '/api/files/{id}/download',
            premiumCheck: '/api/user/{id}/premium-check',
            stats: '/api/stats'
        },
        
        // Request configuration
        timeout: 10000, // 10 seconds
        retries: 3,
        retryDelay: 1000 // 1 second
    },

    // Telegram Configuration
    TELEGRAM: {
        // Bot configuration
        botUsername: 'splicesupplybot', // Replace with your bot username
        
        // Channel links
        channels: {
            premium: 'https://t.me/addlist/qBholXq6isY3NzMy',
            support: 'https://t.me/your_support_channel',
            announcements: 'https://t.me/your_announcements_channel'
        },
        
        // WebApp configuration
        webApp: {
            enableClosingConfirmation: true,
            enableVerticalSwipes: false,
            headerColor: '#6366f1',
            backgroundColor: '#0f172a'
        }
    },

    // Application Configuration
    APP: {
        // Application metadata
        name: 'Splice Supply Bot',
        version: '2.0.0',
        description: 'Your ultimate destination for high-quality music production files',
        
        // Feature flags
        features: {
            search: true,
            pagination: true,
            filePreview: true,
            downloadTracking: true,
            premiumFeatures: true,
            offlineMode: false, // GitHub Pages doesn't support offline mode
            pushNotifications: false // Not supported in GitHub Pages
        },
        
        // UI Configuration
        ui: {
            theme: 'glassmorphism',
            animations: true,
            loadingTimeout: 30000, // 30 seconds
            toastDuration: 5000, // 5 seconds
            modalCloseOnOutsideClick: true
        },
        
        // Pagination settings
        pagination: {
            filesPerPage: 6,
            maxPages: 100
        }
    },

    // GitHub Pages Specific Configuration
    DEPLOYMENT: {
        environment: 'github-pages',
        staticHosting: true,
        serverSideRendering: false,
        
        // Asset paths for GitHub Pages
        assets: {
            baseUrl: '', // Will be set dynamically
            images: './assets/images/',
            icons: './assets/icons/',
            fonts: './assets/fonts/'
        },
        
        // CORS configuration for API calls
        cors: {
            enabled: true,
            credentials: false, // GitHub Pages doesn't support credentials
            allowedOrigins: ['*'] // Will be restricted on API server side
        }
    },

    // Error handling configuration
    ERROR_HANDLING: {
        // Error reporting
        reporting: {
            enabled: false, // Disable for privacy on GitHub Pages
            endpoint: null
        },
        
        // Fallback behavior
        fallbacks: {
            showOfflineMessage: true,
            retryFailedRequests: true,
            cacheResponses: true
        }
    },

    // Development configuration
    DEVELOPMENT: {
        debug: false, // Set to true for development
        mockData: false, // Use mock data when API is unavailable
        verbose: false // Verbose logging
    }
};

// Auto-detect GitHub Pages configuration
(function() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Detect if running on GitHub Pages
    if (hostname.includes('github.io')) {
        // Extract username and repository from URL
        const pathParts = pathname.split('/').filter(part => part);
        if (pathParts.length > 0) {
            window.SpliceSupplyConfig.GITHUB_PAGES.repository = pathParts[0];
            window.SpliceSupplyConfig.GITHUB_PAGES.username = hostname.split('.')[0];
        }
        
        // Set base URL for assets
        window.SpliceSupplyConfig.DEPLOYMENT.assets.baseUrl = pathname.endsWith('/') ? pathname : pathname + '/';
    }
    
    // Detect custom domain
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('github.io')) {
        window.SpliceSupplyConfig.GITHUB_PAGES.customDomain = hostname;
        window.SpliceSupplyConfig.DEPLOYMENT.assets.baseUrl = '/';
    }
    
    // Development mode detection
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        window.SpliceSupplyConfig.DEVELOPMENT.debug = true;
        window.SpliceSupplyConfig.DEVELOPMENT.verbose = true;
    }
})();

// Utility functions for GitHub Pages
window.SpliceSupplyUtils = {
    // Get full URL for assets
    getAssetUrl: function(path) {
        const baseUrl = window.SpliceSupplyConfig.DEPLOYMENT.assets.baseUrl;
        return baseUrl + path.replace(/^\.?\//, '');
    },
    
    // Get API URL with fallback
    getApiUrl: function(endpoint) {
        const config = window.SpliceSupplyConfig.API;
        return config.baseUrl + endpoint;
    },
    
    // Check if running on GitHub Pages
    isGitHubPages: function() {
        return window.location.hostname.includes('github.io') || 
               window.SpliceSupplyConfig.GITHUB_PAGES.customDomain;
    },
    
    // Get repository URL
    getRepositoryUrl: function() {
        const config = window.SpliceSupplyConfig.GITHUB_PAGES;
        return `https://github.com/${config.username}/${config.repository}`;
    },
    
    // Log function that respects debug settings
    log: function(message, level = 'info') {
        if (window.SpliceSupplyConfig.DEVELOPMENT.debug || 
            window.SpliceSupplyConfig.DEVELOPMENT.verbose) {
            console[level]('[Splice Supply]', message);
        }
    },
    
    // Error reporting (disabled for GitHub Pages)
    reportError: function(error, context) {
        this.log(`Error in ${context}: ${error.message}`, 'error');
        // Error reporting disabled for GitHub Pages deployment
    }
};

// Initialize configuration
window.SpliceSupplyUtils.log('Configuration loaded for GitHub Pages deployment');
window.SpliceSupplyUtils.log(`Repository: ${window.SpliceSupplyConfig.GITHUB_PAGES.username}/${window.SpliceSupplyConfig.GITHUB_PAGES.repository}`);
window.SpliceSupplyUtils.log(`API Base URL: ${window.SpliceSupplyConfig.API.baseUrl}`);

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SpliceSupplyConfig;
}

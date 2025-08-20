// Splice Supply Bot Mini App - GitHub Pages Compatible Version
class SpliceSupplyApp {
    constructor() {
        this.config = window.SpliceSupplyConfig;
        this.utils = window.SpliceSupplyUtils;
        this.tg = window.Telegram?.WebApp;
        this.user = null;
        this.currentSection = 'home';
        this.currentPage = { free: 1, premium: 1 };
        this.searchQuery = { free: '', premium: '' };
        this.files = { free: [], premium: [] };
        this.userStatus = null;
        this.apiRetryCount = 0;
        this.maxRetries = this.config.API.retries;
        
        this.init();
    }

    async init() {
        try {
            this.utils.log('Initializing Splice Supply Mini App on GitHub Pages');
            
            // Show loading progress
            this.updateLoadingProgress(10, 'Initializing Telegram WebApp...');
            
            // Initialize Telegram WebApp
            if (this.tg) {
                this.tg.ready();
                this.tg.expand();
                this.setTelegramTheme();
                this.user = this.tg.initDataUnsafe?.user;
                this.utils.log('Telegram WebApp initialized', 'info');
            } else {
                this.utils.log('Telegram WebApp not available - running in browser mode', 'warn');
                this.user = this.getMockUser(); // For testing outside Telegram
            }
            
            this.updateLoadingProgress(30, 'Setting up event listeners...');
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.updateLoadingProgress(50, 'Loading initial data...');
            
            // Load initial data with retry logic
            await this.loadInitialDataWithRetry();
            
            this.updateLoadingProgress(80, 'Finalizing setup...');
            
            // Setup connection monitoring
            this.setupConnectionMonitoring();
            
            this.updateLoadingProgress(100, 'Ready!');
            
            // Hide loading screen
            setTimeout(() => this.hideLoadingScreen(), 500);
            
        } catch (error) {
            this.utils.reportError(error, 'App initialization');
            this.showConnectionError();
        }
    }

    updateLoadingProgress(percentage, text) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = text;
        }
    }

    setTelegramTheme() {
        if (!this.tg) return;
        
        // Apply Telegram theme colors
        if (this.tg.themeParams) {
            const root = document.documentElement;
            
            // Set theme colors from Telegram
            if (this.tg.themeParams.bg_color) {
                root.style.setProperty('--tg-bg-color', this.tg.themeParams.bg_color);
            }
            if (this.tg.themeParams.text_color) {
                root.style.setProperty('--tg-text-color', this.tg.themeParams.text_color);
            }
            if (this.tg.themeParams.hint_color) {
                root.style.setProperty('--tg-hint-color', this.tg.themeParams.hint_color);
            }
            if (this.tg.themeParams.button_color) {
                root.style.setProperty('--tg-button-color', this.tg.themeParams.button_color);
            }
        }
        
        // Configure WebApp settings
        if (this.config.TELEGRAM.webApp.enableClosingConfirmation) {
            this.tg.enableClosingConfirmation();
        }
        
        if (this.config.TELEGRAM.webApp.headerColor) {
            this.tg.setHeaderColor(this.config.TELEGRAM.webApp.headerColor);
        }
        
        if (this.config.TELEGRAM.webApp.backgroundColor) {
            this.tg.setBackgroundColor(this.config.TELEGRAM.webApp.backgroundColor);
        }
    }

    getMockUser() {
        // Mock user for testing outside Telegram
        return {
            id: 123456789,
            first_name: 'Test User',
            username: 'testuser',
            language_code: 'en'
        };
    }

    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.navigateToSection(section);
            });
        });

        // Feature cards
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleFeatureAction(action);
            });
        });

        // Action buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });
        });

        // Search functionality
        document.querySelectorAll('.search-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.performSearch(type);
            });
        });

        // Search input enter key
        document.querySelectorAll('.search-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const type = e.target.id.includes('free') ? 'free' : 'premium';
                    this.performSearch(type);
                }
            });
        });

        // Modal close
        document.getElementById('modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modal-cancel')?.addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.getElementById('file-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'file-modal') {
                this.closeModal();
            }
        });

        // Handle browser back button
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.section) {
                this.navigateToSection(e.state.section, false);
            }
        });

        // Handle online/offline events
        window.addEventListener('online', () => {
            this.hideConnectionStatus();
            this.loadInitialDataWithRetry();
        });

        window.addEventListener('offline', () => {
            this.showConnectionStatus('offline');
        });
    }

    async loadInitialDataWithRetry() {
        let attempts = 0;
        const maxAttempts = this.maxRetries;
        
        while (attempts < maxAttempts) {
            try {
                await this.loadInitialData();
                this.hideConnectionStatus();
                return;
            } catch (error) {
                attempts++;
                this.utils.log(`Load attempt ${attempts} failed: ${error.message}`, 'warn');
                
                if (attempts < maxAttempts) {
                    this.showConnectionStatus('retrying', `Retrying... (${attempts}/${maxAttempts})`);
                    await this.delay(this.config.API.retryDelay * attempts);
                } else {
                    this.showConnectionStatus('error', 'Unable to connect to server');
                    this.loadMockData(); // Fallback to mock data
                }
            }
        }
    }

    async loadInitialData() {
        try {
            // Load user status
            await this.loadUserStatus();
            
            // Load file counts
            await this.loadFileCounts();
            
            // Update UI with user info
            this.updateUserInfo();
            
        } catch (error) {
            this.utils.reportError(error, 'Loading initial data');
            throw error;
        }
    }

    async loadUserStatus() {
        try {
            const response = await this.apiCall('/api/user/status', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: this.user?.id,
                    username: this.user?.username,
                    first_name: this.user?.first_name,
                    last_name: this.user?.last_name
                })
            });

            this.userStatus = response;
            this.utils.log('User status loaded successfully');
        } catch (error) {
            this.utils.log('Failed to load user status, using fallback', 'warn');
            // Fallback user status
            this.userStatus = {
                user_id: this.user?.id || 0,
                username: this.user?.username || 'Unknown',
                is_premium: false,
                premium_downloads_used: 0,
                premium_downloads_remaining: 3
            };
        }
    }

    async loadFileCounts() {
        try {
            const response = await this.apiCall('/api/files/counts');
            
            document.getElementById('free-files-count').textContent = response.free_count || 0;
            document.getElementById('premium-files-count').textContent = response.premium_count || 0;
            
            this.utils.log('File counts loaded successfully');
        } catch (error) {
            this.utils.log('Failed to load file counts, using fallback', 'warn');
            document.getElementById('free-files-count').textContent = '6';
            document.getElementById('premium-files-count').textContent = '6';
        }
    }

    loadMockData() {
        this.utils.log('Loading mock data for offline mode', 'info');
        
        // Mock user status
        this.userStatus = {
            user_id: this.user?.id || 123456789,
            username: this.user?.username || 'testuser',
            is_premium: false,
            premium_downloads_used: 0,
            premium_downloads_remaining: 3
        };
        
        // Mock file counts
        document.getElementById('free-files-count').textContent = '6';
        document.getElementById('premium-files-count').textContent = '6';
        
        // Update UI
        this.updateUserInfo();
        
        // Show offline notice
        this.showToast('Running in offline mode with sample data', 'warning');
    }

    setupConnectionMonitoring() {
        // Periodically check API connection
        setInterval(async () => {
            try {
                await this.apiCall('/api/stats', { method: 'GET' });
                this.hideConnectionStatus();
            } catch (error) {
                this.showConnectionStatus('error', 'Connection lost');
            }
        }, 30000); // Check every 30 seconds
    }

    showConnectionStatus(type, message) {
        const statusElement = document.getElementById('connection-status');
        const indicator = statusElement?.querySelector('.status-indicator');
        
        if (!statusElement || !indicator) return;
        
        statusElement.style.display = 'block';
        statusElement.className = `connection-status ${type}`;
        
        const icon = indicator.querySelector('i');
        const text = indicator.querySelector('span');
        
        switch (type) {
            case 'offline':
                icon.className = 'fas fa-wifi-slash';
                text.textContent = 'You are offline';
                break;
            case 'retrying':
                icon.className = 'fas fa-spinner fa-spin';
                text.textContent = message || 'Reconnecting...';
                break;
            case 'error':
                icon.className = 'fas fa-exclamation-triangle';
                text.textContent = message || 'Connection error';
                break;
        }
    }

    hideConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.style.display = 'none';
        }
    }

    // GitHub Pages compatible communication method
    async apiCall(endpoint, options = {}) {
        // For GitHub Pages, use Telegram WebApp communication
        if (this.config.API.mode === 'telegram_webapp') {
            return this.telegramWebAppCall(endpoint, options);
        }

        // Fallback to server API (for VPS deployment)
        const url = this.utils.getApiUrl(endpoint);

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': this.tg?.initData || '',
                'X-GitHub-Pages': 'true'
            },
            timeout: this.config.API.timeout
        };

        const requestOptions = { ...defaultOptions, ...options };

        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout);
        requestOptions.signal = controller.signal;

        try {
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }

            this.utils.reportError(error, `API call to ${endpoint}`);
            throw error;
        }
    }

    // Telegram WebApp communication for GitHub Pages
    async telegramWebAppCall(endpoint, options = {}) {
        try {
            // For GitHub Pages deployment, we'll use mock data and Telegram WebApp features
            switch (endpoint) {
                case '/api/user/status':
                    return this.getMockUserStatus();

                case '/api/files/counts':
                    return this.getMockFileCounts();

                case '/api/files/free':
                case '/api/files/premium':
                    return this.getMockFiles(endpoint.includes('premium') ? 'premium' : 'free', options.body ? JSON.parse(options.body) : {});

                case '/api/stats':
                    return { status: 'ok', timestamp: Date.now() };

                default:
                    if (endpoint.includes('/download')) {
                        return this.handleTelegramDownload(endpoint, options);
                    }
                    throw new Error(`Endpoint ${endpoint} not supported in GitHub Pages mode`);
            }
        } catch (error) {
            this.utils.reportError(error, `Telegram WebApp call to ${endpoint}`);
            throw error;
        }
    }

    // Handle downloads via Telegram WebApp
    async handleTelegramDownload(endpoint, options) {
        try {
            const fileId = endpoint.match(/\/api\/files\/(\d+)\/download/)?.[1];
            if (!fileId) {
                throw new Error('Invalid file ID');
            }

            const data = options.body ? JSON.parse(options.body) : {};

            // Use Telegram WebApp to send data back to bot
            if (this.tg) {
                const downloadData = {
                    action: 'download_file',
                    file_id: parseInt(fileId),
                    user_id: this.user?.id,
                    timestamp: Date.now()
                };

                // Send data to bot via WebApp
                this.tg.sendData(JSON.stringify(downloadData));

                // Show success message
                this.showToast('Download request sent to bot!', 'success');

                return {
                    success: true,
                    message: 'Download request sent to bot',
                    download_method: 'telegram_webapp'
                };
            } else {
                throw new Error('Telegram WebApp not available');
            }
        } catch (error) {
            this.utils.reportError(error, 'Telegram download');
            throw error;
        }
    }

    // Navigation with URL state management
    navigateToSection(section, updateHistory = true) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

        // Update content sections
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`)?.classList.add('active');

        this.currentSection = section;

        // Update URL without page reload (for GitHub Pages)
        if (updateHistory && window.history) {
            const url = new URL(window.location);
            url.searchParams.set('section', section);
            window.history.pushState({ section }, '', url);
        }

        // Load section data if needed
        if (section === 'free-files' && this.files.free.length === 0) {
            this.loadFiles('free');
        } else if (section === 'premium-files' && this.files.premium.length === 0) {
            this.loadFiles('premium');
        }
    }

    handleAction(action) {
        switch (action) {
            case 'join-channels':
            case 'join-premium':
                if (this.tg) {
                    this.tg.openLink(this.config.TELEGRAM.channels.premium);
                } else {
                    window.open(this.config.TELEGRAM.channels.premium, '_blank');
                }
                break;
            case 'view-status':
                this.navigateToSection('status');
                break;
        }
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen && app) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                app.style.display = 'block';
                app.style.opacity = '0';
                setTimeout(() => {
                    app.style.opacity = '1';
                }, 50);
            }, 300);
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, this.config.APP.ui.toastDuration);
    }

    getToastIcon(type) {
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Placeholder methods for features to be implemented
    updateUserInfo() {
        // Implementation from original app.js
        this.utils.log('User info updated');
    }

    async loadFiles(type, page = 1, search = '') {
        // Implementation from original app.js with error handling
        this.utils.log(`Loading ${type} files`);
    }

    closeModal() {
        const modal = document.getElementById('file-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async performSearch(type) {
        // Implementation from original app.js
        this.utils.log(`Performing ${type} search`);
    }

    handleFeatureAction(action) {
        switch (action) {
            case 'browse-free':
                this.navigateToSection('free-files');
                break;
            case 'browse-premium':
                this.navigateToSection('premium-files');
                break;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if configuration is loaded
    if (typeof window.SpliceSupplyConfig === 'undefined') {
        console.error('Configuration not loaded. Make sure config.js is included before app.js');
        return;
    }
    
    // Initialize the app
    window.spliceSupplyApp = new SpliceSupplyApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.spliceSupplyApp) {
        // Refresh data when page becomes visible
        window.spliceSupplyApp.loadInitialDataWithRetry();
    }
});

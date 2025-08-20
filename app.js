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

    // Mock data functions for GitHub Pages deployment
    getMockUserStatus() {
        return {
            user_id: this.user?.id || 123456789,
            username: this.user?.username || 'testuser',
            first_name: this.user?.first_name || 'Test User',
            last_name: this.user?.last_name || '',
            is_premium: false,
            premium_downloads_used: 0,
            premium_downloads_remaining: 3,
            premium_reset_date: 'Next month'
        };
    }

    getMockFileCounts() {
        return {
            free_count: 8,
            premium_count: 10,
            total_count: 18
        };
    }

    getMockFiles(fileType, params = {}) {
        const page = params.page || 1;
        const search = params.search || '';
        const filesPerPage = 6;

        // Mock file data
        const mockFiles = {
            free: [
                {
                    file_id: 1,
                    name: 'Free Beat Pack Vol.1',
                    description: 'High-quality free beats for your productions',
                    file_type: 'free',
                    file_size: 15728640,
                    created_at: '2025-08-20',
                    download_count: 245
                },
                {
                    file_id: 2,
                    name: 'Free VST Presets Collection',
                    description: 'Collection of free synthesizer presets',
                    file_type: 'free',
                    file_size: 8388608,
                    created_at: '2025-08-19',
                    download_count: 189
                },
                {
                    file_id: 3,
                    name: 'Free Drum Samples Pack',
                    description: 'Essential drum samples for hip-hop and trap',
                    file_type: 'free',
                    file_size: 12582912,
                    created_at: '2025-08-18',
                    download_count: 312
                },
                {
                    file_id: 4,
                    name: 'Free Melody Loops Starter',
                    description: 'Catchy melody loops to inspire your tracks',
                    file_type: 'free',
                    file_size: 9437184,
                    created_at: '2025-08-17',
                    download_count: 156
                },
                {
                    file_id: 5,
                    name: 'Free Bass Samples',
                    description: '808s and bass sounds for modern production',
                    file_type: 'free',
                    file_size: 7340032,
                    created_at: '2025-08-16',
                    download_count: 278
                },
                {
                    file_id: 6,
                    name: 'Free Vocal Chops Pack',
                    description: 'Processed vocal samples for creative use',
                    file_type: 'free',
                    file_size: 11534336,
                    created_at: '2025-08-15',
                    download_count: 203
                }
            ],
            premium: [
                {
                    file_id: 7,
                    name: 'Premium Drum Kit Deluxe',
                    description: 'Exclusive premium drum samples with stems',
                    file_type: 'premium',
                    file_size: 52428800,
                    created_at: '2025-08-20',
                    download_count: 89
                },
                {
                    file_id: 8,
                    name: 'Premium Melody Loops Pro',
                    description: 'Professional melody loops with MIDI files',
                    file_type: 'premium',
                    file_size: 31457280,
                    created_at: '2025-08-19',
                    download_count: 67
                },
                {
                    file_id: 9,
                    name: 'Premium Vocal Pack Elite',
                    description: 'High-quality vocal samples and harmonies',
                    file_type: 'premium',
                    file_size: 45088768,
                    created_at: '2025-08-18',
                    download_count: 45
                },
                {
                    file_id: 10,
                    name: 'Premium Synth Presets Bundle',
                    description: 'Exclusive synthesizer presets for all genres',
                    file_type: 'premium',
                    file_size: 18874368,
                    created_at: '2025-08-17',
                    download_count: 78
                },
                {
                    file_id: 11,
                    name: 'Premium Construction Kit',
                    description: 'Complete song construction with all elements',
                    file_type: 'premium',
                    file_size: 67108864,
                    created_at: '2025-08-16',
                    download_count: 34
                },
                {
                    file_id: 12,
                    name: 'Premium FX & Transitions',
                    description: 'Professional sound effects and transitions',
                    file_type: 'premium',
                    file_size: 23068672,
                    created_at: '2025-08-15',
                    download_count: 56
                }
            ]
        };

        let files = mockFiles[fileType] || [];

        // Apply search filter if provided
        if (search) {
            files = files.filter(file =>
                file.name.toLowerCase().includes(search.toLowerCase()) ||
                file.description.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Calculate pagination
        const totalFiles = files.length;
        const totalPages = Math.ceil(totalFiles / filesPerPage);
        const startIndex = (page - 1) * filesPerPage;
        const endIndex = startIndex + filesPerPage;
        const paginatedFiles = files.slice(startIndex, endIndex);

        return {
            files: paginatedFiles,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_files: totalFiles,
                files_per_page: filesPerPage,
                has_next: page < totalPages,
                has_prev: page > 1
            }
        };
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
        try {
            this.utils.log(`Loading ${type} files - page ${page}, search: "${search}"`);

            // Show loading state
            const container = document.getElementById(`${type}-files-container`);
            if (container) {
                container.innerHTML = '<div class="loading-spinner">Loading files...</div>';
            }

            // Make API call
            const response = await this.apiCall(`/api/files/${type}`, {
                method: 'POST',
                body: JSON.stringify({
                    page: page,
                    search: search,
                    user_id: this.user?.id
                })
            });

            // Update current page and search
            this.currentPage[type] = page;
            this.searchQuery[type] = search;

            // Store files data
            if (page === 1) {
                this.files[type] = response.files || [];
            } else {
                this.files[type] = [...this.files[type], ...(response.files || [])];
            }

            // Display files
            this.displayFiles(type, response);

            this.utils.log(`Loaded ${response.files?.length || 0} ${type} files`);

        } catch (error) {
            this.utils.reportError(error, `Loading ${type} files`);

            // Show error state
            const container = document.getElementById(`${type}-files-container`);
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p>❌ Error loading files</p>
                        <button onclick="app.loadFiles('${type}', ${page}, '${search}')" class="retry-btn">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    displayFiles(type, response) {
        const container = document.getElementById(`${type}-files-container`);
        if (!container) {
            this.utils.log(`Container for ${type} files not found`, 'error');
            return;
        }

        const files = response.files || [];
        const pagination = response.pagination || {};

        if (files.length === 0) {
            container.innerHTML = `
                <div class="no-files-state">
                    <p>📁 No ${type} files found</p>
                    ${this.searchQuery[type] ? '<p>Try adjusting your search terms</p>' : ''}
                </div>
            `;
            return;
        }

        // Generate files HTML
        const filesHTML = files.map(file => `
            <div class="file-card" data-file-id="${file.file_id}">
                <div class="file-header">
                    <h3 class="file-title">${this.escapeHtml(file.name)}</h3>
                    <span class="file-type ${file.file_type}">${file.file_type.toUpperCase()}</span>
                </div>
                <div class="file-info">
                    <p class="file-description">${this.escapeHtml(file.description)}</p>
                    <div class="file-meta">
                        <span class="file-size">${this.formatFileSize(file.file_size)}</span>
                        <span class="download-count">📥 ${file.download_count || 0}</span>
                        <span class="file-date">${this.formatDate(file.created_at)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="download-btn" onclick="app.downloadFile(${file.file_id}, '${file.file_type}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `).join('');

        // Generate pagination HTML
        const paginationHTML = pagination.total_pages > 1 ? `
            <div class="pagination">
                ${pagination.has_prev ? `
                    <button class="page-btn" onclick="app.loadFiles('${type}', ${pagination.current_page - 1}, '${this.searchQuery[type]}')">
                        ← Previous
                    </button>
                ` : ''}
                <span class="page-info">
                    Page ${pagination.current_page} of ${pagination.total_pages}
                </span>
                ${pagination.has_next ? `
                    <button class="page-btn" onclick="app.loadFiles('${type}', ${pagination.current_page + 1}, '${this.searchQuery[type]}')">
                        Next →
                    </button>
                ` : ''}
            </div>
        ` : '';

        container.innerHTML = `
            <div class="files-grid">
                ${filesHTML}
            </div>
            ${paginationHTML}
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    async downloadFile(fileId, fileType) {
        try {
            this.utils.log(`Downloading file ${fileId} (${fileType})`);

            // Show loading state
            const button = event.target.closest('.download-btn');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            button.disabled = true;

            // Make download request
            const response = await this.apiCall(`/api/files/${fileId}/download`, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: this.user?.id,
                    file_type: fileType
                })
            });

            if (response.success) {
                this.showToast('Download request sent to bot!', 'success');
            } else {
                this.showToast('Download failed. Please try again.', 'error');
            }

            // Restore button
            button.innerHTML = originalText;
            button.disabled = false;

        } catch (error) {
            this.utils.reportError(error, 'File download');
            this.showToast('Download error. Please try again.', 'error');

            // Restore button
            const button = event.target.closest('.download-btn');
            button.innerHTML = '<i class="fas fa-download"></i> Download';
            button.disabled = false;
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Add to page
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
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

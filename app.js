/**
 * SnipLink — URL Shortener Application
 * Core JavaScript: URL shortening, history management, click tracking, QR generation
 */

// ===========================
// Storage Manager
// ===========================
class StorageManager {
    constructor(key = 'sniplink_urls') {
        this.key = key;
    }

    getAll() {
        try {
            const data = localStorage.getItem(this.key);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    save(entries) {
        localStorage.setItem(this.key, JSON.stringify(entries));
    }

    add(entry) {
        const entries = this.getAll();
        entries.unshift(entry);
        this.save(entries);
    }

    remove(code) {
        const entries = this.getAll().filter(e => e.code !== code);
        this.save(entries);
    }

    incrementClicks(code) {
        const entries = this.getAll();
        const entry = entries.find(e => e.code === code);
        if (entry) {
            entry.clicks = (entry.clicks || 0) + 1;
            this.save(entries);
        }
    }

    clear() {
        this.save([]);
    }
}

// ===========================
// URL Shortener Engine
// ===========================
class URLShortener {
    constructor() {
        this.baseUrl = 'snip.link';
    }

    /**
     * Generate a unique short code using base62 encoding
     * Combines timestamp + random characters for uniqueness
     */
    generateCode(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        const timestamp = Date.now().toString(36).slice(-2);
        code += timestamp;
        for (let i = 0; i < length - 2; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Validate URL format
     */
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Create shortened URL entry
     */
    shorten(originalUrl) {
        if (!this.isValidUrl(originalUrl)) {
            throw new Error('Please enter a valid URL (starting with http:// or https://)');
        }

        const code = this.generateCode();
        return {
            code,
            originalUrl,
            shortUrl: `${this.baseUrl}/${code}`,
            createdAt: new Date().toISOString(),
            clicks: 0
        };
    }

    /**
     * Generate QR Code URL using external API
     */
    getQRCodeUrl(url, size = 150) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=8`;
    }
}

// ===========================
// UI Controller
// ===========================
class UIController {
    constructor() {
        this.storage = new StorageManager();
        this.shortener = new URLShortener();
        this.initElements();
        this.bindEvents();
        this.render();
    }

    initElements() {
        // Input elements
        this.urlInput = document.getElementById('url-input');
        this.shortenBtn = document.getElementById('shorten-btn');

        // Result elements
        this.resultArea = document.getElementById('result-area');
        this.shortUrlDisplay = document.getElementById('short-url-display');
        this.copyBtn = document.getElementById('copy-btn');
        this.qrCode = document.getElementById('qr-code');

        // History elements
        this.historyList = document.getElementById('history-list');
        this.clearHistoryBtn = document.getElementById('clear-history-btn');

        // Stats elements
        this.statTotal = document.getElementById('stat-total');
        this.statClicks = document.getElementById('stat-clicks');
        this.statToday = document.getElementById('stat-today');

        // Toast
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toast-message');
    }

    bindEvents() {
        // Shorten button click
        this.shortenBtn.addEventListener('click', () => this.handleShorten());

        // Enter key on input
        this.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleShorten();
        });

        // Copy button
        this.copyBtn.addEventListener('click', () => this.handleCopy());

        // Clear history
        this.clearHistoryBtn.addEventListener('click', () => this.handleClearHistory());

        // Smooth scroll navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Input animation
        this.urlInput.addEventListener('focus', () => {
            this.urlInput.parentElement.style.transform = 'scale(1.01)';
        });
        this.urlInput.addEventListener('blur', () => {
            this.urlInput.parentElement.style.transform = 'scale(1)';
        });
    }

    /**
     * Handle URL shortening
     */
    handleShorten() {
        const url = this.urlInput.value.trim();

        if (!url) {
            this.showToast('⚠️ Please enter a URL', 'warning');
            this.urlInput.focus();
            return;
        }

        try {
            const entry = this.shortener.shorten(url);
            this.storage.add(entry);

            // Show result
            this.shortUrlDisplay.textContent = entry.shortUrl;
            this.shortUrlDisplay.href = entry.originalUrl;
            this.qrCode.src = this.shortener.getQRCodeUrl(entry.originalUrl);
            this.resultArea.classList.remove('hidden');

            // Clear input
            this.urlInput.value = '';

            // Re-render
            this.render();
            this.showToast('✅ Link shortened successfully!');

        } catch (error) {
            this.showToast(`❌ ${error.message}`, 'error');
        }
    }

    /**
     * Copy short URL to clipboard
     */
    async handleCopy() {
        const text = this.shortUrlDisplay.textContent;
        try {
            await navigator.clipboard.writeText(text);
            this.copyBtn.querySelector('span').textContent = 'Copied!';
            this.showToast('📋 Copied to clipboard!');
            setTimeout(() => {
                this.copyBtn.querySelector('span').textContent = 'Copy';
            }, 2000);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('📋 Copied to clipboard!');
        }
    }

    /**
     * Clear all history
     */
    handleClearHistory() {
        if (this.storage.getAll().length === 0) {
            this.showToast('📭 Nothing to clear');
            return;
        }
        this.storage.clear();
        this.resultArea.classList.add('hidden');
        this.render();
        this.showToast('🗑️ History cleared');
    }

    /**
     * Delete single entry
     */
    handleDelete(code) {
        this.storage.remove(code);
        this.render();
        this.showToast('🗑️ Link removed');
    }

    /**
     * Simulate a click on a shortened link
     */
    handleLinkClick(code, originalUrl) {
        this.storage.incrementClicks(code);
        this.render();
        window.open(originalUrl, '_blank');
    }

    /**
     * Render history list
     */
    renderHistory() {
        const entries = this.storage.getAll();

        if (entries.length === 0) {
            this.historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No links yet. Shorten your first URL above!</p>
                </div>
            `;
            return;
        }

        this.historyList.innerHTML = entries.map(entry => {
            const date = new Date(entry.createdAt);
            const formattedDate = date.toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });

            return `
                <div class="history-item">
                    <div class="history-item-info">
                        <a href="#" class="history-short-url" 
                           onclick="app.handleLinkClick('${entry.code}', '${entry.originalUrl}'); return false;">
                            ${entry.shortUrl}
                        </a>
                        <span class="history-original-url" title="${entry.originalUrl}">
                            ${entry.originalUrl}
                        </span>
                    </div>
                    <div class="history-meta">
                        <span class="history-clicks">
                            <span class="click-badge">${entry.clicks || 0} clicks</span>
                        </span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${formattedDate}</span>
                        <button class="history-delete" title="Delete" 
                                onclick="app.handleDelete('${entry.code}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
                                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render statistics
     */
    renderStats() {
        const entries = this.storage.getAll();
        const today = new Date().toDateString();

        const totalLinks = entries.length;
        const totalClicks = entries.reduce((sum, e) => sum + (e.clicks || 0), 0);
        const todayLinks = entries.filter(e => new Date(e.createdAt).toDateString() === today).length;

        this.animateCounter(this.statTotal, totalLinks);
        this.animateCounter(this.statClicks, totalClicks);
        this.animateCounter(this.statToday, todayLinks);
    }

    /**
     * Animate counter from 0 to target value
     */
    animateCounter(element, target) {
        const duration = 500;
        const start = parseInt(element.textContent) || 0;
        const diff = target - start;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            element.textContent = Math.round(start + diff * eased);
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    /**
     * Full render
     */
    render() {
        this.renderHistory();
        this.renderStats();
    }

    /**
     * Show toast notification
     */
    showToast(message) {
        this.toastMessage.textContent = message;
        this.toast.classList.remove('hidden');
        this.toast.classList.add('show');

        setTimeout(() => {
            this.toast.classList.remove('show');
            setTimeout(() => this.toast.classList.add('hidden'), 300);
        }, 2500);
    }
}

// ===========================
// Initialize Application
// ===========================
const app = new UIController();

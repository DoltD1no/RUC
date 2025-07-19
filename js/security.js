// Security functions
class Security {
    // Generate CSRF token
    static generateCSRFToken() {
        const array = new Uint8Array(CONFIG.SECURITY.CSRF_TOKEN_LENGTH);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Input sanitization
    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .replace(/[<>'"]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/script/gi, '')
            .trim();
    }

    // Validate username
    static validateUsername(username) {
        username = this.sanitizeInput(username);
        
        if (!CONFIG.VALIDATION.USERNAME_REGEX.test(username)) {
            throw new Error('Username must be 3-20 characters, letters, numbers, and underscores only');
        }
        
        if (username.includes('__') || username.startsWith('_') || username.endsWith('_')) {
            throw new Error('Invalid username format');
        }
        
        return username;
    }

    // Validate password
    static validatePassword(password) {
        if (password.length < CONFIG.VALIDATION.PASSWORD_MIN_LENGTH) {
            throw new Error(`Password must be at least ${CONFIG.VALIDATION.PASSWORD_MIN_LENGTH} characters`);
        }
        
        if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) {
            throw new Error('Password must contain both letters and numbers');
        }
        
        return password;
    }

    // Simple encryption for session storage
    static encrypt(data) {
        try {
            const jsonStr = JSON.stringify(data);
            return btoa(encodeURIComponent(jsonStr));
        } catch (e) {
            console.error('Encryption failed:', e);
            return null;
        }
    }

    // Simple decryption for session storage
    static decrypt(data) {
        try {
            const jsonStr = decodeURIComponent(atob(data));
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    }

    // Rate limiting check
    static checkRateLimit() {
        if (STATE.apiRateLimit.current <= 0) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
        return true;
    }

    // Update rate limit
    static updateRateLimit(cost = 1) {
        STATE.apiRateLimit.current = Math.max(0, STATE.apiRateLimit.current - cost);
        UI.updateRateLimitDisplay();
        
        // Schedule rate limit reset
        if (STATE.apiRateLimit.current === 0) {
            setTimeout(() => {
                STATE.apiRateLimit.current = STATE.apiRateLimit.max;
                UI.updateRateLimitDisplay();
                UI.showMessage('Rate limit reset', 'success');
            }, 60000);
        }
    }
}

// Session management
class SessionManager {
    static save(key, data) {
        try {
            const encrypted = Security.encrypt(data);
            if (encrypted) {
                sessionStorage.setItem(`${CONFIG.STORAGE.PREFIX}${key}`, encrypted);
                UI.showSessionIndicator();
            }
        } catch (e) {
            console.error('Session save failed:', e);
        }
    }

    static load(key) {
        try {
            const encrypted = sessionStorage.getItem(`${CONFIG.STORAGE.PREFIX}${key}`);
            if (encrypted) {
                return Security.decrypt(encrypted);
            }
        } catch (e) {
            console.error('Session load failed:', e);
        }
        return null;
    }

    static clear() {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.startsWith(CONFIG.STORAGE.PREFIX)) {
                sessionStorage.removeItem(key);
            }
        });
        UI.showMessage('Session cleared', 'info');
    }
}

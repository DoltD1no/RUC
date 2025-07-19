// Roblox API integration
class RobloxAPI {
    // Check username availability
    static async checkUsername(username) {
        Security.checkRateLimit();
        username = Security.validateUsername(username);
        
        try {
            Security.updateRateLimit(1);
            
            // Check if username exists
            const response = await fetch(`${CONFIG.API.USERS_API}/users/search?keyword=${encodeURIComponent(username)}&limit=10`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(CONFIG.API.TIMEOUT)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Check if exact username match exists
            const exactMatch = data.data?.find(user => 
                user.name.toLowerCase() === username.toLowerCase()
            );

            const result = {
                username: username,
                available: !exactMatch,
                status: exactMatch ? 'Taken' : 'Available',
                userId: exactMatch?.id || null,
                displayName: exactMatch?.displayName || null
            };

            // Save to session
            this.saveToHistory('usernameChecks', result);
            
            return result;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    // Validate username format with Roblox rules
    static async validateUsernameFormat(username) {
        // Additional Roblox-specific validation
        const forbidden = ['roblox', 'robux', 'admin', 'moderator'];
        const usernameLower = username.toLowerCase();
        
        for (const word of forbidden) {
            if (usernameLower.includes(word)) {
                return {
                    valid: false,
                    reason: 'Username contains forbidden words'
                };
            }
        }

        return { valid: true };
    }

    // Bulk check usernames
    static async bulkCheckUsernames(usernames, onProgress) {
        const results = [];
        const total = usernames.length;
        
        for (let i = 0; i < total; i++) {
            try {
                const result = await this.checkUsername(usernames[i]);
                results.push(result);
                
                if (onProgress) {
                    onProgress(i + 1, total, result);
                }
                
                // Add delay to avoid rate limiting
                if (i < total - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                results.push({
                    username: usernames[i],
                    status: 'Error',
                    error: error.message
                });
            }
        }
        
        return results;
    }

    // Generate usernames
    static generateUsernames(options) {
        const { type, length, count, randomOrder } = options;
        const usernames = [];
        
        const generators = {
            mixed: () => this.generateMixed(length),
            letters: () => this.generateLetters(length),
            numbers: () => this.generateNumbers(length),
            pronounceable: () => this.generatePronounceable(length),
            leetspeak: () => this.generateLeetspeak(length)
        };
        
        const generator = generators[type] || generators.mixed;
        
        for (let i = 0; i < count; i++) {
            usernames.push(generator());
        }
        
        if (randomOrder) {
            // Fisher-Yates shuffle
            for (let i = usernames.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [usernames[i], usernames[j]] = [usernames[j], usernames[i]];
            }
        }
        
        return usernames;
    }

    // Username generators
    static generateMixed(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let username = '';
        for (let i = 0; i < length; i++) {
            username += chars[Math.floor(Math.random() * chars.length)];
        }
        return username;
    }

    static generateLetters(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let username = '';
        for (let i = 0; i < length; i++) {
            username += chars[Math.floor(Math.random() * chars.length)];
        }
        return username;
    }

    static generateNumbers(length) {
        return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
    }

    static generatePronounceable(length) {
        const consonants = 'bcdfghjklmnpqrstvwxyz';
        const vowels = 'aeiou';
        let username = '';
        
        for (let i = 0; i < length; i++) {
            if (i % 2 === 0) {
                username += consonants[Math.floor(Math.random() * consonants.length)];
            } else {
                username += vowels[Math.floor(Math.random() * vowels.length)];
            }
        }
        
        return username;
    }

    static generateLeetspeak(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const leetMap = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', g: '9' };
        let username = '';
        
        for (let i = 0; i < length; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            username += (leetMap[char] && Math.random() > 0.5) ? leetMap[char] : char;
        }
        
        return username;
    }

    // Save to history
    static saveToHistory(type, data) {
        const history = SessionManager.load(type) || [];
        history.unshift({ ...data, timestamp: Date.now() });
        
        // Keep only last 100 entries
        if (history.length > 100) {
            history.length = 100;
        }
        
        SessionManager.save(type, history);
    }
}

// Roblox API integration with CORS handling
class RobloxAPI {
    // Check username with CORS handling
    static async checkUsername(username) {
        Security.checkRateLimit();
        username = Security.validateUsername(username);
        
        try {
            Security.updateRateLimit(1);
            
            let data;
            
            // Try direct API call first (works for some Roblox endpoints)
            try {
                const response = await fetch(
                    `${CONFIG.API.USERS_API}/usernames/users`,
                    {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            usernames: [username],
                            excludeBannedUsers: true
                        }),
                        mode: 'cors'
                    }
                );

                if (response.ok) {
                    data = await response.json();
                } else {
                    throw new Error('Direct API failed');
                }
            } catch (corsError) {
                // Fallback: Use search endpoint (more likely to work)
                try {
                    const searchResponse = await fetch(
                        `${CONFIG.API.USERS_API}/users/search?keyword=${encodeURIComponent(username)}&limit=10`,
                        {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json'
                            },
                            mode: 'cors'
                        }
                    );

                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        // Convert search format to match username check format
                        const exactMatch = searchData.data?.find(user => 
                            user.name.toLowerCase() === username.toLowerCase()
                        );
                        
                        data = {
                            data: exactMatch ? [{
                                requestedUsername: username,
                                id: exactMatch.id,
                                name: exactMatch.name,
                                displayName: exactMatch.displayName
                            }] : []
                        };
                    } else {
                        throw new Error('Search API failed');
                    }
                } catch (searchError) {
                    // Last resort: Use CORS proxy
                    console.log('Using CORS proxy fallback...');
                    const proxyUrl = `${CONFIG.API.CORS_PROXY}${encodeURIComponent(
                        `${CONFIG.API.USERS_API}/users/search?keyword=${username}&limit=10`
                    )}`;
                    
                    const proxyResponse = await fetch(proxyUrl);
                    if (proxyResponse.ok) {
                        const searchData = await proxyResponse.json();
                        const exactMatch = searchData.data?.find(user => 
                            user.name.toLowerCase() === username.toLowerCase()
                        );
                        
                        data = {
                            data: exactMatch ? [{
                                requestedUsername: username,
                                id: exactMatch.id,
                                name: exactMatch.name,
                                displayName: exactMatch.displayName
                            }] : []
                        };
                    } else {
                        throw new Error('All API methods failed');
                    }
                }
            }

            // Process response
            const userExists = data.data && data.data.length > 0;
            const result = {
                username: username,
                available: !userExists,
                status: userExists ? 'Taken' : 'Available',
                userId: userExists ? data.data[0].id : null,
                displayName: userExists ? data.data[0].displayName : null
            };

            // Save to session
            this.saveToHistory('usernameChecks', result);
            
            return result;

        } catch (error) {
            console.error('Username check error:', error);
            
            // Provide helpful error message
            if (error.message.includes('CORS')) {
                throw new Error('Unable to connect to Roblox API. Please try again later.');
            }
            throw error;
        }
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
                    available: null,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    // Username generators
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
        
        // Generate unique usernames
        const usedUsernames = new Set();
        while (usernames.length < count) {
            const username = generator();
            if (!usedUsernames.has(username)) {
                usedUsernames.add(username);
                usernames.push(username);
            }
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
        let username = '';
        for (let i = 0; i < length; i++) {
            username += Math.floor(Math.random() * 10).toString();
        }
        return username;
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

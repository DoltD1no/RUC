// Configuration for browser-based operation
const CONFIG = {
    API: {
        // Roblox APIs that support CORS
        USERS_API: 'https://users.roblox.com/v1',
        THUMBNAILS_API: 'https://thumbnails.roblox.com/v1',
        
        // Public CORS proxy (backup option)
        CORS_PROXY: 'https://corsproxy.io/?',
        
        // Rate limiting
        RATE_LIMIT: 60,
        TIMEOUT: 10000
    },
    VALIDATION: {
        USERNAME_REGEX: /^[a-zA-Z0-9_]{3,20}$/,
        PASSWORD_MIN_LENGTH: 8,
        MIN_AGE: 13
    },
    STORAGE: {
        PREFIX: 'utools_'
    }
};

// Global state
const STATE = {
    soundEnabled: true,
    matrixEnabled: false,
    darkTheme: true,
    apiRateLimit: { current: CONFIG.API.RATE_LIMIT, max: CONFIG.API.RATE_LIMIT },
    currentResults: [],
    audioContext: null,
    gridDots: []
};

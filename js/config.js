// Configuration and constants
const CONFIG = {
    API: {
        BASE_URL: 'https://api.roblox.com',
        USERS_API: 'https://users.roblox.com/v1',
        AUTH_API: 'https://auth.roblox.com/v2',
        RATE_LIMIT: 100,
        TIMEOUT: 10000
    },
    VALIDATION: {
        USERNAME_REGEX: /^[a-zA-Z0-9_]{3,20}$/,
        PASSWORD_MIN_LENGTH: 8,
        MIN_AGE: 13
    },
    STORAGE: {
        PREFIX: 'utools_',
        ENCRYPTION_KEY: 'your-encryption-key-here' // Change in production
    },
    SECURITY: {
        CSRF_TOKEN_LENGTH: 32,
        SESSION_TIMEOUT: 3600000, // 1 hour
        MAX_ATTEMPTS: 5
    }
};

// State management
const STATE = {
    soundEnabled: true,
    matrixEnabled: false,
    darkTheme: true,
    apiRateLimit: { current: CONFIG.API.RATE_LIMIT, max: CONFIG.API.RATE_LIMIT },
    currentResults: [],
    sessionData: {},
    csrfToken: null
};

// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize effects
    Effects.generateASCII();
    Effects.createGridDots();
    Effects.initMouseEffects();
    
    // Initialize UI
    initializeEventListeners();
    initializeTerminals();
    initializeCommandPalette();
    initializeFormHandlers();
    
    // Load session data
    const savedChecks = SessionManager.load('usernameChecks');
    if (savedChecks && savedChecks.length > 0) {
        UI.addTerminalLine('username-output', 
            `Loaded ${savedChecks.length} previous checks from session`, 'info');
    }
    
    // Initialize rate limit
    Security.updateRateLimit(0);
    
    // Auto-save session periodically
    setInterval(() => {
        if (STATE.currentResults.length > 0) {
            SessionManager.save('lastResults', STATE.currentResults);
        }
    }, 30000);
});

// Initialize event listeners
function initializeEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        STATE.darkTheme = !STATE.darkTheme;
        const icon = STATE.darkTheme ? '🌙' : '☀️';
        document.getElementById('themeToggle').textContent = icon;
        UI.playSound('click');
    });

    // Sound toggle
    document.getElementById('soundToggle')?.addEventListener('click', () => {
        STATE.soundEnabled = !STATE.soundEnabled;
        document.getElementById('soundToggle').textContent = STATE.soundEnabled ? '🔊' : '🔇';
        if (STATE.soundEnabled) UI.playSound('click');
    });

    // Matrix toggle
    document.getElementById('matrixToggle')?.addEventListener('click', () => {
        STATE.matrixEnabled = !STATE.matrixEnabled;
        Effects.createMatrixRain();
        UI.playSound('click');
    });

    // Hover sounds
    document.addEventListener('mouseover', (e) => {
        if (e.target.matches('button, .btn, .filter-btn, .checkbox-group, .control-btn')) {
            UI.playSound('hover');
        }
    });

    // Click sounds
    document.addEventListener('click', (e) => {
        if (e.target.matches('button, .btn, .filter-btn')) {
            UI.playSound('click');
        }
    });

    // Number controls
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('number-btn')) return;
        
        const action = e.target.dataset.action;
        const field = e.target.dataset.field;
        const input = document.querySelector(`input[name="${field}"]`);
        
        if (!input) return;
        
        if (field === 'max_checks') {
            handleMaxChecks(action, input);
        } else {
            const current = parseInt(input.value) || 0;
            const min = parseInt(input.min) || 0;
            const max = parseInt(input.max) || 999;
            
            if (action === 'increment') {
                input.value = Math.min(current + 1, max);
            } else {
                input.value = Math.max(current - 1, min);
            }
        }
        
        UI.playSound('click');
    });
}

// Handle max checks special input
function handleMaxChecks(action, input) {
    const current = input.value === '∞' ? Infinity : parseInt(input.value) || 1;
    
    if (action === 'increment') {
        if (current >= 50) {
            input.value = '∞';
        } else {
            input.value = Math.min(current + 5, 50);
        }
    } else {
        if (current === Infinity) {
            input.value = 50;
        } else {
            input.value = Math.max(1, current - 5);
        }
    }
}

// Initialize terminals
function initializeTerminals() {
    setTimeout(() => {
        UI.addTerminalLine('username-output', 'System initialized', 'success');
        UI.addTerminalLine('bulk-output', 'Generator ready', 'success');
        UI.addTerminalLine('signup-output', 'Creator online', 'success');
        UI.addTerminalLine('username-output', 'CORS mode: Browser-based', 'info');
    }, 1000);
}

// Initialize form handlers
function initializeFormHandlers() {
    // Username checker
    document.getElementById('username-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const username = formData.get('username').trim();
        const detailed = formData.get('detailed_check') === 'on';
        
        const btn = form.querySelector('.btn');
        btn.classList.add('btn-loading');
        btn.disabled = true;
        
        UI.addTerminalLine('username-output', `Checking username: ${username}...`);
        UI.animateProgress(form);
        
        try {
            const result = await RobloxAPI.checkUsername(username);
            
            const statusMsg = `${result.username}: ${result.status}${detailed ? ' (detailed)' : ''}`;
            UI.addTerminalLine('username-output', statusMsg, 
                result.available ? 'success' : 'error');
            
            if (result.userId) {
                UI.addTerminalLine('username-output', 
                    `User ID: ${result.userId}`, 'info');
            }
            
            UI.showMessage(statusMsg, result.available ? 'success' : 'error');
            
        } catch (error) {
            UI.addTerminalLine('username-output', 
                `ERROR: ${error.message}`, 'error');
            UI.showMessage(error.message, 'error');
        } finally {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    });

    // Bulk generator
    document.getElementById('bulk-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const length = parseInt(formData.get('length'));
        const type = formData.get('type');
        const checkGenerated = formData.get('check_generated') === 'on';
        const randomOrder = formData.get('random_order') === 'on';
        
        const maxChecksInput = document.getElementById('max-checks-input');
        const maxChecks = maxChecksInput.value === '∞' ? 50 : 
            Math.min(parseInt(maxChecksInput.value) || 10, 50);
        
        const btn = form.querySelector('.btn');
        btn.classList.add('btn-loading');
        btn.disabled = true;
        
        UI.addTerminalLine('bulk-output', 
            `Generating ${maxChecks} usernames (${type}, length: ${length})...`);
        
        const usernames = RobloxAPI.generateUsernames({
            type, length, count: maxChecks, randomOrder
        });
        
        if (checkGenerated) {
            UI.animateProgress(form, maxChecks * 1000);
            
            const results = await RobloxAPI.bulkCheckUsernames(usernames, 
                (current, total, result) => {
                    UI.addTerminalLine('bulk-output', 
                        `[${current}/${total}] ${result.username}: ${result.status}`,
                        result.available ? 'success' : result.status === 'Taken' ? 'error' : 'info');
                });
            
            const available = results.filter(r => r.available).length;
            UI.addTerminalLine('bulk-output', 
                `Complete! Found ${available}/${results.length} available usernames`, 
                'success');
            
            STATE.currentResults = results;
            showResults(results);
        } else {
            UI.addTerminalLine('bulk-output', 
                `Generated ${usernames.length} usernames`, 'success');
            
            STATE.currentResults = usernames.map(u => ({
                username: u,
                status: 'Generated',
                available: null
            }));
            
            showResults(STATE.currentResults);
        }
        
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    });

    // Account creator (demo only)
    document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const agreed = formData.get('agree_terms') === 'on';
        
        if (!agreed) {
            UI.showMessage('You must agree to terms', 'error');
            return;
        }
        
        UI.showMessage(
            'Account creation is in demo mode. In production, this would create a real account.', 
            'info'
        );
        
        UI.addTerminalLine('signup-output', 
            'Demo mode: Account creation simulated', 'info');
    });
}

// Results handling
function showResults(results) {
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('results-view').style.display = 'block';
    
    updateResultsStats(results);
    updateResultsTable(results);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showMain() {
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('results-view').style.display = 'none';
    UI.playSound('click');
}

function updateResultsStats(results) {
    const total = results.length;
    const available = results.filter(r => r.available === true).length;
    const taken = results.filter(r => r.available === false).length;
    
    document.getElementById('total-results').textContent = total;
    document.getElementById('available-results').textContent = available;
    document.getElementById('taken-results').textContent = taken;
}

function updateResultsTable(results) {
    const tbody = document.getElementById('results-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = results.map(result => {
        const status = result.available === true ? 'Available' : 
                      result.available === false ? 'Taken' : 
                      result.status || 'Unknown';
        
        const statusClass = status === 'Available' ? 'status-available' :
                           status === 'Taken' ? 'status-taken' : '';
        
        return `
            <tr data-status="${status}">
                <td><strong>${Security.sanitizeInput(result.username)}</strong></td>
                <td class="${statusClass}">${status}</td>
                <td>
                    <a href="https://www.roblox.com/search/users?keyword=${result.username}" 
                       target="_blank" class="action-link">Verify</a>
                    ${status === 'Available' ? 
                        `<a href="https://www.roblox.com/account/signupredir?username=${result.username}" 
                            target="_blank" class="action-link" style="color: var(--success);">Sign up</a>` : 
                        ''}
                </td>
            </tr>
        `;
    }).join('');
}

function filterResults(filter) {
    const rows = document.querySelectorAll('#results-tbody tr');
    const buttons = document.querySelectorAll('.filter-btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    rows.forEach(row => {
        const status = row.dataset.status;
        let show = true;
        
        if (filter === 'available') {
            show = status === 'Available';
        } else if (filter === 'taken') {
            show = status === 'Taken';
        }
        
        row.style.display = show ? '' : 'none';
    });
    
    UI.playSound('click');
}

function copyAvailable() {
    const available = STATE.currentResults
        .filter(r => r.available === true)
        .map(r => r.username);
    
    if (available.length === 0) {
        UI.showMessage('No available usernames to copy', 'error');
        return;
    }
    
    navigator.clipboard.writeText(available.join('\n')).then(() => {
        UI.showMessage(`Copied ${available.length} usernames to clipboard`, 'success');
    }).catch(() => {
        UI.showMessage('Failed to copy to clipboard', 'error');
    });
}

function exportResults() {
    if (STATE.currentResults.length === 0) {
        UI.showMessage('No results to export', 'error');
        return;
    }
    
    const csv = 'Username,Status,Available,Timestamp\n' + 
        STATE.currentResults.map(r => 
            `${r.username},${r.status || 'Unknown'},${r.available},${new Date().toISOString()}`
        ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utools-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    UI.showMessage('Results exported successfully', 'success');
    UI.playSound('success');
}

// Command palette
function initializeCommandPalette() {
    const commands = [
        { icon: '🔍', text: 'Check Username', command: 'check-username', shortcut: 'Ctrl+K' },
        { icon: '🎲', text: 'Bulk Generate', command: 'bulk-generate', shortcut: 'Ctrl+G' },
        { icon: '👤', text: 'Create Account', command: 'create-account', shortcut: 'Ctrl+N' },
        { icon: '💾', text: 'Export Results', command: 'export-results', shortcut: 'Ctrl+E' },
        { icon: '🗑️', text: 'Clear Session', command: 'clear-session', shortcut: 'Ctrl+Shift+C' },
        { icon: '🎨', text: 'Toggle Theme', command: 'toggle-theme', shortcut: 'Ctrl+T' },
        { icon: '📊', text: 'API Status', command: 'api-status', shortcut: 'Ctrl+S' }
    ];
    
    const commandList = document.getElementById('commandList');
    if (commandList) {
        commandList.innerHTML = commands.map(cmd => `
            <li class="command-item" data-command="${cmd.command}">
                <div class="command-icon">${cmd.icon}</div>
                <div class="command-text">${cmd.text}</div>
                <div class="command-shortcut">${cmd.shortcut}</div>
            </li>
        `).join('');
    }
    
    // Command palette toggle
    document.getElementById('commandPaletteBtn')?.addEventListener('click', toggleCommandPalette);
    
    // Command execution
    document.getElementById('commandList')?.addEventListener('click', (e) => {
        const item = e.target.closest('.command-item');
        if (item) {
            executeCommand(item.dataset.command);
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'k':
                    e.preventDefault();
                    toggleCommandPalette();
                    break;
                case 'g':
                    e.preventDefault();
                    executeCommand('bulk-generate');
                    break;
                case 'e':
                    e.preventDefault();
                    executeCommand('export-results');
                    break;
            }
        }
    });
}

function toggleCommandPalette() {
    const palette = document.getElementById('commandPalette');
    const input = document.getElementById('commandInput');
    
    if (!palette) return;
    
    palette.classList.toggle('active');
    if (palette.classList.contains('active')) {
        input?.focus();
    }
}

function executeCommand(command) {
    toggleCommandPalette();
    
    switch(command) {
        case 'check-username':
            document.getElementById('username-form')?.scrollIntoView({ behavior: 'smooth' });
            document.querySelector('input[name="username"]')?.focus();
            break;
        case 'bulk-generate':
            document.getElementById('bulk-form')?.scrollIntoView({ behavior: 'smooth' });
            break;
        case 'export-results':
            exportResults();
            break;
        case 'clear-session':
            SessionManager.clear();
            break;
        case 'toggle-theme':
            document.getElementById('themeToggle')?.click();
            break;
        case 'api-status':
            UI.showMessage(
                `API Status: ${STATE.apiRateLimit.current}/${STATE.apiRateLimit.max} requests remaining`, 
                'info'
            );
            break;
    }
}

// Window resize handler
window.addEventListener('resize', () => {
    Effects.generateASCII();
    Effects.createGridDots();
    if (STATE.matrixEnabled) {
        Effects.createMatrixRain();
    }
});

// Make functions globally available for inline handlers
window.filterResults = filterResults;
window.copyAvailable = copyAvailable;
window.exportResults = exportResults;
window.showMain = showMain;

// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize CSRF token
    STATE.csrfToken = Security.generateCSRFToken();
    
    // Initialize UI
    UI.init();
    
    // Initialize effects
    Effects.initMouseEffects();
    
    // Initialize command palette
    CommandPalette.init();
    
    // Initialize form handlers
    FormHandlers.init();
    
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
    
    // Window resize handler
    window.addEventListener('resize', () => {
        Effects.generateASCII();
        Effects.createGridDots();
        if (STATE.matrixEnabled) {
            Effects.createMatrixRain();
        }
    });
    
    // Prevent XSS in dynamic content
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        node.textContent = Security.sanitizeInput(node.textContent);
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
});

// Form handlers
class FormHandlers {
    static init() {
        this.initUsernameChecker();
        this.initBulkGenerator();
        this.initAccountCreator();
        this.initNumberControls();
    }
    
    static initUsernameChecker() {
        const form = document.getElementById('username-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const username = formData.get('username').trim();
            const advanced = formData.get('bypass_filter') === 'on';
            
            const btn = form.querySelector('.btn');
            btn.classList.add('btn-loading');
            btn.disabled = true;
            
            UI.addTerminalLine('username-output', `Checking username: ${username}...`);
            UI.animateProgress(form);
            
            try {
                const result = await RobloxAPI.checkUsername(username);
                
                const statusMsg = `${result.username}: ${result.status}${advanced ? ' (advanced)' : ''}`;
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
    }
    
    static initBulkGenerator() {
        const form = document.getElementById('bulk-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
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
                            result.available ? 'success' : 'error');
                    });
                
                const available = results.filter(r => r.available).length;
                UI.addTerminalLine('bulk-output', 
                    `Complete! Found ${available}/${results.length} available usernames`, 
                    'success');
                
                STATE.currentResults = results;
                Results.show(results);
            } else {
                UI.addTerminalLine('bulk-output', 
                    `Generated ${usernames.length} usernames`, 'success');
                
                STATE.currentResults = usernames.map(u => ({
                    username: u,
                    status: 'Generated',
                    available: null
                }));
                
                Results.show(STATE.currentResults);
            }
            
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        });
    }
    
    static initAccountCreator() {
        const form = document.getElementById('signup-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            UI.showMessage(
                'Account creation is disabled in demo mode. In production, this would create a real Roblox account.', 
                'info'
            );
            
            UI.addTerminalLine('signup-output', 
                'Account creation disabled in demo mode', 'info');
        });
    }
    
    static initNumberControls() {
        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('number-btn')) return;
            
            const action = e.target.dataset.action;
            const field = e.target.dataset.field;
            const input = document.querySelector(`input[name="${field}"]`);
            
            if (!input) return;
            
            if (field === 'max_checks') {
                this.handleMaxChecks(action, input);
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
    
    static handleMaxChecks(action, input) {
        if (input.value === '∞') {
            if (action === 'decrement') {
                input.value = 50;
                input.readOnly = false;
            }
        } else {
            const current = parseInt(input.value) || 1;
            if (action === 'increment') {
                if (current >= 100) {
                    input.value = '∞';
                    input.readOnly = true;
                } else {
                    input.value = Math.min(current + 5, 100);
                }
            } else {
                input.value = Math.max(1, current - 5);
            }
        }
    }
}

// Results handling
class Results {
    static show(results) {
        document.getElementById('main-view').style.display = 'none';
        document.getElementById('results-view').style.display = 'block';
        
        this.updateStats(results);
        this.updateTable(results);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    static hide() {
        document.getElementById('main-view').style.display = 'block';
        document.getElementById('results-view').style.display = 'none';
        UI.playSound('click');
    }
    
    static updateStats(results) {
        const total = results.length;
        const available = results.filter(r => r.available === true).length;
        const taken = results.filter(r => r.available === false).length;
        
        document.getElementById('total-results').textContent = total;
        document.getElementById('available-results').textContent = available;
        document.getElementById('taken-results').textContent = taken;
    }
    
    static updateTable(results) {
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
    
    static filter(filterType) {
        const rows = document.querySelectorAll('#results-tbody tr');
        const buttons = document.querySelectorAll('.filter-btn');
        
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        rows.forEach(row => {
            const status = row.dataset.status;
            let show = true;
            
            if (filterType === 'available') {
                show = status === 'Available';
            } else if (filterType === 'taken') {
                show = status === 'Taken';
            }
            
            row.style.display = show ? '' : 'none';
        });
        
        UI.playSound('click');
    }
    
    static copyAvailable() {
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
    
    static export() {
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
}

// Command palette
class CommandPalette {
    static init() {
        this.commands = [
            { icon: '🔍', text: 'Check Username', command: 'check-username', shortcut: 'Ctrl+K' },
            { icon: '🎲', text: 'Bulk Generate', command: 'bulk-generate', shortcut: 'Ctrl+G' },
            { icon: '👤', text: 'Create Account', command: 'create-account', shortcut: 'Ctrl+N' },
            { icon: '💾', text: 'Export Results', command: 'export-results', shortcut: 'Ctrl+E' },
            { icon: '🗑️', text: 'Clear Session', command: 'clear-session', shortcut: 'Ctrl+Shift+C' },
            { icon: '🎨', text: 'Toggle Theme', command: 'toggle-theme', shortcut: 'Ctrl+T' },
            { icon: '📊', text: 'API Status', command: 'api-status', shortcut: 'Ctrl+S' }
        ];
        
        this.selectedIndex = 0;
        this.active = false;
        
        this.renderCommands();
        this.initEventListeners();
    }
    
    static renderCommands() {
        const commandList = document.getElementById('commandList');
        if (!commandList) return;
        
        commandList.innerHTML = this.commands.map((cmd, index) => `
            <li class="command-item ${index === 0 ? 'selected' : ''}" data-command="${cmd.command}">
                <div class="command-icon">${cmd.icon}</div>
                <div class="command-text">${cmd.text}</div>
                <div class="command-shortcut">${cmd.shortcut}</div>
            </li>
        `).join('');
    }
    
    static toggle() {
        this.active = !this.active;
        const palette = document.getElementById('commandPalette');
        const input = document.getElementById('commandInput');
        
        if (!palette || !input) return;
        
        if (this.active) {
            palette.classList.add('active');
            input.value = '';
            input.focus();
            this.filterCommands('');
        } else {
            palette.classList.remove('active');
        }
    }
    
    static filterCommands(query) {
        const items = document.querySelectorAll('.command-item');
        let visibleIndex = 0;
        this.selectedIndex = 0;
        
        items.forEach((item, index) => {
            const text = item.querySelector('.command-text').textContent.toLowerCase();
            const matches = text.includes(query.toLowerCase());
            
            item.style.display = matches ? 'flex' : 'none';
            item.classList.remove('selected');
            
            if (matches && visibleIndex === 0) {
                item.classList.add('selected');
                this.selectedIndex = index;
            }
            
            if (matches) visibleIndex++;
        });
    }
    
    static execute(command) {
        this.toggle();
        
        const actions = {
            'check-username': () => {
                document.getElementById('username-form')?.scrollIntoView({ behavior: 'smooth' });
                document.querySelector('input[name="username"]')?.focus();
            },
            'bulk-generate': () => {
                document.getElementById('bulk-form')?.scrollIntoView({ behavior: 'smooth' });
            },
            'create-account': () => {
                document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' });
            },
            'export-results': () => Results.export(),
            'clear-session': () => SessionManager.clear(),
            'toggle-theme': () => document.getElementById('themeToggle')?.click(),
            'api-status': () => {
                UI.showMessage(
                    `API Status: ${STATE.apiRateLimit.current}/${STATE.apiRateLimit.max} requests remaining`, 
                    'info'
                );
            }
        };
        
        const action = actions[command];
        if (action) action();
    }
    
    static initEventListeners() {
        // Command palette button
        document.getElementById('commandPaletteBtn')?.addEventListener('click', () => {
            this.toggle();
        });
        
        // Input filtering
        document.getElementById('commandInput')?.addEventListener('input', (e) => {
            this.filterCommands(e.target.value);
        });
        
        // Keyboard navigation
        document.getElementById('commandInput')?.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
        
        // Click handler
        document.getElementById('commandList')?.addEventListener('click', (e) => {
            const item = e.target.closest('.command-item');
            if (item) {
                this.execute(item.dataset.command);
            }
        });
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                this.handleGlobalShortcuts(e);
            }
        });
    }
    
    static handleKeyboard(e) {
        const items = Array.from(document.querySelectorAll('.command-item'))
            .filter(item => item.style.display !== 'none');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex + 1) % items.length;
                this.updateSelection(items);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
                this.updateSelection(items);
                break;
                
            case 'Enter':
                e.preventDefault();
                const selected = items[this.selectedIndex];
                if (selected) {
                    this.execute(selected.dataset.command);
                }
                break;
                
            case 'Escape':
                this.toggle();
                break;
        }
    }
    
    static updateSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }
    
    static handleGlobalShortcuts(e) {
        const shortcuts = {
            'k': () => this.toggle(),
            'g': () => this.execute('bulk-generate'),
            'n': () => this.execute('create-account'),
            'e': () => this.execute('export-results'),
            't': () => this.execute('toggle-theme'),
            's': () => this.execute('api-status')
        };
        
        if (shortcuts[e.key] && !this.active) {
            e.preventDefault();
            shortcuts[e.key]();
        }
        
        if (e.shiftKey && e.key === 'C' && !this.active) {
            e.preventDefault();
            this.execute('clear-session');
        }
    }
}

// Make functions globally available for inline handlers
window.filterResults = (filter) => Results.filter(filter);
window.copyAvailable = () => Results.copyAvailable();
window.exportResults = () => Results.export();
window.showMain = () => Results.hide();

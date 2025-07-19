// UI management
class UI {
    // Initialize UI components
    static init() {
        this.initializeEventListeners();
        this.loadTools();
        this.initializeTerminals();
        this.initializeEffects();
    }

    // Sound system
    static playSound(type) {
        if (!STATE.soundEnabled) return;
        
        if (!STATE.audioContext) {
            STATE.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = STATE.audioContext.createOscillator();
        const gainNode = STATE.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(STATE.audioContext.destination);
        
        const sounds = {
            click: { type: 'square', freq: 200, duration: 0.1, gain: 0.02 },
            hover: { type: 'sine', freq: 800, duration: 0.05, gain: 0.01 },
            success: { type: 'sine', freq: 400, duration: 0.2, gain: 0.03 },
            error: { type: 'sawtooth', freq: 100, duration: 0.3, gain: 0.02 }
        };
        
        const sound = sounds[type] || sounds.click;
        
        oscillator.type = sound.type;
        oscillator.frequency.setValueAtTime(sound.freq, STATE.audioContext.currentTime);
        gainNode.gain.setValueAtTime(sound.gain, STATE.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, STATE.audioContext.currentTime + sound.duration);
        
        oscillator.start();
        oscillator.stop(STATE.audioContext.currentTime + sound.duration);
    }

    // Show message
    static showMessage(text, type = 'info', duration = 5000) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `[${type.toUpperCase()}] ${Security.sanitizeInput(text)}`;
        
        document.body.appendChild(message);
        this.playSound(type === 'success' ? 'success' : type === 'error' ? 'error' : 'click');
        
        setTimeout(() => {
            message.style.animation = 'slideIn 0.5s ease-out reverse';
            setTimeout(() => message.remove(), 500);
        }, duration);
    }

    // Update rate limit display
    static updateRateLimitDisplay() {
        const percentage = (STATE.apiRateLimit.current / STATE.apiRateLimit.max) * 100;
        const indicator = document.getElementById('rateLimitIndicator');
        const display = document.getElementById('rateLimit');
        
        display.textContent = `${STATE.apiRateLimit.current}/${STATE.apiRateLimit.max}`;
        indicator.style.setProperty('--rate-limit-width', `${percentage}%`);
        
        if (STATE.apiRateLimit.current < 20) {
            indicator.style.borderColor = 'var(--error)';
        } else if (STATE.apiRateLimit.current < 50) {
            indicator.style.borderColor = 'var(--warning)';
        } else {
            indicator.style.borderColor = 'var(--border)';
        }
    }

    // Show session indicator
    static showSessionIndicator() {
        const indicator = document.getElementById('sessionIndicator');
        indicator.classList.add('active');
        setTimeout(() => {
            indicator.classList.remove('active');
        }, 2000);
    }

    // Terminal output
    static addTerminalLine(outputId, message, type = 'info') {
        const output = document.getElementById(outputId);
        if (!output) return;
        
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.textContent = Security.sanitizeInput(message);
        output.appendChild(line);
        
        // Keep only last 10 lines
        while (output.children.length > 10) {
            output.removeChild(output.firstChild);
        }
        
        output.scrollTop = output.scrollHeight;
    }

    // Progress animation
    static animateProgress(container, duration = 2000) {
        const progressContainer = container.querySelector('.progress-container');
        const progressBar = container.querySelector('.progress-bar');
        
        if (!progressContainer || !progressBar) return;
        
        progressContainer.classList.add('active');
        progressBar.style.width = '0%';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            
            progressBar.style.width = `${progress * 100}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setTimeout(() => {
                    progressContainer.classList.remove('active');
                    progressBar.style.width = '0%';
                }, 500);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Initialize event listeners
    static initializeEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            STATE.darkTheme = !STATE.darkTheme;
            const icon = STATE.darkTheme ? '🌙' : '☀️';
            document.getElementById('themeToggle').textContent = icon;
            this.playSound('click');
        });

        // Sound toggle
        document.getElementById('soundToggle')?.addEventListener('click', () => {
            STATE.soundEnabled = !STATE.soundEnabled;
            document.getElementById('soundToggle').textContent = STATE.soundEnabled ? '🔊' : '🔇';
            if (STATE.soundEnabled) this.playSound('click');
        });

        // Matrix toggle
        document.getElementById('matrixToggle')?.addEventListener('click', () => {
            STATE.matrixEnabled = !STATE.matrixEnabled;
            Effects.createMatrixRain();
            this.playSound('click');
        });

        // Hover sounds
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches('button, .btn, .filter-btn, .checkbox-group, .control-btn')) {
                this.playSound('hover');
            }
        });

        // Global click handler
        document.addEventListener('click', (e) => {
            if (e.target.matches('button, .btn, .filter-btn')) {
                this.playSound('click');
            }
        });
    }

    // Load tools HTML (keeping it simple for now)
    static loadTools() {
        // This would normally load from separate files
        // For production, use proper templating or framework
        const mainView = document.getElementById('main-view');
        if (mainView) {
            mainView.innerHTML = `
                ${this.getUsernameCheckerHTML()}
                ${this.getBulkGeneratorHTML()}
                ${this.getAccountCreatorHTML()}
            `;
        }
    }

    // Tool HTML templates
    static getUsernameCheckerHTML() {
        return `
            <div class="tool-card">
                <div class="tool-header">
                    <div class="tool-icon">🔍</div>
                    <div class="tool-title">Username Checker</div>
                </div>
                
                <form id="username-form">
                    <div class="form-grid">
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label class="form-label">Username</label>
                            <input type="text" class="form-input" name="username" 
                                   placeholder="Enter username to check" 
                                   required minlength="3" maxlength="20" 
                                   autocomplete="off">
                        </div>
                    </div>
                    
                    <div class="checkbox-container">
                        <label class="checkbox-group">
                            <div class="custom-checkbox">
                                <input type="checkbox" name="bypass_filter">
                                <div class="checkbox-indicator"></div>
                            </div>
                            <span class="checkbox-label">Advanced check</span>
                        </label>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">
                        <span class="btn-text">Check username</span>
                    </button>
                    
                    <div class="progress-container">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                </form>
                
                <div class="terminal-output" id="username-output">
                    <div class="terminal-line info">Ready to check usernames...</div>
                </div>
            </div>
        `;
    }

    static getBulkGeneratorHTML() {
        return `
            <div class="tool-card">
                <div class="tool-header">
                    <div class="tool-icon">🎲</div>
                    <div class="tool-title">Bulk Generator</div>
                </div>
                
                <form id="bulk-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Length</label>
                            <div class="number-input-container">
                                <input type="number" class="form-input number-input" 
                                       name="length" min="3" max="20" value="6" required>
                                <div class="number-controls">
                                    <button type="button" class="number-btn" 
                                            data-action="increment" data-field="length">▲</button>
                                    <button type="button" class="number-btn" 
                                            data-action="decrement" data-field="length">▼</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Type</label>
                            <select class="form-input form-select" name="type" required>
                                <option value="mixed">Mixed (Letters & Numbers)</option>
                                <option value="letters">Letters Only</option>
                                <option value="numbers">Numbers Only</option>
                                <option value="pronounceable">Pronounceable</option>
                                <option value="leetspeak">Leetspeak</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Max checks</label>
                            <div class="number-input-container">
                                <input type="text" class="form-input number-input" 
                                       name="max_checks" value="10" id="max-checks-input">
                                <div class="number-controls">
                                    <button type="button" class="number-btn" 
                                            data-action="increment" data-field="max_checks">▲</button>
                                    <button type="button" class="number-btn" 
                                            data-action="decrement" data-field="max_checks">▼</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="checkbox-container">
                        <label class="checkbox-group">
                            <div class="custom-checkbox">
                                <input type="checkbox" name="check_generated" checked>
                                <div class="checkbox-indicator"></div>
                            </div>
                            <span class="checkbox-label">Check availability</span>
                        </label>
                        
                        <label class="checkbox-group">
                            <div class="custom-checkbox">
                                <input type="checkbox" name="random_order" checked>
                                <div class="checkbox-indicator"></div>
                            </div>
                            <span class="checkbox-label">Random order</span>
                        </label>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">
                        <span class="btn-text">Generate usernames</span>
                    </button>
                    
                    <div class="progress-container">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                </form>
                
                <div class="terminal-output" id="bulk-output">
                    <div class="terminal-line info">Generator initialized...</div>
                </div>
            </div>
        `;
    }

    static getAccountCreatorHTML() {
        return `
            <div class="tool-card">
                <div class="tool-header">
                    <div class="tool-icon">👤</div>
                    <div class="tool-title">Account Creator</div>
                </div>
                
                <form id="signup-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" class="form-input" name="signup_username" 
                                   placeholder="Choose username" required 
                                   minlength="3" maxlength="20" autocomplete="off">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" class="form-input" name="password" 
                                   placeholder="Strong password" required 
                                   minlength="8" autocomplete="new-password">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Birthday</label>
                            <input type="date" class="form-input" name="birthday" 
                                   required max="2010-01-01">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Gender</label>
                            <select class="form-input form-select" name="gender" required>
                                <option value="">Select gender</option>
                                <option value="2">Male</option>
                                <option value="3">Female</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="checkbox-container">
                        <label class="checkbox-group">
                            <div class="custom-checkbox">
                                <input type="checkbox" name="advanced_mode">
                                <div class="checkbox-indicator"></div>
                            </div>
                            <span class="checkbox-label">Advanced mode</span>
                        </label>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">
                        <span class="btn-text">Create account</span>
                    </button>
                    
                    <div class="progress-container">
                        <div class="progress-bar" style="width: 0%"></div>
                    </div>
                </form>
                
                <div class="terminal-output" id="signup-output">
                    <div class="terminal-line info">Account creator ready...</div>
                </div>
            </div>
        `;
    }

    // Initialize terminals
    static initializeTerminals() {
        setTimeout(() => {
            this.addTerminalLine('username-output', 'System initialized', 'success');
            this.addTerminalLine('bulk-output', 'Generator ready', 'success');
            this.addTerminalLine('signup-output', 'Creator online', 'success');
            this.addTerminalLine('username-output', `Security: Session secured`, 'info');
        }, 1000);
    }

    // Initialize visual effects
    static initializeEffects() {
        Effects.generateASCII();
        Effects.createGridDots();
    }
}

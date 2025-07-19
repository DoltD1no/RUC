// Visual effects
class Effects {
    // ASCII background
    static generateASCII() {
        const chars = '01';
        const width = Math.floor(window.innerWidth / 10);
        const height = Math.floor(window.innerHeight / 10);
        let ascii = '';
        
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                ascii += Math.random() > 0.5 ? chars[Math.floor(Math.random() * chars.length)] : ' ';
            }
            ascii += '\n';
        }
        
        const asciiBg = document.getElementById('asciiBg');
        if (asciiBg) asciiBg.textContent = ascii;
    }

    // Grid dots for magnetic effect
    static createGridDots() {
        const gridBg = document.getElementById('gridBg');
        if (!gridBg) return;
        
        const dotSpacing = 50;
        const rows = Math.ceil(window.innerHeight / dotSpacing);
        const cols = Math.ceil(window.innerWidth / dotSpacing);
        
        gridBg.innerHTML = '';
        STATE.gridDots = [];
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const dot = document.createElement('div');
                dot.className = 'grid-dot';
                dot.style.left = `${j * dotSpacing}px`;
                dot.style.top = `${i * dotSpacing}px`;
                dot.dataset.originalX = j * dotSpacing;
                dot.dataset.originalY = i * dotSpacing;
                gridBg.appendChild(dot);
                STATE.gridDots.push(dot);
            }
        }
    }

    // Matrix rain effect
    static createMatrixRain() {
        const matrixRain = document.getElementById('matrixRain');
        if (!matrixRain) return;
        
        matrixRain.innerHTML = '';
        
        if (!STATE.matrixEnabled) return;
        
        const columns = Math.floor(window.innerWidth / 25);
        
        for (let i = 0; i < columns; i++) {
            const column = document.createElement('div');
            column.className = 'matrix-column';
            column.style.left = `${i * 25}px`;
            column.style.animationDuration = `${8 + Math.random() * 8}s`;
            column.style.animationDelay = `${Math.random() * 8}s`;
            
            const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01';
            let text = '';
            const columnLength = Math.floor(Math.random() * 15) + 20;
            
            for (let j = 0; j < columnLength; j++) {
                text += chars[Math.floor(Math.random() * chars.length)] + '\n';
            }
            column.textContent = text;
            
            matrixRain.appendChild(column);
        }
    }

    // Mouse move handler for grid effect
    static initMouseEffects() {
        document.addEventListener('mousemove', (e) => {
            if (!STATE.gridDots) return;
            
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            STATE.gridDots.forEach(dot => {
                const dotX = parseFloat(dot.dataset.originalX);
                const dotY = parseFloat(dot.dataset.originalY);
                const distance = Math.sqrt(Math.pow(mouseX - dotX, 2) + Math.pow(mouseY - dotY, 2));
                
                if (distance < 150) {
                    const angle = Math.atan2(dotY - mouseY, dotX - mouseX);
                    const force = (150 - distance) / 150;
                    const moveX = Math.cos(angle) * force * 30;
                    const moveY = Math.sin(angle) * force * 30;
                    
                    dot.style.transform = `translate(${moveX}px, ${moveY}px) scale(${1 + force})`;
                    dot.style.opacity = force * 0.8;
                } else {
                    dot.style.transform = 'translate(0, 0) scale(1)';
                    dot.style.opacity = 0;
                }
            });
        });
    }
}

import { CONFIG } from './config.js';
import { state } from './state.js';
import { createFish, createFood, createBubble } from './entities.js';
import { scareFish, scheduleScatter, loadStats, updateStats, showNotification } from './logic.js';

// 1. Инициализация PixiJS
const app = new PIXI.Application({
    width: CONFIG.W,
    height: CONFIG.H,
    backgroundColor: 0x000000,
    backgroundAlpha: 0,
    transparent: true,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

app.view.style.display = 'block';
app.view.style.width = '100%';
app.view.style.height = '100%';

document.getElementById('aquarium-container').appendChild(app.view);

// 2. Создание слоев
state.layers.fishLayer = new PIXI.Container();
state.layers.foodLayer = new PIXI.Container();
state.layers.bubbleLayer = new PIXI.Container();
state.layers.plantLayer = new PIXI.Container();
state.layers.lightLayer = new PIXI.Container();
state.layers.effectLayer = new PIXI.Container();

app.stage.addChild(
    state.layers.lightLayer, 
    state.layers.plantLayer, 
    state.layers.bubbleLayer, 
    state.layers.foodLayer, 
    state.layers.effectLayer, 
    state.layers.fishLayer
);

// 3. Окружение
const bgGfx = new PIXI.Graphics();
bgGfx.beginFill(0x0c2340, 0.3).drawRect(0, 0, CONFIG.W, CONFIG.H).endFill();
app.stage.addChildAt(bgGfx, 0);

const sandGfx = new PIXI.Graphics();
sandGfx.beginFill(0x8B7355, 0.6).moveTo(0, CONFIG.H - 60);
for (let i = 0; i <= CONFIG.W; i += 30) {
    sandGfx.lineTo(i, CONFIG.H - 60 + Math.sin(i * 0.05) * 8);
}
sandGfx.lineTo(CONFIG.W, CONFIG.H).lineTo(0, CONFIG.H).closePath().endFill();
app.stage.addChildAt(sandGfx, 1);

for (let i = 0; i < 40; i++) {
    const pgfx = new PIXI.Graphics();
    const sz = 3 + Math.random() * 6;
    pgfx.beginFill(CONFIG.pebbleColors[Math.floor(Math.random() * CONFIG.pebbleColors.length)], 0.7)
      .drawEllipse(Math.random() * CONFIG.W, CONFIG.H - 40 + Math.random() * 20, sz, sz * 0.6).endFill();
    app.stage.addChildAt(pgfx, 2);
}

function createSeaweed(x, baseHeight) {
    const plant = new PIXI.Container();
    const h = baseHeight * (1 + (Math.random() - 0.5) * 0.4);
    const segments = Math.max(4, Math.floor(h / 20));
    let prevX = x, prevY = CONFIG.H - 30;
    
    for (let i = 0; i < segments; i++) {
        const sway = Math.sin(i * 0.5) * 10 + Math.random() * 8;
        const newX = x + sway;
        const newY = CONFIG.H - 30 - (i + 1) * (h / segments);
        const segGfx = new PIXI.Graphics();
        segGfx.lineStyle(4 + (1 - i / segments) * 4, 0x2D8B46, 0.7);
        segGfx.moveTo(prevX, prevY);
        segGfx.lineTo(newX, newY);
        plant.addChild(segGfx);
        
        if (i === segments - 1) {
            const leaf = new PIXI.Graphics();
            leaf.beginFill(0x3DA65A, 0.8);
            leaf.drawEllipse(newX, newY, 12, 5);
            leaf.endFill();
            plant.addChild(leaf);
        }
        prevX = newX;
        prevY = newY;
    }
    plant.baseRotation = ((Math.random() - 0.5) * 15) * Math.PI / 180;
    plant.rotation = plant.baseRotation;
    plant.swayOffset = Math.random() * Math.PI * 2;
    plant.swaySpeed = 0.5 + Math.random() * 0.5;
    return plant;
}

const plants = [];
for (let i = 0; i < 7; i++) {
    const x = 30 + (i / 6) * (CONFIG.W - 60);
    const plant = createSeaweed(x, 240);
    state.layers.plantLayer.addChild(plant);
    plants.push(plant);
}

const lightRays = [];
for (let i = 0; i < 5; i++) {
    const rayGfx = new PIXI.Graphics();
    const rx = 50 + i * (CONFIG.W / 5);
    rayGfx.beginFill(0x7fdbff, 0.02).moveTo(rx - 30, 0).lineTo(rx + 30, 0).lineTo(rx + 80, CONFIG.H).lineTo(rx - 80, CONFIG.H).closePath().endFill();
    rayGfx.alpha = 0;
    state.layers.lightLayer.addChild(rayGfx);
    lightRays.push({ gfx: rayGfx, speed: 0.3 + Math.random() * 0.5, offset: Math.random() * Math.PI * 2 });
}

// 4. Инициализация состояния
loadStats();
for (let i = 0; i < 6; i++) createFish();

// 5. Логика панелей
const settingsPanel = document.getElementById('settingsPanel');
const statsPanel = document.getElementById('statsPanel');
const btnSettings = document.getElementById('btnSettings');
const btnStats = document.getElementById('btnStats');
const closeSettings = document.getElementById('closeSettings');
const closeStats = document.getElementById('closeStats');

function togglePanel(panel, button) {
    const isVisible = panel.classList.contains('visible');
    
    settingsPanel.classList.remove('visible');
    statsPanel.classList.remove('visible');
    btnSettings.classList.remove('active');
    btnStats.classList.remove('active');
    
    if (!isVisible) {
        panel.classList.add('visible');
        button.classList.add('active');
        
        if (panel === statsPanel) {
            updateStats();
            updateAchievementsList();
        }
    }
}

function updateAchievementsList() {
    const list = document.getElementById('achievementsList');
    if (state.achievements.length === 0) {
        list.innerHTML = '<p style="color: #88c8dc; text-align: center; margin: 0;">Пока нет достижений. Продолжайте кормить рыбок!</p>';
        return;
    }
    
    const achievementNames = {
        'school_master': '🏆 Повелитель стаи (10 рыбок)',
        'generous': '🏆 Щедрая душа (50 корма)',
        'feast': '🏆 Королевский пир (100 корма)',
        'aquarium_master': '🏆 Аквариумный магнат (20 рыбок)'
    };
    
    list.innerHTML = '<h4>Ваши достижения:</h4>' + 
        state.achievements.map(a => `<span class="achievement-badge">${achievementNames[a] || a}</span>`).join('');
}

// 6. ОБРАБОТЧИКИ СОБЫТИЙ (только один раз!)

// Главные кнопки
btnSettings.addEventListener('click', () => togglePanel(settingsPanel, btnSettings));
btnStats.addEventListener('click', () => togglePanel(statsPanel, btnStats));

// Крестики закрытия
closeSettings.addEventListener('click', () => {
    settingsPanel.classList.remove('visible');
    btnSettings.classList.remove('active');
});

closeStats.addEventListener('click', () => {
    statsPanel.classList.remove('visible');
    btnStats.classList.remove('active');
});

// Кнопки внутри панели настроек
document.getElementById('btnFeed').addEventListener('click', () => {
    const bx = 100 + Math.random() * (CONFIG.W - 200);
    for (let i = 0; i < 8; i++) createFood(bx + (Math.random() - 0.5) * 80, -10 - Math.random() * 30);
});

document.getElementById('btnAddFish').addEventListener('click', () => {
    createFish();
});

document.getElementById('btnBubble').addEventListener('click', () => {
    for (let i = 0; i < 20; i++) createBubble(100 + Math.random() * (CONFIG.W - 200), CONFIG.H + Math.random() * 50);
});

document.getElementById('btnClear').addEventListener('click', () => {
    while (state.foods.length) {
        const f = state.foods.pop();
        state.layers.foodLayer.removeChild(f);
        f.destroy();
    }
    updateStats();
});

const nightFilter = new PIXI.filters.ColorMatrixFilter();
nightFilter.brightness(0.4, false);

document.getElementById('btnNightMode').addEventListener('click', () => {
    state.isNightMode = !state.isNightMode;
    if (state.isNightMode) {
        app.stage.filters = [nightFilter];
        lightRays.forEach(ray => ray.gfx.visible = false);
        document.getElementById('btnNightMode').textContent = '☀️ Дневной режим';
        showNotification("🌙 Ночной режим активирован");
    } else {
        app.stage.filters = null;
        lightRays.forEach(ray => ray.gfx.visible = true);
        document.getElementById('btnNightMode').textContent = '🌙 Ночной режим';
        showNotification("☀️ Дневной режим активирован");
    }
});

document.getElementById('autoFeedToggle').addEventListener('change', (e) => {
    // Очищаем старый интервал
    if (state.autoFeedInterval) {
        clearInterval(state.autoFeedInterval);
        state.autoFeedInterval = null;
    }
    
    if (e.target.checked) {
        state.autoFeedInterval = setInterval(() => {
            const bx = 100 + Math.random() * (CONFIG.W - 200);
            for (let i = 0; i < 3; i++) {
                createFood(bx + (Math.random() - 0.5) * 80, -10 - Math.random() * 30);
            }
            showNotification("🤖 Автокорм: брошена порция корма!");
        }, 15000);
    }
});

// Клик по аквариуму закрывает панели
document.getElementById('aquarium-container').addEventListener('click', () => {
    settingsPanel.classList.remove('visible');
    statsPanel.classList.remove('visible');
    btnSettings.classList.remove('active');
    btnStats.classList.remove('active');
});

// Клики по canvas
app.view.addEventListener('click', (e) => {
    if (e.button === 0) {
        const rect = app.view.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (CONFIG.W / rect.width);
        const y = (e.clientY - rect.top) * (CONFIG.H / rect.height);
        scareFish(x, y);
    }
});

app.view.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = app.view.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CONFIG.W / rect.width);
    const y = (e.clientY - rect.top) * (CONFIG.H / rect.height);
    createFood(x, y);
    createFood(x + (Math.random() - 0.5) * 30, y - 10);
    createFood(x + (Math.random() - 0.5) * 30, y - 5);
    showNotification("🍕 Корм брошен!");
    return false;
});

// 7. Игровой цикл
app.ticker.add((delta) => {
    state.time += delta * 0.016;

    if (state.time - state.lastCheck > 1) {
        const processed = new Set();
        let hasOvercrowded = false;

        for (const fish of state.fishes) {
            if (processed.has(fish)) continue;
            const cluster = [fish];
            const queue = [fish];
            processed.add(fish);

            while (queue.length > 0) {
                const current = queue.shift();
                for (const other of state.fishes) {
                    if (!processed.has(other)) {
                        const dist = Math.hypot(other.x - current.x, other.y - current.y);
                        if (dist < 150) {
                            cluster.push(other);
                            processed.add(other);
                            queue.push(other);
                        }
                    }
                }
            }
            if (cluster.length > CONFIG.maxSchoolSize) {
                hasOvercrowded = true;
                break;
            }
        }

        if (hasOvercrowded && !state.scatterTimeout && !state.pendingScatter) {
            scheduleScatter();
        }
        state.lastCheck = state.time;
    }

    if (!state.isNightMode) {
        for (const ray of lightRays) ray.gfx.alpha = 0.3 + 0.3 * Math.sin(state.time * ray.speed + ray.offset);
    }
    for (const plant of plants) {
        const sway = Math.sin(state.time * plant.swaySpeed + plant.swayOffset) * 3;
        plant.rotation = plant.baseRotation + (sway * Math.PI) / 180;
    }

    if (Math.random() < 0.02) createBubble();

    for (const fish of state.fishes) {
        fish.hungerTimer += delta * 0.016;
        let nearestFood = null, nearestDist = Infinity;
        
        for (const f of state.foods) {
            if (!f.eaten) {
                const dist = Math.hypot(f.x - fish.x, f.y - fish.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestFood = f;
                }
            }
        }

        if (nearestFood && nearestDist < 400) {
            fish.state = 'chase';
            fish.targetFood = nearestFood;
        } else {
            fish.state = 'wander';
            fish.targetFood = null;
        }

        let targetVx, targetVy;
        const speed = fish.baseSpeed;

        if (fish.state === 'chase' && fish.targetFood && !fish.targetFood.eaten) {
            const fdx = fish.targetFood.x - fish.x, fdy = fish.targetFood.y - fish.y, fdist = Math.hypot(fdx, fdy);
            if (fdist < fish.size * 0.8) {
                fish.targetFood.eaten = true;
                state.totalEaten++;
                fish.hungerTimer = 0;
                updateStats();
                import('./logic.js').then(m => m.saveStats());
                import('./logic.js').then(m => m.checkAchievements());
                fish.mouth.visible = false;
                setTimeout(() => { if (fish.mouth) fish.mouth.visible = true; }, 500);
                targetVx = fish.vx;
                targetVy = fish.vy;
            } else {
                targetVx = (fdx / fdist) * speed * 3.5;
                targetVy = (fdy / fdist) * speed * 2.5;
            }
        } else {
            if (!fish.isLeaving) {
                let nearbyCount = 0;
                for (const other of state.fishes) {
                    if (other !== fish && Math.hypot(other.x - fish.x, other.y - fish.y) < 150) {
                        nearbyCount++;
                    }
                }

                if (nearbyCount + 1 <= CONFIG.maxSchoolSize) {
                    const neighbors = [];
                    for (const other of state.fishes) {
                        if (other !== fish) {
                            const dist = Math.hypot(other.x - fish.x, other.y - fish.y);
                            if (dist < 150) neighbors.push({ fish: other, dist: dist });
                        }
                    }
                    neighbors.sort((a, b) => a.dist - b.dist);
                    const attractTo = neighbors.slice(0, Math.min(4, neighbors.length));

                    if (attractTo.length > 0) {
                        let centerX = fish.x, centerY = fish.y;
                        for (const n of attractTo) {
                            centerX += n.fish.x;
                            centerY += n.fish.y;
                        }
                        centerX /= (attractTo.length + 1);
                        centerY /= (attractTo.length + 1);

                        const dx = centerX - fish.x;
                        const dy = centerY - fish.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 30) {
                            fish.vx += dx * 0.08;
                            fish.vy += dy * 0.08;
                        }
                    }
                }
            }

            if (Math.random() < 0.02) {
                fish.vx += (Math.random() - 0.5) * 3;
                fish.vy += (Math.random() - 0.5) * 2;
            }

            const margin = 60;
            if (fish.x < margin) fish.vx += 2;
            if (fish.x > CONFIG.W - margin) fish.vx -= 2;
            if (fish.y < margin) fish.vy += 2;
            if (fish.y > CONFIG.H - margin - 40) fish.vy -= 2;

            let cs = Math.hypot(fish.vx, fish.vy);
            if (cs > speed) {
                fish.vx = (fish.vx / cs) * speed;
                fish.vy = (fish.vy / cs) * speed;
            }
            targetVx = fish.vx;
            targetVy = fish.vy;
        }

        fish.x += targetVx * delta;
        fish.y += targetVy * delta;
        fish.x = Math.min(Math.max(fish.x, 15), CONFIG.W - 15);
        fish.y = Math.min(Math.max(fish.y, 30), CONFIG.H - 55);

        if (targetVx > 0.2) fish.direction = 1;
        if (targetVx < -0.2) fish.direction = -1;
        fish.scale.x = fish.direction;

        fish.tail.rotation = Math.sin(state.time * 6 + fish.animOffset) * 0.3;
        fish.dorsal.rotation = Math.sin(state.time * 4 + fish.animOffset) * 0.15;
    }

    for (let i = state.foods.length - 1; i >= 0; i--) {
        const f = state.foods[i];
        if (f.eaten) {
            f.alpha -= 0.1;
            f.scale.x += 0.1;
            f.scale.y += 0.1;
            if (f.alpha <= 0) {
                state.layers.foodLayer.removeChild(f);
                f.destroy();
                state.foods.splice(i, 1);
                updateStats();
            }
        } else {
            f.y += f.sinkSpeed * delta;
            f.x += f.vx * delta;
            f.rotation += 0.02 * delta;
            if (f.y > CONFIG.H - 20) {
                state.layers.foodLayer.removeChild(f);
                f.destroy();
                state.foods.splice(i, 1);
                updateStats();
            }
        }
    }

    for (let i = state.bubbles.length - 1; i >= 0; i--) {
        const b = state.bubbles[i];
        b.y += b.vy * delta;
        b.x += b.vx * delta + Math.sin(state.time * 2 + b.wobble) * 0.3;
        if (b.y < -20 || b.x < -50 || b.x > CONFIG.W + 50) {
            state.layers.bubbleLayer.removeChild(b);
            b.destroy();
            state.bubbles.splice(i, 1);
        }
    }
});

// 8. Интеграция с Tauri
if (window.__TAURI__) {
    const { listen } = window.__TAURI__.event;
    listen('widget-mode-changed', (event) => {
        const isWidgetMode = event.payload;
        if (isWidgetMode) {
            document.body.classList.add('widget-mode');
        } else {
            document.body.classList.remove('widget-mode');
        }
    });
}
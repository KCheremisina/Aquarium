import { CONFIG } from './config.js';
import { state } from './state.js';
import { createFish } from './entities.js';

export function showNotification(msg) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

export function updateStats() {
    document.getElementById('fishCount').textContent = state.fishes.length;
    document.getElementById('foodCount').textContent = state.foods.filter(f => !f.eaten).length;
    document.getElementById('eatenCount').textContent = state.totalEaten;
    document.getElementById('achievementCount').textContent = state.achievements.length;
}

export function loadStats() {
    const saved = localStorage.getItem('aquariumStats');
    if (saved) {
        const stats = JSON.parse(saved);
        state.totalEaten = stats.totalEaten || 0;
        state.achievements = stats.achievements || [];
    }
    updateStats();
}

export function saveStats() {
    localStorage.setItem('aquariumStats', JSON.stringify({
        totalEaten: state.totalEaten,
        achievements: state.achievements
    }));
}

export function checkAchievements() {
    let newAchievements = [];
    if (state.fishes.length >= 10 && !state.achievements.includes('school_master')) {
        newAchievements.push('school_master');
        showNotification('🏆 Достижение: Повелитель стаи! (10 рыбок)');
    }
    if (state.totalEaten >= 50 && !state.achievements.includes('generous')) {
        newAchievements.push('generous');
        showNotification('🏆 Достижение: Щедрая душа! (50 корма съедено)');
    }
    if (state.totalEaten >= 100 && !state.achievements.includes('feast')) {
        newAchievements.push('feast');
        showNotification('🏆 Достижение: Королевский пир! (100 корма съедено)');
    }
    if (state.fishes.length >= 20 && !state.achievements.includes('aquarium_master')) {
        newAchievements.push('aquarium_master');
        showNotification('🏆 Достижение: Аквариумный магнат! (20 рыбок)');
    }

    if (newAchievements.length > 0) {
        state.achievements.push(...newAchievements);
        saveStats();
        updateStats();
    }
}

export function scareFish(x, y) {
    let scaredCount = 0;
    for (const fish of state.fishes) {
        const dx = fish.x - x;
        const dy = fish.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < 100) {
            if (fish.scareTimeout) {
                clearTimeout(fish.scareTimeout);
                if (fish.savedBaseSpeed) fish.baseSpeed = fish.savedBaseSpeed;
                fish.scareTimeout = null;
            }

            fish.savedBaseSpeed = fish.baseSpeed;
            fish.savedVx = fish.vx;
            fish.savedVy = fish.vy;

            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * Math.PI / 3;
            const force = 25 * (1 - dist / 100);

            fish.vx = Math.cos(angle) * force * 5;
            fish.vy = Math.sin(angle) * force * 5;
            fish.baseSpeed = fish.savedBaseSpeed * 5;

            fish.scareTimeout = setTimeout(() => {
                if (fish.savedBaseSpeed) {
                    fish.baseSpeed = fish.savedBaseSpeed;
                    fish.vx = fish.savedVx || 0;
                    fish.vy = fish.savedVy || 0;
                    delete fish.savedBaseSpeed;
                    delete fish.savedVx;
                    delete fish.savedVy;
                    delete fish.scareTimeout;
                }
            }, 1000);

            scaredCount++;

            const exclamation = new PIXI.Text('!!', { fontFamily: 'Arial', fontSize: 24, fill: 0xff0000, fontWeight: 'bold' });
            exclamation.x = fish.x;
            exclamation.y = fish.y - 25;
            exclamation.alpha = 1;
            state.layers.effectLayer.addChild(exclamation);

            let alpha = 1;
            const interval = setInterval(() => {
                alpha -= 0.1;
                exclamation.alpha = alpha;
                if (alpha <= 0) {
                    state.layers.effectLayer.removeChild(exclamation);
                    exclamation.destroy();
                    clearInterval(interval);
                }
            }, 50);

            fish.direction = fish.vx >= 0 ? 1 : -1;
            fish.scale.x = fish.direction;
        }
    }

    if (scaredCount > 0) {
        showNotification(`😱 Рывок! Испугано ${scaredCount} рыбок!`);
        const shockwave = new PIXI.Graphics();
        shockwave.lineStyle(3, 0xff6666, 0.8);
        shockwave.drawCircle(0, 0, 10);
        shockwave.x = x;
        shockwave.y = y;
        state.layers.effectLayer.addChild(shockwave);

        let radius = 10;
        const waveInterval = setInterval(() => {
            radius += 8;
            shockwave.clear();
            shockwave.lineStyle(3, 0xff6666, 0.8 - radius / 100);
            shockwave.drawCircle(0, 0, radius);
            if (radius > 120) {
                state.layers.effectLayer.removeChild(shockwave);
                shockwave.destroy();
                clearInterval(waveInterval);
            }
        }, 30);
    }
}

export function forceFishToLeave(fish, centerX, centerY) {
    if (fish.leaveTimeout) return;
    fish.normalBaseSpeed = fish.baseSpeed;
    const angle = Math.atan2(fish.y - centerY, fish.x - centerX) + (Math.random() - 0.5) * Math.PI;
    fish.vx = Math.cos(angle) * 2;
    fish.vy = Math.sin(angle) * 2;
    fish.isLeaving = true;

    fish.leaveTimeout = setTimeout(() => {
        fish.isLeaving = false;
        delete fish.normalBaseSpeed;
        delete fish.leaveTimeout;
    }, 1500);

    const leaveEffect = new PIXI.Text('🚶‍♂️', { fontFamily: 'Arial', fontSize: 18, fill: 0xffaa44, fontWeight: 'bold' });
    leaveEffect.x = fish.x;
    leaveEffect.y = fish.y - 20;
    leaveEffect.alpha = 1;
    state.layers.effectLayer.addChild(leaveEffect);

    setTimeout(() => {
        if (leaveEffect.parent) {
            state.layers.effectLayer.removeChild(leaveEffect);
            leaveEffect.destroy();
        }
    }, 600);
}

export function scheduleScatter() {
    if (state.scatterTimeout) clearTimeout(state.scatterTimeout);
    state.pendingScatter = true;
    state.scatterTimeout = setTimeout(() => {
        if (state.pendingScatter) {
            performScatter();
            state.pendingScatter = false;
        }
        state.scatterTimeout = null;
    }, 3000);
}

export function performScatter() {
    const processed = new Set();
    const clusters = [];

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
        if (cluster.length > 0) clusters.push(cluster);
    }

    let scattered = false;
    for (const cluster of clusters) {
        if (cluster.length > CONFIG.maxSchoolSize) {
            const centerX = cluster.reduce((sum, f) => sum + f.x, 0) / cluster.length;
            const centerY = cluster.reduce((sum, f) => sum + f.y, 0) / cluster.length;

            cluster.sort((a, b) => {
                const distA = Math.hypot(a.x - centerX, a.y - centerY);
                const distB = Math.hypot(b.x - centerX, b.y - centerY);
                return distA - distB;
            });

            const toLeave = cluster.slice(CONFIG.maxSchoolSize);
            for (const lonelyFish of toLeave) {
                if (!lonelyFish.isLeaving) {
                    forceFishToLeave(lonelyFish, centerX, centerY);
                    scattered = true;
                }
            }
        }
    }

    // if (scattered) showNotification("🐟 Стая переполнена! Лишние рыбки отплывают...");
}
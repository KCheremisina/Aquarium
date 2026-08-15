import { CONFIG } from './config.js';
import { state } from './state.js';

export function createFish(x, y) {
    if (state.fishes.length >= CONFIG.maxFish) {
        import('./logic.js').then(module => module.showNotification("В аквариуме уже 25 рыбок! Нельзя добавить больше."));
        return null;
    }
    const fish = new PIXI.Container();
    const color = CONFIG.fishColors[Math.floor(Math.random() * CONFIG.fishColors.length)];
    const size = 20 + Math.random() * 25;

    const bodyGfx = new PIXI.Graphics();
    bodyGfx.beginFill(color.body).drawEllipse(0, 0, size, size * 0.5).endFill();
    fish.addChild(bodyGfx);

    const stripeGfx = new PIXI.Graphics();
    stripeGfx.lineStyle(2, color.accent, 0.5);
    for (let i = -1; i <= 1; i++) stripeGfx.moveTo(i * size * 0.3, -size * 0.45).lineTo(i * size * 0.3, size * 0.45);
    fish.addChild(stripeGfx);

    const tailGfx = new PIXI.Graphics();
    tailGfx.beginFill(color.fin).moveTo(-size * 0.7, 0).lineTo(-size * 1.2, -size * 0.45).lineTo(-size * 1.2, size * 0.45).closePath().endFill();
    fish.addChild(tailGfx);
    fish.tail = tailGfx;

    const dorsalGfx = new PIXI.Graphics();
    dorsalGfx.beginFill(color.fin, 0.7).moveTo(-size * 0.2, -size * 0.45).lineTo(size * 0.1, -size * 0.85).lineTo(size * 0.3, -size * 0.45).closePath().endFill();
    fish.addChild(dorsalGfx);
    fish.dorsal = dorsalGfx;

    const eyeGfx = new PIXI.Graphics();
    eyeGfx.beginFill(0xFFFFFF).drawCircle(size * 0.5, -size * 0.08, size * 0.18).endFill();
    eyeGfx.beginFill(0x111111).drawCircle(size * 0.55, -size * 0.08, size * 0.1).endFill();
    fish.addChild(eyeGfx);

    const mouthGfx = new PIXI.Graphics();
    mouthGfx.lineStyle(1.5, color.accent, 0.8).arc(size * 0.9, size * 0.1, size * 0.12, 0, Math.PI, false);
    fish.addChild(mouthGfx);
    fish.mouth = mouthGfx;

    fish.x = x !== undefined ? x : 50 + Math.random() * (CONFIG.W - 100);
    fish.y = y !== undefined ? y : 50 + Math.random() * (CONFIG.H - 150);
    fish.vx = (Math.random() - 0.5) * 40;
    fish.vy = (Math.random() - 0.5) * 30;
    fish.size = size;
    fish.baseSpeed = 1 + Math.random() * 1.5;
    fish.state = 'wander';
    fish.targetFood = null;
    fish.hungerTimer = 0;
    fish.animOffset = Math.random() * Math.PI * 2;
    fish.direction = fish.vx >= 0 ? 1 : -1;
    fish.name = `Рыбка ${state.fishes.length + 1}`;
    fish.isLeaving = false;

    state.layers.fishLayer.addChild(fish);
    state.fishes.push(fish);

    import('./logic.js').then(module => {
        module.updateStats();
        module.checkAchievements();
    });

    return fish;
}

export function createFood(x, y) {
    const food = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    const t = Math.random();
    if (t < 0.33) gfx.beginFill(0xC68E17, 0.9).drawEllipse(0, 0, 5, 3);
    else if (t < 0.66) gfx.beginFill(0xA0522D, 0.9).drawCircle(0, 0, 4);
    else gfx.beginFill(0xFF6347, 0.8).drawEllipse(0, 0, 7, 2.5);
    gfx.endFill();

    food.addChild(gfx);
    food.x = x;
    food.y = y;
    food.sinkSpeed = 1 + Math.random() * 10;
    food.vx = (Math.random() - 0.5) * 6;
    food.eaten = false;
    food.alpha = 1;

    state.layers.foodLayer.addChild(food);
    state.foods.push(food);

    import('./logic.js').then(module => {
        module.updateStats();
        module.scheduleScatter();
    });

    return food;
}

export function createBubble(x, y) {
    const bubble = new PIXI.Container();
    const gfx = new PIXI.Graphics();
    const sz = 2 + Math.random() * 6;
    gfx.lineStyle(1, 0x7fdbff, 0.4).beginFill(0x7fdbff, 0.08).drawCircle(0, 0, sz).endFill();
    bubble.addChild(gfx);

    bubble.x = x !== undefined ? x : 20 + Math.random() * (CONFIG.W - 40);
    bubble.y = y !== undefined ? y : CONFIG.H + 10;
    bubble.vy = -15 - Math.random() * 25;
    bubble.vx = (Math.random() - 0.5) * 4;
    bubble.size = sz;
    bubble.wobble = Math.random() * Math.PI * 2;

    state.layers.bubbleLayer.addChild(bubble);
    state.bubbles.push(bubble);
}
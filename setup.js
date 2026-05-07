// ==========================================
// ゲームの準備ファイル (setup.js)
// ==========================================

let isGameStarted = false;

// --- シーン・カメラ・レンダラーの設定 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// ★【追加】カメラアングル設定
const CAMERA_SETTINGS = {
    search: { y: 18, z: 24, lookAtY: 0, lerpSpeed: 0.05 }, // 探索：遠く、高め
    battle: { y: 8, z: 14, lookAtY: 2, lerpSpeed: 0.08 }   // 戦闘：近く、低め、ドラゴンの胴体を狙う
};
// 初期状態は探索アングル
let targetCameraY = CAMERA_SETTINGS.search.y;
let targetCameraZ = CAMERA_SETTINGS.search.z;
let targetLookAtY = CAMERA_SETTINGS.search.lookAtY;
let currentLerpSpeed = CAMERA_SETTINGS.search.lerpSpeed;

// 初期位置を設定
camera.position.set(0, targetCameraY, targetCameraZ);
camera.lookAt(0, targetLookAtY, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-screen').appendChild(renderer.domElement);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); dirLight.position.set(10, 20, 10); scene.add(dirLight);
scene.add(new THREE.AmbientLight(0x606060));

// --- フィールドの設定 ---
const MAP_SIZE = 160;
const BOUNDARY = MAP_SIZE / 2;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE), new THREE.MeshLambertMaterial({ color: 0x3cb371 }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);

const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0x1e90ff }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -0.5; scene.add(sea);

// --- 障害物（森）の配置 ---
const obstacles = [];
const NUM_TREES = 120; 
for (let i = 0; i < NUM_TREES; i++) {
    let x = (Math.random() - 0.5) * (MAP_SIZE - 4);
    let z = (Math.random() - 0.5) * (MAP_SIZE - 4);
    if (Math.abs(x) < 10 && Math.abs(z) < 10) continue; 
    const tree = createTree(); tree.position.set(x, 0, z); scene.add(tree);
    obstacles.push({ mesh: tree, radius: 1.5 });
}

// --- キャラクター・ドラゴンの配置 ---
const hero = createHeroModel(); scene.add(hero);

const dragons = [];
const NUM_DRAGONS = 3;
let activeDragon = null; 
const DRAGON_SPACING = 35; 

for (let i = 0; i < NUM_DRAGONS; i++) {
    const d = createDragonModel();
    let rx, rz, tooClose;
    do {
        rx = (Math.random() - 0.5) * (MAP_SIZE - 20);
        rz = (Math.random() - 0.5) * (MAP_SIZE - 20);
        tooClose = false;
        if (Math.abs(rx) < 20 && Math.abs(rz) < 20) { tooClose = true; continue; }
        for (let otherD of dragons) {
            const dist = Math.sqrt(Math.pow(rx - otherD.position.x, 2) + Math.pow(rz - otherD.position.z, 2));
            if (dist < DRAGON_SPACING) { tooClose = true; break; }
        }
    } while (tooClose);

    d.position.set(rx, 0, rz); scene.add(d);
    d.userData = {
        isDragon: true, hp: 300, maxHp: 300, isAggro: false, state: 'idle',
        lastMoveTime: 0, targetPos: d.position.clone(), spinStartTime: 0, recoveryEndTime: 0, initialRotY: 0
    };
    dragons.push(d);
}

// --- ゲームシステム変数 ---
let projectiles = []; 
let targetPosition = hero.position.clone(); 
const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();

const stats = {
    hero: { hp: 100, maxHp: 100, stamina: 100, maxStamina: 100, atkMelee: 20, atkRanged: 8 },
    dragon: { atkMelee: 35, atkRanged: 10, collisionDamage: 15 } 
};
const DASH_STAMINA_COST = 30; const STAMINA_REGEN_RATE = 0.3; 
let isGameOver = false;

// --- UI要素・戦闘管理変数 ---
const UI_hero = document.getElementById('hero-status'); const UI_dragon = document.getElementById('dragon-status');
const barHero = document.getElementById('hero-hp-bar'); const barDragon = document.getElementById('dragon-hp-bar');
const barStamina = document.getElementById('hero-stamina-bar');
const resultText = document.getElementById('result-text'); const retryButton = document.getElementById('retry-button');

let lastAttackTime = 0; const attackCooldown = 1500; 
const spinDuration = 600; const dragonMoveInterval = 2000; 
let isHeroKnockedBack = false; let heroKnockBackEndTime = 0;
let isHeroDashing = false; let dashEndTime = 0;
let isHeroInvincible = false; let invincibleEndTime = 0;

const titleScreen = document.getElementById('title-screen');
const gameScreen = document.getElementById('game-screen');
const startButton = document.getElementById('start-button');

// --- アイテムシステム変数 ---
let inventory = { name: "回復薬", count: 3 };
const UI_item = document.getElementById('item-info');
const useItemButton = document.getElementById('use-item-button');

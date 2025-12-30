// ============= CONFIGURATION =============
const CONFIG = {
    MAP_SIZE: 1000,
    PLAYER_SPEED: 0.3,
    BOT_COUNT: 19,
    ZONE_SHRINK_TIME: 120, // ثواني
    GAME_DURATION: 300, // 5 دقائق
    PLAYER_HEALTH: 100,
    LOOT_SPAWN_CHANCE: 0.3
};

// ============= GLOBAL VARIABLES =============
let scene, camera, renderer, world;
let player, bots = [];
let weapons = [];
let currentWeapon = null;
let playerHealth = CONFIG.PLAYER_HEALTH;
let kills = 0;
let alivePlayers = CONFIG.BOT_COUNT + 1;
let gameStarted = false;
let gameEnded = false;
let safeZoneRadius = CONFIG.MAP_SIZE / 2;
let safeZoneCenter = { x: 0, z: 0 };
let gameTime = 0;
let lootBoxes = [];

// ============= INITIALIZATION =============
async function init() {
    // إعداد Three.js
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 10, 1000);
    
    // الكاميرا (منظور أول شخص)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 10, 0);
    
    // الرندر
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // الفيزياء (Cannon.js)
    world = new CANNON.World();
    world.gravity = new CANNON.Vec3(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    
    // الإضاءة
    setupLights();
    
    // إنشاء الخريطة
    createMap();
    
    // إنشاء اللاعب
    createPlayer();
    
    // إنشاء البوتات
    createBots();
    
    // إنشاء الغنائم
    spawnInitialLoot();
    
    // أحداث التحكم
    setupControls();
    
    // بدء اللعبة
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    
    // إخفاء شاشة التحميل
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 1500);
    
    // بدء الأنيميشن
    animate();
}

// ============= MAP CREATION =============
function createMap() {
    // الأرض
    const groundGeometry = new THREE.PlaneGeometry(CONFIG.MAP_SIZE, CONFIG.MAP_SIZE, 100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x3a7c3e,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // فيزياء الأرض
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
    
    // حدود الخريطة (جدران)
    createBoundaryWalls();
    
    // مباني عشوائية
    for (let i = 0; i < 15; i++) {
        createRandomBuilding();
    }
    
    // أشجار
    for (let i = 0; i < 50; i++) {
        createTree();
    }
}

function createBoundaryWalls() {
    const wallHeight = 50;
    const wallThickness = 10;
    
    // الجدران الأربعة
    const positions = [
        [0, wallHeight/2, -CONFIG.MAP_SIZE/2], // شمال
        [0, wallHeight/2, CONFIG.MAP_SIZE/2],  // جنوب
        [-CONFIG.MAP_SIZE/2, wallHeight/2, 0], // غرب
        [CONFIG.MAP_SIZE/2, wallHeight/2, 0]   // شرق
    ];
    
    const rotations = [0, 0, Math.PI/2, Math.PI/2];
    
    for (let i = 0; i < 4; i++) {
        const wallGeometry = new THREE.BoxGeometry(
            i < 2 ? CONFIG.MAP_SIZE : wallThickness,
            wallHeight,
            i < 2 ? wallThickness : CONFIG.MAP_SIZE
        );
        
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(...positions[i]);
        wall.castShadow = true;
        scene.add(wall);
        
        // فيزياء الجدار
        const wallShape = new CANNON.Box(new CANNON.Vec3(
            (i < 2 ? CONFIG.MAP_SIZE/2 : wallThickness/2),
            wallHeight/2,
            (i < 2 ? wallThickness/2 : CONFIG.MAP_SIZE/2)
        ));
        const wallBody = new CANNON.Body({ mass: 0 });
        wallBody.addShape(wallShape);
        wallBody.position.copy(wall.position);
        if (rotations[i] !== 0) {
            wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotations[i]);
        }
        world.addBody(wallBody);
    }
}

function createRandomBuilding() {
    const size = Math.random() * 30 + 20;
    const height = Math.floor(Math.random() * 3 + 1) * 10;
    const x = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 100);
    const z = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 100);
    
    // المبنى
    const buildingGeometry = new THREE.BoxGeometry(size, height, size);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: Math.random() * 0x555555 + 0xaaaaaa });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x, height/2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    
    // فيزياء المبنى
    const buildingShape = new CANNON.Box(new CANNON.Vec3(size/2, height/2, size/2));
    const buildingBody = new CANNON.Body({ mass: 0 });
    buildingBody.addShape(buildingShape);
    buildingBody.position.copy(building.position);
    world.addBody(buildingBody);
    
    // بعض المباني تحتوي على أسقف يمكن الصعود عليها
    if (Math.random() > 0.5) {
        createRoofAccess(building, height, size);
    }
}

function createTree() {
    const x = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 100);
    const z = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 100);
    
    // الجذع
    const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 8, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 4, z);
    trunk.castShadow = true;
    scene.add(trunk);
    
    // الأوراق
    const leavesGeometry = new THREE.SphereGeometry(5, 8, 8);
    const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.set(x, 12, z);
    leaves.castShadow = true;
    scene.add(leaves);
}

// ============= PLAYER SYSTEM =============
function createPlayer() {
    // نموذج اللاعب (مكعب بسيط)
    const playerGeometry = new THREE.BoxGeometry(2, 5, 2);
    const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 2.5, 50);
    player.castShadow = true;
    scene.add(player);
    
    // فيزياء اللاعب
    const playerShape = new CANNON.Box(new CANNON.Vec3(1, 2.5, 1));
    const playerBody = new CANNON.Body({ mass: 70 });
    playerBody.addShape(playerShape);
    playerBody.position.copy(player.position);
    playerBody.fixedRotation = true;
    playerBody.linearDamping = 0.9;
    world.addBody(playerBody);
    
    // كاميرا تتبع اللاعب
    camera.position.set(player.position.x, player.position.y + 2, player.position.z + 5);
    camera.lookAt(player.position);
    
    // منظور أول شخص (يمكن التبديل)
    const fpsCamera = new THREE.Object3D();
    fpsCamera.position.set(0, 1.5, 0);
    player.add(fpsCamera);
    
    // إعطاء اللاعب سلاح ابتدائي
    currentWeapon = {
        name: 'Pistol',
        damage: 15,
        fireRate: 500,
        range: 100,
        ammo: 30,
        maxAmmo: 90,
        type: 'pistol'
    };
    updateWeaponUI();
}

// ============= BOT SYSTEM =============
function createBots() {
    for (let i = 0; i < CONFIG.BOT_COUNT; i++) {
        const bot = {
            id: i,
            mesh: null,
            body: null,
            health: 100,
            weapon: getRandomWeapon(),
            state: 'wandering', // wandering, chasing, attacking, fleeing
            target: null,
            lastShot: 0,
            position: getRandomSpawnPoint(),
            rotation: 0
        };
        
        // نموذج البوت
        const botGeometry = new THREE.BoxGeometry(2, 5, 2);
        const botMaterial = new THREE.MeshLambertMaterial({ color: 0xff4444 });
        bot.mesh = new THREE.Mesh(botGeometry, botMaterial);
        bot.mesh.position.copy(bot.position);
        bot.mesh.castShadow = true;
        scene.add(bot.mesh);
        
        // فيزياء البوت
        const botShape = new CANNON.Box(new CANNON.Vec3(1, 2.5, 1));
        bot.body = new CANNON.Body({ mass: 70 });
        bot.body.addShape(botShape);
        bot.body.position.copy(bot.position);
        bot.body.fixedRotation = true;
        bot.body.linearDamping = 0.9;
        world.addBody(bot.body);
        
        bots.push(bot);
    }
}

function getRandomSpawnPoint() {
    const margin = 100;
    return new THREE.Vector3(
        (Math.random() - 0.5) * (CONFIG.MAP_SIZE - margin * 2),
        2.5,
        (Math.random() - 0.5) * (CONFIG.MAP_SIZE - margin * 2)
    );
}

function getRandomWeapon() {
    const weapons = [
        { name: 'Pistol', damage: 15, fireRate: 500, range: 100 },
        { name: 'Shotgun', damage: 40, fireRate: 1000, range: 30 },
        { name: 'AR', damage: 20, fireRate: 150, range: 200 },
        { name: 'Sniper', damage: 80, fireRate: 2000, range: 500 }
    ];
    return weapons[Math.floor(Math.random() * weapons.length)];
}

// ============= GAME LOGIC =============
function startGame() {
    gameStarted = true;
    gameEnded = false;
    gameTime = 0;
    playerHealth = CONFIG.PLAYER_HEALTH;
    kills = 0;
    alivePlayers = CONFIG.BOT_COUNT + 1;
    
    // إخفاء شاشة البداية
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    
    // تحديث واجهة المستخدم
    updateHealthUI();
    updatePlayersLeftUI();
    
    // بدء المؤقت
    startGameTimer();
    
    // بدء انكماش المنطقة
    startZoneShrink();
}

function restartGame() {
    // إعادة تعيين كل شيء
    gameEnded = false;
    
    // إخفاء شاشة النهاية
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    
    // إعادة تعيين اللاعب
    player.position.set(0, 2.5, 50);
    playerBody.position.copy(player.position);
    playerHealth = CONFIG.PLAYER_HEALTH;
    
    // إعادة تعيين البوتات
    bots.forEach(bot => {
        bot.health = 100;
        bot.position = getRandomSpawnPoint();
        bot.mesh.position.copy(bot.position);
        bot.body.position.copy(bot.position);
        bot.state = 'wandering';
    });
    
    // إعادة تعيين الإحصائيات
    kills = 0;
    alivePlayers = CONFIG.BOT_COUNT + 1;
    safeZoneRadius = CONFIG.MAP_SIZE / 2;
    
    // تحديث الواجهة
    updateHealthUI();
    updatePlayersLeftUI();
    updateKillsUI();
    
    // إعادة التشغيل
    startGame();
}

// ============= COMBAT SYSTEM =============
function shoot() {
    if (!currentWeapon || currentWeapon.ammo <= 0 || !gameStarted || gameEnded) return;
    
    // تقليل الذخيرة
    currentWeapon.ammo--;
    updateAmmoUI();
    
    // إنشاء شعاع (رصاصة)
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    const raycaster = new THREE.Raycaster(
        camera.position,
        direction,
        0,
        currentWeapon.range
    );
    
    // التحقق من الاصطدامات
    const targets = bots.map(bot => bot.mesh);
    const intersects = raycaster.intersectObjects(targets);
    
    if (intersects.length > 0) {
        const hitBot = bots.find(bot => bot.mesh === intersects[0].object);
        if (hitBot) {
            hitBot.health -= currentWeapon.damage;
            
            // تأثير دم
            showHitEffect(intersects[0].point);
            
            if (hitBot.health <= 0) {
                killBot(hitBot);
            }
        }
    }
    
    // تأثير إطلاق النار
    showMuzzleFlash();
    playGunshotSound();
}

function killBot(bot) {
    // إزالة البوت
    scene.remove(bot.mesh);
    world.removeBody(bot.body);
    
    // تحديث الإحصائيات
    kills++;
    alivePlayers--;
    
    // تحديث الواجهة
    updateKillsUI();
    updatePlayersLeftUI();
    
    // التحقق إذا فاز اللاعب
    if (alivePlayers <= 1) {
        endGame(true);
    }
    
    // إسقاط غنائم من البوت
    spawnLootFromBot(bot);
}

// ============= LOOT SYSTEM =============
function spawnInitialLoot() {
    for (let i = 0; i < 50; i++) {
        if (Math.random() < CONFIG.LOOT_SPAWN_CHANCE) {
            spawnLootBox();
        }
    }
}

function spawnLootBox() {
    const x = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 100);
    const z = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 100);
    
    const boxGeometry = new THREE.BoxGeometry(3, 3, 3);
    const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(x, 1.5, z);
    box.castShadow = true;
    scene.add(box);
    
    lootBoxes.push({
        mesh: box,
        type: getRandomLootType(),
        position: new THREE.Vector3(x, 1.5, z),
        collected: false
    });
}

function spawnLootFromBot(bot) {
    const lootType = getRandomLootType();
    showLootNotification(`البوت أسقط: ${lootType}`);
}

function getRandomLootType() {
    const lootTypes = [
        'Medkit',
        'Ammo',
        'Armor',
        'Weapon',
        'Grenade'
    ];
    return lootTypes[Math.floor(Math.random() * lootTypes.length)];
}

// ============= UI UPDATES =============
function updateHealthUI() {
    const healthFill = document.getElementById('health-fill');
    const healthText = document.getElementById('health-text');
    const healthPercent = (playerHealth / CONFIG.PLAYER_HEALTH) * 100;
    
    healthFill.style.width = `${healthPercent}%`;
    healthText.textContent = playerHealth;
    
    // تغيير اللون حسب الصحة
    if (healthPercent > 50) {
        healthFill.style.background = 'linear-gradient(90deg, #ff0000, #00ff00)';
    } else if (healthPercent > 25) {
        healthFill.style.background = 'linear-gradient(90deg, #ff0000, #ffff00)';
    } else {
        healthFill.style.background = '#ff0000';
    }
}

function updateAmmoUI() {
    if (currentWeapon) {
        document.getElementById('ammo-counter').textContent = 
            `رصاص: ${currentWeapon.ammo}/${currentWeapon.maxAmmo}`;
    }
}

function updateWeaponUI() {
    if (currentWeapon) {
        document.getElementById('weapon-info').textContent = 
            `سلاح: ${currentWeapon.name}`;
    }
}

function updatePlayersLeftUI() {
    document.getElementById('players-left').textContent = 
        `الباقون: ${alivePlayers}`;
}

function updateKillsUI() {
    document.getElementById('kill-counter').textContent = 
        `🩸 القتلى: ${kills}`;
}

function showLootNotification(text) {
    const notification = document.getElementById('loot-notification');
    notification.textContent = text;
    notification.style.opacity = '1';
    
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 2000);
}

// ============= GAME TIMERS =============
function startGameTimer() {
    const gameInterval = setInterval(() => {
        if (!gameStarted || gameEnded) {
            clearInterval(gameInterval);
            return;
        }
        
        gameTime++;
        
        // انتهاء الوقت
        if (gameTime >= CONFIG.GAME_DURATION) {
            endGame(false);
            clearInterval(gameInterval);
        }
    }, 1000);
}

function startZoneShrink() {
    const shrinkInterval = setInterval(() => {
        if (!gameStarted || gameEnded) {
            clearInterval(shrinkInterval);
            return;
        }
        
        // تقليص المنطقة الآمنة
        safeZoneRadius *= 0.8;
        if (safeZoneRadius < 50) safeZoneRadius = 50;
        
        // تحديث الواجهة
        document.getElementById('safe-zone').textContent = 
            `⚪ المنطقة الآمنة: ${Math.round(safeZoneRadius)}m`;
        
        // إلحاق ضرر للخارجين عن المنطقة
        checkZoneDamage();
        
    }, CONFIG.ZONE_SHRINK_TIME * 1000);
}

function checkZoneDamage() {
    // حساب المسافة من مركز المنطقة
    const playerDistance = player.position.distanceTo(
        new THREE.Vector3(safeZoneCenter.x, player.position.y, safeZoneCenter.z)
    );
    
    if (playerDistance > safeZoneRadius) {
        // ضرر خارج المنطقة
        takeDamage(5);
    }
    
    // تطبيق الضرر على البوتات خارج المنطقة
    bots.forEach(bot => {
        if (bot.health > 0) {
            const botDistance = bot.mesh.position.distanceTo(
                new THREE.Vector3(safeZoneCenter.x, bot.mesh.position.y, safeZoneCenter.z)
            );
            
            if (botDistance > safeZoneRadius) {
                bot.health -= 5;
                if (bot.health <= 0) {
                    killBot(bot);
                }
            }
        }
    });
}

// ============= END GAME =============
function endGame(isWin) {
    gameEnded = true;
    
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('end-screen').style.display = 'block';
    
    if (isWin) {
        document.getElementById('end-screen').className = 'win';
        document.getElementById('result-title').textContent = '🎉 انتصرت! 🎉';
        document.getElementById('result-title').style.color = 'gold';
    } else {
        document.getElementById('end-screen').className = 'lose';
        document.getElementById('result-title').textContent = '💀 هزيمة 💀';
        document.getElementById('result-title').style.color = '#ff0000';
    }
    
    document.getElementById('result-stats').innerHTML = `
        <p>قتلت: ${kills} بوت</p>
        <p>الوقت: ${Math.floor(gameTime / 60)}:${gameTime % 60}</p>
        <p>الصحة النهائية: ${playerHealth}</p>
    `;
}

// ============= CONTROLS =============
function setupControls() {
    const keys = {};
    
    // حدث الضغط على المفاتيح
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        
        // إطلاق النار (مسافة)
        if (e.key === ' ') {
            shoot();
        }
        
        // إعادة تعبئة (R)
        if (e.key === 'r' && currentWeapon) {
            reloadWeapon();
        }
        
        // تغيير السلاح (1-4)
        if (e.key >= '1' && e.key <= '4') {
            switchWeapon(parseInt(e.key) - 1);
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // إطلاق النار بالماوس
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0 && gameStarted && !gameEnded) { // زر الماوس الأيسر
            shoot();
        }
    });
    
    // حركة الماوس للدوران
    document.addEventListener('mousemove', (e) => {
        if (!gameStarted || gameEnded) return;
        
        const sensitivity = 0.002;
        player.rotation.y -= e.movementX * sensitivity;
        camera.rotation.y -= e.movementX * sensitivity;
    });
    
    // تحديث الحركة في كل إطار
    function updateMovement() {
        if (!gameStarted || gameEnded) return;
        
        const speed = keys['shift'] ? CONFIG.PLAYER_SPEED * 1.5 : CONFIG.PLAYER_SPEED;
        const velocity = new THREE.Vector3();
        
        if (keys['w']) velocity.z -= speed;
        if (keys['s']) velocity.z += speed;
        if (keys['a']) velocity.x -= speed;
        if (keys['d']) velocity.x += speed;
        
        // تطبيق الحركة
        velocity.applyQuaternion(player.quaternion);
        player.position.add(velocity);
        playerBody.position.copy(player.position);
        
        // تحديث الكاميرا
        camera.position.set(
            player.position.x,
            player.position.y + 2,
            player.position.z + 5
        );
        camera.lookAt(player.position);
    }
    
    // دمج تحديث الحركة مع الأنيميشن
    const originalAnimate = animate;
    animate = function() {
        updateMovement();
        originalAnimate();
    };
}

// ============= ANIMATION & PHYSICS =============
function animate() {
    requestAnimationFrame(animate);
    
    // تحديث الفيزياء
    world.step(1/60);
    
    // تحديث البوتات
    updateBots();
    
    // تحديث الغنائم
    updateLoot();
    
    // تحديث المنطقة الآمنة
    updateSafeZoneVisual();
    
    // تحديث اللاعب
    if (player && playerBody) {
        player.position.copy(playerBody.position);
        player.quaternion.copy(playerBody.quaternion);
    }
    
    // تحديث البوتات
    bots.forEach(bot => {
        if (bot.mesh && bot.body) {
            bot.mesh.position.copy(bot.body.position);
            bot.mesh.quaternion.copy(bot.body.quaternion);
        }
    });
    
    // التقديم
    renderer.render(scene, camera);
}

// ============= UTILITY FUNCTIONS =============
function setupLights() {
    // ضوء رئيسي (شمس)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // ضوء بيئي
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    // ضوء سماوي
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3a7c3e, 0.3);
    scene.add(hemisphereLight);
}

function showHitEffect(position) {
    const hitGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const hitMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const hitEffect = new THREE.Mesh(hitGeometry, hitMaterial);
    hitEffect.position.copy(position);
    scene.add(hitEffect);
    
    setTimeout(() => {
        scene.remove(hitEffect);
    }, 100);
}

function showMuzzleFlash() {
    const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(camera.position);
    scene.add(flash);
    
    setTimeout(() => {
        scene.remove(flash);
    }, 50);
}

function playGunshotSound() {
    // يمكن إضافة أصوات هنا
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function takeDamage(amount) {
    playerHealth -= amount;
    updateHealthUI();
    
    // تأثير رعشة عند أخذ ضرر
    camera.position.x += (Math.random() - 0.5) * 2;
    camera.position.y += (Math.random() - 0.5) * 2;
    
    setTimeout(() => {
        camera.position.x = player.position.x;
        camera.position.y = player.position.y + 2;
        camera.position.z = player.position.z + 5;
    }, 100);
    
    // التحقق من الوفاة
    if (playerHealth <= 0) {
        playerHealth = 0;
        endGame(false);
    }
}

// ============= WINDOW RESIZE =============
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============= INITIALIZE GAME =============
init();

// حالة اللعبة
const GameState = {
    LOADING: 'loading',
    MAIN_MENU: 'main_menu',
    MATCHMAKING: 'matchmaking',
    PLAYING: 'playing',
    RESULTS: 'results'
};

let currentState = GameState.LOADING;
let playersRemaining = 20;
let matchmakingInterval;
let gameLoopInterval;
let joystickActive = false;
let cameraJoystickActive = false;

// عناصر DOM
const loadingScreen = document.getElementById('loadingScreen');
const mainMenu = document.getElementById('mainMenu');
const matchmakingScreen = document.getElementById('matchmakingScreen');
const gameScreen = document.getElementById('gameScreen');
const resultsScreen = document.getElementById('resultsScreen');
const settingsMenu = document.getElementById('settingsMenu');
const inventoryMenu = document.getElementById('inventoryMenu');
const alertMessage = document.getElementById('alertMessage');

// الأزرار
const playButton = document.getElementById('playButton');
const cancelMatchmaking = document.getElementById('cancelMatchmaking');
const playAgainButton = document.getElementById('playAgainButton');
const mainMenuButton = document.getElementById('mainMenuButton');
const customizeButton = document.getElementById('customizeButton');
const settingsButton = document.getElementById('settingsButton');
const shopButton = document.getElementById('shopButton');
const leaderboardButton = document.getElementById('leaderboardButton');
const closeInventory = document.getElementById('closeInventory');
const inventoryBtn = document.getElementById('inventoryBtn');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');

// عناصر التحكم
const movementJoystick = document.getElementById('movementJoystick');
const cameraJoystick = document.getElementById('cameraJoystick');
const joystickHandle = document.querySelector('#movementJoystick .joystick-handle');
const cameraJoystickHandle = document.querySelector('#cameraJoystick .joystick-handle');
const jumpBtn = document.getElementById('jumpBtn');
const crouchBtn = document.getElementById('crouchBtn');
const reloadBtn = document.getElementById('reloadBtn');
const shootBtn = document.getElementById('shootBtn');

// عناصر المعلومات
const playersRemainingElement = document.getElementById('playersRemaining');
const killsStat = document.getElementById('killsStat');
const damageStat = document.getElementById('damageStat');
const timeStat = document.getElementById('timeStat');
const xpStat = document.getElementById('xpStat');
const resultTitle = document.getElementById('resultTitle');

// تهيئة اللعبة عند تحميل الصفحة
window.addEventListener('load', initializeGame);

function initializeGame() {
    // محاكاة تحميل اللعبة
    simulateLoading();
    
    // إعداد المستمعين للأحداث
    setupEventListeners();
    
    // إعداد عناصر التحكم باللمس
    setupTouchControls();
    
    // تحديث حالة اللعبة
    updateGameState(GameState.LOADING);
}

function simulateLoading() {
    const loadingProgress = document.querySelector('.loading-progress');
    let progress = 0;
    
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // الانتقال إلى القائمة الرئيسية بعد التحميل
            setTimeout(() => {
                updateGameState(GameState.MAIN_MENU);
            }, 500);
        }
        
        loadingProgress.style.width = `${progress}%`;
    }, 200);
}

function setupEventListeners() {
    // أزرار القائمة الرئيسية
    playButton.addEventListener('click', startMatchmaking);
    customizeButton.addEventListener('click', () => showAlert('ميزة تخصيص الشخصية قريباً!'));
    settingsButton.addEventListener('click', showSettings);
    shopButton.addEventListener('click', () => showAlert('المتجر قريباً!'));
    leaderboardButton.addEventListener('click', () => showAlert('لوحة المتصدرين قريباً!'));
    
    // أزرار البحث عن مباراة
    cancelMatchmaking.addEventListener('click', cancelMatchmakingProcess);
    
    // أزرار النتائج
    playAgainButton.addEventListener('click', startMatchmaking);
    mainMenuButton.addEventListener('click', () => updateGameState(GameState.MAIN_MENU));
    
    // أزرار القوائم
    closeInventory.addEventListener('click', () => inventoryMenu.classList.add('hidden'));
    inventoryBtn.addEventListener('click', () => inventoryMenu.classList.remove('hidden'));
    closeSettings.addEventListener('click', () => settingsMenu.classList.add('hidden'));
    saveSettings.addEventListener('click', saveGameSettings);
    
    // أحداث عناصر التحكم
    setupControlEvents();
    
    // تحديث عناصر الإعدادات
    updateSettingsUI();
}

function setupControlEvents() {
    // أزرار الحركة
    jumpBtn.addEventListener('touchstart', () => handleAction('jump'));
    crouchBtn.addEventListener('touchstart', () => handleAction('crouch'));
    reloadBtn.addEventListener('touchstart', () => handleAction('reload'));
    shootBtn.addEventListener('touchstart', () => handleAction('shootStart'));
    shootBtn.addEventListener('touchend', () => handleAction('shootEnd'));
    
    // منع السلوك الافتراضي لبعض الأحداث لمنع التكبير/التصغير
    document.addEventListener('touchmove', function(e) {
        if (e.target.classList.contains('action-btn') || 
            e.target.classList.contains('joystick-area') ||
            e.target.classList.contains('camera-joystick-area')) {
            e.preventDefault();
        }
    }, { passive: false });
}

function setupTouchControls() {
    // جويستيك الحركة
    setupJoystick(movementJoystick, joystickHandle, 'movement');
    
    // جويستيك الكاميرا
    setupJoystick(cameraJoystick, cameraJoystickHandle, 'camera');
}

function setupJoystick(joystickArea, handle, type) {
    let active = false;
    let startX, startY;
    let joystickX = 0, joystickY = 0;
    
    joystickArea.addEventListener('touchstart', (e) => {
        active = true;
        const rect = joystickArea.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
        
        if (type === 'movement') {
            joystickActive = true;
        } else {
            cameraJoystickActive = true;
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!active) return;
        
        const touch = e.touches[0];
        let x = touch.clientX - startX;
        let y = touch.clientY - startY;
        
        // تحديد الحد الأقصى للحركة
        const maxDist = 40;
        const dist = Math.sqrt(x * x + y * y);
        
        if (dist > maxDist) {
            x = (x / dist) * maxDist;
            y = (y / dist) * maxDist;
        }
        
        // تحديث موضع المقبض
        handle.style.transform = `translate(${x}px, ${y}px)`;
        
        // تخزين قيم الجويستيك
        joystickX = x / maxDist;
        joystickY = y / maxDist;
        
        // إرسال بيانات الحركة
        if (type === 'movement') {
            handleMovement(joystickX, joystickY);
        } else {
            handleCamera(joystickX, joystickY);
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('touchend', () => {
        if (!active) return;
        
        active = false;
        handle.style.transform = 'translate(0, 0)';
        
        if (type === 'movement') {
            joystickActive = false;
            handleMovement(0, 0);
        } else {
            cameraJoystickActive = false;
            handleCamera(0, 0);
        }
    });
}

function handleMovement(x, y) {
    // في التطبيق الكامل، سيتم إرسال هذه البيانات إلى محرك اللعبة
    console.log(`حركة: X=${x.toFixed(2)}, Y=${y.toFixed(2)}`);
}

function handleCamera(x, y) {
    // في التطبيق الكامل، سيتم إرسال هذه البيانات إلى محرك اللعبة
    console.log(`كاميرا: X=${x.toFixed(2)}, Y=${y.toFixed(2)}`);
}

function handleAction(action) {
    console.log(`إجراء: ${action}`);
    
    // في التطبيق الكامل، سيتم تنفيذ الإجراءات المناسبة
    switch(action) {
        case 'jump':
            showAlert('قفز!');
            break;
        case 'crouch':
            showAlert('انحناء!');
            break;
        case 'reload':
            showAlert('إعادة تعبئة!');
            break;
        case 'shootStart':
            console.log('بدء إطلاق النار');
            break;
        case 'shootEnd':
            console.log('توقف إطلاق النار');
            break;
    }
}

function updateGameState(newState) {
    // إخفاء جميع الشاشات
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.add('hidden'));
    
    // إخفاء القوائم
    settingsMenu.classList.add('hidden');
    inventoryMenu.classList.add('hidden');
    
    // عرض الشاشة المطلوبة
    currentState = newState;
    
    switch(newState) {
        case GameState.LOADING:
            loadingScreen.classList.remove('hidden');
            break;
        case GameState.MAIN_MENU:
            mainMenu.classList.remove('hidden');
            break;
        case GameState.MATCHMAKING:
            matchmakingScreen.classList.remove('hidden');
            startMatchmakingProcess();
            break;
        case GameState.PLAYING:
            gameScreen.classList.remove('hidden');
            startGameLoop();
            break;
        case GameState.RESULTS:
            resultsScreen.classList.remove('hidden');
            generateRandomResults();
            break;
    }
}

function startMatchmaking() {
    updateGameState(GameState.MATCHMAKING);
}

function startMatchmakingProcess() {
    // إعادة تعيين عدد اللاعبين
    const playerCount = document.querySelector('.count');
    playerCount.textContent = '1';
    
    // إزالة اللاعبين السابقين
    const playerList = document.querySelector('.player-list');
    while (playerList.children.length > 1) {
        playerList.removeChild(playerList.lastChild);
    }
    
    // محاكاة البحث عن لاعبين
    let playersFound = 1;
    let botsAdded = 0;
    
    matchmakingInterval = setInterval(() => {
        playersFound++;
        playerCount.textContent = playersFound;
        
        // إضافة لاعب أو بوت جديد
        const isBot = playersFound > 5; // بعد 5 لاعبين حقيقيين، نضيف بوتات
        addPlayerToMatchmaking(isBot, playersFound);
        
        if (playersFound >= 20) {
            clearInterval(matchmakingInterval);
            
            // بدء اللعبة بعد تأخير قصير
            setTimeout(() => {
                updateGameState(GameState.PLAYING);
            }, 1000);
        }
    }, 500);
}

function addPlayerToMatchmaking(isBot, playerNumber) {
    const playerList = document.querySelector('.player-list');
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    
    if (isBot) {
        playerItem.innerHTML = `<i class="fas fa-robot"></i><span>بوت ${playerNumber - 5}</span>`;
    } else {
        playerItem.innerHTML = `<i class="fas fa-user"></i><span>لاعب ${playerNumber}</span>`;
    }
    
    playerList.appendChild(playerItem);
}

function cancelMatchmakingProcess() {
    clearInterval(matchmakingInterval);
    updateGameState(GameState.MAIN_MENU);
}

function startGameLoop() {
    // إعادة تعيين عدد اللاعبين
    playersRemaining = 20;
    playersRemainingElement.textContent = playersRemaining;
    
    // بدء دورة اللعبة
    let gameTime = 0;
    
    gameLoopInterval = setInterval(() => {
        gameTime++;
        
        // تحديث المؤقت
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        document.querySelector('.timer span').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // تقليل عدد اللاعبين بشكل عشوائي لمحاكاة اللعبة
        if (playersRemaining > 1 && Math.random() < 0.02) {
            playersRemaining--;
            playersRemainingElement.textContent = playersRemaining;
            
            // إذا بقي لاعب واحد فقط (أنت)، فازت بالمباراة
            if (playersRemaining === 1) {
                clearInterval(gameLoopInterval);
                
                // تأخير قبل عرض النتائج
                setTimeout(() => {
                    updateGameState(GameState.RESULTS);
                }, 1500);
            }
        }
        
        // تحديث الصحة والدرع بشكل عشوائي
        updatePlayerStats();
        
    }, 1000);
}

function updatePlayerStats() {
    // تحديث شريط الصحة بشكل عشوائي
    const healthFill = document.querySelector('.health-fill');
    const healthText = document.querySelector('.health-text');
    let health = parseInt(healthFill.style.width);
    
    // تقليل الصحة باحتمال معين
    if (health > 20 && Math.random() < 0.05) {
        health -= Math.floor(Math.random() * 10) + 5;
        if (health < 0) health = 0;
        healthFill.style.width = `${health}%`;
        healthText.textContent = health;
    }
    
    // تحديث شريط الدرع بشكل عشوائي
    const armorFill = document.querySelector('.armor-fill');
    const armorText = document.querySelector('.armor-text');
    let armor = parseInt(armorFill.style.width);
    
    // تقليل الدرع باحتمال معين
    if (armor > 10 && Math.random() < 0.03) {
        armor -= Math.floor(Math.random() * 15) + 5;
        if (armor < 0) armor = 0;
        armorFill.style.width = `${armor}%`;
        armorText.textContent = armor;
    }
}

function generateRandomResults() {
    // إنشاء نتائج عشوائية
    const kills = Math.floor(Math.random() * 10) + 1;
    const damage = Math.floor(Math.random() * 2000) + 500;
    const time = Math.floor(Math.random() * 600) + 120; // بين 2-10 دقائق
    const xp = Math.floor(Math.random() * 500) + 200;
    
    // تحديث العناصر
    killsStat.textContent = kills;
    damageStat.textContent = damage.toLocaleString();
    timeStat.textContent = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
    xpStat.textContent = `+${xp}`;
    
    // تحديد العنوان بناءً على المركز
    resultTitle.textContent = "#1 VICTORY ROYALE!";
    resultTitle.style.color = "#ffd700";
}

function showSettings() {
    settingsMenu.classList.remove('hidden');
}

function updateSettingsUI() {
    const soundVolume = document.getElementById('soundVolume');
    const sensitivity = document.getElementById('sensitivity');
    const volumeValue = document.querySelector('.volume-value');
    const sensitivityValue = document.querySelector('.sensitivity-value');
    
    // تحديث قيم العرض عند التغيير
    soundVolume.addEventListener('input', () => {
        volumeValue.textContent = `${soundVolume.value}%`;
    });
    
    sensitivity.addEventListener('input', () => {
        sensitivityValue.textContent = sensitivity.value;
    });
}

function saveGameSettings() {
    const soundVolume = document.getElementById('soundVolume').value;
    const sensitivity = document.getElementById('sensitivity').value;
    const graphicsQuality = document.getElementById('graphicsQuality').value;
    const controlLayout = document.getElementById('controlLayout').value;
    
    // حفظ الإعدادات (في التطبيق الحقيقي، سيتم حفظها في localStorage أو خادم)
    console.log('الإعدادات المحفوظة:', {
        soundVolume,
        sensitivity,
        graphicsQuality,
        controlLayout
    });
    
    showAlert('تم حفظ الإعدادات بنجاح!');
    settingsMenu.classList.add('hidden');
}

function showAlert(message) {
    const alertText = document.getElementById('alertText');
    alertText.textContent = message;
    
    alertMessage.classList.remove('hidden');
    
    // إخفاء التنبيه بعد 3 ثواني
    setTimeout(() => {
        alertMessage.classList.add('hidden');
    }, 3000);
}

// تهيئة المخزون
function initializeInventory() {
    const inventoryItems = [
        { name: 'AK-47', type: 'weapon', icon: 'fas fa-gun' },
        { name: 'Pistol', type: 'weapon', icon: 'fas fa-gun' },
        { name: 'علبة إسعاف', type: 'health', icon: 'fas fa-first-aid' },
        { name: 'درع مستوى 2', type: 'armor', icon: 'fas fa-shield-alt' },
        { name: 'ذخيرة 5.56', type: 'ammo', icon: 'fas fa-box' },
        { name: 'قنبلة يدوية', type: 'grenade', icon: 'fas fa-bomb' },
    ];
    
    const inventoryContainer = document.querySelector('.inventory-items');
    inventoryContainer.innerHTML = '';
    
    inventoryItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `
            <i class="${item.icon} fa-2x"></i>
            <span>${item.name}</span>
        `;
        inventoryContainer.appendChild(itemElement);
    });
}

// استدعاء تهيئة المخزون عند بدء اللعبة
initializeInventory();

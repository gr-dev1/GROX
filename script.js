// تهيئة اللعبة
document.addEventListener('DOMContentLoaded', function() {
    // عناصر DOM
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const scoreScreen = document.getElementById('score-screen');
    const startBtn = document.getElementById('start-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const howToPlayBtn = document.getElementById('how-to-play-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const closeInstructionsBtn = document.getElementById('close-instructions');
    const saveSettingsBtn = document.getElementById('save-settings');
    const settingsModal = document.getElementById('settings-modal');
    const howToPlayModal = document.getElementById('how-to-play-modal');
    const gameCanvas = document.getElementById('game-canvas');
    const miniMapCanvas = document.getElementById('mini-map-canvas');
    const ctx = gameCanvas.getContext('2d');
    const miniMapCtx = miniMapCanvas.getContext('2d');
    
    // عناصر التحكم
    const shootBtn = document.getElementById('shoot-btn');
    const reloadBtn = document.getElementById('reload-btn');
    const jumpBtn = document.getElementById('jump-btn');
    const crouchBtn = document.getElementById('crouch-btn');
    
    // عناصر المعلومات
    const playersCount = document.getElementById('players-count');
    const gameTime = document.getElementById('game-time');
    const zoneTimer = document.getElementById('zone-timer');
    const healthBar = document.getElementById('health-bar');
    const healthText = document.getElementById('health-text');
    const primaryWeapon = document.getElementById('primary-weapon');
    const primaryAmmo = document.getElementById('primary-ammo');
    const secondaryWeapon = document.getElementById('secondary-weapon');
    const secondaryAmmo = document.getElementById('secondary-ammo');
    
    // متغيرات اللعبة
    let gameActive = false;
    let gameLoop;
    let players = 99;
    let gameSeconds = 300; // 5 دقائق
    let zoneSeconds = 150; // 2.5 دقيقة
    let playerHealth = 100;
    let playerWeapons = {
        primary: { name: 'AK-47', ammo: 30, maxAmmo: 120 },
        secondary: { name: 'مسدس', ammo: 12, maxAmmo: 36 }
    };
    let playerPosition = { x: 400, y: 300 };
    let playerAngle = 0;
    let safeZone = { x: 500, y: 350, radius: 300 };
    let mapObjects = [];
    let enemies = [];
    
    // تهيئة الصوت
    const shootSound = document.getElementById('shoot-sound');
    const backgroundMusic = document.getElementById('background-music');
    
    // إعداد أحجام الكانفاس
    function setupCanvas() {
        gameCanvas.width = gameCanvas.parentElement.clientWidth;
        gameCanvas.height = gameCanvas.parentElement.clientHeight;
        
        miniMapCanvas.width = miniMapCanvas.parentElement.clientWidth;
        miniMapCanvas.height = miniMapCanvas.parentElement.clientHeight;
        
        // تحديث منطقة الآمن في الواجهة
        const safeZoneElement = document.getElementById('safe-zone');
        safeZoneElement.style.width = safeZone.radius * 2 + 'px';
        safeZoneElement.style.height = safeZone.radius * 2 + 'px';
        safeZoneElement.style.left = (safeZone.x - safeZone.radius) + 'px';
        safeZoneElement.style.top = (safeZone.y - safeZone.radius) + 'px';
    }
    
    // إنشاء الخريطة والعناصر
    function generateMap() {
        mapObjects = [];
        
        // إنشاء مباني
        for (let i = 0; i < 15; i++) {
            mapObjects.push({
                type: 'building',
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
                width: 60 + Math.random() * 80,
                height: 80 + Math.random() * 100,
                color: `rgb(${100 + Math.random() * 100}, ${80 + Math.random() * 80}, ${70 + Math.random() * 70})`
            });
        }
        
        // إناسطة أشجار
        for (let i = 0; i < 30; i++) {
            mapObjects.push({
                type: 'tree',
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
                radius: 10 + Math.random() * 15,
                color: '#27ae60'
            });
        }
        
        // إنشاء أسلحة على الأرض
        const weaponTypes = ['AK-47', 'M16', 'قناص', 'رشاش', 'مسدس', 'بندقية صيد'];
        for (let i = 0; i < 10; i++) {
            mapObjects.push({
                type: 'weapon',
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
                weaponType: weaponTypes[Math.floor(Math.random() * weaponTypes.length)],
                color: '#f39c12'
            });
        }
        
        // إنشاء علاجات
        for (let i = 0; i < 8; i++) {
            mapObjects.push({
                type: 'health',
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
                radius: 8,
                color: '#e74c3c'
            });
        }
        
        // إنشاء دروع
        for (let i = 0; i < 6; i++) {
            mapObjects.push({
                type: 'armor',
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
                radius: 8,
                color: '#3498db'
            });
        }
        
        // إنشاء أعداء (NPCs)
        enemies = [];
        for (let i = 0; i < players; i++) {
            enemies.push({
                id: i,
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
                radius: 15,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                health: 100,
                active: true
            });
        }
    }
    
    // رسم اللعبة
    function drawGame() {
        // مسح الكانفاس
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        // رسم الخلفية
        ctx.fillStyle = '#1a2530';
        ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        // رسم العشب
        ctx.fillStyle = '#2c3e50';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * gameCanvas.width;
            const y = Math.random() * gameCanvas.height;
            ctx.fillRect(x, y, 2, 2);
        }
        
        // رسم العناصر
        mapObjects.forEach(obj => {
            ctx.fillStyle = obj.color;
            
            if (obj.type === 'building') {
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                
                // إضافة نافذة
                ctx.fillStyle = '#3498db';
                ctx.fillRect(obj.x + 10, obj.y + 10, 15, 15);
                ctx.fillRect(obj.x + obj.width - 25, obj.y + 10, 15, 15);
                
                // إضافة باب
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(obj.x + obj.width/2 - 10, obj.y + obj.height - 20, 20, 20);
            } 
            else if (obj.type === 'tree') {
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // جذع الشجرة
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(obj.x - 3, obj.y + obj.radius - 5, 6, 15);
            }
            else if (obj.type === 'weapon') {
                ctx.fillStyle = obj.color;
                ctx.fillRect(obj.x - 10, obj.y - 5, 20, 10);
                
                // نص السلاح
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(obj.weaponType.substring(0, 4), obj.x, obj.y - 10);
            }
            else if (obj.type === 'health' || obj.type === 'armor') {
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // رمز
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(obj.type === 'health' ? '+' : 'A', obj.x, obj.y + 4);
            }
        });
        
        // رسم الأعداء
        enemies.forEach(enemy => {
            if (enemy.active) {
                // جسم العدو
                ctx.fillStyle = enemy.color;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // عيون العدو
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(enemy.x - 4, enemy.y - 4, 3, 0, Math.PI * 2);
                ctx.arc(enemy.x + 4, enemy.y - 4, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // بؤبؤ العين
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(enemy.x - 4, enemy.y - 4, 1, 0, Math.PI * 2);
                ctx.arc(enemy.x + 4, enemy.y - 4, 1, 0, Math.PI * 2);
                ctx.fill();
                
                // فم العدو
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y + 3, 4, 0, Math.PI);
                ctx.stroke();
                
                // شريط صحة العدو
                if (enemy.health < 100) {
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 5);
                    
                    ctx.fillStyle = '#2ecc71';
                    ctx.fillRect(enemy.x - 15, enemy.y - 25, 30 * (enemy.health / 100), 5);
                }
            }
        });
        
        // رسم منطقة الآمن
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.arc(safeZone.x, safeZone.y, safeZone.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // رسم اللاعب
        drawPlayer();
        
        // رسم الخريطة المصغرة
        drawMiniMap();
    }
    
    // رسم اللاعب
    function drawPlayer() {
        // جسم اللاعب
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(playerPosition.x, playerPosition.y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // اتجاه اللاعب (السلاح)
        const weaponLength = 30;
        const weaponX = playerPosition.x + Math.cos(playerAngle) * weaponLength;
        const weaponY = playerPosition.y + Math.sin(playerAngle) * weaponLength;
        
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(playerPosition.x, playerPosition.y);
        ctx.lineTo(weaponX, weaponY);
        ctx.stroke();
        
        // عيون اللاعب
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(playerPosition.x - 6, playerPosition.y - 5, 4, 0, Math.PI * 2);
        ctx.arc(playerPosition.x + 6, playerPosition.y - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(playerPosition.x - 6, playerPosition.y - 5, 2, 0, Math.PI * 2);
        ctx.arc(playerPosition.x + 6, playerPosition.y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // فم اللاعب
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(playerPosition.x, playerPosition.y + 8, 6, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        
        // اسم اللاعب فوق رأسه
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('أنت', playerPosition.x, playerPosition.y - 35);
    }
    
    // رسم الخريطة المصغرة
    function drawMiniMap() {
        miniMapCtx.clearRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);
        
        // خلفية الخريطة
        miniMapCtx.fillStyle = '#1a2530';
        miniMapCtx.fillRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);
        
        const scaleX = miniMapCanvas.width / gameCanvas.width;
        const scaleY = miniMapCanvas.height / gameCanvas.height;
        
        // رسم المباني على الخريطة المصغرة
        mapObjects.forEach(obj => {
            if (obj.type === 'building') {
                miniMapCtx.fillStyle = '#7f8c8d';
                miniMapCtx.fillRect(obj.x * scaleX, obj.y * scaleY, obj.width * scaleX, obj.height * scaleY);
            }
        });
        
        // رسم منطقة الآمن على الخريطة المصغرة
        miniMapCtx.strokeStyle = '#2ecc71';
        miniMapCtx.lineWidth = 2;
        miniMapCtx.beginPath();
        miniMapCtx.arc(safeZone.x * scaleX, safeZone.y * scaleY, safeZone.radius * scaleX, 0, Math.PI * 2);
        miniMapCtx.stroke();
        
        // رسم الأعداء على الخريطة المصغرة
        enemies.forEach(enemy => {
            if (enemy.active) {
                miniMapCtx.fillStyle = enemy.color;
                miniMapCtx.beginPath();
                miniMapCtx.arc(enemy.x * scaleX, enemy.y * scaleY, 3, 0, Math.PI * 2);
                miniMapCtx.fill();
            }
        });
        
        // رسم اللاعب على الخريطة المصغرة
        miniMapCtx.fillStyle = '#e74c3c';
        miniMapCtx.beginPath();
        miniMapCtx.arc(playerPosition.x * scaleX, playerPosition.y * scaleY, 4, 0, Math.PI * 2);
        miniMapCtx.fill();
        
        // تحديث موقع مؤشر اللاعب في الواجهة
        const playerIndicator = document.querySelector('.player-mini-map-indicator');
        playerIndicator.style.left = (playerPosition.x * scaleX) + 'px';
        playerIndicator.style.top = (playerPosition.y * scaleY) + 'px';
        
        // تحديث اتجاه البوصلة
        const compassNeedle = document.querySelector('.compass-needle');
        compassNeedle.style.transform = `translate(-50%, -100%) rotate(${playerAngle}rad)`;
    }
    
    // تحديث اللعبة
    function updateGame() {
        if (!gameActive) return;
        
        // تحقق إذا كان اللاعب خارج منطقة الآمن
        const distanceToZone = Math.sqrt(
            Math.pow(playerPosition.x - safeZone.x, 2) + 
            Math.pow(playerPosition.y - safeZone.y, 2)
        );
        
        if (distanceToZone > safeZone.radius) {
            // خسارة الصحة إذا كان خارج المنطقة
            playerHealth -= 0.1;
            updateHealth();
        }
        
        // حركة الأعداء العشوائية
        enemies.forEach(enemy => {
            if (enemy.active) {
                // حركة عشوائية
                enemy.x += (Math.random() - 0.5) * 2;
                enemy.y += (Math.random() - 0.5) * 2;
                
                // التأكد من بقاء الأعداء داخل حدود الخريطة
                enemy.x = Math.max(20, Math.min(gameCanvas.width - 20, enemy.x));
                enemy.y = Math.max(20, Math.min(gameCanvas.height - 20, enemy.y));
                
                // تحقق من الاصطدام مع اللاعب
                const distanceToPlayer = Math.sqrt(
                    Math.pow(playerPosition.x - enemy.x, 2) + 
                    Math.pow(playerPosition.y - enemy.y, 2)
                );
                
                if (distanceToPlayer < 40) {
                    // هجوم العدو على اللاعب
                    playerHealth -= 0.05;
                    updateHealth();
                }
            }
        });
        
        // تحديث المؤقتات
        updateTimers();
        
        // إعادة رسم اللعبة
        drawGame();
    }
    
    // تحديث المؤقتات
    function updateTimers() {
        // مؤقت اللعبة
        gameSeconds--;
        if (gameSeconds < 0) gameSeconds = 0;
        
        const gameMinutes = Math.floor(gameSeconds / 60);
        const gameSecs = gameSeconds % 60;
        gameTime.textContent = `${gameMinutes.toString().padStart(2, '0')}:${gameSecs.toString().padStart(2, '0')}`;
        
        // مؤقت منطقة الآمن
        zoneSeconds--;
        if (zoneSeconds < 0) zoneSeconds = 0;
        
        const zoneMinutes = Math.floor(zoneSeconds / 60);
        const zoneSecs = zoneSeconds % 60;
        zoneTimer.textContent = `${zoneMinutes.toString().padStart(2, '0')}:${zoneSecs.toString().padStart(2, '0')}`;
        
        // تقليص منطقة الآمن كل 30 ثانية
        if (zoneSeconds % 30 === 0 && safeZone.radius > 100) {
            safeZone.radius -= 20;
            
            // تحديث منطقة الآمن في الواجهة
            const safeZoneElement = document.getElementById('safe-zone');
            safeZoneElement.style.width = safeZone.radius * 2 + 'px';
            safeZoneElement.style.height = safeZone.radius * 2 + 'px';
        }
        
        // انتهاء اللعبة
        if (gameSeconds === 0 || playerHealth <= 0) {
            endGame();
        }
    }
    
    // تحديث صحة اللاعب
    function updateHealth() {
        if (playerHealth < 0) playerHealth = 0;
        if (playerHealth > 100) playerHealth = 100;
        
        healthBar.style.width = `${playerHealth}%`;
        healthText.textContent = `${Math.round(playerHealth)}%`;
        
        // تغيير لون شريط الصحة بناء على النسبة
        if (playerHealth > 70) {
            healthBar.style.background = 'linear-gradient(90deg, #2ecc71, #2ecc71)';
        } else if (playerHealth > 30) {
            healthBar.style.background = 'linear-gradient(90deg, #f1c40f, #f1c40f)';
        } else {
            healthBar.style.background = 'linear-gradient(90deg, #e74c3c, #e74c3c)';
        }
    }
    
    // بدء اللعبة
    function startGame() {
        gameActive = true;
        
        // إعادة تعيين القيم
        players = 99;
        gameSeconds = 300;
        zoneSeconds = 150;
        playerHealth = 100;
        playerPosition = { x: 400, y: 300 };
        safeZone = { x: 500, y: 350, radius: 300 };
        
        // تحديث واجهة المستخدم
        playersCount.textContent = players;
        updateHealth();
        
        // توليد خريطة جديدة
        generateMap();
        
        // إعداد الكانفاس
        setupCanvas();
        
        // تبديل الشاشات
        startScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        scoreScreen.classList.add('hidden');
        
        // بدء موسيقى الخلفية
        backgroundMusic.volume = 0.5;
        backgroundMusic.play().catch(e => console.log("لم يتم تشغيل الموسيقى:", e));
        
        // بدء حلقة اللعبة
        gameLoop = setInterval(updateGame, 16); // ~60 إطار في الثانية
    }
    
    // إنهاء اللعبة
    function endGame() {
        gameActive = false;
        clearInterval(gameLoop);
        
        // إيقاف الموسيقى
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        
        // حساب النتائج
        const kills = 99 - players;
        const damage = Math.round(kills * 100 + (300 - gameSeconds) * 2);
        const survivalTime = `05:${(300 - gameSeconds).toString().padStart(2, '0')}`;
        
        // تحديث شاشة النتائج
        document.getElementById('player-rank').textContent = kills > 50 ? '1' : kills > 30 ? '5' : kills > 10 ? '15' : '25';
        document.getElementById('final-kills').textContent = kills;
        document.getElementById('total-damage').textContent = damage;
        document.getElementById('survival-time').textContent = survivalTime;
        
        // تبديل الشاشات
        gameScreen.classList.add('hidden');
        scoreScreen.classList.remove('hidden');
    }
    
    // التحكم في حركة اللاعب
    let keysPressed = {};
    
    document.addEventListener('keydown', function(e) {
        keysPressed[e.key.toLowerCase()] = true;
        movePlayer();
    });
    
    document.addEventListener('keyup', function(e) {
        keysPressed[e.key.toLowerCase()] = false;
    });
    
    // حركة الماوس لتوجيه السلاح
    gameCanvas.addEventListener('mousemove', function(e) {
        const rect = gameCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // حساب الزاوية بين اللاعب والماوس
        playerAngle = Math.atan2(mouseY - playerPosition.y, mouseX - playerPosition.x);
    });
    
    // حركة اللاعب
    function movePlayer() {
        const speed = 5;
        
        if (keysPressed['w'] || keysPressed['arrowup']) {
            playerPosition.y -= speed;
        }
        if (keysPressed['s'] || keysPressed['arrowdown']) {
            playerPosition.y += speed;
        }
        if (keysPressed['a'] || keysPressed['arrowleft']) {
            playerPosition.x -= speed;
        }
        if (keysPressed['d'] || keysPressed['arrowright']) {
            playerPosition.x += speed;
        }
        
        // التأكد من بقاء اللاعب داخل حدود الخريطة
        playerPosition.x = Math.max(20, Math.min(gameCanvas.width - 20, playerPosition.x));
        playerPosition.y = Math.max(20, Math.min(gameCanvas.height - 20, playerPosition.y));
        
        // تحقق من جمع العناصر
        checkItemCollection();
    }
    
    // جمع العناصر
    function checkItemCollection() {
        mapObjects = mapObjects.filter(obj => {
            const distance = Math.sqrt(
                Math.pow(playerPosition.x - obj.x, 2) + 
                Math.pow(playerPosition.y - obj.y, 2)
            );
            
            if (distance < 30) {
                // جمع العنصر
                if (obj.type === 'health') {
                    playerHealth += 25;
                    updateHealth();
                    return false; // إزالة العنصر من الخريطة
                }
                else if (obj.type === 'armor') {
                    playerHealth += 15;
                    updateHealth();
                    return false;
                }
                else if (obj.type === 'weapon') {
                    // تغيير السلاح
                    playerWeapons.primary.name = obj.weaponType;
                    playerWeapons.primary.ammo = 30;
                    playerWeapons.primary.maxAmmo = 120;
                    
                    primaryWeapon.textContent = obj.weaponType;
                    primaryAmmo.textContent = `${playerWeapons.primary.ammo}/${playerWeapons.primary.maxAmmo}`;
                    
                    return false;
                }
            }
            return true;
        });
    }
    
    // أحداث الأزرار
    startBtn.addEventListener('click', startGame);
    playAgainBtn.addEventListener('click', startGame);
    backToMenuBtn.addEventListener('click', function() {
        gameActive = false;
        clearInterval(gameLoop);
        
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        
        scoreScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    });
    
    // زر إطلاق النار
    shootBtn.addEventListener('click', function() {
        if (!gameActive) return;
        
        // تشغيل صوت إطلاق النار
        shootSound.currentTime = 0;
        shootSound.play().catch(e => console.log("لم يتم تشغيل الصوت:", e));
        
        // تقليل الذخيرة
        if (playerWeapons.primary.ammo > 0) {
            playerWeapons.primary.ammo--;
            primaryAmmo.textContent = `${playerWeapons.primary.ammo}/${playerWeapons.primary.maxAmmo}`;
            
            // تحقق من إصابة الأعداء
            const bulletRange = 300;
            const bulletEndX = playerPosition.x + Math.cos(playerAngle) * bulletRange;
            const bulletEndY = playerPosition.y + Math.sin(playerAngle) * bulletRange;
            
            // رسم مسار الرصاصة
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(playerPosition.x, playerPosition.y);
            ctx.lineTo(bulletEndX, bulletEndY);
            ctx.stroke();
            
            // تحقق من إصابة الأعداء
            enemies.forEach(enemy => {
                if (enemy.active) {
                    // حساب المسافة بين الخط والنقطة (العدو)
                    const distance = pointToLineDistance(
                        enemy.x, enemy.y,
                        playerPosition.x, playerPosition.y,
                        bulletEndX, bulletEndY
                    );
                    
                    if (distance < 20) {
                        enemy.health -= 25;
                        
                        if (enemy.health <= 0) {
                            enemy.active = false;
                            players--;
                            playersCount.textContent = players;
                            
                            // تحقق إذا فاز اللاعب
                            if (players === 0) {
                                endGame();
                            }
                        }
                    }
                }
            });
        } else {
            // الذخيرة نفذت
            alert('انتهت الذخيرة! اضغط على زر إعادة التحميل.');
        }
    });
    
    // دالة حساب المسافة بين النقطة والخط
    function pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // زر إعادة التحميل
    reloadBtn.addEventListener('click', function() {
        if (!gameActive) return;
        
        if (playerWeapons.primary.ammo < 30 && playerWeapons.primary.maxAmmo > 0) {
            const needed = 30 - playerWeapons.primary.ammo;
            const available = Math.min(needed, playerWeapons.primary.maxAmmo);
            
            playerWeapons.primary.ammo += available;
            playerWeapons.primary.maxAmmo -= available;
            
            primaryAmmo.textContent = `${playerWeapons.primary.ammo}/${playerWeapons.primary.maxAmmo}`;
            
            // عرض رسالة إعادة التحميل
            const reloadMsg = document.createElement('div');
            reloadMsg.textContent = 'تم إعادة التحميل!';
            reloadMsg.style.position = 'absolute';
            reloadMsg.style.top = '50%';
            reloadMsg.style.left = '50%';
            reloadMsg.style.transform = 'translate(-50%, -50%)';
            reloadMsg.style.color = '#2ecc71';
            reloadMsg.style.fontSize = '24px';
            reloadMsg.style.fontWeight = 'bold';
            reloadMsg.style.zIndex = '1000';
            reloadMsg.style.pointerEvents = 'none';
            
            document.querySelector('.game-area').appendChild(reloadMsg);
            
            setTimeout(() => {
                reloadMsg.remove();
            }, 1000);
        }
    });
    
    // زر القفز
    jumpBtn.addEventListener('click', function() {
        // تأثير القفز
        playerPosition.y -= 50;
        
        setTimeout(() => {
            playerPosition.y += 50;
        }, 300);
    });
    
    // زر الانبطاح
    crouchBtn.addEventListener('click', function() {
        // تأثير الانبطاح
        const playerAvatar = document.querySelector('.player-avatar');
        playerAvatar.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            playerAvatar.style.transform = 'scale(1)';
        }, 500);
    });
    
    // إعدادات النوافذ المنبثقة
    settingsBtn.addEventListener('click', function() {
        settingsModal.classList.remove('hidden');
    });
    
    howToPlayBtn.addEventListener('click', function() {
        howToPlayModal.classList.remove('hidden');
    });
    
    closeSettingsBtn.addEventListener('click', function() {
        settingsModal.classList.add('hidden');
    });
    
    closeInstructionsBtn.addEventListener('click', function() {
        howToPlayModal.classList.add('hidden');
    });
    
    saveSettingsBtn.addEventListener('click', function() {
        // حفظ الإعدادات
        const musicVolume = document.getElementById('music-volume').value;
        const sfxVolume = document.getElementById('sfx-volume').value;
        
        backgroundMusic.volume = musicVolume / 100;
        shootSound.volume = sfxVolume / 100;
        
        // عرض رسالة التأكيد
        alert('تم حفظ الإعدادات!');
        settingsModal.classList.add('hidden');
    });
    
    // إغلاق النوافذ المنبثقة بالنقر خارجها
    window.addEventListener('click', function(e) {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
        if (e.target === howToPlayModal) {
            howToPlayModal.classList.add('hidden');
        }
    });
    
    // إعادة ضبط حجم الكانفاس عند تغيير حجم النافذة
    window.addEventListener('resize', setupCanvas);
    
    // بدء التهيئة
    setupCanvas();
    generateMap();
    drawGame();
    
    // عرض رسالة ترحيبية
    setTimeout(() => {
        console.log("لعبة GROS جاهزة للعب! تم التطوير باستخدام HTML, CSS, JavaScript.");
        console.log("تحكم باستخدام WASD للحركة، والماوس للتوجيه.");
    }, 1000);
});

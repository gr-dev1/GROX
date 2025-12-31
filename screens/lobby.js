// ============= LOBBY SYSTEM =============
class LobbyManager {
    constructor(gameManager) {
        this.game = gameManager;
        this.players = new Map();
        this.maxPlayers = 20;
        this.countdown = null;
        this.countdownTime = 15;
        this.readyPlayers = 0;
        
        // إعدادات اللوبي
        this.settings = {
            map: 'island',
            difficulty: 'medium',
            gameMode: 'solo',
            maxBots: 19
        };
        
        this.init();
    }
    
    init() {
        // إضافة اللاعب الرئيسي
        this.addPlayer('player_1', 'اللاعب', true);
        
        // إضافة البوتات
        for (let i = 1; i <= this.settings.maxBots; i++) {
            this.addPlayer(`bot_${i}`, `بوت ${i}`, false, true);
        }
        
        // إعداد الأحداث
        this.setupEvents();
        
        // تحديث العرض
        this.updateDisplay();
    }
    
    // إضافة لاعب
    addPlayer(id, name, isHuman = false, isBot = false) {
        const player = {
            id,
            name,
            isHuman,
            isBot,
            ready: false,
            connected: true,
            ping: Math.floor(Math.random() * 50) + 10,
            avatar: this.generateAvatar(name),
            team: null
        };
        
        this.players.set(id, player);
        
        if (isHuman) {
            this.game.state.player.id = id;
            this.game.state.player.name = name;
        }
        
        return player;
    }
    
    // توليد صورة رمزية
    generateAvatar(name) {
        const colors = [
            '#4169E1', '#FF4655', '#00FF88', '#FFCC00',
            '#4DCCFF', '#9933FF', '#FF6B81', '#3A7C3E'
        ];
        
        const color = colors[name.length % colors.length];
        const initials = name.substring(0, 2).toUpperCase();
        
        return { color, initials };
    }
    
    // إعداد الأحداث
    setupEvents() {
        // زر الجاهزية
        document.getElementById('ready-btn').addEventListener('click', () => {
            this.setPlayerReady();
        });
        
        // زر بدء اللعبة
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        // زر التدريب
        document.getElementById('practice-btn').addEventListener('click', () => {
            this.startPractice();
        });
        
        // زر الإعدادات
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });
        
        // اختيار الخريطة
        document.querySelectorAll('.map-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectMap(option.dataset.map);
            });
        });
        
        // اختيار الصعوبة
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectDifficulty(btn.dataset.diff);
            });
        });
        
        // تحديث البنغ
        this.updatePing();
    }
    
    // جعل اللاعب جاهزاً
    setPlayerReady() {
        const player = this.players.get('player_1');
        
        if (!player) return;
        
        player.ready = !player.ready;
        this.game.state.playerReady = player.ready;
        
        // تحديث العداد
        this.readyPlayers = player.ready ? 1 : 0;
        
        // تحديث الزر
        const readyBtn = document.getElementById('ready-btn');
        const icon = readyBtn.querySelector('i');
        const text = readyBtn.querySelector('span');
        
        if (player.ready) {
            icon.className = 'fas fa-hourglass-half';
            text.textContent = 'انتظر...';
            readyBtn.classList.add('active');
        } else {
            icon.className = 'fas fa-check-circle';
            text.textContent = 'جاهز للقتال!';
            readyBtn.classList.remove('active');
        }
        
        // تحديث زر البدء
        this.updateStartButton();
        
        // تحديث العرض
        this.updateDisplay();
        
        // إذا كان جاهزاً، بدء المؤقت
        if (player.ready) {
            this.startCountdown();
        } else {
            this.stopCountdown();
        }
    }
    
    // بدء المؤقت
    startCountdown() {
        if (this.countdown) return;
        
        this.countdownTime = 15;
        
        // إظهار قسم المؤقت
        const countdownSection = document.getElementById('countdown-section');
        countdownSection.style.display = 'block';
        
        // تحديث العداد
        this.updateCountdownDisplay();
        
        this.countdown = setInterval(() => {
            this.countdownTime--;
            this.updateCountdownDisplay();
            
            if (this.countdownTime <= 0) {
                this.stopCountdown();
                this.startGame();
            }
        }, 1000);
    }
    
    // تحديث عرض المؤقت
    updateCountdownDisplay() {
        const timer = document.getElementById('countdown-timer');
        const bar = document.getElementById('countdown-bar');
        
        if (timer) timer.textContent = this.countdownTime;
        if (bar) bar.style.width = `${((15 - this.countdownTime) / 15) * 100}%`;
        
        // تحديث زر البدء
        const startBtn = document.getElementById('start-game-btn');
        const startText = startBtn.querySelector('span');
        startText.textContent = `بدء المعركة (${this.readyPlayers}/${this.maxPlayers})`;
    }
    
    // إيقاف المؤقت
    stopCountdown() {
        if (this.countdown) {
            clearInterval(this.countdown);
            this.countdown = null;
        }
        
        // إخفاء قسم المؤقت
        const countdownSection = document.getElementById('countdown-section');
        countdownSection.style.display = 'none';
    }
    
    // تحديث زر البدء
    updateStartButton() {
        const startBtn = document.getElementById('start-game-btn');
        const startText = startBtn.querySelector('span');
        
        startText.textContent = `بدء المعركة (${this.readyPlayers}/${this.maxPlayers})`;
        
        if (this.readyPlayers > 0) {
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
        }
    }
    
    // بدء اللعبة
    startGame() {
        console.log('🚀 بدء اللعبة من اللوبي...');
        
        // إيقاف المؤقت
        this.stopCountdown();
        
        // جعل جميع البوتات جاهزة
        this.players.forEach(player => {
            if (player.isBot) {
                player.ready = true;
            }
        });
        
        // الانتقال لشاشة الطائرة
        this.game.transitionToPlane();
        
        // تحديث الإحصائيات
        this.updateServerInfo();
    }
    
    // بدء وضع التدريب
    startPractice() {
        console.log('🎯 بدء وضع التدريب...');
        
        // تغيير الإعدادات
        this.settings.difficulty = 'easy';
        this.settings.maxBots = 5;
        this.settings.gameMode = 'practice';
        
        // تحديث العرض
        this.updateDisplay();
        
        // بدء اللعبة مباشرة
        setTimeout(() => {
            this.startGame();
        }, 1000);
    }
    
    // فتح الإعدادات
    openSettings() {
        console.log('⚙️ فتح الإعدادات...');
        
        // يمكن فتح نافذة إعدادات هنا
        alert('الإعدادات - قريباً في التحديثات القادمة!');
    }
    
    // اختيار الخريطة
    selectMap(mapId) {
        this.settings.map = mapId;
        
        // تحديث الأزرار
        document.querySelectorAll('.map-option').forEach(option => {
            option.classList.remove('active');
        });
        
        document.querySelector(`[data-map="${mapId}"]`).classList.add('active');
        
        console.log(`🗺️ الخريطة المختارة: ${mapId}`);
    }
    
    // اختيار الصعوبة
    selectDifficulty(diff) {
        this.settings.difficulty = diff;
        
        // تحديث عدد البوتات حسب الصعوبة
        switch(diff) {
            case 'easy':
                this.settings.maxBots = 15;
                break;
            case 'medium':
                this.settings.maxBots = 19;
                break;
            case 'hard':
                this.settings.maxBots = 19;
                break;
        }
        
        // تحديث الأزرار
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-diff="${diff}"]`).classList.add('active');
        
        console.log(`🎯 الصعوبة المختارة: ${diff}`);
        
        // تحديث العرض
        this.updateDisplay();
    }
    
    // تحديث العرض
    updateDisplay() {
        this.updatePlayersList();
        this.updateServerInfo();
    }
    
    // تحديث قائمة اللاعبين
    updatePlayersList() {
        const playersGrid = document.getElementById('players-grid');
        playersGrid.innerHTML = '';
        
        this.players.forEach(player => {
            const playerCard = this.createPlayerCard(player);
            playersGrid.appendChild(playerCard);
        });
        
        // تحديث العداد
        const readyCount = document.getElementById('players-ready');
        if (readyCount) {
            readyCount.textContent = this.readyPlayers;
        }
    }
    
    // إنشاء بطاقة لاعب
    createPlayerCard(player) {
        const card = document.createElement('div');
        card.className = 'player-card';
        
        if (player.isBot) card.classList.add('bot');
        if (player.ready) card.classList.add('ready');
        
        card.innerHTML = `
            <div class="player-avatar" style="background: ${player.avatar.color}">
                ${player.avatar.initials}
            </div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-status ${player.ready ? 'ready' : ''}">
                    ${player.isBot ? 'بوت' : player.isHuman ? (player.ready ? 'جاهز' : 'في الانتظار') : '...'}
                </div>
            </div>
            ${!player.isBot ? `<div class="player-ping">${player.ping}ms</div>` : ''}
        `;
        
        return card;
    }
    
    // تحديث معلومات السيرفر
    updateServerInfo() {
        const pingValue = document.getElementById('ping-value');
        if (pingValue) {
            const player = this.players.get('player_1');
            pingValue.textContent = `${player ? player.ping : 15}ms`;
        }
    }
    
    // تحديث البنغ
    updatePing() {
        setInterval(() => {
            this.players.forEach(player => {
                if (!player.isBot) {
                    // محاكاة تغير البنغ
                    player.ping = Math.max(10, Math.min(100, player.ping + (Math.random() - 0.5) * 10));
                }
            });
            
            this.updateServerInfo();
        }, 3000);
    }
    
    // الحصول على إعدادات اللعبة
    getGameSettings() {
        return {
            ...this.settings,
            playerCount: this.players.size,
            botCount: Array.from(this.players.values()).filter(p => p.isBot).length,
            humanCount: Array.from(this.players.values()).filter(p => p.isHuman).length
        };
    }
    
    // الانتقال لشاشة الطائرة
    transitionToPlane() {
        // يتم استدعاء هذه الوظيفة من gameManager
        this.game.state.inLobby = false;
        this.game.state.inPlane = true;
    }
    
    // إعادة تعيين اللوبي
    reset() {
        this.players.clear();
        this.readyPlayers = 0;
        this.stopCountdown();
        this.init();
    }
}

// ============= EXPORT =============
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LobbyManager;
}

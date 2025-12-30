// ============= GAME CONFIGURATION =============
const CONFIG = {
    // إعدادات النظام
    DEBUG: false,
    VERSION: '1.0.0',
    
    // إعدادات اللعبة
    MAP_SIZE: 2000,
    MAX_PLAYERS: 20,
    BOT_COUNT: 19,
    GAME_DURATION: 300, // 5 دقائق
    ZONE_SHRINK_INTERVAL: 120, // كل دقيقتين
    ZONE_DAMAGE_PER_SECOND: 5,
    PLAYER_HEALTH: 100,
    PLAYER_ARMOR: 100,
    
    // إعدادات الأداء
    FPS: 60,
    MAX_OBJECTS: 1000,
    SHADOW_QUALITY: isMobile ? 1024 : 2048,
    
    // إعدادات الفيزياء
    GRAVITY: -9.82,
    PHYSICS_STEPS: 3,
    
    // إعدادات الصوت
    SOUND_ENABLED: true,
    MUSIC_VOLUME: 0.3,
    SFX_VOLUME: 0.5
};

// ============= GLOBAL STATE =============
class GameState {
    constructor() {
        this.currentScreen = 'loading';
        this.gameStarted = false;
        this.gameEnded = false;
        this.gamePaused = false;
        this.inLobby = true;
        this.inPlane = false;
        this.parachuting = false;
        this.playerReady = false;
        this.countdownActive = false;
        this.countdownTime = 15;
        
        // إحصائيات اللاعب
        this.playerStats = {
            kills: 0,
            damageDealt: 0,
            damageTaken: 0,
            distanceTraveled: 0,
            survivalTime: 0,
            lootCollected: 0,
            headshots: 0,
            rank: 20
        };
        
        // حالة المنطقة الآمنة
        this.safeZone = {
            center: { x: 0, z: 0 },
            radius: CONFIG.MAP_SIZE / 2,
            nextShrinkTime: CONFIG.ZONE_SHRINK_INTERVAL,
            currentStage: 1,
            totalStages: 5
        };
        
        // قائمة اللاعبين
        this.players = new Map();
        this.bots = new Map();
        this.aliveCount = CONFIG.MAX_PLAYERS;
        
        // توقيت اللعبة
        this.gameTime = 0;
        this.startTime = 0;
        
        // حالة اللاعب
        this.player = {
            id: 'player_1',
            name: 'اللاعب',
            health: CONFIG.PLAYER_HEALTH,
            armor: 0,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            isAlive: true,
            isMoving: false,
            isRunning: false,
            isCrouching: false,
            isAiming: false,
            currentWeapon: 0,
            weapons: [],
            inventory: [],
            team: null
        };
        
        // إعدادات التحكم
        this.controls = {
            // لوحة المفاتيح
            keys: {
                w: false, a: false, s: false, d: false,
                shift: false, space: false, ctrl: false,
                e: false, r: false, q: false, f: false,
                '1': false, '2': false, '3': false, '4': false
            },
            
            // الماوس
            mouse: {
                x: 0,
                y: 0,
                deltaX: 0,
                deltaY: 0,
                sensitivity: isMobile ? 0.001 : 0.002,
                locked: false
            },
            
            // اللمس (للهاتف)
            touch: {
                joystick: { active: false, x: 0, y: 0, radius: 50 },
                buttons: new Map()
            }
        };
        
        // الأصوات
        this.sounds = new Map();
        
        // تأثيرات
        this.effects = [];
        
        // الغنائم
        this.lootItems = [];
        
        // نظام المهام
        this.quests = [];
        
        // إحصائيات الأداء
        this.performance = {
            fps: 0,
            frameCount: 0,
            lastTime: 0,
            renderTime: 0,
            physicsTime: 0,
            updateTime: 0
        };
    }
}

// ============= GAME MANAGER =============
class GameManager {
    constructor() {
        this.state = new GameState();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.clock = new THREE.Clock();
        
        // الأنظمة
        this.botManager = null;
        this.weaponSystem = null;
        this.lobbyManager = null;
        this.mobileControls = null;
        this.miniMap = null;
        
        // العناصر
        this.playerMesh = null;
        this.playerBody = null;
        this.map = null;
        this.skybox = null;
        
        // الاشتراكات
        this.listeners = new Map();
        
        // التهيئة
        this.init();
    }
    
    // التهيئة الأساسية
    async init() {
        try {
            // تهيئة Three.js
            this.initThreeJS();
            
            // تهيئة الفيزياء
            this.initPhysics();
            
            // تهيئة الأصوات
            this.initSounds();
            
            // إنشاء الخريطة
            await this.createMap();
            
            // إنشاء السماء
            this.createSkybox();
            
            // إنشاء اللاعب
            this.createPlayer();
            
            // تهيئة الأنظمة
            this.initSystems();
            
            // تهيئة واجهة المستخدم
            this.initUI();
            
            // بدء الحلقات
            this.startLoops();
            
            // الانتقال للوبي
            this.transitionToLobby();
            
            console.log('✅ اللعبة جاهزة للعب!');
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة اللعبة:', error);
            this.showError('فشل تحميل اللعبة. يرجى تحديث الصفحة.');
        }
    }
    
    // تهيئة Three.js
    initThreeJS() {
        // المشهد
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 2000);
        
        // الكاميرا
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            5000
        );
        
        // الرندر
        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: !isMobile,
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
            depth: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // الإضاءة
        this.setupLighting();
        
        // أحداث النافذة
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('orientationchange', () => this.onResize());
        
        // كشف الجهاز
        if (isMobile) {
            this.enableMobileOptimizations();
        }
    }
    
    // تحسينات الهاتف
    enableMobileOptimizations() {
        // تقليل الجودة للأداء
        this.renderer.setPixelRatio(1);
        CONFIG.SHADOW_QUALITY = 512;
        
        // تقليل عدد المضلعات
        CONFIG.MAX_OBJECTS = 500;
        
        // ضبط حساسية أقل
        this.state.controls.mouse.sensitivity = 0.001;
        
        // إظهار عناصر التحكم للهاتف
        document.querySelectorAll('.mobile-controls').forEach(el => {
            el.style.display = 'block';
        });
    }
    
    // تهيئة الفيزياء
    initPhysics() {
        this.world = new CANNON.World();
        this.world.gravity = new CANNON.Vec3(0, CONFIG.GRAVITY, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.3;
        
        // مادة الأرض
        const groundMaterial = new CANNON.Material('ground');
        const playerMaterial = new CANNON.Material('player');
        
        const groundPlayerContact = new CANNON.ContactMaterial(
            groundMaterial,
            playerMaterial,
            { friction: 0.5, restitution: 0.1 }
        );
        
        this.world.addContactMaterial(groundPlayerContact);
    }
    
    // تهيئة الأصوات
    initSounds() {
        if (!CONFIG.SOUND_ENABLED) return;
        
        // أصوات الأسلحة
        const sounds = {
            shot: 'https://assets.mixkit.co/sfx/preview/mixkit-gun-pistol-shot-1669.mp3',
            reload: 'https://assets.mixkit.co/sfx/preview/mixkit-gun-reload-276.mp3',
            empty: 'https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3',
            hit: 'https://assets.mixkit.co/sfx/preview/mixkit-arrow-whoosh-1491.mp3',
            death: 'https://assets.mixkit.co/sfx/preview/mixkit-player-losing-or-failing-2042.mp3',
            zone: 'https://assets.mixkit.co/sfx/preview/mixkit-warning-alarm-buzzer-951.mp3',
            loot: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
            jump: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-small-sweep-transition-166.mp3'
        };
        
        Object.entries(sounds).forEach(([key, url]) => {
            const sound = new Howl({
                src: [url],
                volume: CONFIG.SFX_VOLUME,
                preload: true,
                pool: 5
            });
            this.sounds.set(key, sound);
        });
    }
    
    // إعداد الإضاءة
    setupLighting() {
        // ضوء الشمس
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(100, 200, 100);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -200;
        sunLight.shadow.camera.right = 200;
        sunLight.shadow.camera.top = 200;
        sunLight.shadow.camera.bottom = -200;
        sunLight.shadow.mapSize.width = CONFIG.SHADOW_QUALITY;
        sunLight.shadow.mapSize.height = CONFIG.SHADOW_QUALITY;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 1000;
        sunLight.shadow.bias = -0.0001;
        this.scene.add(sunLight);
        
        // ضوء بيئي
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // ضوء سماوي
        const hemisphereLight = new THREE.HemisphereLight(
            0x87CEEB,
            0x3a7c3e,
            0.4
        );
        this.scene.add(hemisphereLight);
    }
    
    // إنشاء الخريطة
    async createMap() {
        console.log('🗺️ جاري إنشاء الخريطة...');
        
        // الأرض
        const groundGeometry = new THREE.PlaneGeometry(
            CONFIG.MAP_SIZE,
            CONFIG.MAP_SIZE,
            100,
            100
        );
        
        // تحسين الأرض للهاتف
        if (isMobile) {
            groundGeometry.attributes.position.count = 2500; // تقليل المضلعات
        }
        
        // نسيج الأرض
        const groundTexture = this.createProceduralTexture(2048, 0x3a7c3e, 0x2a6c2e);
        const groundMaterial = new THREE.MeshLambertMaterial({
            map: groundTexture,
            side: THREE.DoubleSide
        });
        
        this.map = new THREE.Mesh(groundGeometry, groundMaterial);
        this.map.rotation.x = -Math.PI / 2;
        this.map.receiveShadow = true;
        this.scene.add(this.map);
        
        // فيزياء الأرض
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0),
            -Math.PI / 2
        );
        this.world.addBody(groundBody);
        
        // الحدود
        this.createBoundaries();
        
        // المباني
        await this.generateBuildings();
        
        // الأشجار والغطاء النباتي
        this.generateVegetation();
        
        // الغنائم الأولية
        this.spawnInitialLoot();
        
        console.log('✅ الخريطة تم إنشاؤها بنجاح');
    }
    
    // إنشاء نسيج إجرائي
    createProceduralTexture(size, color1, color2) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // تدرج لوني
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, `#${color1.toString(16)}`);
        gradient.addColorStop(1, `#${color2.toString(16)}`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // إضافة تفاصيل (عشب)
        ctx.fillStyle = `#${(color1 - 0x101010).toString(16)}`;
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 3 + 1;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        
        return texture;
    }
    
    // إنشاء الحدود
    createBoundaries() {
        const wallHeight = 50;
        const wallThickness = 20;
        const halfSize = CONFIG.MAP_SIZE / 2;
        
        // الجدران الأربعة
        const walls = [
            { pos: [0, wallHeight/2, -halfSize], size: [CONFIG.MAP_SIZE, wallHeight, wallThickness] },
            { pos: [0, wallHeight/2, halfSize], size: [CONFIG.MAP_SIZE, wallHeight, wallThickness] },
            { pos: [-halfSize, wallHeight/2, 0], size: [wallThickness, wallHeight, CONFIG.MAP_SIZE] },
            { pos: [halfSize, wallHeight/2, 0], size: [wallThickness, wallHeight, CONFIG.MAP_SIZE] }
        ];
        
        walls.forEach((wall, index) => {
            // النموذج المرئي
            const geometry = new THREE.BoxGeometry(...wall.size);
            const material = new THREE.MeshLambertMaterial({
                color: 0x666666,
                transparent: true,
                opacity: 0.8
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(...wall.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            
            // الفيزياء
            const shape = new CANNON.Box(new CANNON.Vec3(
                wall.size[0] / 2,
                wall.size[1] / 2,
                wall.size[2] / 2
            ));
            
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(shape);
            body.position.copy(mesh.position);
            this.world.addBody(body);
        });
        
        // علامات التحذير
        this.createWarningSigns();
    }
    
    // إنشاء لافتات تحذير
    createWarningSigns() {
        const halfSize = CONFIG.MAP_SIZE / 2 - 50;
        const positions = [
            [halfSize, 10, halfSize],
            [-halfSize, 10, halfSize],
            [halfSize, 10, -halfSize],
            [-halfSize, 10, -halfSize]
        ];
        
        positions.forEach(pos => {
            const geometry = new THREE.CylinderGeometry(5, 5, 20, 8);
            const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
            const sign = new THREE.Mesh(geometry, material);
            sign.position.set(...pos);
            this.scene.add(sign);
            
            // ضوء تحذير
            const light = new THREE.PointLight(0xff0000, 1, 100);
            light.position.set(pos[0], pos[1] + 15, pos[2]);
            this.scene.add(light);
        });
    }
    
    // توليد المباني
    async generateBuildings() {
        const buildingCount = isMobile ? 15 : 30;
        
        for (let i = 0; i < buildingCount; i++) {
            const building = await this.createRandomBuilding();
            this.scene.add(building.mesh);
            this.world.addBody(building.body);
            
            // إضافة غنائم داخل المباني
            if (Math.random() > 0.5) {
                this.spawnLootInBuilding(building);
            }
        }
    }
    
    // إنشاء مبنى عشوائي
    async createRandomBuilding() {
        const x = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 200);
        const z = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 200);
        const width = Math.random() * 40 + 20;
        const depth = Math.random() * 40 + 20;
        const height = Math.floor(Math.random() * 3 + 1) * 10;
        
        // النموذج المرئي
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshLambertMaterial({
            color: Math.random() * 0x555555 + 0xaaaaaa,
            transparent: true,
            opacity: 0.9
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, height / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // النوافذ
        this.addWindows(mesh, width, height, depth);
        
        // الفيزياء
        const shape = new CANNON.Box(new CANNON.Vec3(
            width / 2,
            height / 2,
            depth / 2
        ));
        
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.copy(mesh.position);
        
        return { mesh, body, width, height, depth, x, z };
    }
    
    // إضافة نوافذ للمباني
    addWindows(building, width, height, depth) {
        const windowCount = Math.floor(height / 5);
        const windowColor = 0x87CEEB;
        
        for (let i = 1; i < windowCount; i++) {
            const windowHeight = i * 5 - 2.5;
            
            // نوافذ الجانب الأمامي والخلفي
            if (width > 10) {
                const window1 = new THREE.Mesh(
                    new THREE.BoxGeometry(2, 3, 0.1),
                    new THREE.MeshLambertMaterial({ color: windowColor })
                );
                window1.position.set(0, windowHeight, depth / 2 + 0.1);
                building.add(window1);
                
                const window2 = new THREE.Mesh(
                    new THREE.BoxGeometry(2, 3, 0.1),
                    new THREE.MeshLambertMaterial({ color: windowColor })
                );
                window2.position.set(0, windowHeight, -depth / 2 - 0.1);
                building.add(window2);
            }
            
            // نوافذ الجانبين
            if (depth > 10) {
                const window3 = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 3, 2),
                    new THREE.MeshLambertMaterial({ color: windowColor })
                );
                window3.position.set(width / 2 + 0.1, windowHeight, 0);
                building.add(window3);
                
                const window4 = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 3, 2),
                    new THREE.MeshLambertMaterial({ color: windowColor })
                );
                window4.position.set(-width / 2 - 0.1, windowHeight, 0);
                building.add(window4);
            }
        }
    }
    
    // توليد الغطاء النباتي
    generateVegetation() {
        const treeCount = isMobile ? 50 : 100;
        const bushCount = isMobile ? 30 : 60;
        
        // الأشجار
        for (let i = 0; i < treeCount; i++) {
            const tree = this.createTree();
            this.scene.add(tree);
        }
        
        // الشجيرات
        for (let i = 0; i < bushCount; i++) {
            const bush = this.createBush();
            this.scene.add(bush);
        }
        
        // الصخور
        for (let i = 0; i < 20; i++) {
            const rock = this.createRock();
            this.scene.add(rock);
        }
    }
    
    // إنشاء شجرة
    createTree() {
        const x = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 200);
        const z = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 200);
        
        // الجذع
        const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 10, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, 5, z);
        trunk.castShadow = true;
        
        // الأوراق
        const leavesGeometry = new THREE.SphereGeometry(6, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(x, 15, z);
        leaves.castShadow = true;
        
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(leaves);
        
        return tree;
    }
    
    // إنشاء شجيرة
    createBush() {
        const x = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 200);
        const z = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 200);
        
        const geometry = new THREE.SphereGeometry(3, 6, 6);
        const material = new THREE.MeshLambertMaterial({ color: 0x2d5a27 });
        const bush = new THREE.Mesh(geometry, material);
        bush.position.set(x, 3, z);
        bush.castShadow = true;
        
        return bush;
    }
    
    // إنشاء صخرة
    createRock() {
        const x = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 200);
        const z = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 200);
        
        const geometry = new THREE.DodecahedronGeometry(2 + Math.random() * 3, 0);
        const material = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const rock = new THREE.Mesh(geometry, material);
        rock.position.set(x, 2, z);
        rock.castShadow = true;
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        return rock;
    }
    
    // إنشاء السماء
    createSkybox() {
        const skyGeometry = new THREE.SphereGeometry(5000, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide,
            fog: false
        });
        
        this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.skybox);
        
        // السحب
        this.createClouds();
    }
    
    // إنشاء السحب
    createClouds() {
        const cloudCount = isMobile ? 10 : 20;
        
        for (let i = 0; i < cloudCount; i++) {
            const x = (Math.random() - 0.5) * 3000;
            const y = Math.random() * 500 + 500;
            const z = (Math.random() - 0.5) * 3000;
            
            const cloud = this.createCloud();
            cloud.position.set(x, y, z);
            cloud.scale.setScalar(Math.random() * 2 + 1);
            this.scene.add(cloud);
        }
    }
    
    // إنشاء سحابة واحدة
    createCloud() {
        const cloud = new THREE.Group();
        
        const sphereGeometry = new THREE.SphereGeometry(1, 8, 8);
        const cloudMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        // عدة كرات لتكوين شكل السحابة
        for (let i = 0; i < 5; i++) {
            const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);
            sphere.position.set(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 4
            );
            sphere.scale.set(
                Math.random() * 2 + 1,
                Math.random() + 0.5,
                Math.random() * 2 + 1
            );
            cloud.add(sphere);
        }
        
        return cloud;
    }
    
    // إنشاء اللاعب
    createPlayer() {
        console.log('👤 جاري إنشاء اللاعب...');
        
        // نموذج اللاعب
        const geometry = new THREE.BoxGeometry(2, 5, 2);
        const material = new THREE.MeshLambertMaterial({
            color: 0x4169E1,
            transparent: true,
            opacity: 0.9
        });
        
        this.playerMesh = new THREE.Mesh(geometry, material);
        this.playerMesh.position.set(0, 5, 50);
        this.playerMesh.castShadow = true;
        this.scene.add(this.playerMesh);
        
        // فيزياء اللاعب
        const shape = new CANNON.Box(new CANNON.Vec3(1, 2.5, 1));
        this.playerBody = new CANNON.Body({ mass: 70 });
        this.playerBody.addShape(shape);
        this.playerBody.position.copy(this.playerMesh.position);
        this.playerBody.fixedRotation = true;
        this.playerBody.linearDamping = 0.9;
        this.playerBody.angularDamping = 0.9;
        this.world.addBody(this.playerBody);
        
        // تحديث حالة اللاعب
        this.state.player.position = {
            x: this.playerMesh.position.x,
            y: this.playerMesh.position.y,
            z: this.playerMesh.position.z
        };
        
        // إضافة أسلحة ابتدائية
        this.state.player.weapons = [
            { id: 'fists', name: 'القبضات', ammo: Infinity, equipped: true },
            { id: 'pistol', name: 'مسدس', ammo: 12, equipped: false }
        ];
        
        console.log('✅ اللاعب تم إنشاؤه بنجاح');
    }
    
    // تهيئة الأنظمة
    initSystems() {
        // نظام البوتات
        this.botManager = new BotManager(this.scene, this.world, this.state.player);
        this.botManager.createBots();
        
        // نظام الأسلحة
        this.weaponSystem = new WeaponSystem(this.scene, this.camera);
        
        // نظام اللوبي
        this.lobbyManager = new LobbyManager(this);
        
        // نظام تحكم الهاتف
        if (isMobile) {
            this.mobileControls = new MobileControls(this);
        }
        
        // نظام الخريطة المصغرة
        this.miniMap = new MiniMap(this);
        
        // إضافة أحداث التحكم
        this.setupControls();
    }
    
    // تهيئة واجهة المستخدم
    initUI() {
        // تحديث عناصر الواجهة
        this.updateUI();
        
        // إضافة مستمعين للأحداث
        this.setupUIEvents();
    }
    
    // إعداد أحداث التحكم
    setupControls() {
        // لوحة المفاتيح
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // الماوس
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // اللمس
        document.addEventListener('touchstart', (e) => this.onTouchStart(e));
        document.addEventListener('touchmove', (e) => this.onTouchMove(e));
        document.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // منع السياق لمنع قائمة المتصفح
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // طلب مؤشر الماوس
        if (!isMobile) {
            document.getElementById('game-canvas').addEventListener('click', () => {
                this.lockPointer();
            });
        }
    }
    
    // قفل المؤشر للعب
    lockPointer() {
        if (!this.state.controls.mouse.locked) {
            const canvas = document.getElementById('game-canvas');
            canvas.requestPointerLock();
            this.state.controls.mouse.locked = true;
        }
    }
    
    // تحديث واجهة المستخدم
    updateUI() {
        // تحديث الصحة والدرع
        document.getElementById('health-text').textContent = Math.floor(this.state.player.health);
        document.getElementById('health-fill').style.width = `${(this.state.player.health / CONFIG.PLAYER_HEALTH) * 100}%`;
        
        document.getElementById('armor-text').textContent = Math.floor(this.state.player.armor);
        document.getElementById('armor-fill').style.width = `${(this.state.player.armor / CONFIG.PLAYER_ARMOR) * 100}%`;
        
        // تحديث الذخيرة
        const currentWeapon = this.state.player.weapons[this.state.player.currentWeapon];
        if (currentWeapon) {
            document.getElementById('weapon-name').textContent = currentWeapon.name;
            document.getElementById('ammo-count').textContent = 
                `${currentWeapon.ammo === Infinity ? '∞' : currentWeapon.ammo}/${currentWeapon.ammo === Infinity ? '∞' : currentWeapon.maxAmmo || 0}`;
        }
        
        // تحديث عدد اللاعبين
        document.getElementById('ui-players-left').textContent = this.state.aliveCount;
        document.getElementById('ui-rank').textContent = `#${this.state.playerStats.rank}`;
        document.getElementById('ui-kills').textContent = this.state.playerStats.kills;
        
        // تحديث التوقيت
        const gameTime = Math.max(0, CONFIG.GAME_DURATION - this.state.gameTime);
        const minutes = Math.floor(gameTime / 60);
        const seconds = Math.floor(gameTime % 60);
        document.getElementById('ui-game-timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // تحديث المنطقة الآمنة
        const zoneTime = Math.floor(this.state.safeZone.nextShrinkTime);
        const zoneMinutes = Math.floor(zoneTime / 60);
        const zoneSeconds = Math.floor(zoneTime % 60);
        document.getElementById('ui-zone-timer').textContent = 
            `${zoneMinutes.toString().padStart(2, '0')}:${zoneSeconds.toString().padStart(2, '0')}`;
        
        // تحديث المسافة للمنطقة
        const playerPos = this.state.player.position;
        const zoneCenter = this.state.safeZone.center;
        const distance = Math.sqrt(
            Math.pow(playerPos.x - zoneCenter.x, 2) +
            Math.pow(playerPos.z - zoneCenter.z, 2)
        );
        const zoneDistance = Math.max(0, distance - this.state.safeZone.radius);
        document.getElementById('zone-distance').textContent = `${Math.floor(zoneDistance)}m`;
        
        // تحديث مؤقت المنطقة القادمة
        document.getElementById('zone-next-timer').textContent = 
            `${zoneMinutes.toString().padStart(2, '0')}:${zoneSeconds.toString().padStart(2, '0')}`;
    }
    
    // إعداد أحداث الواجهة
    setupUIEvents() {
        // زر الجاهزية
        document.getElementById('ready-btn').addEventListener('click', () => {
            this.lobbyManager.setPlayerReady();
        });
        
        // زر بدء اللعبة
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.lobbyManager.startGame();
        });
        
        // زر القفز التلقائي
        document.getElementById('auto-jump-btn').addEventListener('click', () => {
            this.startParachuting(true);
        });
        
        // زر القفز اليدوي
        document.getElementById('manual-jump-btn').addEventListener('click', () => {
            this.startParachuting(false);
        });
        
        // زر إعادة اللعب
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.restartGame();
        });
        
        // زر العودة للوبي
        document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
            this.transitionToLobby();
        });
        
        // زر مشاركة النتائج
        document.getElementById('share-results-btn').addEventListener('click', () => {
            this.shareResults();
        });
        
        // زر القائمة
        document.getElementById('game-menu-btn').addEventListener('click', () => {
            this.toggleMenu();
        });
        
        // زر متابعة اللعب
        document.getElementById('continue-btn').addEventListener('click', () => {
            this.toggleMenu();
        });
        
        // زر إعادة بدء
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });
        
        // زر مغادرة اللعبة
        document.getElementById('quit-btn').addEventListener('click', () => {
            this.quitGame();
        });
        
        // أزرار تبديل السلاح
        document.querySelectorAll('.weapon-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const weaponIndex = parseInt(e.target.dataset.weapon) - 1;
                this.switchWeapon(weaponIndex);
            });
        });
        
        // أزرار التحكم للهاتف
        if (isMobile) {
            document.getElementById('mobile-fire').addEventListener('touchstart', () => {
                this.weaponSystem.fire();
            });
            
            document.getElementById('mobile-aim').addEventListener('touchstart', () => {
                this.state.player.isAiming = true;
            });
            
            document.getElementById('mobile-aim').addEventListener('touchend', () => {
                this.state.player.isAiming = false;
            });
            
            document.getElementById('mobile-reload').addEventListener('touchstart', () => {
                this.reloadWeapon();
            });
            
            document.getElementById('mobile-jump').addEventListener('touchstart', () => {
                this.jump();
            });
            
            document.getElementById('mobile-crouch').addEventListener('touchstart', () => {
                this.crouch();
            });
        }
    }
    
    // ============= التحكم في اللعبة =============
    
    // عند الضغط على مفتاح
    onKeyDown(event) {
        const key = event.key.toLowerCase();
        
        if (this.state.controls.keys.hasOwnProperty(key)) {
            this.state.controls.keys[key] = true;
            event.preventDefault();
        }
        
        // إطلاق النار (مسافة)
        if (key === ' ' && this.state.gameStarted && !this.state.gamePaused) {
            this.weaponSystem.fire();
            event.preventDefault();
        }
        
        // إعادة تعبئة (R)
        if (key === 'r' && this.state.gameStarted) {
            this.reloadWeapon();
            event.preventDefault();
        }
        
        // التربع (Ctrl)
        if (key === 'control') {
            this.crouch();
            event.preventDefault();
        }
        
        // الجري (Shift)
        if (key === 'shift') {
            this.state.player.isRunning = true;
            event.preventDefault();
        }
        
        // التصويب (زر الماوس الأيمن - محاكاة بـ Alt)
        if (key === 'alt') {
            this.state.player.isAiming = true;
            event.preventDefault();
        }
        
        // التبديل بين الأسلحة (1-4)
        if (key >= '1' && key <= '4') {
            const weaponIndex = parseInt(key) - 1;
            this.switchWeapon(weaponIndex);
            event.preventDefault();
        }
        
        // القفز (مسافة - للقفز بالمظلة)
        if (key === ' ' && this.state.inPlane) {
            this.startParachuting(false);
            event.preventDefault();
        }
        
        // فتح/إغلاق القائمة (Esc)
        if (key === 'escape') {
            this.toggleMenu();
            event.preventDefault();
        }
    }
    
    // عند رفع المفتاح
    onKeyUp(event) {
        const key = event.key.toLowerCase();
        
        if (this.state.controls.keys.hasOwnProperty(key)) {
            this.state.controls.keys[key] = false;
        }
        
        // التوقف عن الجري
        if (key === 'shift') {
            this.state.player.isRunning = false;
        }
        
        // التوقف عن التصويب
        if (key === 'alt') {
            this.state.player.isAiming = false;
        }
        
        // التوقف عن التربع
        if (key === 'control') {
            this.state.player.isCrouching = false;
            this.playerMesh.scale.y = 1;
        }
    }
    
    // عند الضغط على الماوس
    onMouseDown(event) {
        if (!this.state.gameStarted || this.state.gamePaused) return;
        
        // زر الماوس الأيسر - إطلاق النار
        if (event.button === 0) {
            this.weaponSystem.fire();
        }
        
        // زر الماوس الأيمن - التصويب
        if (event.button === 2) {
            this.state.player.isAiming = true;
        }
    }
    
    // عند رفع الماوس
    onMouseUp(event) {
        // زر الماوس الأيمن - إيقاف التصويب
        if (event.button === 2) {
            this.state.player.isAiming = false;
        }
    }
    
    // عند حركة الماوس
    onMouseMove(event) {
        if (!this.state.controls.mouse.locked || this.state.gamePaused) return;
        
        this.state.controls.mouse.deltaX = event.movementX;
        this.state.controls.mouse.deltaY = event.movementY;
    }
    
    // عند اللمس (الهاتف)
    onTouchStart(event) {
        event.preventDefault();
        
        const touches = event.touches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // التحقق من الجويستيك
            const joystickArea = document.getElementById('movement-joystick');
            const rect = joystickArea.getBoundingClientRect();
            
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                this.state.controls.touch.joystick.active = true;
                this.state.controls.touch.joystick.x = x - rect.left - rect.width / 2;
                this.state.controls.touch.joystick.y = y - rect.top - rect.height / 2;
                
                // تحديث موقع الجويستيك
                const thumb = document.getElementById('joystick-thumb');
                const maxDistance = rect.width / 2 - 30;
                const distance = Math.min(
                    Math.sqrt(
                        Math.pow(this.state.controls.touch.joystick.x, 2) +
                        Math.pow(this.state.controls.touch.joystick.y, 2)
                    ),
                    maxDistance
                );
                
                const angle = Math.atan2(
                    this.state.controls.touch.joystick.y,
                    this.state.controls.touch.joystick.x
                );
                
                thumb.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
            }
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        
        if (this.state.controls.touch.joystick.active) {
            const touch = event.touches[0];
            const joystickArea = document.getElementById('movement-joystick');
            const rect = joystickArea.getBoundingClientRect();
            
            this.state.controls.touch.joystick.x = touch.clientX - rect.left - rect.width / 2;
            this.state.controls.touch.joystick.y = touch.clientY - rect.top - rect.height / 2;
            
            // تحديث موقع الجويستيك
            const thumb = document.getElementById('joystick-thumb');
            const maxDistance = rect.width / 2 - 30;
            const distance = Math.min(
                Math.sqrt(
                    Math.pow(this.state.controls.touch.joystick.x, 2) +
                    Math.pow(this.state.controls.touch.joystick.y, 2)
                ),
                maxDistance
            );
            
            const angle = Math.atan2(
                this.state.controls.touch.joystick.y,
                this.state.controls.touch.joystick.x
            );
            
            thumb.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
        }
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        
        this.state.controls.touch.joystick.active = false;
        
        // إعادة الجويستيك للمركز
        const thumb = document.getElementById('joystick-thumb');
        thumb.style.transform = 'translate(0, 0)';
    }
    
    // ============= حركة اللاعب =============
    
    // تحديث حركة اللاعب
    updatePlayerMovement(deltaTime) {
        if (!this.state.gameStarted || this.state.gamePaused) return;
        
        let moveX = 0;
        let moveZ = 0;
        
        // التحكم بلوحة المفاتيح
        if (this.state.controls.keys.w) moveZ -= 1;
        if (this.state.controls.keys.s) moveZ += 1;
        if (this.state.controls.keys.a) moveX -= 1;
        if (this.state.controls.keys.d) moveX += 1;
        
        // التحكم بالجويستيك (الهاتف)
        if (this.state.controls.touch.joystick.active) {
            const joyX = this.state.controls.touch.joystick.x / 50;
            const joyZ = -this.state.controls.touch.joystick.y / 50;
            
            moveX += joyX;
            moveZ += joyZ;
        }
        
        // تطبيع الحركة
        const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (moveLength > 0) {
            moveX /= moveLength;
            moveZ /= moveLength;
            this.state.player.isMoving = true;
        } else {
            this.state.player.isMoving = false;
        }
        
        // حساب السرعة
        let speed = 0.1;
        if (this.state.player.isRunning) speed *= 2;
        if (this.state.player.isCrouching) speed *= 0.5;
        
        // تطبيق السرعة
        moveX *= speed * deltaTime * 60;
        moveZ *= speed * deltaTime * 60;
        
        // تطبيق الدوران
        const playerRotation = this.playerMesh.rotation.y;
        const rotatedX = moveX * Math.cos(playerRotation) - moveZ * Math.sin(playerRotation);
        const rotatedZ = moveX * Math.sin(playerRotation) + moveZ * Math.cos(playerRotation);
        
        // تحديث موقع اللاعب
        if (this.playerBody) {
            const velocity = this.playerBody.velocity;
            velocity.x = rotatedX * 100;
            velocity.z = rotatedZ * 100;
            
            // تحديث السرعة الرأسية (للقفز)
            if (this.state.controls.keys.space && this.playerBody.velocity.y === 0) {
                velocity.y = 10;
                this.playSound('jump');
            }
        }
        
        // تحديث دوران اللاعب بالمأوس
        if (this.state.controls.mouse.locked) {
            const sensitivity = this.state.controls.mouse.sensitivity;
            this.playerMesh.rotation.y -= this.state.controls.mouse.deltaX * sensitivity;
            this.camera.rotation.y -= this.state.controls.mouse.deltaX * sensitivity;
            
            // تحديث دوران الكاميرا العمودي (مع حدود)
            const verticalRotation = this.camera.rotation.x - this.state.controls.mouse.deltaY * sensitivity;
            this.camera.rotation.x = THREE.MathUtils.clamp(verticalRotation, -Math.PI / 3, Math.PI / 3);
            
            // إعادة تعيين دلتا الماوس
            this.state.controls.mouse.deltaX = 0;
            this.state.controls.mouse.deltaY = 0;
        }
        
        // تحديث موقع الكاميرا
        this.updateCameraPosition();
        
        // تحديث موقع اللاعب في الحالة
        this.state.player.position = {
            x: this.playerMesh.position.x,
            y: this.playerMesh.position.y,
            z: this.playerMesh.position.z
        };
        
        // تحديث المسافة المقطوعة
        if (this.state.player.isMoving) {
            const distance = Math.sqrt(rotatedX * rotatedX + rotatedZ * rotatedZ);
            this.state.playerStats.distanceTraveled += distance;
        }
    }
    
    // تحديث موقع الكاميرا
    updateCameraPosition() {
        if (!this.playerMesh) return;
        
        // مسافة الكاميرا خلف اللاعب
        let cameraDistance = 5;
        
        // تقريب الكاميرا عند التصويب
        if (this.state.player.isAiming) {
            cameraDistance = 2;
        }
        
        // التربع يخفض الكاميرا
        let cameraHeight = 2;
        if (this.state.player.isCrouching) {
            cameraHeight = 1;
        }
        
        // حساب موقع الكاميرا
        const playerPos = this.playerMesh.position;
        const playerRot = this.playerMesh.rotation.y;
        
        const cameraX = playerPos.x - Math.sin(playerRot) * cameraDistance;
        const cameraY = playerPos.y + cameraHeight;
        const cameraZ = playerPos.z - Math.cos(playerRot) * cameraDistance;
        
        // تطبيق الموقع
        this.camera.position.set(cameraX, cameraY, cameraZ);
        
        // توجيه الكاميرا للاعب
        const lookAtX = playerPos.x + Math.sin(playerRot) * 2;
        const lookAtY = playerPos.y + cameraHeight;
        const lookAtZ = playerPos.z + Math.cos(playerRot) * 2;
        
        this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
    }
    
    // القفز
    jump() {
        if (this.playerBody && this.playerBody.velocity.y === 0) {
            this.playerBody.velocity.y = 10;
            this.playSound('jump');
        }
    }
    
    // التربع
    crouch() {
        this.state.player.isCrouching = !this.state.player.isCrouching;
        
        if (this.state.player.isCrouching) {
            this.playerMesh.scale.y = 0.5;
            this.playerMesh.position.y -= 1.25;
        } else {
            this.playerMesh.scale.y = 1;
            this.playerMesh.position.y += 1.25;
        }
    }
    
    // تبديل السلاح
    switchWeapon(index) {
        if (index < 0 || index >= this.state.player.weapons.length) return;
        
        this.state.player.currentWeapon = index;
        
        // تحديث نظام الأسلحة
        this.weaponSystem.switchWeapon(index);
        
        // تحديث الواجهة
        this.updateUI();
        
        // تشغيل صوت تبديل السلاح
        this.playSound('reload');
    }
    
    // إعادة تعبئة السلاح
    reloadWeapon() {
        const weapon = this.state.player.weapons[this.state.player.currentWeapon];
        
        if (weapon && weapon.ammo < (weapon.maxAmmo || Infinity)) {
            weapon.ammo = weapon.maxAmmo || Infinity;
            this.playSound('reload');
            this.updateUI();
            this.showNotification('تم إعادة التعبة', 'loot');
        }
    }
    
    // ============= نظام اللوبي =============
    
    // الانتقال للوبي
    transitionToLobby() {
        this.state.currentScreen = 'lobby';
        this.state.inLobby = true;
        this.state.gameStarted = false;
        
        // إخفاء الشاشات الأخرى
        this.hideAllScreens();
        
        // إظهار شاشة اللوبي
        document.getElementById('lobby-screen').style.display = 'block';
        
        // بدء نظام اللوبي
        this.lobbyManager.start();
        
        // إعادة تعيين اللاعب
        this.resetPlayerPosition();
        
        // تحديث قائمة اللاعبين
        this.updatePlayersList();
    }
    
    // بدء اللعبة
    startGame() {
        console.log('🚀 بدء اللعبة...');
        
        this.state.currentScreen = 'plane';
        this.state.inLobby = false;
        this.state.inPlane = true;
        
        // إخفاء الشاشات الأخرى
        this.hideAllScreens();
        
        // إظهار شاشة الطائرة
        document.getElementById('plane-screen').style.display = 'block';
        
        // بدء مؤتمر القفز
        this.startJumpCountdown();
        
        // تحديث قائمة الركاب
        this.updatePassengersList();
        
        // تشغيل صوت الطائرة
        this.playSound('zone');
    }
    
    // بدء مؤتمر القفز
    startJumpCountdown() {
        let timeLeft = 30;
        const timerElement = document.getElementById('jump-timer');
        const positionElement = document.getElementById('player-position');
        
        const interval = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            // تحديث موقع افتراضي
            const positions = ['الشمال', 'الجنوب', 'الشرق', 'الغرب', 'الوسط'];
            positionElement.textContent = positions[Math.floor(Math.random() * positions.length)];
            
            if (timeLeft <= 0) {
                clearInterval(interval);
                this.startParachuting(true); // قفز تلقائي
            }
        }, 1000);
    }
    
    // بدء القفز بالمظلة
    startParachuting(autoJump = false) {
        console.log('🪂 بدء القفز بالمظلة...');
        
        this.state.inPlane = false;
        this.state.parachuting = true;
        
        // إخفاء شاشة الطائرة
        document.getElementById('plane-screen').style.display = 'none';
        
        // إظهار شاشة اللعبة
        document.getElementById('game-screen').style.display = 'block';
        
        // وضع اللاعب في الهواء
        this.playerMesh.position.set(
            (Math.random() - 0.5) * CONFIG.MAP_SIZE / 2,
            200,
            (Math.random() - 0.5) * CONFIG.MAP_SIZE / 2
        );
        
        this.playerBody.position.copy(this.playerMesh.position);
        
        // بدء اللعبة الفعلية
        setTimeout(() => {
            this.state.parachuting = false;
            this.state.gameStarted = true;
            this.state.startTime = Date.now();
            
            // إسقاط البوتات
            this.botManager.dropBots();
            
            // بدء المؤقت
            this.startGameTimer();
            
            // بدء انكماش المنطقة
            this.startZoneShrink();
            
            // إظهار إشعار
            this.showNotification('حظاً موفقاً!', 'zone');
            
            // قفل المؤشر
            if (!isMobile) {
                this.lockPointer();
            }
        }, 3000); // 3 ثواني للهبوط
    }
    
    // بدء مؤتمر اللعبة
    startGameTimer() {
        this.state.gameTime = 0;
        
        const interval = setInterval(() => {
            if (!this.state.gameStarted || this.state.gameEnded) {
                clearInterval(interval);
                return;
            }
            
            this.state.gameTime++;
            this.state.playerStats.survivalTime = this.state.gameTime;
            
            // التحقق من انتهاء الوقت
            if (this.state.gameTime >= CONFIG.GAME_DURATION) {
                clearInterval(interval);
                this.endGame(false); // انتهاء الوقت
            }
            
            // تحديث الواجهة
            this.updateUI();
            
        }, 1000);
    }
    
    // بدء انكماش المنطقة الآمنة
    startZoneShrink() {
        const shrinkInterval = setInterval(() => {
            if (!this.state.gameStarted || this.state.gameEnded) {
                clearInterval(shrinkInterval);
                return;
            }
            
            // تقليص المنطقة
            this.state.safeZone.radius *= 0.7;
            this.state.safeZone.currentStage++;
            
            // إعادة تعيين مؤتمر الانكماش التالي
            this.state.safeZone.nextShrinkTime = CONFIG.ZONE_SHRINK_INTERVAL;
            
            // تحذير اللاعبين
            this.showNotification(`المنطقة الآمنة تتقلص! المرحلة ${this.state.safeZone.currentStage}/${this.state.safeZone.totalStages}`, 'zone');
            this.playSound('zone');
            
            // التحقق إذا كانت المرحلة الأخيرة
            if (this.state.safeZone.currentStage >= this.state.safeZone.totalStages) {
                clearInterval(shrinkInterval);
                this.state.safeZone.radius = 50; // منطقة صغيرة جداً
            }
            
        }, CONFIG.ZONE_SHRINK_INTERVAL * 1000);
    }
    
    // تحديث المنطقة الآمنة
    updateSafeZone(deltaTime) {
        if (!this.state.gameStarted) return;
        
        // تحديث المؤقت
        this.state.safeZone.nextShrinkTime -= deltaTime;
        
        // التحقق من ضرر المنطقة
        const playerPos = this.state.player.position;
        const zoneCenter = this.state.safeZone.center;
        const distance = Math.sqrt(
            Math.pow(playerPos.x - zoneCenter.x, 2) +
            Math.pow(playerPos.z - zoneCenter.z, 2)
        );
        
        // إذا كان اللاعب خارج المنطقة
        if (distance > this.state.safeZone.radius) {
            const damage = CONFIG.ZONE_DAMAGE_PER_SECOND * deltaTime;
            this.takeDamage(damage, 'zone');
            
            // إظهار تحذير
            if (Math.random() < 0.1) {
                this.showNotification('أنت خارج المنطقة الآمنة!', 'zone');
            }
        }
    }
    
    // ============= نظام القتال =============
    
    // تلقي ضرر
    takeDamage(amount, source = 'unknown') {
        if (!this.state.player.isAlive) return;
        
        // تخفيض الضرر بالدرع أولاً
        let damageToHealth = amount;
        if (this.state.player.armor > 0) {
            const armorDamage = Math.min(amount, this.state.player.armor);
            this.state.player.armor -= armorDamage;
            damageToHealth = amount - armorDamage;
        }
        
        // تطبيق الضرر المتبقي على الصحة
        this.state.player.health -= damageToHealth;
        this.state.playerStats.damageTaken += amount;
        
        // تحديث الواجهة
        this.updateUI();
        
        // تأثير اهتزاز الكاميرا
        this.shakeCamera(0.5);
        
        // تشغيل صوت الإصابة
        this.playSound('hit');
        
        // التحقق من الوفاة
        if (this.state.player.health <= 0) {
            this.playerDie(source);
        }
    }
    
    // اهتزاز الكاميرا
    shakeCamera(intensity) {
        const originalX = this.camera.position.x;
        const originalY = this.camera.position.y;
        const originalZ = this.camera.position.z;
        
        let shakeCount = 0;
        const maxShakes = 10;
        
        const shakeInterval = setInterval(() => {
            this.camera.position.x = originalX + (Math.random() - 0.5) * intensity;
            this.camera.position.y = originalY + (Math.random() - 0.5) * intensity;
            this.camera.position.z = originalZ + (Math.random() - 0.5) * intensity;
            
            shakeCount++;
            
            if (shakeCount >= maxShakes) {
                clearInterval(shakeInterval);
                this.camera.position.set(originalX, originalY, originalZ);
            }
        }, 50);
    }
    
    // موت اللاعب
    playerDie(killer) {
        console.log('💀 اللاعب مات!');
        
        this.state.player.isAlive = false;
        this.state.player.health = 0;
        this.state.gameEnded = true;
        
        // إخفاء نموذج اللاعب
        this.playerMesh.visible = false;
        
        // تشغيل صوت الموت
        this.playSound('death');
        
        // إنشاء علامة قبر
        this.createGraveMarker();
        
        // الانتقال لشاشة النتائج بعد تأخير
        setTimeout(() => {
            this.showResults(false);
        }, 2000);
    }
    
    // إنشاء علامة قبر
    createGraveMarker() {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const grave = new THREE.Mesh(geometry, material);
        
        grave.position.copy(this.playerMesh.position);
        grave.position.y = 1;
        
        this.scene.add(grave);
    }
    
    // ============= نظام الغنائم =============
    
    // إسقاط الغنائم الأولية
    spawnInitialLoot() {
        const lootCount = isMobile ? 30 : 50;
        
        for (let i = 0; i < lootCount; i++) {
            this.spawnLootItem();
        }
    }
    
    // إسقاط غنيمة واحدة
    spawnLootItem() {
        const x = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 100);
        const z = (Math.random() - 0.5) * (CONFIG.MAP_SIZE - 100);
        
        // أنواع الغنائم
        const lootTypes = [
            { type: 'weapon', color: 0xffd700, size: 1.5 },
            { type: 'ammo', color: 0xff9900, size: 1 },
            { type: 'medkit', color: 0xff3333, size: 1.2 },
            { type: 'armor', color: 0x4dccff, size: 1.3 },
            { type: 'grenade', color: 0x33ff33, size: 1 }
        ];
        
        const lootType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
        
        // إنشاء الغنيمة
        const geometry = new THREE.BoxGeometry(lootType.size, lootType.size, lootType.size);
        const material = new THREE.MeshLambertMaterial({
            color: lootType.color,
            transparent: true,
            opacity: 0.9
        });
        
        const loot = new THREE.Mesh(geometry, material);
        loot.position.set(x, lootType.size / 2, z);
        loot.userData = {
            type: lootType.type,
            value: Math.floor(Math.random() * 50) + 10,
            collected: false
        };
        
        // تأثير الطفو
        loot.userData.floatOffset = Math.random() * Math.PI * 2;
        
        this.scene.add(loot);
        this.state.lootItems.push(loot);
    }
    
    // إسقاط غنائم في المباني
    spawnLootInBuilding(building) {
        const lootCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < lootCount; i++) {
            const x = building.x + (Math.random() - 0.5) * (building.width - 4);
            const z = building.z + (Math.random() - 0.5) * (building.depth - 4);
            
            // غنائم المباني تكون أفضل
            const lootTypes = [
                { type: 'weapon', color: 0xffd700, size: 1.5 },
                { type: 'armor', color: 0x4dccff, size: 1.3 },
                { type: 'rare', color: 0x9933ff, size: 1.2 }
            ];
            
            const lootType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
            
            const geometry = new THREE.BoxGeometry(lootType.size, lootType.size, lootType.size);
            const material = new THREE.MeshLambertMaterial({
                color: lootType.color,
                emissive: lootType.color,
                emissiveIntensity: 0.2
            });
            
            const loot = new THREE.Mesh(geometry, material);
            loot.position.set(x, 2, z);
            loot.userData = {
                type: lootType.type,
                value: Math.floor(Math.random() * 100) + 50,
                collected: false
            };
            
            this.scene.add(loot);
            this.state.lootItems.push(loot);
        }
    }
    
    // جمع الغنائم
    collectLoot(loot) {
        if (loot.userData.collected) return;
        
        loot.userData.collected = true;
        this.state.playerStats.lootCollected++;
        
        // تطبيق تأثير الغنيمة
        switch (loot.userData.type) {
            case 'weapon':
                this.addWeaponToInventory();
                this.showNotification('+ سلاح جديد', 'loot');
                break;
                
            case 'ammo':
                this.state.player.weapons.forEach(w => {
                    if (w.ammo !== Infinity) {
                        w.ammo = Math.min(w.ammo + loot.userData.value, w.maxAmmo || 100);
                    }
                });
                this.showNotification(`+ ${loot.userData.value} ذخيرة`, 'loot');
                break;
                
            case 'medkit':
                this.state.player.health = Math.min(
                    CONFIG.PLAYER_HEALTH,
                    this.state.player.health + loot.userData.value
                );
                this.showNotification(`+ ${loot.userData.value} صحة`, 'loot');
                break;
                
            case 'armor':
                this.state.player.armor = Math.min(
                    CONFIG.PLAYER_ARMOR,
                    this.state.player.armor + loot.userData.value
                );
                this.showNotification(`+ ${loot.userData.value} درع`, 'loot');
                break;
                
            case 'grenade':
                // إضافة قنبلة للمخزون
                this.state.player.inventory.push('grenade');
                this.showNotification('+ قنبلة', 'loot');
                break;
                
            case 'rare':
                // غنيمة نادرة - تأثيرات متعددة
                this.state.player.health = CONFIG.PLAYER_HEALTH;
                this.state.player.armor = CONFIG.PLAYER_ARMOR;
                this.showNotification('غنيمة نادرة! كل شيء ممتلئ', 'loot');
                break;
        }
        
        // تشغيل صوت الجمع
        this.playSound('loot');
        
        // إخفاء الغنيمة
        loot.visible = false;
        
        // تحديث الواجهة
        this.updateUI();
    }
    
    // إضافة سلاح للمخزون
    addWeaponToInventory() {
        const weapons = [
            { id: 'shotgun', name: 'بندقية صيد', ammo: 6, maxAmmo: 24 },
            { id: 'ar', name: 'بندقية اقتحام', ammo: 30, maxAmmo: 180 },
            { id: 'sniper', name: 'بندقية قنص', ammo: 5, maxAmmo: 20 },
            { id: 'smg', name: 'رشاش', ammo: 25, maxAmmo: 125 }
        ];
        
        const newWeapon = weapons[Math.floor(Math.random() * weapons.length)];
        
        // التحقق إذا كان السلاح موجوداً بالفعل
        const exists = this.state.player.weapons.some(w => w.id === newWeapon.id);
        if (!exists) {
            this.state.player.weapons.push(newWeapon);
        }
    }
    
    // ============= نظام الإشعارات =============
    
    // إظهار إشعار
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        // إزالة الإشعار بعد 3 ثواني
        setTimeout(() => {
            if (notification.parentNode === notifications) {
                notifications.removeChild(notification);
            }
        }, 3000);
    }
    
    // إظهار مطالبة تفاعل
    showInteractionPrompt(text) {
        const prompt = document.getElementById('interaction-prompt');
        const promptText = document.getElementById('interaction-text');
        
        promptText.textContent = text;
        prompt.style.display = 'flex';
    }
    
    // إخفاء مطالبة التفاعل
    hideInteractionPrompt() {
        const prompt = document.getElementById('interaction-prompt');
        prompt.style.display = 'none';
    }
    
    // ============= نظام الصوت =============
    
    // تشغيل صوت
    playSound(name) {
        if (!CONFIG.SOUND_ENABLED) return;
        
        const sound = this.sounds.get(name);
        if (sound) {
            sound.play();
        }
    }
    
    // ============= نهاية اللعبة =============
    
    // إنهاء اللعبة
    endGame(isWinner) {
        console.log(isWinner ? '🎉 انتصرت!' : '💀 انتهت اللعبة');
        
        this.state.gameEnded = true;
        this.state.gameStarted = false;
        
        // حساب النتائج
        this.calculateResults(isWinner);
        
        // الانتقال لشاشة النتائج
        setTimeout(() => {
            this.showResults(isWinner);
        }, 2000);
    }
    
    // حساب النتائج
    calculateResults(isWinner) {
        // حساب الرتبة
        this.state.playerStats.rank = isWinner ? 1 : Math.max(1, this.state.aliveCount + 1);
        
        // حساب النقاط
        const score = this.calculateScore(isWinner);
        
        // تحديث أفضل نتيجة
        this.updateHighScore(score);
    }
    
    // حساب النقاط
    calculateScore(isWinner) {
        let score = 0;
        
        // نقاط القتلى
        score += this.state.playerStats.kills * 100;
        
        // نقاط البقاء
        score += Math.floor(this.state.playerStats.survivalTime) * 10;
        
        // نقاط الضرر
        score += Math.floor(this.state.playerStats.damageDealt / 10);
        
        // نقاط الغنائم
        score += this.state.playerStats.lootCollected * 50;
        
        // نقاط الرأس
        score += this.state.playerStats.headshots * 150;
        
        // نقاط الفوز
        if (isWinner) {
            score += 1000;
        }
        
        return score;
    }
    
    // تحديث أعلى نتيجة
    updateHighScore(score) {
        const highScore = localStorage.getItem('battleRoyaleHighScore') || 0;
        
        if (score > highScore) {
            localStorage.setItem('battleRoyaleHighScore', score);
            this.showNotification('🎊 سجل جديد!', 'loot');
        }
    }
    
    // إظهار النتائج
    showResults(isWinner) {
        this.state.currentScreen = 'results';
        
        // إخفاء الشاشات الأخرى
        this.hideAllScreens();
        
        // إظهار شاشة النتائج
        document.getElementById('results-screen').style.display = 'block';
        
        // تحديث العنوان
        const header = document.getElementById('results-header');
        if (isWinner) {
            header.innerHTML = `
                <h1>🎉 انتصرت! 🎉</h1>
                <p>كنت الأخير على قيد الحياة ضد ${CONFIG.BOT_COUNT} بوت</p>
            `;
        } else {
            header.innerHTML = `
                <h1>💀 هزيمة 💀</h1>
                <p>لقد خسرت المعركة</p>
            `;
        }
        
        // تحديث الشارة
        const badge = document.getElementById('rank-badge');
        const rankTitle = document.getElementById('rank-title');
        const rankPosition = document.getElementById('rank-position');
        
        if (this.state.playerStats.rank === 1) {
            badge.innerHTML = '👑';
            badge.style.background = 'linear-gradient(45deg, gold, #ffd700)';
            rankTitle.textContent = 'البطل';
        } else if (this.state.playerStats.rank <= 3) {
            badge.innerHTML = '🏆';
            badge.style.background = this.state.playerStats.rank === 2 
                ? 'linear-gradient(45deg, silver, #c0c0c0)' 
                : 'linear-gradient(45deg, #cd7f32, #b08d57)';
            rankTitle.textContent = this.state.playerStats.rank === 2 ? 'الوصيف' : 'المركز الثالث';
        } else {
            badge.innerHTML = '🎯';
            badge.style.background = 'linear-gradient(45deg, #4169E1, #4dccff)';
            rankTitle.textContent = 'مقاتل';
        }
        
        rankPosition.textContent = `المركز #${this.state.playerStats.rank}`;
        
        // تحديث الإحصائيات
        document.getElementById('stat-kills').textContent = this.state.playerStats.kills;
        document.getElementById('stat-damage').textContent = Math.floor(this.state.playerStats.damageDealt);
        document.getElementById('stat-distance').textContent = `${Math.floor(this.state.playerStats.distanceTraveled)}m`;
        document.getElementById('stat-survival').textContent = 
            `${Math.floor(this.state.playerStats.survivalTime / 60)}:${Math.floor(this.state.playerStats.survivalTime % 60).toString().padStart(2, '0')}`;
        
        // تحديث المكافآت
        this.updateRewardsDisplay();
        
        // تحديث لوحة الصدارة
        this.updateLeaderboard();
    }
    
    // تحديث عرض المكافآت
    updateRewardsDisplay() {
        const rewardsGrid = document.getElementById('rewards-grid');
        rewardsGrid.innerHTML = '';
        
        const rewards = [
            { icon: '💰', name: 'النقاط', value: this.calculateScore(this.state.playerStats.rank === 1) },
            { icon: '🎯', name: 'الدقة', value: `${Math.min(100, Math.floor((this.state.playerStats.headshots / Math.max(1, this.state.playerStats.kills)) * 100))}%` },
            { icon: '🏃', name: 'المسافة', value: `${Math.floor(this.state.playerStats.distanceTraveled)}m` },
            { icon: '⏱️', name: 'مدة البقاء', value: `${Math.floor(this.state.playerStats.survivalTime / 60)} دقيقة` }
        ];
        
        rewards.forEach(reward => {
            const rewardElement = document.createElement('div');
            rewardElement.className = 'reward-item';
            rewardElement.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${reward.icon}</div>
                <div style="font-weight: bold;">${reward.name}</div>
                <div style="color: var(--primary-color); font-size: 1.2rem;">${reward.value}</div>
            `;
            rewardsGrid.appendChild(rewardElement);
        });
    }
    
    // تحديث لوحة الصدارة
    updateLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        leaderboard.innerHTML = '';
        
        // بيانات افتراضية
        const players = [
            { name: 'أنت', kills: this.state.playerStats.kills, score: this.calculateScore(this.state.playerStats.rank === 1), rank: this.state.playerStats.rank },
            { name: 'محترف', kills: 15, score: 2500, rank: 2 },
            { name: 'مقاتل', kills: 10, score: 1800, rank: 3 },
            { name: 'مبتدئ', kills: 5, score: 1200, rank: 4 },
            { name: 'بوت', kills: 3, score: 800, rank: 5 }
        ];
        
        players.sort((a, b) => a.rank - b.rank);
        
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'leaderboard-item';
            playerElement.innerHTML = `
                <div class="leaderboard-rank">${player.rank}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${player.name}</div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">
                        ${player.kills} قتلى | ${player.score} نقطة
                    </div>
                </div>
            `;
            leaderboard.appendChild(playerElement);
        });
    }
    
    // مشاركة النتائج
    shareResults() {
        const text = `🎮 لعبة Battle Royale
القتلى: ${this.state.playerStats.kills}
الرتبة: #${this.state.playerStats.rank}
مدة البقاء: ${Math.floor(this.state.playerStats.survivalTime / 60)} دقيقة

العبي الآن: ${window.location.href}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'نتائج معركة البقاء',
                text: text,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(text);
            this.showNotification('تم نسخ النتائج للحافظة', 'loot');
        }
    }
    
    // ============= إعادة التشغيل =============
    
    // إعادة تشغيل اللعبة
    restartGame() {
        console.log('🔄 إعادة تشغيل اللعبة...');
        
        // إعادة تعيين الحالة
        this.state = new GameState();
        
        // تنظيف المشهد
        while(this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }
        
        // تنظيف الفيزياء
        while(this.world.bodies.length > 0) {
            this.world.removeBody(this.world.bodies[0]);
        }
        
        // إعادة التهيئة
        this.init();
    }
    
    // مغادرة اللعبة
    quitGame() {
        if (confirm('هل تريد مغادرة اللعبة؟')) {
            this.transitionToLobby();
        }
    }
    
    // تبديل القائمة
    toggleMenu() {
        this.state.gamePaused = !this.state.gamePaused;
        const menu = document.getElementById('game-menu');
        
        if (this.state.gamePaused) {
            menu.style.display = 'flex';
            
            // تحديث إحصائيات القائمة
            document.getElementById('menu-kills').textContent = this.state.playerStats.kills;
            document.getElementById('menu-players-left').textContent = this.state.aliveCount;
            document.getElementById('menu-time').textContent = 
                `${Math.floor(this.state.gameTime / 60)}:${Math.floor(this.state.gameTime % 60).toString().padStart(2, '0')}`;
            
            // إلغاء قفل المؤشر
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            this.state.controls.mouse.locked = false;
        } else {
            menu.style.display = 'none';
            
            // إعادة قفل المؤظر
            if (this.state.gameStarted && !isMobile) {
                this.lockPointer();
            }
        }
    }
    
    // ============= مساعدات =============
    
    // إخفاء جميع الشاشات
    hideAllScreens() {
        const screens = ['loading-screen', 'lobby-screen', 'plane-screen', 'game-screen', 'results-screen'];
        screens.forEach(screen => {
            document.getElementById(screen).style.display = 'none';
        });
    }
    
    // تحديث قائمة اللاعبين
    updatePlayersList() {
        const playersGrid = document.getElementById('players-grid');
        playersGrid.innerHTML = '';
        
        // اللاعب الحالي
        const playerCard = this.createPlayerCard('أنت', true, false);
        playersGrid.appendChild(playerCard);
        
        // البوتات
        for (let i = 1; i <= CONFIG.BOT_COUNT; i++) {
            const botCard = this.createPlayerCard(`بوت ${i}`, false, true);
            playersGrid.appendChild(botCard);
        }
        
        // تحديث العداد
        document.getElementById('players-ready').textContent = this.state.playerReady ? 1 : 0;
        document.getElementById('start-game-btn').querySelector('span').textContent = 
            `بدء المعركة (${this.state.playerReady ? 1 : 0}/${CONFIG.MAX_PLAYERS})`;
    }
    
    // إنشاء بطاقة لاعب
    createPlayerCard(name, isPlayer, isBot) {
        const card = document.createElement('div');
        card.className = `player-card ${isBot ? 'bot' : ''} ${isPlayer && this.state.playerReady ? 'ready' : ''}`;
        
        card.innerHTML = `
            <div class="player-avatar">
                ${isPlayer ? '👤' : isBot ? '🤖' : '👥'}
            </div>
            <div class="player-info">
                <div class="player-name">${name}</div>
                <div class="player-status ${isPlayer && this.state.playerReady ? 'ready' : ''}">
                    ${isBot ? 'بوت' : isPlayer ? (this.state.playerReady ? 'جاهز' : 'في الانتظار') : '...'}
                </div>
            </div>
        `;
        
        return card;
    }
    
    // تحديث قائمة الركاب
    updatePassengersList() {
        const passengersList = document.getElementById('passengers-list');
        passengersList.innerHTML = '';
        
        // اللاعب
        const playerItem = this.createPassengerItem('أنت', true);
        passengersList.appendChild(playerItem);
        
        // البوتات
        for (let i = 1; i <= CONFIG.BOT_COUNT; i++) {
            const botItem = this.createPassengerItem(`بوت ${i}`, false);
            passengersList.appendChild(botItem);
        }
    }
    
    // إنشاء عنصر راكب
    createPassengerItem(name, isPlayer) {
        const item = document.createElement('div');
        item.className = 'passenger-item';
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <div style="width: 30px; height: 30px; border-radius: 50%; background: ${isPlayer ? '#4169E1' : '#ff4444'}; 
                    display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">
                    ${isPlayer ? '👤' : '🤖'}
                </div>
                <div>
                    <div style="font-weight: bold;">${name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                        ${isPlayer ? 'لاعب' : 'بوت'} | ${Math.random() > 0.5 ? 'جاهز' : 'ينتظر'}
                    </div>
                </div>
            </div>
        `;
        
        return item;
    }
    
    // إعادة تعيين موقع اللاعب
    resetPlayerPosition() {
        if (this.playerMesh && this.playerBody) {
            this.playerMesh.position.set(0, 5, 50);
            this.playerBody.position.copy(this.playerMesh.position);
            this.playerMesh.visible = true;
        }
        
        this.state.player.health = CONFIG.PLAYER_HEALTH;
        this.state.player.armor = 0;
        this.state.player.isAlive = true;
        
        this.updateUI();
    }
    
    // عند تغيير حجم النافذة
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // ============= الحلقات الرئيسية =============
    
    // بدء الحلقات
    startLoops() {
        this.animationLoop();
        this.physicsLoop();
    }
    
    // حلقة الأنيميشن
    animationLoop() {
        requestAnimationFrame(() => this.animationLoop());
        
        const deltaTime = this.clock.getDelta();
        
        // تحديث الأداء
        this.updatePerformance(deltaTime);
        
        // تحديث الحركة
        this.updatePlayerMovement(deltaTime);
        
        // تحديث البوتات
        if (this.botManager && this.state.gameStarted) {
            this.botManager.update(deltaTime);
        }
        
        // تحديث الغنائم
        this.updateLoot(deltaTime);
        
        // تحديث المنطقة الآمنة
        this.updateSafeZone(deltaTime);
        
        // تحديث المؤثرات
        this.updateEffects(deltaTime);
        
        // تحديث الخريطة المصغرة
        if (this.miniMap && this.state.gameStarted) {
            this.miniMap.update();
        }
        
        // التقديم
        this.renderer.render(this.scene, this.camera);
    }
    
    // حلقة الفيزياء
    physicsLoop() {
        const fixedTimeStep = 1 / CONFIG.FPS;
        
        setInterval(() => {
            if (this.state.gameStarted && !this.state.gamePaused) {
                this.world.step(fixedTimeStep);
                
                // مزامنة النماذج مع الفيزياء
                if (this.playerMesh && this.playerBody) {
                    this.playerMesh.position.copy(this.playerBody.position);
                    this.playerMesh.quaternion.copy(this.playerBody.quaternion);
                }
                
                // مزامنة البوتات
                if (this.botManager) {
                    this.botManager.syncPhysics();
                }
            }
        }, 1000 / CONFIG.FPS);
    }
    
    // تحديث الأداء
    updatePerformance(deltaTime) {
        this.state.performance.frameCount++;
        
        if (Date.now() - this.state.performance.lastTime >= 1000) {
            this.state.performance.fps = this.state.performance.frameCount;
            this.state.performance.frameCount = 0;
            this.state.performance.lastTime = Date.now();
        }
    }
    
    // تحديث الغنائم
    updateLoot(deltaTime) {
        this.state.lootItems.forEach((loot, index) => {
            if (loot.userData.collected) {
                // إزالة الغنائم المجموعة بعد فترة
                if (loot.userData.removeTime && Date.now() > loot.userData.removeTime) {
                    this.scene.remove(loot);
                    this.state.lootItems.splice(index, 1);
                }
                return;
            }
            
            // تأثير الطفو
            loot.position.y = loot.geometry.parameters.height / 2 + Math.sin(Date.now() * 0.001 + loot.userData.floatOffset) * 0.5;
            
            // دوران الغنيمة
            loot.rotation.y += deltaTime * 0.5;
            
            // التحقق من القرب من اللاعب
            const distance = loot.position.distanceTo(this.playerMesh.position);
            if (distance < 3) {
                this.showInteractionPrompt('اضغط E للجمع');
                
                if (this.state.controls.keys.e) {
                    this.collectLoot(loot);
                    loot.userData.removeTime = Date.now() + 1000; // إزالة بعد ثانية
                }
            }
        });
    }
    
    // تحديث المؤثرات
    updateEffects(deltaTime) {
        // تحديث المؤثرات (دم، نيران، إلخ)
        this.effects = this.effects.filter(effect => {
            effect.lifetime -= deltaTime;
            
            if (effect.lifetime <= 0) {
                this.scene.remove(effect.mesh);
                return false;
            }
            
            // تحديث المؤثر
            if (effect.type === 'blood') {
                effect.mesh.material.opacity = effect.lifetime / effect.maxLifetime;
                effect.mesh.position.y += deltaTime * 2;
            }
            
            return true;
        });
    }
}

// ============= التصدير والبدء =============

// بدء اللعبة عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    const game = new GameManager();
    
    // جعل اللعبة متاحة عالمياً للتصحيح
    window.game = game;
    
    console.log('🎮 Battle Royale جاهزة للعب!');
});

// دعم الهاتف
if (isMobile) {
    // منع التكبير باللمس المزدوج
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // منع التمرير
    document.addEventListener('touchmove', (event) => {
        if (event.scale !== 1) {
            event.preventDefault();
        }
    }, false);
}

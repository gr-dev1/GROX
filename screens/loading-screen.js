// ============= LOADING SCREEN =============
class LoadingScreen {
    constructor() {
        this.progress = 0;
        this.totalSteps = 10;
        this.currentStep = 0;
        this.loadingTime = 120000; // دقيقتين بالمللي ثانية
        this.startTime = null;
        this.tips = [
            "استخدم زر الجري للهروب السريع من العدو!",
            "جمع الغنائم يزيد من فرصك في البقاء",
            "المنطقة الآمنة تتقلص كل دقيقتين",
            "تأكد من إعادة تعبئة أسلحتك قبل المعركة",
            "استخدم التربع للاختباء خلف الحواجز",
            "الرأس أصعب مكان لإصابة الخصم",
            "استمع لأصوات الخطوات لمعرفة موقع الأعداء",
            "حاول الهبوط في مناطق نائية لتفادي المواجهات المبكرة",
            "استخدم القنابل للهجوم على الأعداء خلف الحواجز",
            "تذكر أن الدرع يحميك من جزء كبير من الضرر"
        ];
        
        this.elements = {};
        this.interval = null;
        this.isComplete = false;
    }
    
    // إنشاء واجهة التحميل
    create() {
        const screen = document.getElementById('loading-screen');
        
        screen.innerHTML = `
            <!-- الخلفية -->
            <div class="loading-background"></div>
            <div class="loading-overlay"></div>
            
            <!-- المحتوى -->
            <div class="loading-container animate__animated animate__fadeIn">
                <!-- الشعار -->
                <div class="game-logo">
                    <div class="logo-text">GROS</div>
                    <div class="logo-subtitle">معركة البقاء</div>
                </div>
                
                <!-- محتوى التحميل -->
                <div class="loading-content">
                    <!-- العنوان -->
                    <div class="loading-title">
                        <i class="fas fa-sync-alt fa-spin"></i>
                        <span>جاري تحميل المعركة...</span>
                    </div>
                    
                    <!-- شريط التقدم -->
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>التقدم</span>
                            <span class="progress-percentage">0%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <!-- حالة التحميل -->
                    <div class="loading-status">
                        <div class="status-text">جاري تهيئة النظام...</div>
                        <div class="status-details"></div>
                    </div>
                    
                    <!-- تلميحات -->
                    <div class="loading-tips">
                        <div class="tips-title">
                            <i class="fas fa-lightbulb"></i>
                            <span>نصائح للمبتدئين</span>
                        </div>
                        <ul class="tips-list">
                            <li><i class="fas fa-chevron-left"></i> ${this.tips[0]}</li>
                        </ul>
                    </div>
                    
                    <!-- إحصائيات -->
                    <div class="loading-stats">
                        <div class="stat-item">
                            <div class="stat-value" id="load-time">0s</div>
                            <div class="stat-label">الوقت</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="load-step">0/10</div>
                            <div class="stat-label">المراحل</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="load-fps">60</div>
                            <div class="stat-label">الإطارات</div>
                        </div>
                    </div>
                    
                    <!-- معلومات الجهاز -->
                    <div class="device-info">
                        <span><i class="fas fa-mobile-alt"></i> <span id="device-name">جهاز محمول</span></span>
                        <span><i class="fas fa-wifi"></i> <span id="connection-type">إنترنت</span></span>
                    </div>
                    
                    <!-- زر التخطي (للاختبار) -->
                    <button class="skip-button" id="skip-loading">تخطي التحميل</button>
                </div>
            </div>
        `;
        
        // حفظ العناصر
        this.elements = {
            screen,
            progressFill: screen.querySelector('.progress-fill'),
            progressPercentage: screen.querySelector('.progress-percentage'),
            statusText: screen.querySelector('.status-text'),
            statusDetails: screen.querySelector('.status-details'),
            tipsList: screen.querySelector('.tips-list'),
            loadTime: document.getElementById('load-time'),
            loadStep: document.getElementById('load-step'),
            loadFps: document.getElementById('load-fps'),
            deviceName: document.getElementById('device-name'),
            connectionType: document.getElementById('connection-type'),
            skipButton: document.getElementById('skip-loading')
        };
        
        // تحديث معلومات الجهاز
        this.updateDeviceInfo();
        
        // إضافة أحداث
        this.setupEvents();
        
        // بدء التحميل
        this.startLoading();
    }
    
    // تحديث معلومات الجهاز
    updateDeviceInfo() {
        const device = detectDevice();
        
        // اسم الجهاز
        let deviceName = 'جهاز محمول';
        if (device.isIOS) deviceName = 'آيفون/آيباد';
        if (device.isAndroid) deviceName = 'أندرويد';
        if (device.isTablet) deviceName += ' (تابلت)';
        
        this.elements.deviceName.textContent = deviceName;
        
        // نوع الاتصال
        const connection = device.getConnection ? device.getConnection() : null;
        if (connection && connection.effectiveType) {
            this.elements.connectionType.textContent = `${connection.effectiveType}`;
        }
    }
    
    // إعداد الأحداث
    setupEvents() {
        // زر التخطي
        if (this.elements.skipButton) {
            this.elements.skipButton.addEventListener('click', () => {
                this.skipLoading();
            });
        }
        
        // تحديث الـ FPS
        this.updateFpsCounter();
    }
    
    // بدء التحميل
    startLoading() {
        this.startTime = Date.now();
        this.currentStep = 0;
        
        // محاكاة خطوات التحميل
        const steps = [
            { name: 'تهيئة النظام', duration: 10000, details: 'جاري تحميل النواة الأساسية...' },
            { name: 'تحميل الرسوميات', duration: 15000, details: 'جاري تحميل النماذج ثلاثية الأبعاد...' },
            { name: 'تحميل الأصوات', duration: 8000, details: 'جاري تحميل تأثيرات الصوت...' },
            { name: 'إنشاء الخريطة', duration: 20000, details: 'جاري توليد عالم المعركة...' },
            { name: 'تحميل البوتات', duration: 12000, details: 'جاري تحميل الذكاء الاصطناعي...' },
            { name: 'إعداد الأسلحة', duration: 10000, details: 'جاري تحميل نظام القتال...' },
            { name: 'تهيئة الفيزياء', duration: 15000, details: 'جاري تحميل محرك الفيزياء...' },
            { name: 'تحميل الواجهة', duration: 8000, details: 'جاري تحميل عناصر التحكم...' },
            { name: 'اختبار الأداء', duration: 10000, details: 'جاري تحسين الإعدادات للجهاز...' },
            { name: 'الإنهاء', duration: 12000, details: 'جاري الإعداد النهائي للعبة...' }
        ];
        
        // تنفيذ الخطوات تباعاً
        steps.forEach((step, index) => {
            setTimeout(() => {
                this.executeStep(step, index + 1);
            }, this.calculateStepDelay(index, steps));
        });
        
        // تحديث الوقت
        this.updateTime();
        
        // تغيير النصائح بشكل عشوائي
        this.randomizeTips();
    }
    
    // حساب تأخر الخطوة
    calculateStepDelay(index, steps) {
        let delay = 0;
        for (let i = 0; i < index; i++) {
            delay += steps[i].duration;
        }
        return delay;
    }
    
    // تنفيذ خطوة
    executeStep(step, stepNumber) {
        this.currentStep = stepNumber;
        
        // تحديث النص
        this.elements.statusText.textContent = step.name;
        this.elements.statusDetails.textContent = step.details;
        
        // تحديث شريط التقدم
        this.progress = (stepNumber / this.totalSteps) * 100;
        this.updateProgress();
        
        // تحديث العداد
        this.elements.loadStep.textContent = `${stepNumber}/${this.totalSteps}`;
        
        // تأثير بسيط
        this.elements.statusText.classList.add('animate__pulse');
        setTimeout(() => {
            this.elements.statusText.classList.remove('animate__pulse');
        }, 500);
        
        // إذا كانت الخطوة الأخيرة
        if (stepNumber === this.totalSteps) {
            setTimeout(() => {
                this.completeLoading();
            }, step.duration);
        }
    }
    
    // تحديث التقدم
    updateProgress() {
        this.elements.progressFill.style.width = `${this.progress}%`;
        this.elements.progressPercentage.textContent = `${Math.round(this.progress)}%`;
    }
    
    // تحديث الوقت
    updateTime() {
        if (!this.startTime) return;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.elements.loadTime.textContent = `${elapsed}s`;
        
        // استمرارية التحديث
        if (!this.isComplete) {
            setTimeout(() => this.updateTime(), 1000);
        }
    }
    
    // تحديث عداد الـ FPS
    updateFpsCounter() {
        let lastTime = performance.now();
        let frames = 0;
        
        const updateCounter = () => {
            const currentTime = performance.now();
            frames++;
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.elements.loadFps.textContent = fps;
                frames = 0;
                lastTime = currentTime;
            }
            
            if (!this.isComplete) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        updateCounter();
    }
    
    // تغيير النصائح عشوائياً
    randomizeTips() {
        if (this.isComplete) return;
        
        const randomTip = this.tips[Math.floor(Math.random() * this.tips.length)];
        const tipsList = this.elements.tipsList;
        
        if (tipsList && tipsList.children[0]) {
            tipsList.children[0].innerHTML = `<i class="fas fa-chevron-left"></i> ${randomTip}`;
            
            // تأثير التغيير
            tipsList.classList.add('animate__fadeIn');
            setTimeout(() => {
                tipsList.classList.remove('animate__fadeIn');
            }, 500);
        }
        
        // تغيير كل 5 ثواني
        setTimeout(() => this.randomizeTips(), 5000);
    }
    
    // إكمال التحميل
    completeLoading() {
        this.isComplete = true;
        this.progress = 100;
        this.updateProgress();
        
        // تحديث النص النهائي
        this.elements.statusText.textContent = 'جاهز للعب!';
        this.elements.statusDetails.textContent = 'انقر للمتابعة';
        this.elements.statusText.classList.add('animate__heartBeat');
        
        // إضافة حدث النقر للمتابعة
        this.elements.screen.addEventListener('click', () => {
            this.transitionToLobby();
        }, { once: true });
        
        // إظهار رسالة
        setTimeout(() => {
            this.showReadyMessage();
        }, 1000);
    }
    
    // تخطي التحميل
    skipLoading() {
        this.isComplete = true;
        this.progress = 100;
        this.updateProgress();
        
        this.elements.statusText.textContent = 'تخطي التحميل...';
        this.elements.statusDetails.textContent = '';
        
        setTimeout(() => {
            this.transitionToLobby();
        }, 500);
    }
    
    // عرض رسالة الجاهزية
    showReadyMessage() {
        const message = document.createElement('div');
        message.className = 'ready-message animate__animated animate__bounceIn';
        message.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-check-circle" style="font-size: 48px; color: var(--success); margin-bottom: 15px;"></i>
                <h3 style="color: var(--text); margin-bottom: 10px;">اللعبة جاهزة!</h3>
                <p style="color: var(--text-secondary);">انقر للانتقال إلى اللوبي</p>
            </div>
        `;
        
        this.elements.screen.appendChild(message);
    }
    
    // الانتقال للوبي
    transitionToLobby() {
        // تأثير الخروج
        this.elements.screen.classList.add('animate__fadeOut');
        
        setTimeout(() => {
            // إخفاء شاشة التحميل
            this.elements.screen.classList.remove('active');
            this.elements.screen.style.display = 'none';
            
            // تحميل شاشة اللوبي
            if (typeof initLobbyScreen === 'function') {
                initLobbyScreen();
            } else {
                console.log('شاشة اللوبي جاهزة للتحميل');
                // هنا سيتم تحميل شاشة اللوبي في الخطوة التالية
            }
        }, 500);
    }
    
    // الحصول على وقت التحميل
    getLoadTime() {
        if (!this.startTime) return 0;
        return Date.now() - this.startTime;
    }
}

// ============= INITIALIZATION =============
let loadingScreen = null;

function initLoadingScreen() {
    loadingScreen = new LoadingScreen();
    loadingScreen.create();
    
    return loadingScreen;
}

// للاستخدام العام
window.LoadingScreen = LoadingScreen;
window.initLoadingScreen = initLoadingScreen;

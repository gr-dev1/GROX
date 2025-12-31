// ============= DEVICE DETECTION =============
class DeviceDetector {
    constructor() {
        this.info = this.detectDevice();
        this.setupListeners();
    }
    
    detectDevice() {
        const ua = navigator.userAgent;
        
        return {
            // نوع الجهاز
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isTablet: /iPad|Android(?!.*Mobile)|Tablet/i.test(ua),
            isIOS: /iPhone|iPad|iPod/i.test(ua),
            isAndroid: /Android/i.test(ua),
            
            // المتصفح
            browser: this.getBrowser(ua),
            
            // النظام
            os: this.getOS(ua),
            
            // الشاشة
            screen: {
                width: window.innerWidth,
                height: window.innerHeight,
                pixelRatio: window.devicePixelRatio,
                orientation: this.getOrientation()
            },
            
            // الإمكانيات
            capabilities: {
                webGL: this.checkWebGL(),
                touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                vibration: 'vibrate' in navigator,
                fullscreen: document.fullscreenEnabled || document.webkitFullscreenEnabled,
                notifications: 'Notification' in window,
                storage: this.checkStorage()
            },
            
            // الأداء
            performance: {
                memory: navigator.deviceMemory || 'unknown',
                cores: navigator.hardwareConcurrency || 'unknown'
            }
        };
    }
    
    getBrowser(ua) {
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        if (ua.includes('Opera')) return 'Opera';
        return 'Unknown';
    }
    
    getOS(ua) {
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac')) return 'MacOS';
        if (ua.includes('Linux')) return 'Linux';
        return 'Unknown';
    }
    
    getOrientation() {
        if (window.innerHeight > window.innerWidth) return 'portrait';
        return 'landscape';
    }
    
    checkWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }
    
    checkStorage() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch (e) {
            return false;
        }
    }
    
    setupListeners() {
        // تغيير حجم الشاشة
        window.addEventListener('resize', () => {
            this.info.screen.width = window.innerWidth;
            this.info.screen.height = window.innerHeight;
            this.info.screen.orientation = this.getOrientation();
        });
        
        // تغيير الاتجاه
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.info.screen.orientation = this.getOrientation();
                this.emit('orientationchange', this.info.screen.orientation);
            }, 100);
        });
    }
    
    // الأحداث
    on(event, callback) {
        if (!this.listeners) this.listeners = {};
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    
    emit(event, data) {
        if (this.listeners && this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
    
    // الحصول على معلومات الأداء
    async getPerformance() {
        const perf = {
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            fps: 60, // سيتم تحديثه لاحقاً
            memory: null
        };
        
        // الحصول على معلومات الذاكرة إن أمكن
        if (performance.memory) {
            perf.memory = {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        
        return perf;
    }
    
    // التحقق من دعم الاهتزاز
    vibrate(pattern = [100]) {
        if (this.info.capabilities.vibration) {
            navigator.vibrate(pattern);
            return true;
        }
        return false;
    }
    
    // التحقق من وضع الشاشة الكاملة
    toggleFullscreen() {
        if (!this.info.capabilities.fullscreen) return false;
        
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
        
        return true;
    }
    
    // الحصول على سعة البطارية
    getBattery() {
        if ('getBattery' in navigator) {
            return navigator.getBattery().then(battery => ({
                level: battery.level * 100,
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
            }));
        }
        return Promise.resolve(null);
    }
    
    // التحقق من اتصال الشبكة
    getConnection() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                type: conn.type || 'unknown',
                effectiveType: conn.effectiveType || 'unknown',
                downlink: conn.downlink || 'unknown',
                rtt: conn.rtt || 'unknown',
                saveData: conn.saveData || false
            };
        }
        return null;
    }
}

// ============= EXPORT =============
const deviceDetector = new DeviceDetector();

// دالة مساعدة للاستخدام المباشر
function detectDevice() {
    return deviceDetector.info;
}

// توفير للاستخدام العام
window.DeviceDetector = DeviceDetector;
window.detectDevice = detectDevice;

/**
 * 翻译管理器 - 修复参数传递
 */

class TranslatorManager {
    constructor() {
        this.translators = {};
        this.currentTranslator = null;
        this.targetLanguage = 'en';
        this.engine = 'google';
    }

    register(name, translatorClass) {
        this.translators[name] = translatorClass;
    }

    /**
     * 从 URL 读取所有配置
     */
    loadConfigFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 读取引擎
        this.engine = urlParams.get('translator') || urlParams.get('t') || 'google';
        
        // 读取目标语言
        this.targetLanguage = urlParams.get('lang') || urlParams.get('l') || 'en';
        
        // 读取自动翻译
        const autoTranslate = urlParams.get('translate') === '1' || urlParams.get('auto') === '1';
        if (autoTranslate) {
            localStorage.setItem('translator_auto', 'true');
        }
        
        // 读取百度配置并保存到 localStorage
        const baiduAppId = urlParams.get('baidu_app_id') || urlParams.get('baiduAppId');
        const baiduSecret = urlParams.get('baidu_secret') || urlParams.get('baiduSecret');
        if (baiduAppId) {
            localStorage.setItem('baidu_app_id', baiduAppId);
            console.log('已保存百度 AppId');
        }
        if (baiduSecret) {
            localStorage.setItem('baidu_secret', baiduSecret);
            console.log('已保存百度 Secret');
        }
        
        // 读取微软配置
        const msApiKey = urlParams.get('ms_api_key') || urlParams.get('msApiKey');
        const msRegion = urlParams.get('ms_region') || urlParams.get('msRegion');
        if (msApiKey) localStorage.setItem('ms_api_key', msApiKey);
        if (msRegion) localStorage.setItem('ms_region', msRegion);
        
        console.log('配置加载完成:', {
            engine: this.engine,
            targetLang: this.targetLanguage,
            hasBaiduConfig: !!(localStorage.getItem('baidu_app_id') && localStorage.getItem('baidu_secret'))
        });
    }

    init(options = {}) {
        // 先从 URL 加载配置
        this.loadConfigFromURL();
        
        // 合并传入的 options（优先级更高）
        this.engine = options.engine || this.engine;
        this.targetLanguage = options.targetLang || this.targetLanguage;
        
        // 构建配置对象，传入翻译器
        const config = {
            appId: options.appId || localStorage.getItem('baidu_app_id') || '',
            secret: options.secret || localStorage.getItem('baidu_secret') || '',
            apiKey: options.apiKey || localStorage.getItem('ms_api_key') || '',
            region: options.region || localStorage.getItem('ms_region') || 'global'
        };
        
        // 创建翻译器实例
        const TranslatorClass = this.translators[this.engine];
        if (TranslatorClass) {
            this.currentTranslator = new TranslatorClass(config);
            console.log(`翻译器已初始化: ${this.engine}`);
        } else {
            console.warn(`未找到翻译引擎: ${this.engine}`);
            if (this.translators['google']) {
                this.currentTranslator = new this.translators['google']();
                console.log('降级使用 Google 翻译');
            }
        }
    }

    async translate(text) {
        if (!this.currentTranslator) {
            console.warn('翻译器未初始化');
            return text;
        }
        
        try {
            const result = await this.currentTranslator.translate(text, this.targetLanguage);
            return result;
        } catch (error) {
            console.error('翻译失败:', error);
            return text;
        }
    }

    setTargetLanguage(lang) {
        this.targetLanguage = lang;
        localStorage.setItem('translator_lang', lang);
    }

    switchEngine(engine, config = {}) {
        const TranslatorClass = this.translators[engine];
        if (TranslatorClass) {
            this.engine = engine;
            this.currentTranslator = new TranslatorClass(config);
            localStorage.setItem('translator_engine', engine);
            return true;
        }
        return false;
    }
}

// 创建全局单例
window.translatorManager = new TranslatorManager();

// 注册翻译引擎
function registerTranslators() {
    if (typeof GoogleTranslator !== 'undefined') {
        window.translatorManager.register('google', GoogleTranslator);
    }
    if (typeof BaiduTranslator !== 'undefined') {
        window.translatorManager.register('baidu', BaiduTranslator);
    }
    if (typeof MicrosoftTranslator !== 'undefined') {
        window.translatorManager.register('microsoft', MicrosoftTranslator);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerTranslators);
} else {
    registerTranslators();
}
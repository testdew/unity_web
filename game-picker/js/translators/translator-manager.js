/**
 * 翻译管理器 - 修复版
 * 确保正确传递 URL 参数给翻译引擎
 */

class TranslatorManager {
    constructor() {
        this.translators = {};
        this.currentTranslator = null;
        this.targetLanguage = 'en';
        this.engine = 'google';
    }

    /**
     * 注册翻译引擎
     */
    register(name, translatorClass) {
        this.translators[name] = translatorClass;
    }

    /**
     * 从 URL 读取所有百度/微软配置
     */
    getBaiduConfigFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            appId: urlParams.get('baidu_app_id') || urlParams.get('baiduAppId') || '',
            secret: urlParams.get('baidu_secret') || urlParams.get('baiduSecret') || ''
        };
    }

    getMicrosoftConfigFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            apiKey: urlParams.get('ms_api_key') || urlParams.get('msApiKey') || '',
            region: urlParams.get('ms_region') || urlParams.get('msRegion') || 'global'
        };
    }

    /**
     * 初始化翻译器
     */
    init(options = {}) {
        // 从 URL 读取引擎和语言
        const urlParams = new URLSearchParams(window.location.search);
        const urlEngine = urlParams.get('translator') || urlParams.get('t');
        const urlLang = urlParams.get('lang') || urlParams.get('l');
        const urlAuto = urlParams.get('translate') === '1' || urlParams.get('auto') === '1';
        
        // 确定引擎
        this.engine = options.engine || urlEngine || localStorage.getItem('translator_engine') || 'google';
        
        // 确定目标语言
        this.targetLanguage = options.targetLang || urlLang || localStorage.getItem('translator_lang') || 'en';
        
        // 保存自动翻译设置
        if (urlAuto) {
            localStorage.setItem('translator_auto', 'true');
        }
        
        // 构建配置，从 URL 读取 API 密钥
        let config = options.config || {};
        
        if (this.engine === 'baidu') {
            const baiduConfig = this.getBaiduConfigFromURL();
            config.appId = baiduConfig.appId;
            config.secret = baiduConfig.secret;
            // 保存到 localStorage 供后续使用
            if (baiduConfig.appId) localStorage.setItem('baidu_app_id', baiduConfig.appId);
            if (baiduConfig.secret) localStorage.setItem('baidu_secret', baiduConfig.secret);
        } else if (this.engine === 'microsoft') {
            const msConfig = this.getMicrosoftConfigFromURL();
            config.apiKey = msConfig.apiKey;
            config.region = msConfig.region;
            if (msConfig.apiKey) localStorage.setItem('ms_api_key', msConfig.apiKey);
            if (msConfig.region) localStorage.setItem('ms_region', msConfig.region);
        }
        
        console.log('翻译管理器初始化:', {
            engine: this.engine,
            targetLang: this.targetLanguage,
            hasBaiduConfig: !!(config.appId && config.secret),
            hasMsConfig: !!config.apiKey
        });
        
        // 创建翻译器实例
        const TranslatorClass = this.translators[this.engine];
        if (TranslatorClass) {
            this.currentTranslator = new TranslatorClass(config);
            console.log(`翻译器已创建: ${this.engine}`);
        } else {
            console.error(`未找到翻译引擎: ${this.engine}`);
            // 尝试使用 Google 降级
            if (this.translators['google']) {
                this.currentTranslator = new this.translators['google']();
                console.log('降级使用 Google 翻译');
            }
        }
    }

    /**
     * 翻译文本
     */
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

    /**
     * 设置目标语言
     */
    setTargetLanguage(lang) {
        this.targetLanguage = lang;
        localStorage.setItem('translator_lang', lang);
    }

    /**
     * 获取当前语言
     */
    getTargetLanguage() {
        return this.targetLanguage;
    }

    /**
     * 切换引擎
     */
    switchEngine(engine, config = {}) {
        const TranslatorClass = this.translators[engine];
        if (TranslatorClass) {
            this.engine = engine;
            this.currentTranslator = new TranslatorClass(config);
            localStorage.setItem('translator_engine', engine);
            console.log(`已切换到 ${engine}`);
            return true;
        }
        return false;
    }
}

// 创建全局单例
if (typeof window !== 'undefined') {
    window.translatorManager = new TranslatorManager();
}

// 注册翻译引擎（需要在加载 translator 类之后调用）
function registerTranslators() {
    if (typeof GoogleTranslator !== 'undefined') {
        window.translatorManager.register('google', GoogleTranslator);
        console.log('已注册 Google 翻译');
    }
    if (typeof BaiduTranslator !== 'undefined') {
        window.translatorManager.register('baidu', BaiduTranslator);
        console.log('已注册 百度 翻译');
    }
    if (typeof MicrosoftTranslator !== 'undefined') {
        window.translatorManager.register('microsoft', MicrosoftTranslator);
        console.log('已注册 微软 翻译');
    }
}

// 延迟注册，等待脚本加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerTranslators);
} else {
    registerTranslators();
}
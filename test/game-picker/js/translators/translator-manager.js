/**
 * 翻译管理器
 * 统一管理多个翻译引擎，支持切换和降级
 */

class TranslatorManager {
    constructor() {
        this.translators = [];
        this.currentTranslator = null;
        this.defaultTranslator = 'google';
        this.targetLanguage = 'en';
    }

    /**
     * 注册翻译引擎
     */
    registerTranslator(translator) {
        this.translators.push(translator);
    }

    /**
     * 初始化翻译器
     */
    init(options = {}) {
        const { engine = 'google', targetLang = 'en', config = {} } = options;
        
        this.targetLanguage = targetLang;
        
        console.log('初始化翻译器:', engine, targetLang, config);
        
        // 获取翻译引擎类
        const TranslatorClass = this.getTranslatorClass(engine);
        
        if (TranslatorClass) {
            this.currentTranslator = new TranslatorClass(config);
            console.log(`翻译引擎 ${engine} 初始化完成，可用: ${this.currentTranslator.isAvailable()}`);
        } else {
            console.warn(`未找到翻译引擎: ${engine}，使用默认 Google 翻译`);
            this.currentTranslator = new GoogleTranslator();
        }
        
        return this.currentTranslator;
    }

    /**
     * 获取翻译引擎类
     */
    getTranslatorClass(engine) {
        const engines = {
            'google': GoogleTranslator,
            'baidu': BaiduTranslator,
            'microsoft': MicrosoftTranslator
        };
        return engines[engine];
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
            const translated = await this.currentTranslator.translate(text, this.targetLanguage);
            return translated;
        } catch (error) {
            console.error('翻译失败:', error);
            return text;
        }
    }

    /**
     * 批量翻译
     */
    async translateBatch(texts) {
        const results = await Promise.all(texts.map(text => this.translate(text)));
        return results;
    }

    /**
     * 设置目标语言
     */
    setTargetLanguage(lang) {
        this.targetLanguage = lang;
        if (this.currentTranslator && this.currentTranslator.setTargetLanguage) {
            this.currentTranslator.setTargetLanguage(lang);
        }
    }

    /**
     * 获取当前语言
     */
    getTargetLanguage() {
        return this.targetLanguage;
    }

    /**
     * 切换翻译引擎
     */
    switchEngine(engine, config = {}) {
        const TranslatorClass = this.getTranslatorClass(engine);
        if (TranslatorClass) {
            this.currentTranslator = new TranslatorClass(config);
            console.log(`已切换到 ${engine} 翻译引擎`);
            return true;
        }
        return false;
    }
}

// 创建全局单例
window.translatorManager = new TranslatorManager();

// 从 URL 参数读取配置
function initTranslatorFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 支持多种参数名
    const engine = urlParams.get('translator') || urlParams.get('t') || 'google';
    const targetLang = urlParams.get('lang') || urlParams.get('l') || 'en';
    const baiduAppId = urlParams.get('baidu_app_id') || urlParams.get('appid') || '';
    const baiduSecret = urlParams.get('baidu_secret') || urlParams.get('secret') || '';
    const msApiKey = urlParams.get('ms_api_key') || urlParams.get('key') || '';
    const msRegion = urlParams.get('ms_region') || urlParams.get('region') || 'global';
    
    console.log('URL参数解析:', { engine, targetLang, baiduAppId: !!baiduAppId, baiduSecret: !!baiduSecret });
    
    // 保存到 localStorage
    if (baiduAppId) localStorage.setItem('baidu_app_id', baiduAppId);
    if (baiduSecret) localStorage.setItem('baidu_secret', baiduSecret);
    if (msApiKey) localStorage.setItem('ms_api_key', msApiKey);
    if (msRegion) localStorage.setItem('ms_region', msRegion);
    
    const config = {};
    if (engine === 'baidu') {
        config.appId = baiduAppId || localStorage.getItem('baidu_app_id');
        config.secret = baiduSecret || localStorage.getItem('baidu_secret');
    } else if (engine === 'microsoft') {
        config.apiKey = msApiKey || localStorage.getItem('ms_api_key');
        config.region = msRegion || localStorage.getItem('ms_region');
    }
    
    const translator = window.translatorManager.init({
        engine: engine,
        targetLang: targetLang,
        config: config
    });
    
    return { engine, targetLang, translator };
}

// 自动初始化
if (typeof window !== 'undefined') {
    // 等待所有脚本加载完成
    window.addEventListener('load', () => {
        initTranslatorFromURL();
    });
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TranslatorManager, initTranslatorFromURL };
}
/**
 * 翻译管理器
 * 统一管理多个翻译引擎，支持切换和降级
 */

class TranslatorManager {
    constructor() {
        this.translators = [];
        this.currentTranslator = null;
        this.defaultTranslator = 'google';
        this.targetLanguage = 'en'; // 默认英语
    }

    /**
     * 注册翻译引擎
     */
    registerTranslator(translator) {
        this.translators.push(translator);
    }

    /**
     * 初始化翻译器
     * @param {Object} options - 配置选项
     * @param {string} options.engine - 翻译引擎名称 (google, baidu, microsoft)
     * @param {string} options.targetLang - 目标语言
     * @param {Object} options.config - 引擎配置（如API Key）
     */
    init(options = {}) {
        const { engine = 'google', targetLang = 'en', config = {} } = options;
        
        this.targetLanguage = targetLang;
        
        // 查找并激活翻译引擎
        const TranslatorClass = this.getTranslatorClass(engine);
        
        if (TranslatorClass) {
            this.currentTranslator = new TranslatorClass(config);
        } else {
            console.warn(`未找到翻译引擎: ${engine}，使用默认 Google 翻译`);
            this.currentTranslator = new GoogleTranslator();
        }
        
        console.log(`翻译管理器初始化完成，引擎: ${this.currentTranslator.name}, 目标语言: ${this.targetLanguage}`);
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
     * @param {string} text - 要翻译的文本
     * @returns {Promise<string>}
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
     * @param {Array<string>} texts - 文本数组
     * @returns {Promise<Array<string>>}
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
    const engine = urlParams.get('translator') || urlParams.get('t') || 'google';
    const targetLang = urlParams.get('lang') || urlParams.get('l') || 'en';
    const baiduAppId = urlParams.get('baidu_app_id') || '';
    const baiduSecret = urlParams.get('baidu_secret') || '';
    const msApiKey = urlParams.get('ms_api_key') || '';
    const msRegion = urlParams.get('ms_region') || 'global';
    
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
    
    translatorManager.init({
        engine: engine,
        targetLang: targetLang,
        config: config
    });
    
    return { engine, targetLang };
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TranslatorManager, initTranslatorFromURL };
}
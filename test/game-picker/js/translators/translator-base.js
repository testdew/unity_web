/**
 * 翻译引擎基类
 * 所有翻译引擎都需要继承此类
 */

class TranslatorBase {
    constructor() {
        this.name = 'base';
        this.supportedLanguages = [];
    }

    /**
     * 翻译文本
     * @param {string} text - 要翻译的文本
     * @param {string} targetLang - 目标语言代码 (en, zh, ja, ko 等)
     * @returns {Promise<string>} 翻译后的文本
     */
    async translate(text, targetLang) {
        throw new Error('子类必须实现 translate 方法');
    }

    /**
     * 检查是否可用
     * @returns {boolean}
     */
    isAvailable() {
        return true;
    }

    /**
     * 获取语言名称
     * @param {string} code - 语言代码
     * @returns {string}
     */
    getLanguageName(code) {
        const languages = {
            'en': 'English',
            'zh': '中文',
            'ja': '日本語',
            'ko': '한국어',
            'fr': 'Français',
            'de': 'Deutsch',
            'es': 'Español',
            'ru': 'Русский',
            'ar': 'العربية',
            'pt': 'Português'
        };
        return languages[code] || code;
    }
}

// 导出（浏览器环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslatorBase;
}
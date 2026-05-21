/**
 * Google 翻译引擎（免费模拟版）
 * 无需 API Key，但可能有请求限制
 */

class GoogleTranslator extends TranslatorBase {
    constructor() {
        super();
        this.name = 'google';
        this.supportedLanguages = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'it', 'pt', 'nl', 'pl'];
        
        // Google Translate API（免费代理）
        this.apiUrl = 'https://translate.googleapis.com/translate_a/single';
    }

    isAvailable() {
        // 无需配置，始终可用
        return true;
    }

    async translate(text, targetLang) {
        try {
            const url = `${this.apiUrl}?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data[0]) {
                // Google 返回格式：[[["翻译文本","原文",...]],...]
                const translated = data[0].map(item => item[0]).join('');
                return translated;
            } else {
                throw new Error('翻译结果为空');
            }
        } catch (error) {
            console.error('Google翻译错误:', error);
            return text; // 降级返回原文
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleTranslator;
}
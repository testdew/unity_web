/**
 * 微软翻译引擎
 * 需要申请 Azure Cognitive Services API Key
 * 申请地址：https://azure.microsoft.com/zh-cn/services/cognitive-services/translator/
 */

class MicrosoftTranslator extends TranslatorBase {
    constructor(config = {}) {
        super();
        this.name = 'microsoft';
        this.supportedLanguages = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'ar', 'it', 'pt', 'nl', 'pl', 'tr'];
        
        // 配置（建议从环境变量或URL参数读取）
        this.apiKey = config.apiKey || localStorage.getItem('ms_api_key') || '';
        this.region = config.region || localStorage.getItem('ms_region') || 'global';
        
        this.apiUrl = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';
    }

    isAvailable() {
        return !!this.apiKey;
    }

    async translate(text, targetLang) {
        if (!this.isAvailable()) {
            throw new Error('微软翻译未配置 API Key，请在 URL 参数或 localStorage 中设置 ms_api_key');
        }

        const url = `${this.apiUrl}&to=${targetLang}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': this.apiKey,
                    'Ocp-Apim-Subscription-Region': this.region,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{ Text: text }])
            });
            
            const data = await response.json();
            
            if (data && data[0] && data[0].translations && data[0].translations[0]) {
                return data[0].translations[0].text;
            } else {
                throw new Error('翻译失败');
            }
        } catch (error) {
            console.error('微软翻译错误:', error);
            return text;
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MicrosoftTranslator;
}
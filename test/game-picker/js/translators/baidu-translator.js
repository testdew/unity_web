/**
 * 百度翻译引擎
 * 需要申请 API Key 和 Secret
 * 申请地址：https://api.fanyi.baidu.com/
 */

class BaiduTranslator extends TranslatorBase {
    constructor(config = {}) {
        super();
        this.name = 'baidu';
        this.supportedLanguages = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt', 'it', 'th', 'vi'];
        
        // 配置（建议从环境变量或URL参数读取）
        this.appId = config.appId || localStorage.getItem('baidu_app_id') || '';
        this.secret = config.secret || localStorage.getItem('baidu_secret') || '';
        
        // API 地址（注意：实际使用需要后端代理，避免暴露密钥）
        this.apiUrl = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
        
        // 是否需要后端代理（因为浏览器跨域限制）
        this.needsProxy = true;
    }

    isAvailable() {
        return !!(this.appId && this.secret);
    }

    /**
     * 生成随机数
     */
    generateSalt() {
        return Math.floor(Math.random() * 10000000000);
    }

    /**
     * 生成签名
     */
    generateSign(text, salt) {
        const str = this.appId + text + salt + this.secret;
        // 需要引入 MD5 库，这里用简单模拟
        return this.md5(str);
    }

    /**
     * 简单的 MD5 实现（实际使用建议引入 crypto-js）
     */
    md5(string) {
        // 注意：生产环境请使用完整的 MD5 库
        // 这里简化处理，实际使用时建议引入 https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
        return string.split('').reduce((hash, char) => {
            return ((hash << 5) - hash) + char.charCodeAt(0) | 0;
        }, 0).toString(16);
    }

    async translate(text, targetLang) {
        if (!this.isAvailable()) {
            throw new Error('百度翻译未配置 API Key，请在 URL 参数或 localStorage 中设置 baidu_app_id 和 baidu_secret');
        }

        // 百度语言代码映射
        const langMap = {
            'en': 'en',
            'zh': 'zh',
            'ja': 'jp',
            'ko': 'kor',
            'fr': 'fra',
            'de': 'de',
            'es': 'spa',
            'ru': 'ru'
        };
        
        const to = langMap[targetLang] || targetLang;
        const salt = this.generateSalt();
        const sign = this.generateSign(text, salt);
        
        const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&from=auto&to=${to}&appid=${this.appId}&salt=${salt}&sign=${sign}`;
        
        try {
            // 注意：百度翻译 API 有跨域限制，需要通过后端代理
            // 这里使用 JSONP 方式或提示用户配置代理
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.trans_result && data.trans_result.length > 0) {
                return data.trans_result[0].dst;
            } else {
                throw new Error(data.error_msg || '翻译失败');
            }
        } catch (error) {
            console.error('百度翻译错误:', error);
            // 降级：返回原文本
            return text;
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaiduTranslator;
}
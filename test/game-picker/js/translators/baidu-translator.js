/**
 * 百度翻译引擎 - 修复版
 * 支持从 URL 参数读取 AppId 和 Secret
 */

class BaiduTranslator extends TranslatorBase {
    constructor(config = {}) {
        super();
        this.name = 'baidu';
        this.supportedLanguages = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt', 'it', 'th', 'vi'];
        
        // 优先从 URL 读取，其次从 localStorage，最后从 config
        this.appId = this.getParam('baidu_app_id') || 
                     this.getParam('baiduAppId') || 
                     config.appId || 
                     localStorage.getItem('baidu_app_id') || 
                     '';
        
        this.secret = this.getParam('baidu_secret') || 
                      this.getParam('baiduSecret') || 
                      config.secret || 
                      localStorage.getItem('baidu_secret') || 
                      '';
        
        // 百度 API 地址（注意：浏览器跨域限制，实际可能需要代理）
        this.apiUrl = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
        
        console.log('百度翻译初始化:', { 
            hasAppId: !!this.appId, 
            hasSecret: !!this.secret,
            appIdPreview: this.appId ? this.appId.substring(0, 10) + '...' : 'none'
        });
    }

    /**
     * 从 URL 参数读取
     */
    getParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name) || '';
    }

    isAvailable() {
        const available = !!(this.appId && this.secret);
        if (!available) {
            console.warn('百度翻译未配置 AppId 或 Secret，请在 URL 中添加参数: baidu_app_id 和 baidu_secret');
        }
        return available;
    }

    /**
     * 生成随机数（salt）
     */
    generateSalt() {
        return Math.floor(Math.random() * 10000000000) + '';
    }

    /**
     * 生成签名
     * 百度签名规则：sign = MD5(appId + text + salt + secret)
     */
    generateSign(text, salt) {
        const str = this.appId + text + salt + this.secret;
        return this.md5(str);
    }

    /**
     * 简单 MD5 实现（生产环境建议使用 crypto-js 库）
     */
    md5(string) {
        // 使用简单的哈希算法（注意：这不是标准 MD5，仅用于演示）
        // 生产环境请引入：https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
        // 并使用 CryptoJS.MD5(string).toString()
        
        // 临时方案：如果页面引入了 crypto-js，则使用它
        if (typeof CryptoJS !== 'undefined' && CryptoJS.MD5) {
            return CryptoJS.MD5(string).toString();
        }
        
        // 否则使用简单哈希（不推荐用于生产，仅测试用）
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            const char = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    async translate(text, targetLang) {
        if (!this.isAvailable()) {
            return `[百度翻译未配置] ${text}`;
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
            'ru': 'ru',
            'pt': 'pt',
            'it': 'it',
            'th': 'th',
            'vi': 'vie'
        };
        
        const to = langMap[targetLang] || targetLang;
        const salt = this.generateSalt();
        const sign = this.generateSign(text, salt);
        
        // 注意：百度翻译 API 有跨域限制，不能直接从浏览器调用
        // 解决方案1：使用 JSONP（百度支持）
        // 解决方案2：通过后端代理
        
        return new Promise((resolve, reject) => {
            // 使用 JSONP 方式调用百度翻译 API
            const callbackName = 'baidu_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
            
            window[callbackName] = (data) => {
                delete window[callbackName];
                document.body.removeChild(script);
                
                if (data && data.trans_result && data.trans_result.length > 0) {
                    resolve(data.trans_result[0].dst);
                } else if (data && data.error_msg) {
                    console.error('百度翻译错误:', data.error_msg);
                    reject(new Error(data.error_msg));
                } else {
                    reject(new Error('翻译失败'));
                }
            };
            
            const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&from=auto&to=${to}&appid=${this.appId}&salt=${salt}&sign=${sign}&callback=${callbackName}`;
            
            const script = document.createElement('script');
            script.src = url;
            script.onerror = () => {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('网络请求失败，请检查网络或使用代理'));
            };
            
            document.body.appendChild(script);
            
            // 超时处理
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    reject(new Error('百度翻译请求超时'));
                }
            }, 10000);
        });
    }
}

// 注册到全局
if (typeof window !== 'undefined') {
    window.BaiduTranslator = BaiduTranslator;
}
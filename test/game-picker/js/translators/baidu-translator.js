/**
 * 百度翻译引擎 - 完整修复版
 * 支持从多种来源读取配置：URL参数、localStorage、config对象
 */

class BaiduTranslator extends TranslatorBase {
    constructor(config = {}) {
        super();
        this.name = 'baidu';
        this.supportedLanguages = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt', 'it', 'th', 'vi'];
        
        // 从多个来源读取配置（优先级：URL > config > localStorage）
        this.appId = this.getConfigValue('baidu_app_id', config.appId);
        this.secret = this.getConfigValue('baidu_secret', config.secret);
        
        // 百度 API 地址（使用 JSONP 方式避免跨域）
        this.apiUrl = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
        
        console.log('百度翻译初始化:', { 
            hasAppId: !!this.appId, 
            hasSecret: !!this.secret,
            appIdValue: this.appId ? this.appId.substring(0, 10) + '...' : '未设置'
        });
    }

    /**
     * 获取配置值（从 URL > 传入值 > localStorage）
     */
    getConfigValue(paramName, configValue) {
        // 1. 优先从 URL 参数读取
        const urlParams = new URLSearchParams(window.location.search);
        const urlValue = urlParams.get(paramName);
        if (urlValue) {
            console.log(`从 URL 读取到 ${paramName}:`, urlValue.substring(0, 10) + '...');
            return urlValue;
        }
        
        // 2. 其次使用传入的 config 值
        if (configValue) {
            console.log(`从 config 读取到 ${paramName}`);
            return configValue;
        }
        
        // 3. 最后从 localStorage 读取
        const storedValue = localStorage.getItem(paramName);
        if (storedValue) {
            console.log(`从 localStorage 读取到 ${paramName}`);
            return storedValue;
        }
        
        return '';
    }

    isAvailable() {
        const available = !!(this.appId && this.secret);
        if (!available) {
            console.warn('百度翻译未配置 AppId 或 Secret');
            console.warn('请在 URL 中添加参数: baidu_app_id 和 baidu_secret');
            console.warn('示例: ?t=baidu&l=en&translate=1&baidu_app_id=你的ID&baidu_secret=你的密钥');
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
     * 生成 MD5 签名
     */
    generateSign(text, salt) {
        const str = this.appId + text + salt + this.secret;
        
        // 使用 CryptoJS 进行 MD5（需要引入库）
        if (typeof CryptoJS !== 'undefined' && CryptoJS.MD5) {
            return CryptoJS.MD5(str).toString();
        }
        
        // 如果没有 CryptoJS，使用简单哈希（仅用于测试，生产环境建议引入）
        console.warn('未找到 CryptoJS 库，使用简单哈希（可能无法通过百度验证）');
        return this.simpleHash(str);
    }

    /**
     * 简单哈希（备用）
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    async translate(text, targetLang) {
        if (!this.isAvailable()) {
            throw new Error('百度翻译未配置 API Key，请在 URL 参数中设置 baidu_app_id 和 baidu_secret');
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
        
        console.log('百度翻译请求:', { text: text.substring(0, 30) + '...', to, appId: this.appId });
        
        // 使用 JSONP 方式调用
        return new Promise((resolve, reject) => {
            const callbackName = 'baidu_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
            
            window[callbackName] = (data) => {
                delete window[callbackName];
                document.body.removeChild(script);
                
                if (data && data.trans_result && data.trans_result.length > 0) {
                    console.log('百度翻译成功:', data.trans_result[0].dst.substring(0, 50));
                    resolve(data.trans_result[0].dst);
                } else if (data && data.error_msg) {
                    console.error('百度翻译错误:', data.error_msg);
                    reject(new Error(data.error_msg));
                } else {
                    reject(new Error('翻译失败：响应格式异常'));
                }
            };
            
            const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&from=auto&to=${to}&appid=${this.appId}&salt=${salt}&sign=${sign}&callback=${callbackName}`;
            
            const script = document.createElement('script');
            script.src = url;
            script.onerror = () => {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('网络请求失败，请检查网络'));
            };
            
            document.body.appendChild(script);
            
            // 超时处理（15秒）
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    reject(new Error('百度翻译请求超时'));
                }
            }, 15000);
        });
    }
}

// 注册到全局
if (typeof window !== 'undefined') {
    window.BaiduTranslator = BaiduTranslator;
}
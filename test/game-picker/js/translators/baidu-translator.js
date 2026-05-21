/**
 * 百度翻译引擎 - 修复版
 * 确保能从 URL 参数正确读取 AppId 和 Secret
 */

class BaiduTranslator extends TranslatorBase {
    constructor(config = {}) {
        super();
        this.name = 'baidu';
        this.supportedLanguages = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt', 'it', 'th', 'vi'];
        
        // 从多个来源读取配置，优先级：URL参数 > config > localStorage
        this.appId = this.getUrlParam('baidu_app_id') || 
                     this.getUrlParam('baiduAppId') || 
                     config.appId || 
                     localStorage.getItem('baidu_app_id') || 
                     '';
        
        this.secret = this.getUrlParam('baidu_secret') || 
                      this.getUrlParam('baiduSecret') || 
                      config.secret || 
                      localStorage.getItem('baidu_secret') || 
                      '';
        
        // 百度 API 地址
        this.apiUrl = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
        
        console.log('百度翻译初始化:', { 
            hasAppId: !!this.appId, 
            hasSecret: !!this.secret,
            appIdValue: this.appId ? this.appId.substring(0, 10) + '...' : '未找到',
            secretValue: this.secret ? '已设置' : '未找到'
        });
    }

    /**
     * 从 URL 参数读取（确保能正确读取）
     */
    getUrlParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        const value = urlParams.get(name);
        if (value) {
            console.log(`从 URL 读取到参数 ${name}:`, value.substring(0, 10) + '...');
        }
        return value || '';
    }

    isAvailable() {
        const available = !!(this.appId && this.secret);
        if (!available) {
            console.warn('百度翻译未配置:', { 
                hasAppId: !!this.appId, 
                hasSecret: !!this.secret,
                currentUrl: window.location.href
            });
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
        console.log('生成签名，原始字符串长度:', str.length);
        return this.md5(str);
    }

    /**
     * MD5 加密
     */
    md5(string) {
        // 优先使用 CryptoJS
        if (typeof CryptoJS !== 'undefined' && CryptoJS.MD5) {
            return CryptoJS.MD5(string).toString();
        }
        // 降级方案：简单哈希（不推荐）
        console.warn('未找到 CryptoJS，使用简单哈希');
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            const char = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    async translate(text, targetLang) {
        // 再次检查配置（防止初始化后配置丢失）
        if (!this.appId || !this.secret) {
            // 尝试重新从 URL 读取
            this.appId = this.getUrlParam('baidu_app_id') || this.getUrlParam('baiduAppId') || '';
            this.secret = this.getUrlParam('baidu_secret') || this.getUrlParam('baiduSecret') || '';
            
            if (!this.appId || !this.secret) {
                const errorMsg = `百度翻译未配置。请在 URL 中添加参数: baidu_app_id 和 baidu_secret\n当前URL: ${window.location.href}`;
                console.error(errorMsg);
                return `[翻译失败: 未配置百度翻译] ${text}`;
            }
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
        
        console.log('百度翻译请求:', { text: text.substring(0, 50), to, salt, sign: sign.substring(0, 10) });
        
        // 使用 JSONP 方式调用
        return new Promise((resolve, reject) => {
            const callbackName = 'baidu_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
            
            window[callbackName] = (data) => {
                delete window[callbackName];
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
                
                if (data && data.trans_result && data.trans_result.length > 0) {
                    console.log('百度翻译成功:', data.trans_result[0].dst);
                    resolve(data.trans_result[0].dst);
                } else if (data && data.error_msg) {
                    console.error('百度翻译错误:', data.error_msg);
                    reject(new Error(data.error_msg));
                } else {
                    reject(new Error('翻译失败，响应格式异常'));
                }
            };
            
            const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&from=auto&to=${to}&appid=${this.appId}&salt=${salt}&sign=${sign}&callback=${callbackName}`;
            
            const script = document.createElement('script');
            script.src = url;
            script.onerror = () => {
                delete window[callbackName];
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
                reject(new Error('网络请求失败，请检查网络连接'));
            };
            
            document.body.appendChild(script);
            
            // 超时处理
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    if (document.body.contains(script)) {
                        document.body.removeChild(script);
                    }
                    reject(new Error('百度翻译请求超时 (10秒)'));
                }
            }, 10000);
        });
    }
}

// 注册到全局
if (typeof window !== 'undefined') {
    window.BaiduTranslator = BaiduTranslator;
}
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
        
        // 从多个来源获取配置
        this.appId = config.appId || this.getUrlParameter('baidu_app_id') || this.getUrlParameter('appid') || localStorage.getItem('baidu_app_id') || '';
        this.secret = config.secret || this.getUrlParameter('baidu_secret') || this.getUrlParameter('secret') || localStorage.getItem('baidu_secret') || '';
        
        console.log('百度翻译配置:', { 
            hasAppId: !!this.appId, 
            hasSecret: !!this.secret,
            appIdPrefix: this.appId ? this.appId.substring(0, 6) + '...' : 'none'
        });
    }

    /**
     * 从 URL 获取参数
     */
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name) || '';
    }

    isAvailable() {
        const available = !!(this.appId && this.secret);
        if (!available) {
            console.warn('百度翻译未配置: appId=', !!this.appId, 'secret=', !!this.secret);
        }
        return available;
    }

    /**
     * 生成随机数
     */
    generateSalt() {
        return Math.floor(Math.random() * 10000000000);
    }

    /**
     * 生成签名 (MD5)
     */
    generateSign(text, salt) {
        const str = this.appId + text + salt + this.secret;
        return this.md5(str);
    }

    /**
     * 简单的 MD5 实现
     */
    md5(string) {
        function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];
            a = ff(a, b, c, d, k[0], 7, -680876936);
            d = ff(d, a, b, c, k[1], 12, -389564586);
            c = ff(c, d, a, b, k[2], 17, 606105819);
            b = ff(b, c, d, a, k[3], 22, -1044525330);
            a = ff(a, b, c, d, k[4], 7, -176418897);
            d = ff(d, a, b, c, k[5], 12, 1200080426);
            c = ff(c, d, a, b, k[6], 17, -1473231341);
            b = ff(b, c, d, a, k[7], 22, -45705983);
            a = ff(a, b, c, d, k[8], 7, 1770035416);
            d = ff(d, a, b, c, k[9], 12, -1958414417);
            c = ff(c, d, a, b, k[10], 17, -42063);
            b = ff(b, c, d, a, k[11], 22, -1990404162);
            a = ff(a, b, c, d, k[12], 7, 1804603682);
            d = ff(d, a, b, c, k[13], 12, -40341101);
            c = ff(c, d, a, b, k[14], 17, -1502002290);
            b = ff(b, c, d, a, k[15], 22, 1236535329);
            a = gg(a, b, c, d, k[1], 5, -165796510);
            d = gg(d, a, b, c, k[6], 9, -1069501632);
            c = gg(c, d, a, b, k[11], 14, 643717713);
            b = gg(b, c, d, a, k[0], 20, -373897302);
            a = gg(a, b, c, d, k[5], 5, -701558691);
            d = gg(d, a, b, c, k[10], 9, 38016083);
            c = gg(c, d, a, b, k[15], 14, -660478335);
            b = gg(b, c, d, a, k[4], 20, -405537848);
            a = gg(a, b, c, d, k[9], 5, 568446438);
            d = gg(d, a, b, c, k[14], 9, -1019803690);
            c = gg(c, d, a, b, k[3], 14, -187363961);
            b = gg(b, c, d, a, k[8], 20, 1163531501);
            a = gg(a, b, c, d, k[13], 5, -1444681467);
            d = gg(d, a, b, c, k[2], 9, -51403784);
            c = gg(c, d, a, b, k[7], 14, 1735328473);
            b = gg(b, c, d, a, k[12], 20, -1926607734);
            a = hh(a, b, c, d, k[5], 4, -378558);
            d = hh(d, a, b, c, k[8], 11, -2022574463);
            c = hh(c, d, a, b, k[11], 16, 1839030562);
            b = hh(b, c, d, a, k[14], 23, -35309556);
            a = hh(a, b, c, d, k[1], 4, -1530992060);
            d = hh(d, a, b, c, k[4], 11, 1272893353);
            c = hh(c, d, a, b, k[7], 16, -155497632);
            b = hh(b, c, d, a, k[10], 23, -1094730640);
            a = hh(a, b, c, d, k[13], 4, 681279174);
            d = hh(d, a, b, c, k[0], 11, -358537222);
            c = hh(c, d, a, b, k[3], 16, -722521979);
            b = hh(b, c, d, a, k[6], 23, 76029189);
            a = hh(a, b, c, d, k[9], 4, -640364487);
            d = hh(d, a, b, c, k[12], 11, -421815835);
            c = hh(c, d, a, b, k[15], 16, 530742520);
            b = hh(b, c, d, a, k[2], 23, -995338651);
            a = ii(a, b, c, d, k[0], 6, -198630844);
            d = ii(d, a, b, c, k[7], 10, 1126891415);
            c = ii(c, d, a, b, k[14], 15, -1416354905);
            b = ii(b, c, d, a, k[5], 21, -57434055);
            a = ii(a, b, c, d, k[12], 6, 1700485571);
            d = ii(d, a, b, c, k[3], 10, -1894986606);
            c = ii(c, d, a, b, k[10], 15, -1051523);
            b = ii(b, c, d, a, k[1], 21, -2054922799);
            a = ii(a, b, c, d, k[8], 6, 1873313359);
            d = ii(d, a, b, c, k[15], 10, -30611744);
            c = ii(c, d, a, b, k[6], 15, -1560198380);
            b = ii(b, c, d, a, k[13], 21, 1309151649);
            a = ii(a, b, c, d, k[4], 6, -145523070);
            d = ii(d, a, b, c, k[11], 10, -1120210379);
            c = ii(c, d, a, b, k[2], 15, 718787259);
            b = ii(b, c, d, a, k[9], 21, -343485551);
            x[0] = add32(a, x[0]);
            x[1] = add32(b, x[1]);
            x[2] = add32(c, x[2]);
            x[3] = add32(d, x[3]);
        }

        function cmn(q, a, b, x, s, t) {
            a = add32(add32(a, q), add32(x, t));
            return add32((a << s) | (a >>> (32 - s)), b);
        }

        function ff(a, b, c, d, x, s, t) {
            return cmn((b & c) | ((~b) & d), a, b, x, s, t);
        }

        function gg(a, b, c, d, x, s, t) {
            return cmn((b & d) | (c & (~d)), a, b, x, s, t);
        }

        function hh(a, b, c, d, x, s, t) {
            return cmn(b ^ c ^ d, a, b, x, s, t);
        }

        function ii(a, b, c, d, x, s, t) {
            return cmn(c ^ (b | (~d)), a, b, x, s, t);
        }

        function add32(a, b) {
            return (a + b) & 0xFFFFFFFF;
        }

        function md5str(s) {
            var arr = [];
            for (var i = 0; i < s.length; i++) {
                arr.push(s.charCodeAt(i));
            }
            return md5arr(arr);
        }

        function md5arr(arr) {
            var n = arr.length;
            var x = [];
            var i;
            for (i = 0; i < 64; i++) {
                x[i] = 0;
            }
            for (i = 0; i < n; i++) {
                x[i >> 2] |= arr[i] << ((i % 4) * 8);
            }
            x[i >> 2] |= 0x80 << ((i % 4) * 8);
            var len = n * 8;
            x[((i + 64) >> 9) << 4] = len;
            var a = 1732584193;
            var b = -271733879;
            var c = -1732584194;
            var d = 271733878;
            for (i = 0; i < x.length; i += 16) {
                var olda = a;
                var oldb = b;
                var oldc = c;
                var oldd = d;
                md5cycle([a, b, c, d], x.slice(i, i + 16));
                a = add32(a, olda);
                b = add32(b, oldb);
                c = add32(c, oldc);
                d = add32(d, oldd);
            }
            return ((a & 0xFF) << 0) +
                ((a & 0xFF00) << 8) +
                ((a & 0xFF0000) << 16) +
                ((a & 0xFF000000) << 24) +
                ((b & 0xFF) << 8) +
                ((b & 0xFF00) << 16) +
                ((b & 0xFF0000) << 24) +
                ((b & 0xFF000000) << 32) +
                ((c & 0xFF) << 16) +
                ((c & 0xFF00) << 24) +
                ((c & 0xFF0000) << 32) +
                ((c & 0xFF000000) << 40) +
                ((d & 0xFF) << 24) +
                ((d & 0xFF00) << 32) +
                ((d & 0xFF0000) << 40) +
                ((d & 0xFF000000) << 48);
        }

        return md5str(string).toString(16);
    }

    async translate(text, targetLang) {
        if (!this.isAvailable()) {
            throw new Error('百度翻译未配置 API Key。请在 URL 中添加参数: ?baidu_app_id=你的ID&baidu_secret=你的密钥');
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
            'it': 'it'
        };
        
        const to = langMap[targetLang] || targetLang;
        const salt = this.generateSalt();
        const sign = this.generateSign(text, salt);
        
        // 使用 JSONP 方式避免跨域问题
        const url = `https://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=auto&to=${to}&appid=${this.appId}&salt=${salt}&sign=${sign}`;
        
        try {
            // 由于跨域限制，这里需要使用后端代理或 JSONP
            // 这里提供一个使用代理的方式
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            if (data.trans_result && data.trans_result.length > 0) {
                return data.trans_result[0].dst;
            } else {
                throw new Error(data.error_msg || '翻译失败');
            }
        } catch (error) {
            console.error('百度翻译错误:', error);
            // 提示用户配置代理或使用其他翻译引擎
            return `[翻译失败: ${error.message}] ${text}`;
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaiduTranslator;
}
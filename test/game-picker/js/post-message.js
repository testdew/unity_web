/**
 * 跨域通信模块
 * 负责与父页面进行 postMessage 通信
 */

const PostMessage = (function() {
    // 允许的父页面源（生产环境建议配置具体域名）
    let allowedOrigins = ['*'];  // 可配置为 ['https://your-site.com', 'https://another-site.com']
    
    /**
     * 发送选中的文本给父页面
     * @param {string} text - 选中的原文
     * @param {Object} category - 分类信息 { main, sub }
     * @param {Object} translationInfo - 翻译信息 { original, translated }
     */
    function sendSelectedText(text, category, translationInfo = null) {
        const message = {
            type: 'TEXT_SELECTED',
            value: text,
            category: category || {},
            timestamp: new Date().toISOString()
        };
        
        // 如果提供了翻译信息，附加到消息中
        if (translationInfo && translationInfo.translated) {
            message.original = translationInfo.original || text;
            message.translated = translationInfo.translated;
            message.hasTranslation = true;
        }
        
        window.parent.postMessage(message, '*');
    }
    
    /**
     * 发送关闭通知给父页面
     */
    function sendClose() {
        window.parent.postMessage({
            type: 'PICKER_CLOSED',
            timestamp: new Date().toISOString()
        }, '*');
    }
    
    /**
     * 发送翻译状态给父页面
     * @param {boolean} enabled - 是否启用翻译
     * @param {string} engine - 翻译引擎
     * @param {string} targetLang - 目标语言
     */
    function sendTranslateStatus(enabled, engine, targetLang) {
        window.parent.postMessage({
            type: 'TRANSLATE_STATUS',
            enabled: enabled,
            engine: engine,
            targetLang: targetLang,
            timestamp: new Date().toISOString()
        }, '*');
    }
    
    /**
     * 发送选择器就绪信号
     */
    function sendReady() {
        window.parent.postMessage({
            type: 'PICKER_READY',
            timestamp: new Date().toISOString()
        }, '*');
    }
    
    /**
     * 发送心跳响应
     */
    function sendPong() {
        window.parent.postMessage({
            type: 'PONG',
            timestamp: new Date().toISOString()
        }, '*');
    }
    
    /**
     * 监听来自父页面的消息
     * @param {Function} callback - 消息处理回调
     */
    function listenToParent(callback) {
        window.addEventListener('message', (event) => {
            // 验证来源（可选，生产环境建议开启）
            // if (!allowedOrigins.includes('*') && !allowedOrigins.includes(event.origin)) {
            //     console.warn('未授权的来源:', event.origin);
            //     return;
            // }
            
            const data = event.data;
            
            // 处理 ping 请求
            if (data?.type === 'PING') {
                sendPong();
                return;
            }
            
            // 调用回调处理其他消息
            if (data && callback) {
                callback(data);
            }
        });
    }
    
    /**
     * 配置允许的来源
     * @param {Array} origins - 允许的源列表
     */
    function setAllowedOrigins(origins) {
        allowedOrigins = origins;
    }
    
    /**
     * 添加允许的来源
     * @param {string} origin - 允许的源
     */
    function addAllowedOrigin(origin) {
        if (!allowedOrigins.includes(origin) && origin !== '*') {
            allowedOrigins.push(origin);
        }
    }
    
    // 页面加载完成后发送就绪信号
    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            setTimeout(sendReady, 100);
        });
    }
    
    // 公开 API
    return {
        sendSelectedText,
        sendClose,
        sendTranslateStatus,
        sendReady,
        sendPong,
        listenToParent,
        setAllowedOrigins,
        addAllowedOrigin
    };
})();
/**
 * 跨域通信模块
 * 负责与父页面进行 postMessage 通信
 */

const PostMessage = (function() {
    // 允许的父页面源（生产环境建议配置具体域名）
    let allowedOrigins = ['*'];
    
    /**
     * 发送选中的文本给父页面
     */
    function sendSelectedText(text, category, translationInfo = null) {
        const message = {
            type: 'TEXT_SELECTED',
            value: text,
            category: category || {},
            timestamp: new Date().toISOString()
        };
        
        if (translationInfo && translationInfo.translated) {
            message.original = translationInfo.original || text;
            message.translated = translationInfo.translated;
            message.hasTranslation = true;
            message.fromEditor = translationInfo.fromEditor || false;
        }
        
        window.parent.postMessage(message, '*');
        console.log('PostMessage 发送 TEXT_SELECTED:', message.value.substring(0, 50));
    }
    
    /**
     * 发送关闭通知给父页面
     * 同时也会关闭当前 iframe 页面（如果作为弹窗使用）
     */
    function sendClose() {
        // 1. 通知父页面关闭
        window.parent.postMessage({
            type: 'PICKER_CLOSED',
            timestamp: new Date().toISOString()
        }, '*');
        
        console.log('PostMessage 发送 PICKER_CLOSED');
        
        // 2. 如果当前页面是独立页面（不在 iframe 中），则直接关闭窗口
        if (window.parent === window) {
            console.log('当前页面不在 iframe 中，尝试关闭窗口');
            // 尝试关闭窗口（某些浏览器可能不允许）
            window.close();
        }
    }
    
    /**
     * 发送翻译状态
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
     * 发送就绪信号
     */
    function sendReady() {
        window.parent.postMessage({
            type: 'PICKER_READY',
            timestamp: new Date().toISOString()
        }, '*');
        console.log('PostMessage 发送 PICKER_READY');
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
     */
    function listenToParent(callback) {
        window.addEventListener('message', (event) => {
            const data = event.data;
            
            // 处理 ping 请求
            if (data?.type === 'PING') {
                sendPong();
                return;
            }
            
            // 处理关闭请求（父页面主动要求关闭）
            if (data?.type === 'CLOSE_PICKER') {
                console.log('收到父页面关闭指令');
                sendClose();
                return;
            }
            
            // 调用回调处理其他消息
            if (data && callback) {
                callback(data);
            }
        });
        
        console.log('PostMessage 监听已启动');
    }
    
    /**
     * 配置允许的来源
     */
    function setAllowedOrigins(origins) {
        allowedOrigins = origins;
    }
    
    // 页面加载完成后发送就绪信号
    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            setTimeout(sendReady, 100);
        });
    }
    
    return {
        sendSelectedText,
        sendClose,
        sendTranslateStatus,
        sendReady,
        sendPong,
        listenToParent,
        setAllowedOrigins
    };
})();
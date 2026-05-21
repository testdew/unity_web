/**
 * 跨域通信模块
 * 负责与父页面进行 postMessage 通信
 */

const PostMessage = (function() {
    // 允许的父页面源（生产环境建议配置）
    let allowedOrigins = ['*'];  // 可配置为 ['https://your-site.com', 'https://another-site.com']
    
    /**
     * 发送选中的文本给父页面
     * @param {string} text - 选中的文本
     * @param {Object} category - 分类信息 { main, sub }
     */
    function sendSelectedText(text, category) {
        const message = {
            type: 'TEXT_SELECTED',
            value: text,
            category: category || {},
            timestamp: new Date().toISOString()
        };
        
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
     * 监听来自父页面的消息
     * @param {Function} callback - 消息处理回调
     */
    function listenToParent(callback) {
        window.addEventListener('message', (event) => {
            // 验证来源（可选）
            // if (!allowedOrigins.includes('*') && !allowedOrigins.includes(event.origin)) {
            //     console.warn('未授权的来源:', event.origin);
            //     return;
            // }
            
            const data = event.data;
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
    
    // 公开 API
    return {
        sendSelectedText,
        sendClose,
        listenToParent,
        setAllowedOrigins
    };
})();
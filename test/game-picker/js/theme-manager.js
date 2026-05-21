/**
 * 主题管理模块
 * 负责主题切换、保存和加载
 */

const ThemeManager = (function() {
    // 可用的主题列表
    const THEMES = ['dark', 'pink', 'cyber', 'white', 'red'];
    const STORAGE_KEY = 'gamePickerTheme';
    
    let currentTheme = 'dark';
    let container = null;
    
    /**
     * 初始化主题管理器
     */
    function init() {
        container = document.getElementById('pickerContainer');
        if (!container) {
            console.error('找不到 pickerContainer 元素');
            return;
        }
        loadSavedTheme();
        bindThemeButtons();
    }
    
    /**
     * 设置主题
     * @param {string} theme - 主题名称
     */
    function setTheme(theme) {
        if (!THEMES.includes(theme)) {
            console.warn('未知主题:', theme);
            return;
        }
        
        if (!container) {
            container = document.getElementById('pickerContainer');
        }
        
        if (!container) {
            console.error('找不到容器元素');
            return;
        }
        
        // 移除所有主题类
        THEMES.forEach(t => {
            container.classList.remove(`theme-${t}`);
        });
        
        // 添加新主题类
        container.classList.add(`theme-${theme}`);
        currentTheme = theme;
        
        // 更新 body 的背景色（可选）
        document.body.style.background = getBodyBackground(theme);
        
        // 更新设置弹窗中的按钮激活状态
        updateModalButtons(theme);
        
        // 更新预览效果
        updateThemePreview(theme);
        
        // 保存到 localStorage
        localStorage.setItem(STORAGE_KEY, theme);
        
        // 触发主题变化事件
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
        
        console.log('主题已切换为:', theme);
        console.log('当前容器类名:', container.className);
    }
    
    /**
     * 获取 body 背景色
     */
    function getBodyBackground(theme) {
        const backgrounds = {
            dark: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            pink: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
            cyber: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 100%)',
            white: '#f5f5f5',
            red: 'linear-gradient(135deg, #8b0000 0%, #c41e3a 100%)'
        };
        return backgrounds[theme] || backgrounds.dark;
    }
    
    /**
     * 获取当前主题
     */
    function getCurrentTheme() {
        return currentTheme;
    }
    
    /**
     * 加载保存的主题
     */
    function loadSavedTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEY);
        if (savedTheme && THEMES.includes(savedTheme)) {
            setTheme(savedTheme);
        } else {
            setTheme('dark');
        }
    }
    
    /**
     * 更新设置弹窗中的按钮激活状态
     */
    function updateModalButtons(activeTheme) {
        const themeButtons = document.querySelectorAll('.theme-option-btn');
        themeButtons.forEach(btn => {
            if (btn.dataset.theme === activeTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    /**
     * 更新主题预览
     */
    function updateThemePreview(theme) {
        const previewCard = document.querySelector('.preview-card');
        if (!previewCard) return;
        
        const previewStyles = {
            dark: { 
                bg: '#1a1a2e', 
                color: '#eee', 
                border: 'none',
                gradient: 'linear-gradient(135deg, #1a1a2e, #16213e)'
            },
            pink: { 
                bg: 'linear-gradient(135deg, #fbc2eb, #a6c1ee)', 
                color: '#5a3d5c', 
                border: 'none',
                gradient: 'linear-gradient(135deg, #fbc2eb, #a6c1ee)'
            },
            cyber: { 
                bg: '#0a0f1e', 
                color: '#00ffcc', 
                border: '1px solid #00ffcc',
                gradient: 'linear-gradient(135deg, #0a0f1e, #0d1b2a)'
            },
            white: { 
                bg: '#ffffff', 
                color: '#333', 
                border: '1px solid #ddd',
                gradient: '#ffffff'
            },
            red: { 
                bg: 'linear-gradient(135deg, #8b0000, #c41e3a)', 
                color: '#fff4e6', 
                border: 'none',
                gradient: 'linear-gradient(135deg, #8b0000, #c41e3a)'
            }
        };
        
        const style = previewStyles[theme] || previewStyles.dark;
        previewCard.style.background = style.gradient || style.bg;
        previewCard.style.color = style.color;
        previewCard.style.border = style.border;
        previewCard.style.padding = '12px';
        previewCard.style.borderRadius = '10px';
        previewCard.style.textAlign = 'center';
    }
    
    /**
     * 绑定主题按钮事件
     */
    function bindThemeButtons() {
        const themeButtons = document.querySelectorAll('.theme-option-btn');
        themeButtons.forEach(btn => {
            // 移除旧的事件监听，避免重复
            btn.removeEventListener('click', btn._handler);
            btn._handler = () => {
                const theme = btn.dataset.theme;
                if (theme) {
                    setTheme(theme);
                }
            };
            btn.addEventListener('click', btn._handler);
        });
        
        // 也监听动态添加的按钮
        const observer = new MutationObserver(() => {
            const newButtons = document.querySelectorAll('.theme-option-btn');
            newButtons.forEach(btn => {
                if (!btn._hasListener) {
                    btn._hasListener = true;
                    btn.addEventListener('click', () => {
                        const theme = btn.dataset.theme;
                        if (theme) setTheme(theme);
                    });
                }
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // 公开 API
    return {
        init,
        setTheme,
        getCurrentTheme,
        bindThemeButtons
    };
})();

// 页面加载完成后自动初始化
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
    } else {
        ThemeManager.init();
    }
}
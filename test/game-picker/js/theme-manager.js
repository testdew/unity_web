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
     * @param {HTMLElement} containerElement - 容器元素
     */
    function init(containerElement) {
        container = containerElement;
        loadSavedTheme();
        bindEvents();
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
        
        // 移除所有主题类
        THEMES.forEach(t => {
            container.classList.remove(`theme-${t}`);
        });
        
        // 添加新主题
        container.classList.add(`theme-${theme}`);
        currentTheme = theme;
        
        // 更新按钮激活状态
        updateButtonActiveState(theme);
        
        // 保存到 localStorage
        localStorage.setItem(STORAGE_KEY, theme);
        
        // 触发主题变化事件
        document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }
    
    /**
     * 获取当前主题
     * @returns {string}
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
     * 更新按钮激活状态
     * @param {string} activeTheme - 当前激活的主题
     */
    function updateButtonActiveState(activeTheme) {
        const buttons = document.querySelectorAll('.style-btn');
        buttons.forEach(btn => {
            if (btn.dataset.theme === activeTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    /**
     * 绑定主题按钮事件
     */
    function bindEvents() {
        const styleButtons = document.getElementById('styleButtons');
        if (!styleButtons) return;
        
        styleButtons.addEventListener('click', (e) => {
            const btn = e.target.closest('.style-btn');
            if (btn && btn.dataset.theme) {
                setTheme(btn.dataset.theme);
            }
        });
    }
    
    // 公开 API
    return {
        init,
        setTheme,
        getCurrentTheme
    };
})();
/**
 * 主题管理模块
 * 负责主题切换、保存和加载
 */

const ThemeManager = (function() {
    const THEMES = ['dark', 'pink', 'cyber', 'white', 'red'];
    const STORAGE_KEY = 'gamePickerTheme';
    
    let currentTheme = 'dark';
    let container = null;
    
    function init() {
        container = document.getElementById('pickerContainer');
        if (!container) {
            console.error('找不到 pickerContainer');
            return;
        }
        loadSavedTheme();
        bindThemeButtons();
    }
    
    function setTheme(theme) {
        if (!THEMES.includes(theme)) return;
        
        if (!container) {
            container = document.getElementById('pickerContainer');
        }
        
        // 移除所有主题类
        THEMES.forEach(t => {
            container.classList.remove(`theme-${t}`);
        });
        
        // 添加新主题
        container.classList.add(`theme-${theme}`);
        currentTheme = theme;
        
        // 保存
        localStorage.setItem(STORAGE_KEY, theme);
        
        // 更新弹窗按钮状态
        updateModalButtons(theme);
        
        // 更新预览
        updatePreview(theme);
        
        console.log('主题已切换:', theme);
    }
    
    function getCurrentTheme() {
        return currentTheme;
    }
    
    function loadSavedTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && THEMES.includes(saved)) {
            setTheme(saved);
        } else {
            setTheme('dark');
        }
    }
    
    function updateModalButtons(activeTheme) {
        const btns = document.querySelectorAll('.theme-option-btn');
        btns.forEach(btn => {
            if (btn.dataset.theme === activeTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    function updatePreview(theme) {
        const preview = document.querySelector('.preview-card');
        if (!preview) return;
        
        const styles = {
            dark: { bg: 'linear-gradient(135deg, #1a1a2e, #16213e)', color: '#eee' },
            pink: { bg: 'linear-gradient(135deg, #fbc2eb, #a6c1ee)', color: '#5a3d5c' },
            cyber: { bg: 'linear-gradient(135deg, #0a0f1e, #0d1b2a)', color: '#00ffcc', border: '1px solid #00ffcc' },
            white: { bg: '#ffffff', color: '#333', border: '1px solid #ddd' },
            red: { bg: 'linear-gradient(135deg, #8b0000, #c41e3a)', color: '#fff4e6' }
        };
        
        const s = styles[theme] || styles.dark;
        preview.style.background = s.bg;
        preview.style.color = s.color;
        if (s.border) preview.style.border = s.border;
        else preview.style.border = 'none';
    }
    
    function bindThemeButtons() {
        const btns = document.querySelectorAll('.theme-option-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                if (theme) setTheme(theme);
            });
        });
    }
    
    return { init, setTheme, getCurrentTheme, bindThemeButtons };
})();

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}
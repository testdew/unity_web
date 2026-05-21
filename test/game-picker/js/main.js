/**
 * 主逻辑模块 - 优化版
 * 推荐列表只显示原文，不显示任何翻译或原文标注
 */

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', async () => {
    // DOM 元素
    const mainTypeSelect = document.getElementById('mainTypeSelect');
    const subTypeSelect = document.getElementById('subTypeSelect');
    const searchInput = document.getElementById('searchInput');
    const optionList = document.getElementById('optionList');
    const resultCount = document.getElementById('resultCount');
    const circleCloseBtn = document.getElementById('circleCloseBtn');
    const confirmBtn = document.getElementById('confirmBtn');
    const contentInput = document.getElementById('contentInput');
    const translateInputBtn = document.getElementById('translateInputBtn');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
    const saveSettingsModalBtn = document.getElementById('saveSettingsModalBtn');
    const translatorSelect = document.getElementById('translatorSelect');
    const langSelect = document.getElementById('langSelect');
    const autoTranslateCheckbox = document.getElementById('autoTranslateCheckbox');
    const baiduSettings = document.getElementById('baiduSettings');
    const microsoftSettings = document.getElementById('microsoftSettings');
    const baiduAppId = document.getElementById('baiduAppId');
    const baiduSecret = document.getElementById('baiduSecret');
    const msApiKey = document.getElementById('msApiKey');
    const msRegion = document.getElementById('msRegion');
    
    // 标签页元素
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 当前状态
    let currentSubType = '';
    let currentMainType = 'ban';
    
    // 翻译相关变量（仅用于输入框翻译）
    let translatorEngine = 'google';
    let targetLang = 'en';
    
    // 翻译器实例
    let translatorInstance = null;
    
    // 缓存翻译结果（仅用于输入框翻译）
    const translationCache = new Map();
    
    // 分类名称映射
    const categoryNames = {
        ban: '封号',
        announcement: '停服公告',
        notice: '系统通知',
        reward: '补偿公告',
        maintenance: '维护公告'
    };
    
    /**
     * 获取翻译器实例
     */
    function getTranslator() {
        if (window.translatorManager && window.translatorManager.currentTranslator) {
            return window.translatorManager.currentTranslator;
        }
        if (translatorInstance) {
            return translatorInstance;
        }
        return null;
    }
    
    /**
     * 保存设置到 localStorage
     */
    function saveSettingsToLocal() {
        localStorage.setItem('translator_engine', translatorEngine);
        localStorage.setItem('translator_lang', targetLang);
        localStorage.setItem('baidu_app_id', baiduAppId?.value || '');
        localStorage.setItem('baidu_secret', baiduSecret?.value || '');
        localStorage.setItem('ms_api_key', msApiKey?.value || '');
        localStorage.setItem('ms_region', msRegion?.value || 'global');
    }
    
    /**
     * 加载保存的设置
     */
    function loadSettingsFromLocal() {
        translatorEngine = localStorage.getItem('translator_engine') || 'google';
        targetLang = localStorage.getItem('translator_lang') || 'en';
        
        if (translatorSelect) translatorSelect.value = translatorEngine;
        if (langSelect) langSelect.value = targetLang;
        
        if (baiduAppId) baiduAppId.value = localStorage.getItem('baidu_app_id') || '';
        if (baiduSecret) baiduSecret.value = localStorage.getItem('baidu_secret') || '';
        if (msApiKey) msApiKey.value = localStorage.getItem('ms_api_key') || '';
        if (msRegion) msRegion.value = localStorage.getItem('ms_region') || 'global';
        
        toggleEngineSettings(translatorEngine);
    }
    
    /**
     * 切换引擎设置面板显示
     */
    function toggleEngineSettings(engine) {
        if (baiduSettings) baiduSettings.style.display = engine === 'baidu' ? 'block' : 'none';
        if (microsoftSettings) microsoftSettings.style.display = engine === 'microsoft' ? 'block' : 'none';
    }
    
    /**
     * 初始化翻译器
     */
    function initTranslator() {
        // 从 URL 参数读取覆盖
        const urlParams = new URLSearchParams(window.location.search);
        const urlEngine = urlParams.get('translator') || urlParams.get('t');
        const urlLang = urlParams.get('lang') || urlParams.get('l');
        
        if (urlEngine) translatorEngine = urlEngine;
        if (urlLang) targetLang = urlLang;
        
        // 更新 UI
        if (translatorSelect) translatorSelect.value = translatorEngine;
        if (langSelect) langSelect.value = targetLang;
        
        // 配置翻译管理器
        const config = {};
        if (translatorEngine === 'baidu') {
            config.appId = baiduAppId?.value || localStorage.getItem('baidu_app_id') || '';
            config.secret = baiduSecret?.value || localStorage.getItem('baidu_secret') || '';
        } else if (translatorEngine === 'microsoft') {
            config.apiKey = msApiKey?.value || localStorage.getItem('ms_api_key') || '';
            config.region = msRegion?.value || localStorage.getItem('ms_region') || 'global';
        }
        
        // 初始化翻译器实例
        if (translatorEngine === 'google' && typeof GoogleTranslator !== 'undefined') {
            translatorInstance = new GoogleTranslator();
        } else if (translatorEngine === 'baidu' && typeof BaiduTranslator !== 'undefined') {
            translatorInstance = new BaiduTranslator(config);
        } else if (translatorEngine === 'microsoft' && typeof MicrosoftTranslator !== 'undefined') {
            translatorInstance = new MicrosoftTranslator(config);
        } else {
            translatorInstance = {
                translate: async (text, lang) => {
                    console.warn('使用降级翻译器，返回原文');
                    return text;
                }
            };
        }
        
        if (window.translatorManager) {
            window.translatorManager.init({
                engine: translatorEngine,
                targetLang: targetLang,
                config: config
            });
        }
        
        console.log('翻译器已初始化:', translatorEngine, targetLang);
    }
    
    /**
     * 翻译文本（仅用于输入框手动翻译）
     */
    async function translateText(text) {
        if (!text || text.trim() === '') return text;
        
        const cacheKey = `${text}_${targetLang}_${translatorEngine}`;
        if (translationCache.has(cacheKey)) {
            return translationCache.get(cacheKey);
        }
        
        try {
            let translated = text;
            const translator = getTranslator();
            
            if (translator && typeof translator.translate === 'function') {
                translated = await translator.translate(text, targetLang);
            } else if (window.translatorManager && window.translatorManager.translate) {
                translated = await window.translatorManager.translate(text);
            }
            
            translationCache.set(cacheKey, translated);
            
            if (translationCache.size > 200) {
                const firstKey = translationCache.keys().next().value;
                translationCache.delete(firstKey);
            }
            
            return translated;
        } catch (error) {
            console.error('翻译失败:', error);
            return text;
        }
    }
    
    /**
     * 翻译输入框内容（手动点击翻译按钮时触发）
     */
    async function translateInputContent() {
        const originalText = contentInput.value;
        if (!originalText || originalText.trim() === '') {
            contentInput.placeholder = '请先输入要翻译的内容';
            return;
        }
        
        const originalBtnText = translateInputBtn.innerHTML;
        translateInputBtn.innerHTML = '<span class="loading-spinner"></span>翻译中...';
        translateInputBtn.disabled = true;
        
        try {
            const translated = await translateText(originalText);
            contentInput.value = translated;
        } catch (error) {
            console.error('翻译失败:', error);
            contentInput.placeholder = '翻译失败，请检查网络或设置';
        } finally {
            translateInputBtn.innerHTML = originalBtnText;
            translateInputBtn.disabled = false;
        }
    }
    
    /**
     * 渲染推荐列表 - 只显示原文，没有任何额外文字
     */
    async function renderRecommendations() {
        const keyword = searchInput.value.trim();
        const items = DataLoader.searchTexts(currentMainType, currentSubType, keyword);
        
        resultCount.textContent = items.length;
        
        if (items.length === 0) {
            optionList.innerHTML = '<li class="empty-tip">✨ 没有找到匹配的文案</li>';
            return;
        }
        
        const typeName = categoryNames[currentMainType] || '';
        
        // 简洁的渲染：只显示原文和类型标签，没有任何"原文:"前缀或翻译
        optionList.innerHTML = items.map((item) => `
            <li data-id="${item.id}" data-text="${escapeHtml(item.text)}">
                <span style="flex:1;">${escapeHtml(item.text)}</span>
                <span class="badge">${typeName}</span>
            </li>
        `).join('');
        
        // 绑定点击事件：将选中内容填入输入框
        document.querySelectorAll('.option-list li[data-text]').forEach(li => {
            li.addEventListener('click', () => {
                const originalText = li.getAttribute('data-text');
                contentInput.value = originalText;
                // 高亮输入框
                contentInput.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
                setTimeout(() => {
                    contentInput.style.backgroundColor = '';
                }, 300);
            });
        });
    }
    
    /**
     * 确认发送内容
     */
    function confirmAndSend() {
        const textToSend = contentInput.value;
        if (!textToSend || textToSend.trim() === '') {
            contentInput.placeholder = '请先选择或输入内容';
            contentInput.style.borderColor = '#ff6b6b';
            setTimeout(() => {
                contentInput.style.borderColor = '';
            }, 1000);
            return;
        }
        
        const category = {
            main: mainTypeSelect.options[mainTypeSelect.selectedIndex]?.text,
            sub: currentSubType
        };
        
        PostMessage.sendSelectedText(textToSend, category, {
            original: textToSend,
            translated: textToSend,
            fromEditor: true
        });
        
        PostMessage.sendClose();
    }
    
    /**
     * 关闭选择器
     */
    function closePicker() {
        PostMessage.sendClose();
    }
    
    /**
     * 显示/隐藏设置弹窗
     */
    function toggleSettingsModal(show) {
        if (settingsModal) {
            settingsModal.style.display = show ? 'flex' : 'none';
        }
    }
    
    /**
     * 保存所有设置
     */
    function saveAllSettings() {
        // 保存翻译设置
        translatorEngine = translatorSelect.value;
        targetLang = langSelect.value;
        
        saveSettingsToLocal();
        
        // 重新初始化翻译器
        const config = {};
        if (translatorEngine === 'baidu') {
            config.appId = baiduAppId?.value || '';
            config.secret = baiduSecret?.value || '';
        } else if (translatorEngine === 'microsoft') {
            config.apiKey = msApiKey?.value || '';
            config.region = msRegion?.value || 'global';
        }
        
        if (translatorEngine === 'google' && typeof GoogleTranslator !== 'undefined') {
            translatorInstance = new GoogleTranslator();
        } else if (translatorEngine === 'baidu' && typeof BaiduTranslator !== 'undefined') {
            translatorInstance = new BaiduTranslator(config);
        } else if (translatorEngine === 'microsoft' && typeof MicrosoftTranslator !== 'undefined') {
            translatorInstance = new MicrosoftTranslator(config);
        }
        
        if (window.translatorManager) {
            window.translatorManager.init({
                engine: translatorEngine,
                targetLang: targetLang,
                config: config
            });
        }
        
        translationCache.clear();
        
        // 重新渲染推荐列表
        renderRecommendations();
        
        // 关闭设置弹窗
        toggleSettingsModal(false);
        
        console.log('设置已保存');
    }
    
    /**
     * 切换标签页
     */
    function switchTab(tabId) {
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        tabBtns.forEach(btn => {
            btn.classList.remove('active');
        });
        
        const targetContent = document.getElementById(`${tabId}Tab`);
        if (targetContent) targetContent.classList.add('active');
        
        const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }
    
    /**
     * HTML 转义
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    /**
     * 填充子类型下拉框
     */
    function populateSubTypes() {
        currentMainType = mainTypeSelect.value;
        const subTypes = DataLoader.getSubTypes(currentMainType);
        
        subTypeSelect.innerHTML = '';
        
        if (subTypes.length === 0) {
            subTypeSelect.innerHTML = '<option value="">暂无子类型</option>';
            currentSubType = '';
            renderRecommendations();
            return;
        }
        
        subTypes.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            subTypeSelect.appendChild(option);
        });
        
        currentSubType = subTypes[0];
        subTypeSelect.value = currentSubType;
        renderRecommendations();
    }
    
    /**
     * 初始化主题管理器
     */
    function initTheme() {
        if (window.ThemeManager) {
            window.ThemeManager.init();
            window.ThemeManager.bindThemeButtons();
        } else {
            console.warn('ThemeManager 未加载');
        }
    }
    
    /**
     * 监听来自父页面的消息
     */
    function initMessageListener() {
        if (typeof PostMessage !== 'undefined') {
            PostMessage.listenToParent((data) => {
                if (data?.type === 'CLOSE_PICKER') {
                    closePicker();
                }
            });
        } else {
            console.warn('PostMessage 未加载');
        }
    }
    
    /**
     * 绑定所有事件
     */
    function bindEvents() {
        mainTypeSelect.addEventListener('change', () => {
            populateSubTypes();
        });
        
        subTypeSelect.addEventListener('change', (e) => {
            currentSubType = e.target.value;
            renderRecommendations();
        });
        
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderRecommendations();
            }, 300);
        });
        
        if (circleCloseBtn) {
            circleCloseBtn.addEventListener('click', closePicker);
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmAndSend);
        }
        
        if (translateInputBtn) {
            translateInputBtn.addEventListener('click', translateInputContent);
        }
        
        if (openSettingsBtn) {
            openSettingsBtn.addEventListener('click', () => toggleSettingsModal(true));
        }
        
        if (closeSettingsModalBtn) {
            closeSettingsModalBtn.addEventListener('click', () => toggleSettingsModal(false));
        }
        
        if (saveSettingsModalBtn) {
            saveSettingsModalBtn.addEventListener('click', saveAllSettings);
        }
        
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    toggleSettingsModal(false);
                }
            });
        }
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                if (tabId) switchTab(tabId);
            });
        });
        
        if (translatorSelect) {
            translatorSelect.addEventListener('change', (e) => {
                toggleEngineSettings(e.target.value);
            });
        }
    }
    
    /**
     * 显示加载状态
     */
    function showLoadingState() {
        optionList.innerHTML = '<li class="empty-tip">⏳ 正在加载数据...</li>';
        subTypeSelect.innerHTML = '<option value="">加载中...</option>';
    }
    
    /**
     * 显示错误状态
     */
    function showErrorState(message) {
        optionList.innerHTML = `<li class="empty-tip">❌ ${message}</li>`;
    }
    
    /**
     * 初始化应用
     */
    async function init() {
        showLoadingState();
        
        initTheme();
        initMessageListener();
        loadSettingsFromLocal();
        initTranslator();
        bindEvents();
        
        if (typeof DataLoader === 'undefined') {
            showErrorState('DataLoader 未加载，请检查文件引用');
            return;
        }
        
        const result = await DataLoader.loadData();
        
        if (!result.success) {
            showErrorState('数据加载失败，请检查网络后刷新');
            return;
        }
        
        populateSubTypes();
        
        console.log('应用初始化完成');
    }
    
    init();
});
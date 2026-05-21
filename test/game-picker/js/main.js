/**
 * 主逻辑模块
 * 初始化页面、绑定事件、渲染列表、集成翻译
 */

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', async () => {
    // DOM 元素
    const mainTypeSelect = document.getElementById('mainTypeSelect');
    const subTypeSelect = document.getElementById('subTypeSelect');
    const searchInput = document.getElementById('searchInput');
    const optionList = document.getElementById('optionList');
    const resultCount = document.getElementById('resultCount');
    const closeCircleBtn = document.getElementById('closeCircleBtn');
    const confirmBtn = document.getElementById('confirmBtn');
    const selectedInput = document.getElementById('selectedInput');
    const clearInputBtn = document.getElementById('clearInputBtn');
    const translateInputBtn = document.getElementById('translateInputBtn');
    const settingsToggleBtn = document.getElementById('settingsToggleBtn');
    const translateSettingsPanel = document.getElementById('translateSettingsPanel');
    const translateToggleBtn = document.getElementById('translateToggleBtn');
    const translatorSelect = document.getElementById('translatorSelect');
    const langSelect = document.getElementById('langSelect');
    const translateStatus = document.getElementById('translateStatus');
    
    // 当前状态
    let currentSubType = '';
    let currentMainType = 'ban';
    
    // 翻译相关变量
    let translateEnabled = false;
    let translatorEngine = 'google';
    let targetLang = 'en';
    
    // 缓存翻译结果
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
     * 更新翻译状态显示
     */
    function updateTranslateStatus() {
        if (translateStatus) {
            const engineNames = { google: 'Google', baidu: '百度', microsoft: '微软' };
            const langNames = {
                en: '英语', zh: '中文', ja: '日语', ko: '韩语',
                fr: '法语', de: '德语', es: '西班牙语', ru: '俄语'
            };
            const statusText = translateEnabled ? '已启用' : '未启用';
            const engineText = engineNames[translatorEngine] || translatorEngine;
            const langText = langNames[targetLang] || targetLang;
            translateStatus.innerHTML = `⚙️ 翻译状态：${statusText} | 引擎: ${engineText} | 目标语言: ${langText}`;
        }
    }
    
    /**
     * 初始化翻译器
     */
    function initTranslator() {
        const urlParams = new URLSearchParams(window.location.search);
        translatorEngine = urlParams.get('translator') || urlParams.get('t') || 'google';
        targetLang = urlParams.get('lang') || urlParams.get('l') || 'en';
        
        // 检查 URL 是否启用翻译
        const autoTranslate = urlParams.get('translate') === '1' || urlParams.get('auto') === '1';
        translateEnabled = autoTranslate;
        
        // 更新 UI
        if (translatorSelect) translatorSelect.value = translatorEngine;
        if (langSelect) langSelect.value = targetLang;
        
        // 配置翻译管理器
        const config = {};
        if (translatorEngine === 'baidu') {
            config.appId = urlParams.get('baidu_app_id') || localStorage.getItem('baidu_app_id') || '';
            config.secret = urlParams.get('baidu_secret') || localStorage.getItem('baidu_secret') || '';
        } else if (translatorEngine === 'microsoft') {
            config.apiKey = urlParams.get('ms_api_key') || localStorage.getItem('ms_api_key') || '';
            config.region = urlParams.get('ms_region') || localStorage.getItem('ms_region') || 'global';
        }
        
        if (window.translatorManager) {
            window.translatorManager.init({
                engine: translatorEngine,
                targetLang: targetLang,
                config: config
            });
        }
        
        if (translateToggleBtn) {
            translateToggleBtn.textContent = translateEnabled ? '🔘 关闭翻译' : '🔘 开启翻译';
        }
        
        updateTranslateStatus();
    }
    
    /**
     * 翻译文本（带缓存）
     */
    async function translateWithCache(text) {
        if (!translateEnabled) return text;
        if (!text || text.trim() === '') return text;
        
        const cacheKey = `${text}_${targetLang}_${translatorEngine}`;
        if (translationCache.has(cacheKey)) {
            return translationCache.get(cacheKey);
        }
        
        try {
            const translated = await window.translatorManager.translate(text);
            translationCache.set(cacheKey, translated);
            
            // 限制缓存大小
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
     * 翻译输入框内容
     */
    async function translateInputContent() {
        const originalText = selectedInput.value.trim();
        if (!originalText) {
            alert('请先选择或输入内容');
            return;
        }
        
        if (!translateEnabled) {
            alert('请先在翻译设置中开启翻译功能');
            settingsToggleBtn.click(); // 自动展开设置面板
            return;
        }
        
        // 显示加载状态
        const originalBtnText = translateInputBtn.textContent;
        translateInputBtn.textContent = '⏳ 翻译中...';
        translateInputBtn.disabled = true;
        
        try {
            const translated = await translateWithCache(originalText);
            selectedInput.value = translated;
        } catch (error) {
            console.error('翻译失败:', error);
            alert('翻译失败，请重试');
        } finally {
            translateInputBtn.textContent = originalBtnText;
            translateInputBtn.disabled = false;
        }
    }
    
    /**
     * 渲染推荐列表
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
        
        // 显示加载状态
        if (translateEnabled) {
            optionList.innerHTML = '<li class="empty-tip">🔄 加载翻译中...</li>';
        }
        
        // 批量翻译
        let translatedTexts = items.map(item => item.text);
        if (translateEnabled) {
            translatedTexts = await Promise.all(items.map(item => translateWithCache(item.text)));
        }
        
        optionList.innerHTML = items.map((item, index) => `
            <li data-id="${item.id}" data-text="${escapeHtml(item.text)}">
                <div style="flex:1">
                    <div style="margin-bottom: 4px;">${escapeHtml(translatedTexts[index])}</div>
                    ${translateEnabled ? `<div style="font-size: 11px; opacity: 0.6;">原文: ${escapeHtml(item.text)}</div>` : ''}
                </div>
                <span class="badge">${typeName}</span>
            </li>
        `).join('');
        
        // 绑定点击事件 - 添加到输入框（不关闭）
        document.querySelectorAll('.option-list li[data-text]').forEach(li => {
            li.addEventListener('click', () => {
                const originalText = li.getAttribute('data-text');
                // 添加到输入框
                selectedInput.value = originalText;
                // 可选：添加视觉反馈
                li.style.backgroundColor = 'rgba(102, 126, 234, 0.3)';
                setTimeout(() => {
                    li.style.backgroundColor = '';
                }, 200);
            });
        });
    }
    
    /**
     * 确认发送
     */
    function confirmAndSend() {
        const content = selectedInput.value.trim();
        if (!content) {
            alert('请先选择或输入内容');
            return;
        }
        
        const category = {
            main: mainTypeSelect.options[mainTypeSelect.selectedIndex]?.text,
            sub: currentSubType
        };
        
        // 发送消息
        PostMessage.sendSelectedText(content, category, {
            original: content,
            translated: content  // 如果启用了翻译，这里可以传翻译后的
        });
        
        // 关闭选择器
        PostMessage.sendClose();
    }
    
    /**
     * 清空输入框
     */
    function clearInput() {
        selectedInput.value = '';
        selectedInput.focus();
    }
    
    /**
     * 关闭选择器
     */
    function closePicker() {
        PostMessage.sendClose();
    }
    
    /**
     * 切换翻译设置面板
     */
    function toggleSettingsPanel() {
        translateSettingsPanel.classList.toggle('show');
        settingsToggleBtn.textContent = translateSettingsPanel.classList.contains('show') ? '🔒 隐藏设置' : '⚙️ 显示设置';
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
        const container = document.getElementById('pickerContainer');
        if (container && window.ThemeManager) {
            window.ThemeManager.init(container);
        }
    }
    
    /**
     * 监听来自父页面的消息
     */
    function initMessageListener() {
        PostMessage.listenToParent((data) => {
            if (data?.type === 'CLOSE_PICKER') {
                closePicker();
            }
        });
    }
    
    /**
     * 绑定翻译控件事件
     */
    function bindTranslateEvents() {
        if (translatorSelect) {
            translatorSelect.addEventListener('change', async (e) => {
                translatorEngine = e.target.value;
                
                const config = {};
                if (translatorEngine === 'baidu') {
                    config.appId = localStorage.getItem('baidu_app_id') || '';
                    config.secret = localStorage.getItem('baidu_secret') || '';
                } else if (translatorEngine === 'microsoft') {
                    config.apiKey = localStorage.getItem('ms_api_key') || '';
                    config.region = localStorage.getItem('ms_region') || 'global';
                }
                
                if (window.translatorManager) {
                    window.translatorManager.init({
                        engine: translatorEngine,
                        targetLang: targetLang,
                        config: config
                    });
                }
                
                translationCache.clear();
                if (translateEnabled) {
                    await renderRecommendations();
                }
                updateTranslateStatus();
            });
        }
        
        if (langSelect) {
            langSelect.addEventListener('change', async (e) => {
                targetLang = e.target.value;
                if (window.translatorManager) {
                    window.translatorManager.setTargetLanguage(targetLang);
                }
                translationCache.clear();
                if (translateEnabled) {
                    await renderRecommendations();
                }
                updateTranslateStatus();
            });
        }
        
        if (translateToggleBtn) {
            translateToggleBtn.addEventListener('click', async () => {
                translateEnabled = !translateEnabled;
                translateToggleBtn.textContent = translateEnabled ? '🔘 关闭翻译' : '🔘 开启翻译';
                translationCache.clear();
                await renderRecommendations();
                updateTranslateStatus();
                
                // 通知父页面翻译状态变化
                PostMessage.sendTranslateStatus(translateEnabled, translatorEngine, targetLang);
            });
        }
    }
    
    /**
     * 绑定其他事件
     */
    function bindEvents() {
        // 主类型变化
        mainTypeSelect.addEventListener('change', () => {
            populateSubTypes();
        });
        
        // 子类型变化
        subTypeSelect.addEventListener('change', (e) => {
            currentSubType = e.target.value;
            renderRecommendations();
        });
        
        // 搜索输入（防抖）
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderRecommendations();
            }, 300);
        });
        
        // 圆形关闭按钮
        closeCircleBtn.addEventListener('click', closePicker);
        
        // 确认按钮
        confirmBtn.addEventListener('click', confirmAndSend);
        
        // 清空输入框
        clearInputBtn.addEventListener('click', clearInput);
        
        // 翻译输入框按钮
        translateInputBtn.addEventListener('click', translateInputContent);
        
        // 翻译设置面板切换
        settingsToggleBtn.addEventListener('click', toggleSettingsPanel);
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
        
        // 初始化主题
        initTheme();
        
        // 初始化消息监听
        initMessageListener();
        
        // 初始化翻译
        initTranslator();
        
        // 绑定翻译控件事件
        bindTranslateEvents();
        
        // 加载数据
        const result = await DataLoader.loadData();
        
        if (!result.success) {
            showErrorState('数据加载失败，请检查网络后刷新');
            return;
        }
        
        // 绑定其他事件
        bindEvents();
        
        // 填充子类型
        populateSubTypes();
        
        // 默认隐藏翻译设置面板
        if (translateSettingsPanel) {
            translateSettingsPanel.classList.remove('show');
        }
    }
    
    // 启动应用
    init();
});
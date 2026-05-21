/**
 * 主逻辑模块
 * 初始化页面、绑定事件、渲染列表
 */

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', async () => {
    // DOM 元素
    const mainTypeSelect = document.getElementById('mainTypeSelect');
    const subTypeSelect = document.getElementById('subTypeSelect');
    const searchInput = document.getElementById('searchInput');
    const optionList = document.getElementById('optionList');
    const resultCount = document.getElementById('resultCount');
    const closeBtn = document.getElementById('closeBtn');
    
    // 当前状态
    let currentSubType = '';
    let currentMainType = 'ban';
    
    // 分类名称映射
    const categoryNames = {
        ban: '封号',
        announcement: '停服公告',
        notice: '系统通知',
        reward: '补偿公告',
        maintenance: '维护公告'
    };
    
    /**
     * 渲染推荐列表
     */
    function renderRecommendations() {
        const keyword = searchInput.value.trim();
        const items = DataLoader.searchTexts(currentMainType, currentSubType, keyword);
        
        resultCount.textContent = items.length;
        
        if (items.length === 0) {
            optionList.innerHTML = '<li class="empty-tip">✨ 没有找到匹配的文案</li>';
            return;
        }
        
        const typeName = categoryNames[currentMainType] || '';
        
        optionList.innerHTML = items.map(item => `
            <li data-id="${item.id}" data-text="${escapeHtml(item.text)}">
                <span>${escapeHtml(item.text)}</span>
                <span class="badge">${typeName}</span>
            </li>
        `).join('');
        
        // 绑定点击事件
        document.querySelectorAll('.option-list li[data-text]').forEach(li => {
            li.addEventListener('click', () => {
                const text = li.getAttribute('data-text');
                const category = {
                    main: mainTypeSelect.options[mainTypeSelect.selectedIndex]?.text,
                    sub: currentSubType
                };
                PostMessage.sendSelectedText(text, category);
            });
        });
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
     * 关闭选择器
     */
    function closePicker() {
        PostMessage.sendClose();
    }
    
    /**
     * 初始化主题管理器
     */
    function initTheme() {
        const container = document.getElementById('pickerContainer');
        if (container) {
            ThemeManager.init(container);
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
     * 绑定事件
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
        
        // 搜索输入
        searchInput.addEventListener('input', () => {
            renderRecommendations();
        });
        
        // 关闭按钮
        closeBtn.addEventListener('click', closePicker);
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
        
        // 加载数据
        const result = await DataLoader.loadData();
        
        if (!result.success) {
            showErrorState('数据加载失败，请检查网络后刷新');
            return;
        }
        
        // 绑定事件
        bindEvents();
        
        // 填充子类型
        populateSubTypes();
    }
    
    // 启动应用
    init();
});
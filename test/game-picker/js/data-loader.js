/**
 * 数据加载模块
 * 负责从 JSON 文件加载游戏运营数据
 */

const DataLoader = (function() {
    // 数据存储
    let rawData = null;           // 原始 JSON 数据
    let database = {};            // 转换后的嵌套结构
    let schema = null;            // 字段定义
    let isLoading = false;
    let loadCallbacks = [];
    
    /**
     * 加载数据
     * @param {string} url - JSON 文件路径
     * @returns {Promise}
     */
    async function loadData(url = './data/game-data.json') {
        if (rawData !== null) {
            return { success: true, data: rawData };
        }
        
        if (isLoading) {
            return new Promise((resolve) => {
                loadCallbacks.push(resolve);
            });
        }
        
        isLoading = true;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const jsonData = await response.json();
            rawData = jsonData;
            schema = jsonData._schema || null;
            
            // 转换数据为嵌套结构
            transformData(jsonData.data || []);
            
            isLoading = false;
            
            // 触发所有等待的回调
            loadCallbacks.forEach(cb => cb({ success: true, data: jsonData }));
            loadCallbacks = [];
            
            return { success: true, data: jsonData };
            
        } catch (error) {
            console.error('加载数据失败:', error);
            isLoading = false;
            
            loadCallbacks.forEach(cb => cb({ success: false, error }));
            loadCallbacks = [];
            
            return { success: false, error };
        }
    }
    
    /**
     * 将扁平数据转换为嵌套结构
     * @param {Array} dataArray - 原始数据数组
     */
    function transformData(dataArray) {
        database = {};
        
        dataArray.forEach(item => {
            // 跳过未启用的项
            if (item.enabled === false) return;
            
            const category = item.category;
            const subCategory = item.subCategory;
            
            if (!category || !subCategory) return;
            
            if (!database[category]) {
                database[category] = {};
            }
            if (!database[category][subCategory]) {
                database[category][subCategory] = [];
            }
            
            // 存储完整的 item 对象，而不仅仅是 text
            database[category][subCategory].push(item);
        });
        
        // 按优先级排序
        for (const category in database) {
            for (const subCategory in database[category]) {
                database[category][subCategory].sort((a, b) => {
                    const priorityA = a.priority || 0;
                    const priorityB = b.priority || 0;
                    return priorityB - priorityA;
                });
            }
        }
    }
    
    /**
     * 获取转换后的数据库
     * @returns {Object}
     */
    function getDatabase() {
        return database;
    }
    
    /**
     * 获取 schema 定义
     * @returns {Object}
     */
    function getSchema() {
        return schema;
    }
    
    /**
     * 获取原始数据
     * @returns {Object}
     */
    function getRawData() {
        return rawData;
    }
    
    /**
     * 获取主分类的所有子类型
     * @param {string} mainType - 主分类
     * @returns {Array}
     */
    function getSubTypes(mainType) {
        const data = database[mainType];
        return data ? Object.keys(data) : [];
    }
    
    /**
     * 获取指定分类的文案列表
     * @param {string} mainType - 主分类
     * @param {string} subType - 子类型
     * @returns {Array}
     */
    function getTexts(mainType, subType) {
        if (!database[mainType] || !database[mainType][subType]) {
            return [];
        }
        return database[mainType][subType];
    }
    
    /**
     * 搜索文案（基于文本和标签）
     * @param {string} mainType - 主分类
     * @param {string} subType - 子类型
     * @param {string} keyword - 搜索关键词
     * @returns {Array}
     */
    function searchTexts(mainType, subType, keyword) {
        const items = getTexts(mainType, subType);
        
        if (!keyword || keyword.trim() === '') {
            return items;
        }
        
        const lowerKeyword = keyword.toLowerCase();
        
        return items.filter(item => {
            // 搜索文本内容
            if (item.text.toLowerCase().includes(lowerKeyword)) return true;
            // 搜索标签
            if (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))) return true;
            return false;
        });
    }
    
    // 公开 API
    return {
        loadData,
        getDatabase,
        getSchema,
        getRawData,
        getSubTypes,
        getTexts,
        searchTexts
    };
})();
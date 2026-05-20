// ============================================
// PlayFab 客户端 SDK - 浏览器直接调用
// 部署到外网 CDN 或静态服务器，供 HTML 页面引用
// ============================================

(function(global) {
    // PlayFab 配置（需要在使用前设置）
    let CONFIG = {
        titleId: null,
        secretKey: null,  // 注意：SecretKey 不应暴露在浏览器中！
        apiKey: null      // 用于管理后台的认证
    };
    
    // ==================== 辅助函数 ====================
    
    async function callPlayFabAdminApi(endpoint, body) {
        if (!CONFIG.titleId || !CONFIG.secretKey) {
            throw new Error('PlayFab not configured. Call setConfig() first.');
        }
        
        const url = `https://${CONFIG.titleId}.playfabapi.com/Admin/${endpoint}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-SecretKey': CONFIG.secretKey
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 调用失败: ${endpoint} - HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.code !== 200) {
            throw new Error(`API 错误: ${result.status} - ${result.errorMessage || result.message}`);
        }
        
        return result.data;
    }
    
    // ==================== 配置 ====================
    
    /**
     * 设置 PlayFab 配置
     * @param {object} config - 配置对象 { titleId, secretKey, apiKey }
     */
    function setConfig(config) {
        if (config.titleId) CONFIG.titleId = config.titleId;
        if (config.secretKey) CONFIG.secretKey = config.secretKey;
        if (config.apiKey) CONFIG.apiKey = config.apiKey;
    }
    
    function getConfig() {
        return { ...CONFIG };
    }
    
    // ==================== 封禁相关 ====================
    
    /**
     * 获取玩家封禁信息
     * @param {string} playFabId - PlayFab ID
     * @returns {Promise<object>} 封禁信息
     */
    async function getPlayerBanInfo(playFabId) {
        try {
            const bansResult = await callPlayFabAdminApi('GetUserBans', { PlayFabId: playFabId });
            const activeBan = bansResult.BanData?.find(ban => ban.Active === true);
            
            if (activeBan) {
                return {
                    isBanned: true,
                    banReason: activeBan.Reason,
                    banExpires: activeBan.Expires,
                    banId: activeBan.BanId,
                    ipAddress: activeBan.IPAddress || null
                };
            }
            return { isBanned: false, banReason: null, banExpires: null, banId: null, ipAddress: null };
        } catch (err) {
            console.error('获取封禁信息失败:', err.message);
            return { isBanned: false, banReason: null, banExpires: null, banId: null, ipAddress: null };
        }
    }
    
    /**
     * 封禁玩家
     * @param {string} playFabId - PlayFab ID
     * @param {string} reason - 封禁原因
     * @param {number} durationHours - 封禁时长（0表示永久）
     * @param {string} ipAddress - IP 地址（可选）
     * @returns {Promise<object>} 封禁结果
     */
    async function banPlayer(playFabId, reason, durationHours = 0, ipAddress = null) {
        const banData = { 
            PlayFabId: playFabId, 
            Reason: reason || '违规操作',
            Permanent: durationHours === 0
        };
        
        if (durationHours > 0) {
            banData.DurationInHours = durationHours;
        }
        
        if (ipAddress && ipAddress.trim()) {
            banData.IPAddress = ipAddress.trim();
        }
        
        const result = await callPlayFabAdminApi('BanUsers', { Bans: [banData] });
        await new Promise(resolve => setTimeout(resolve, 1500));
        return result;
    }
    
    /**
     * 解封玩家
     * @param {string} playFabId - PlayFab ID
     * @returns {Promise<object>} 解封结果
     */
    async function unbanPlayer(playFabId) {
        try {
            const result = await callPlayFabAdminApi('RevokeAllBansForUser', { PlayFabId: playFabId });
            await new Promise(resolve => setTimeout(resolve, 1500));
            return result;
        } catch (err) {
            console.error('RevokeAllBansForUser 失败:', err);
            
            try {
                const bansResult = await callPlayFabAdminApi('GetUserBans', { PlayFabId: playFabId });
                const activeBanIds = bansResult.BanData
                    ?.filter(ban => ban.Active === true)
                    .map(ban => ban.BanId) || [];
                
                if (activeBanIds.length === 0) {
                    throw new Error('未找到活跃的封禁记录');
                }
                
                const revokeResult = await callPlayFabAdminApi('RevokeBans', { BanIds: activeBanIds });
                await new Promise(resolve => setTimeout(resolve, 1500));
                return revokeResult;
            } catch (innerErr) {
                throw new Error(`解封失败: ${innerErr.message}`);
            }
        }
    }
    
    /**
     * 更新封禁信息
     * @param {string} banId - 封禁记录 ID
     * @param {object} updates - 更新内容 { reason, durationHours }
     * @returns {Promise<object>} 更新结果
     */
    async function updateBanInfo(banId, updates) {
        const banUpdate = { BanId: banId };
        
        if (updates.reason !== undefined) banUpdate.Reason = updates.reason;
        if (updates.durationHours !== undefined) {
            if (updates.durationHours === 0) {
                banUpdate.Permanent = true;
            } else {
                banUpdate.Permanent = false;
                const expires = new Date();
                expires.setHours(expires.getHours() + updates.durationHours);
                banUpdate.Expires = expires.toISOString();
            }
        }
        if (updates.active !== undefined) banUpdate.Active = updates.active;
        if (updates.ipAddress !== undefined) banUpdate.IPAddress = updates.ipAddress;
        
        const result = await callPlayFabAdminApi('UpdateBans', { Bans: [banUpdate] });
        await new Promise(resolve => setTimeout(resolve, 1500));
        return result;
    }
    
    // ==================== 玩家搜索 ====================
    
    /**
     * 通过 PlayFab ID 搜索玩家
     * @param {string} playFabId - PlayFab ID
     * @returns {Promise<object|null>} 玩家信息
     */
    async function searchPlayerByPlayFabId(playFabId) {
        try {
            const profile = await callPlayFabAdminApi('GetPlayerProfile', {
                PlayFabId: playFabId,
                ProfileConstraints: {
                    ShowDisplayName: true,
                    ShowEmail: true,
                    ShowCreated: true,
                    ShowLastLogin: true
                }
            });
            
            if (!profile.PlayerProfile) return null;
            
            const banInfo = await getPlayerBanInfo(playFabId);
            
            let diamondBalance = 0;
            try {
                const inventory = await callPlayFabAdminApi('GetUserInventory', { PlayFabId: playFabId });
                if (inventory.VirtualCurrency?.DI) diamondBalance = inventory.VirtualCurrency.DI;
            } catch (err) {}
            
            return {
                playFabId: profile.PlayerProfile.PlayerId,
                displayName: profile.PlayerProfile.DisplayName || '',
                email: profile.PlayerProfile.Email || '',
                createdTime: profile.PlayerProfile.Created,
                lastLoginTime: profile.PlayerProfile.LastLogin,
                diamondBalance: diamondBalance,
                isBanned: banInfo.isBanned,
                banReason: banInfo.banReason,
                banExpires: banInfo.banExpires,
                banId: banInfo.banId,
                ipAddress: banInfo.ipAddress
            };
        } catch (err) {
            console.error('PlayFab ID 搜索失败:', err);
            return null;
        }
    }
    
    /**
     * 通过显示名称搜索玩家
     * @param {string} displayName - 显示名称
     * @returns {Promise<object|null>} 玩家信息
     */
    async function searchPlayerByDisplayName(displayName) {
        try {
            const result = await callPlayFabAdminApi('GetUserAccountInfo', {
                TitleDisplayName: displayName
            });
            
            const userInfo = result?.UserInfo || result?.AccountInfo;
            
            if (userInfo?.PlayFabId) {
                return await searchPlayerByPlayFabId(userInfo.PlayFabId);
            }
            return null;
        } catch (err) {
            if (err.message && err.message.includes('AccountNotFound')) {
                return null;
            }
            console.error('显示名称查找失败:', err);
            return null;
        }
    }
    
    // ==================== 分段相关 ====================
    
    /**
     * 获取所有分段列表
     * @returns {Promise<Array>} 分段列表
     */
    async function getAllSegments() {
        try {
            const segments = await callPlayFabAdminApi('GetAllSegments', {});
            return segments.Segments || [];
        } catch (err) {
            console.error('获取分段列表失败:', err);
            return [];
        }
    }
    
    // ==================== 关联平台账号 ====================
    
    /**
     * 获取玩家关联的第三方平台账号
     * @param {string} playFabId - PlayFab ID
     * @returns {Promise<object>} 关联账号信息
     */
    async function getLinkedPlatformAccounts(playFabId) {
        try {
            const profile = await callPlayFabAdminApi('GetPlayerProfile', {
                PlayFabId: playFabId,
                ProfileConstraints: {
                    ShowLinkedAccounts: true,
                    ShowDisplayName: true,
                    ShowEmail: true
                }
            });
            
            const playerProfile = profile.PlayerProfile;
            return {
                success: true,
                playFabId: playerProfile.PlayerId,
                displayName: playerProfile.DisplayName,
                email: playerProfile.Email,
                linkedAccounts: playerProfile.LinkedAccounts || []
            };
        } catch (err) {
            return { success: false, error: err.message, linkedAccounts: [] };
        }
    }
    
    /**
     * 批量获取玩家关联平台账号
     * @param {string[]} playFabIds - PlayFab ID 数组
     * @returns {Promise<object>} 批量结果
     */
    async function batchGetLinkedAccounts(playFabIds) {
        const results = [];
        for (const id of playFabIds) {
            const linked = await getLinkedPlatformAccounts(id);
            results.push({
                playFabId: id,
                linkedAccounts: linked.linkedAccounts || [],
                error: linked.error || null
            });
            await new Promise(r => setTimeout(r, 100));
        }
        return { success: true, results };
    }
    
    // ==================== 导出数据 ====================
    
    /**
     * 导出数据为 CSV
     * @param {Array} data - 数据数组
     * @param {string} filename - 文件名
     */
    function exportToCSV(data, filename) {
        if (!data || data.length === 0) throw new Error('No data to export');
        
        const headers = Object.keys(data[0]);
        let csv = headers.join(',') + '\n';
        
        data.forEach(row => {
            const values = headers.map(h => {
                let val = row[h];
                if (val === undefined || val === null) val = '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                if (typeof val === 'object') val = JSON.stringify(val);
                return val;
            });
            csv += values.join(',') + '\n';
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    /**
     * 导出数据为 JSON
     * @param {Array} data - 数据数组
     * @param {string} filename - 文件名
     */
    function exportToJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    // ==================== 导出所有公开 API ====================
    
    const PlayFabAPI = {
        // 配置
        setConfig,
        getConfig,
        
        // 封禁管理
        getPlayerBanInfo,
        banPlayer,
        unbanPlayer,
        updateBanInfo,
        
        // 玩家搜索
        searchPlayerByPlayFabId,
        searchPlayerByDisplayName,
        
        // 分段
        getAllSegments,
        
        // 关联平台
        getLinkedPlatformAccounts,
        batchGetLinkedAccounts,
        
        // 导出
        exportToCSV,
        exportToJSON
    };
    
    // 导出到全局
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PlayFabAPI;
    } else {
        global.PlayFabAPI = PlayFabAPI;
    }
    
})(typeof window !== 'undefined' ? window : global);
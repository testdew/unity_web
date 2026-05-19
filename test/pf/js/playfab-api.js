// PlayFab API 调用封装 - 直接调用 PlayFab

/**
 * 调用 PlayFab Admin API
 */
export async function callPlayFabAdminApi(titleId, secretKey, endpoint, body) {
    const url = `https://${titleId}.playfabapi.com/Admin/${endpoint}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-SecretKey': secretKey
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

/**
 * 通过 PlayFab ID 搜索玩家
 */
export async function searchPlayerByPlayFabId(titleId, secretKey, playFabId) {
    try {
        const profile = await callPlayFabAdminApi(titleId, secretKey, 'GetPlayerProfile', {
            PlayFabId: playFabId,
            ProfileConstraints: {
                ShowDisplayName: true,
                ShowEmail: true,
                ShowCreated: true,
                ShowLastLogin: true
            }
        });
        
        if (!profile.PlayerProfile) return null;
        
        let diamondBalance = 0;
        try {
            const inventory = await callPlayFabAdminApi(titleId, secretKey, 'GetUserInventory', {
                PlayFabId: playFabId
            });
            if (inventory.VirtualCurrency?.DI) diamondBalance = inventory.VirtualCurrency.DI;
        } catch (err) {}
        
        // 获取封禁信息
        let isBanned = false;
        let banReason = null;
        let banExpires = null;
        let banId = null;
        try {
            const bans = await callPlayFabAdminApi(titleId, secretKey, 'GetUserBans', {
                PlayFabId: playFabId
            });
            const activeBan = bans.BanData?.find(ban => ban.Active === true);
            if (activeBan) {
                isBanned = true;
                banReason = activeBan.Reason;
                banExpires = activeBan.Expires;
                banId = activeBan.BanId;
            }
        } catch (err) {}
        
        return {
            playFabId: profile.PlayerProfile.PlayerId,
            displayName: profile.PlayerProfile.DisplayName || '',
            email: profile.PlayerProfile.Email || '',
            createdTime: profile.PlayerProfile.Created,
            lastLoginTime: profile.PlayerProfile.LastLogin,
            diamondBalance: diamondBalance,
            isBanned: isBanned,
            banReason: banReason,
            banExpires: banExpires,
            banId: banId
        };
    } catch (err) {
        console.error('搜索失败:', err);
        return null;
    }
}

/**
 * 通过显示名称搜索玩家
 */
export async function searchPlayerByDisplayName(titleId, secretKey, displayName) {
    try {
        const result = await callPlayFabAdminApi(titleId, secretKey, 'GetUserAccountInfo', {
            TitleDisplayName: displayName
        });
        
        const userInfo = result?.UserInfo || result?.AccountInfo;
        
        if (userInfo?.PlayFabId) {
            const playFabId = userInfo.PlayFabId;
            return await searchPlayerByPlayFabId(titleId, secretKey, playFabId);
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

/**
 * 封禁玩家
 */
export async function banPlayer(titleId, secretKey, playFabId, reason, durationHours = 0, ipAddress = null) {
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
    
    const result = await callPlayFabAdminApi(titleId, secretKey, 'BanUsers', { Bans: [banData] });
    await new Promise(resolve => setTimeout(resolve, 1500));
    return result;
}

/**
 * 解封玩家
 */
export async function unbanPlayer(titleId, secretKey, playFabId) {
    try {
        const result = await callPlayFabAdminApi(titleId, secretKey, 'RevokeAllBansForUser', {
            PlayFabId: playFabId
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
        return result;
    } catch (err) {
        console.error('RevokeAllBansForUser 失败:', err);
        try {
            const bans = await callPlayFabAdminApi(titleId, secretKey, 'GetUserBans', {
                PlayFabId: playFabId
            });
            const activeBanIds = bans.BanData?.filter(ban => ban.Active === true).map(ban => ban.BanId) || [];
            if (activeBanIds.length === 0) {
                throw new Error('未找到活跃的封禁记录');
            }
            const revokeResult = await callPlayFabAdminApi(titleId, secretKey, 'RevokeBans', {
                BanIds: activeBanIds
            });
            await new Promise(resolve => setTimeout(resolve, 1500));
            return revokeResult;
        } catch (innerErr) {
            throw new Error(`解封失败: ${innerErr.message}`);
        }
    }
}

/**
 * 更新封禁信息
 */
export async function updateBanInfo(titleId, secretKey, banId, reason, durationHours = 0) {
    const banUpdate = { BanId: banId };
    banUpdate.Reason = reason;
    
    if (durationHours === 0) {
        banUpdate.Permanent = true;
    } else {
        banUpdate.Permanent = false;
        const expires = new Date();
        expires.setHours(expires.getHours() + durationHours);
        banUpdate.Expires = expires.toISOString();
    }
    
    const result = await callPlayFabAdminApi(titleId, secretKey, 'UpdateBans', {
        Bans: [banUpdate]
    });
    await new Promise(resolve => setTimeout(resolve, 1500));
    return result;
}

/**
 * 获取分段列表
 */
export async function getSegmentsList(titleId, secretKey) {
    try {
        const result = await callPlayFabAdminApi(titleId, secretKey, 'GetAllSegments', {});
        return result.Segments || [];
    } catch (err) {
        console.error('获取分段列表失败:', err);
        return [];
    }
}

/**
 * 获取玩家自定义数据
 */
export async function getUserData(titleId, secretKey, playFabId) {
    try {
        return await callPlayFabAdminApi(titleId, secretKey, 'GetUserData', { PlayFabId: playFabId });
    } catch (err) {
        console.error('获取玩家数据失败:', err);
        return { Data: {} };
    }
}


/**
 * 从分段获取玩家账号列表
 */
export async function getAccountsFromSegment(titleId, secretKey, segmentId) {
    try {
        // 创建导出任务
        const exportResult = await callPlayFabAdminApi(titleId, secretKey, 'ExportPlayersInSegment', {
            SegmentId: segmentId,
            SegmentNameOverride: `Export_${Date.now()}`
        });
        
        const exportId = exportResult.ExportId;
        let downloadUrl = null;
        let attempts = 0;
        const maxAttempts = 30;
        
        // 轮询等待导出完成
        while (!downloadUrl && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;
            try {
                const statusResult = await callPlayFabAdminApi(titleId, secretKey, 'GetSegmentExport', {
                    ExportId: exportId
                });
                if (statusResult.IndexUrl) {
                    downloadUrl = statusResult.IndexUrl;
                } else if (statusResult.State === 'Completed' && statusResult.ExportUrl) {
                    downloadUrl = statusResult.ExportUrl;
                }
            } catch (err) {
                console.log('等待导出完成...', attempts);
            }
        }
        
        if (!downloadUrl) {
            throw new Error('分段导出超时');
        }
        
        // 下载索引文件
        const indexResponse = await fetch(downloadUrl);
        const indexContent = await indexResponse.text();
        const urls = indexContent.split('\n').filter(u => u.trim());
        
        const accounts = [];
        
        for (const url of urls) {
            if (url.trim()) {
                try {
                    const dataResponse = await fetch(url.trim());
                    const tsvData = await dataResponse.text();
                    const parsed = parseTSVToAccounts(tsvData);
                    accounts.push(...parsed);
                } catch (err) {
                    console.error('下载数据文件失败:', err);
                }
            }
        }
        
        return accounts;
    } catch (err) {
        console.error('获取分段玩家失败:', err);
        return [];
    }
}

/**
 * 解析 TSV 数据为账号对象
 */
function parseTSVToAccounts(tsvData) {
    const lines = tsvData.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split('\t');
    const accounts = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        const account = {};
        
        headers.forEach((header, idx) => {
            const val = (values[idx] || '').trim();
            switch (header.trim()) {
                case 'PlayFabId':
                case 'PlayerId':
                    account.playFabId = val;
                    break;
                case 'DisplayName':
                    account.displayName = val;
                    break;
                case 'Email':
                    account.email = val;
                    break;
                case 'Created':
                    account.createdTime = val;
                    break;
                case 'LastLogin':
                    account.lastLoginTime = val;
                    break;
                case 'DiamondBalance':
                case 'DI':
                    account.diamondBalance = parseInt(val) || 0;
                    break;
            }
        });
        
        if (account.playFabId) {
            accounts.push(account);
        }
    }
    
    return accounts;
}

/**
 * 应用筛选条件到账号列表
 */
export function applyFilters(accounts, filters, titleId, secretKey) {
    let filtered = [...accounts];
    const now = new Date();
    
    // 最近登录天数筛选
    if (filters.lastLoginDays !== undefined && filters.lastLoginDays > 0) {
        filtered = filtered.filter(account => {
            if (!account.lastLoginTime) return false;
            const daysSince = (now - new Date(account.lastLoginTime)) / (1000 * 60 * 60 * 24);
            return daysSince <= filters.lastLoginDays;
        });
    }
    
    // 未登录天数筛选
    if (filters.notLoginDays !== undefined && filters.notLoginDays > 0) {
        filtered = filtered.filter(account => {
            if (!account.lastLoginTime) return true;
            const daysSince = (now - new Date(account.lastLoginTime)) / (1000 * 60 * 60 * 24);
            return daysSince >= filters.notLoginDays;
        });
    }
    
    // 钻石范围筛选
    if (filters.minDiamond !== undefined && filters.minDiamond >= 0) {
        filtered = filtered.filter(account => (account.diamondBalance || 0) >= filters.minDiamond);
    }
    if (filters.maxDiamond !== undefined && filters.maxDiamond >= 0) {
        filtered = filtered.filter(account => (account.diamondBalance || 0) <= filters.maxDiamond);
    }
    
    return filtered;
}
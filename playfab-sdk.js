// ============================================
// PlayFab SDK - 浏览器端直接调用
// 部署后通过 <script src="playfab-sdk.js"></script> 引入
// ============================================

(function(global) {
    'use strict';
    
    // ==================== 配置 ====================
    let PlayFabSettings = {
        titleId: '',
        secretKey: '',      // 注意：SecretKey 不应暴露在前端，仅用于 Admin API
        useAdminApi: false,  // 是否使用 Admin API（需要 SecretKey）
        apiKey: ''           // 自定义 API Key 用于认证
    };
    
    // ==================== 辅助函数 ====================
    
    /**
     * 调用 PlayFab Client API
     */
    async function callPlayFabClientApi(endpoint, body) {
        const url = `https://${PlayFabSettings.titleId}.playfabapi.com/Client/${endpoint}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 调用失败: ${endpoint} - HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.code !== 200) {
            throw new Error(`API 错误: ${result.status} - ${result.errorMessage || result.message}`);
        }
        
        return result.data;
    }
    
    /**
     * 调用 PlayFab Admin API（需要 SecretKey）
     */
    async function callPlayFabAdminApi(endpoint, body) {
        const url = `https://${PlayFabSettings.titleId}.playfabapi.com/Admin/${endpoint}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-SecretKey': PlayFabSettings.secretKey
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 调用失败: ${endpoint} - HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.code !== 200) {
            throw new Error(`API 错误: ${result.status} - ${result.errorMessage || result.message}`);
        }
        
        return result.data;
    }
    
    // ==================== 配置函数 ====================
    
    /**
     * 初始化 PlayFab SDK
     * @param {Object} config - 配置对象
     * @param {string} config.titleId - PlayFab Title ID
     * @param {string} config.secretKey - PlayFab Secret Key（Admin API 需要）
     * @param {string} config.apiKey - 自定义 API Key
     */
    function init(config) {
        PlayFabSettings = { ...PlayFabSettings, ...config };
        console.log('[PlayFab SDK] 已初始化, TitleId:', PlayFabSettings.titleId);
    }
    
    /**
     * 获取当前配置
     */
    function getConfig() {
        return { ...PlayFabSettings };
    }
    
    // ==================== 封禁相关 ====================
    
    /**
     * 获取玩家封禁信息
     */
    async function getPlayerBanInfo(playFabId) {
        if (!PlayFabSettings.secretKey) {
            throw new Error('Admin API 需要配置 secretKey');
        }
        try {
            const bansResult = await callPlayFabAdminApi('GetUserBans', {
                PlayFabId: playFabId
            });
            
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
     * @param {string} playFabId - 玩家 PlayFab ID
     * @param {string} reason - 封禁原因
     * @param {number} durationHours - 封禁时长（0表示永久）
     * @param {string} ipAddress - IP 地址（可选）
     */
    async function banPlayer(playFabId, reason, durationHours = 0, ipAddress = null) {
        if (!PlayFabSettings.secretKey) {
            throw new Error('Admin API 需要配置 secretKey');
        }
        
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
     */
    async function unbanPlayer(playFabId) {
        if (!PlayFabSettings.secretKey) {
            throw new Error('Admin API 需要配置 secretKey');
        }
        
        try {
            const result = await callPlayFabAdminApi('RevokeAllBansForUser', {
                PlayFabId: playFabId
            });
            await new Promise(resolve => setTimeout(resolve, 1500));
            return result;
        } catch (err) {
            console.error('RevokeAllBansForUser 失败:', err);
            
            try {
                const bansResult = await callPlayFabAdminApi('GetUserBans', {
                    PlayFabId: playFabId
                });
                
                const activeBanIds = bansResult.BanData
                    ?.filter(ban => ban.Active === true)
                    .map(ban => ban.BanId) || [];
                
                if (activeBanIds.length === 0) {
                    throw new Error('未找到活跃的封禁记录');
                }
                
                const revokeResult = await callPlayFabAdminApi('RevokeBans', {
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
    async function updateBanInfo(banId, updates) {
        if (!PlayFabSettings.secretKey) {
            throw new Error('Admin API 需要配置 secretKey');
        }
        
        const banUpdate = { BanId: banId };
        
        if (updates.reason !== undefined) banUpdate.Reason = updates.reason;
        if (updates.expires !== undefined) banUpdate.Expires = updates.expires;
        if (updates.permanent !== undefined) banUpdate.Permanent = updates.permanent;
        if (updates.active !== undefined) banUpdate.Active = updates.active;
        if (updates.ipAddress !== undefined) banUpdate.IPAddress = updates.ipAddress;
        
        const result = await callPlayFabAdminApi('UpdateBans', {
            Bans: [banUpdate]
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        return result;
    }
    
    // ==================== 玩家搜索 ====================
    
    /**
     * 通过 PlayFab ID 搜索玩家
     */
    async function searchPlayerByPlayFabId(playFabId, getDevices = false) {
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
                const inventory = await callPlayFabAdminApi('GetUserInventory', {
                    PlayFabId: playFabId
                });
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
     */
    async function searchPlayerByDisplayName(displayName) {
        try {
            const result = await callPlayFabAdminApi('GetUserAccountInfo', {
                TitleDisplayName: displayName
            });
            
            const userInfo = result?.UserInfo || result?.AccountInfo;
            
            if (userInfo?.PlayFabId) {
                const playFabId = userInfo.PlayFabId;
                return await searchPlayerByPlayFabId(playFabId);
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
     * 获取玩家完整档案
     */
    async function getPlayerProfile(playFabId) {
        const profile = await callPlayFabAdminApi('GetPlayerProfile', {
            PlayFabId: playFabId,
            ProfileConstraints: {
                ShowDisplayName: true,
                ShowEmail: true,
                ShowCreated: true,
                ShowLastLogin: true,
                ShowLinkedAccounts: true
            }
        });
        
        const banInfo = await getPlayerBanInfo(playFabId);
        
        return { 
            PlayerProfile: profile.PlayerProfile, 
            isBanned: banInfo.isBanned,
            banReason: banInfo.banReason,
            banExpires: banInfo.banExpires,
            banId: banInfo.banId,
            ipAddress: banInfo.ipAddress
        };
    }
    
    /**
     * 获取玩家库存
     */
    async function getPlayerInventory(playFabId) {
        try {
            return await callPlayFabAdminApi('GetUserInventory', { PlayFabId: playFabId });
        } catch (err) {
            return { VirtualCurrency: {}, Inventory: [] };
        }
    }
    
    /**
     * 获取玩家统计数据
     */
    async function getPlayerStatistics(playFabId) {
        try {
            return await callPlayFabAdminApi('GetPlayerStatistics', { PlayFabId: playFabId });
        } catch (err) {
            return { Statistics: [] };
        }
    }
    
    /**
     * 获取玩家自定义数据
     */
    async function getUserData(playFabId) {
        try {
            return await callPlayFabAdminApi('GetUserData', { PlayFabId: playFabId });
        } catch (err) {
            return { Data: {} };
        }
    }
    
    // ==================== 关联平台账号 ====================
    
    /**
     * 获取玩家关联的第三方平台账号
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
     */
    async function batchGetLinkedAccounts(playFabIds, onProgress) {
        const results = [];
        for (let i = 0; i < playFabIds.length; i++) {
            const id = playFabIds[i];
            const linked = await getLinkedPlatformAccounts(id);
            results.push({
                playFabId: id,
                linkedAccounts: linked.linkedAccounts || [],
                error: linked.error || null
            });
            if (onProgress) onProgress(i + 1, playFabIds.length);
            await new Promise(r => setTimeout(r, 100));
        }
        return { success: true, results };
    }
    
    // ==================== 分段相关 ====================
    
    /**
     * 获取所有分段列表
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
    
    // ==================== 统一登录方式 ====================
    
    /**
     * PlayFab 客户端登录
     */
    async function playFabLogin(type, params) {
        let endpoint = '';
        let requestData = {
            TitleId: PlayFabSettings.titleId,
            CreateAccount: true
        };
        
        switch (type) {
            case 'email':
                endpoint = 'LoginWithEmailAddress';
                requestData.Email = params.email;
                requestData.Password = params.password;
                break;
            case 'username':
                endpoint = 'LoginWithPlayFab';
                requestData.Username = params.username;
                requestData.Password = params.password;
                break;
            case 'customId':
                endpoint = 'LoginWithCustomID';
                requestData.CustomId = params.customId;
                if (params.password) requestData.Password = params.password;
                break;
            case 'android':
                endpoint = 'LoginWithAndroidDeviceID';
                requestData.AndroidDeviceId = params.androidDeviceId;
                break;
            case 'ios':
                endpoint = 'LoginWithIOSDeviceID';
                requestData.DeviceId = params.deviceId;
                break;
            case 'google':
                endpoint = 'LoginWithGoogleAccount';
                requestData.ServerAuthCode = params.authCode;
                break;
            case 'openid':
                endpoint = 'LoginWithOpenIdConnect';
                requestData.ConnectionId = params.connectionId;
                requestData.IdToken = params.idToken;
                break;
            case 'steam':
                endpoint = 'LoginWithSteam';
                requestData.SteamTicket = params.steamTicket;
                break;
            case 'facebook':
                endpoint = 'LoginWithFacebook';
                requestData.AccessToken = params.accessToken;
                break;
            case 'apple':
                endpoint = 'LoginWithApple';
                requestData.IdentityToken = params.identityToken;
                break;
            default:
                throw new Error(`不支持的登录类型: ${type}`);
        }
        
        try {
            const result = await callPlayFabClientApi(endpoint, requestData);
            
            return {
                success: true,
                sessionTicket: result.SessionTicket,
                playFabId: result.PlayFabId,
                entityToken: result.EntityToken,
                settings: result.Settings,
                username: result.Username || params.username || null,
                newlyCreated: result.NewlyCreated || false
            };
        } catch (err) {
            console.error(`${type} 登录失败:`, err);
            return { success: false, error: err.message };
        }
    }
	
	/**
 * 从分段获取玩家账号列表
 */
	async function getAccountsFromSegment(segmentId) {
		if (!PlayFabSettings.secretKey) {
			throw new Error('Admin API 需要配置 secretKey');
		}
		
		try {
			const exportResult = await callPlayFabAdminApi('ExportPlayersInSegment', {
				SegmentId: segmentId,
				SegmentNameOverride: 'Export_' + Date.now()
			});
			
			const exportId = exportResult.ExportId;
			let downloadUrl = null;
			let attempts = 0;
			
			while (!downloadUrl && attempts < 30) {
				await new Promise(r => setTimeout(r, 3000));
				attempts++;
				const statusResult = await callPlayFabAdminApi('GetSegmentExport', {
					ExportId: exportId
				});
				if (statusResult.IndexUrl) {
					downloadUrl = statusResult.IndexUrl;
				}
			}
			
			if (!downloadUrl) throw new Error('分段导出超时');
			
			const indexContent = await downloadFile(downloadUrl);
			const urls = indexContent.split('\n').filter(u => u.trim());
			const accounts = [];
			
			for (const url of urls) {
				if (url.trim()) {
					const tsvData = await downloadFile(url.trim());
					const parsed = parseTSVToAccounts(tsvData);
					accounts.push(...parsed);
				}
			}
			
			// 补充封禁信息
			for (const account of accounts) {
				try {
					const banInfo = await getPlayerBanInfo(account.playFabId);
					account.isBanned = banInfo.isBanned;
					account.banReason = banInfo.banReason;
					account.banExpires = banInfo.banExpires;
					account.banId = banInfo.banId;
				} catch(e) {
					account.isBanned = false;
				}
			}
			
			return accounts;
		} catch (err) {
			console.error('获取分段玩家失败:', err);
			return [];
		}
	}

	async function downloadFile(url) {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error('下载失败: HTTP ' + response.status);
		}
		return await response.text();
	}

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
			
			if (account.playFabId) accounts.push(account);
		}
		
		return accounts;
	}
    
	/**
	 * 解绑平台账号
	 * @param {string} playFabId - 玩家 PlayFab ID
	 * @param {string} platform - 平台名称 (Google, Steam, Facebook, etc.)
	 * @param {string} platformUserId - 平台用户ID
	 */
	async function unlinkPlatform(playFabId, platform) {
		if (!PlayFabSettings.secretKey) {
			throw new Error('Admin API 需要配置 secretKey');
		}
		
		// 获取当前关联账号
		const linked = await getLinkedPlatformAccounts(playFabId);
		const targetLink = linked.linkedAccounts.find(function(link) {
			return link.Platform === platform;
		});
		
		if (!targetLink) {
			throw new Error('未找到该平台关联账号');
		}
		
		// 调用 PlayFab Admin API 解绑
		const result = await callPlayFabAdminApi('UnlinkPlatform', {
			PlayFabId: playFabId,
			Platform: platform,
			PlatformUserId: targetLink.PlatformUserId
		});
		
		return result;
	}
	
	
	// 更新玩家数据
	async function updateUserData(playFabId, data) {
		if (!PlayFabSettings.secretKey) {
			throw new Error('Admin API 需要配置 secretKey');
		}
		
		var updateData = {};
		for (var key in data) {
			if (data.hasOwnProperty(key)) {
				updateData[key] = { Value: data[key] };
			}
		}
		
		var result = await callPlayFabAdminApi('UpdateUserData', {
			PlayFabId: playFabId,
			Data: updateData
		});
		return result;
	}

	// 删除玩家数据
	async function deleteUserData(playFabId, keys) {
		if (!PlayFabSettings.secretKey) {
			throw new Error('Admin API 需要配置 secretKey');
		}
		
		var result = await callPlayFabAdminApi('UpdateUserData', {
			PlayFabId: playFabId,
			KeysToRemove: keys
		});
		return result;
	}
	
	// 更新玩家数据（带权限）
	async function updateUserDataWithPermission(playFabId, data) {
		if (!PlayFabSettings.secretKey) {
			throw new Error('Admin API 需要配置 secretKey');
		}
		
		var updateData = {};
		var keysToRemove = [];
		
		for (var key in data) {
			if (data.hasOwnProperty(key)) {
				if (data[key].Value !== undefined) {
					updateData[key] = { 
						Value: data[key].Value,
						Permission: data[key].Permission || 'Public'
					};
				} else if (data[key] === null) {
					keysToRemove.push(key);
				}
			}
		}
		
		var result = await callPlayFabAdminApi('UpdateUserData', {
			PlayFabId: playFabId,
			Data: updateData,
			KeysToRemove: keysToRemove
		});
		return result;
	}

	
	
    /**
     * PlayFab 客户端注册
     */
    async function playfabClientRegister(username, email, password) {
        const registerData = {
            TitleId: PlayFabSettings.titleId,
            Username: username,
            Email: email,
            Password: password,
            RequireBothUsernameAndEmail: true
        };
        
        try {
            const registerResult = await callPlayFabClientApi('RegisterPlayFabUser', registerData);
            
            const loginResult = await playFabLogin('username', { username: username, password: password });
            
            return {
                success: true,
                playFabId: registerResult.PlayFabId,
                username: username
            };
        } catch (err) {
            console.error('PlayFab 注册失败:', err);
            return { success: false, error: err.message };
        }
    }
    
    /**
     * 发送重置密码邮件
     */
    async function playfabClientResetPassword(email) {
        const requestData = {
            TitleId: PlayFabSettings.titleId,
            Email: email
        };
        
        try {
            await callPlayFabClientApi('SendAccountRecoveryEmail', requestData);
            return { success: true };
        } catch (err) {
            console.error('发送重置密码邮件失败:', err);
            return { success: false, error: err.message };
        }
    }
    
    // ==================== 导出 ====================
    
    // 导出到全局
    const PlayFabSDK = {
        // 配置
        init,
        getConfig,
        
        // 封禁相关
        banPlayer,
        unbanPlayer,
        updateBanInfo,
        getPlayerBanInfo,
		
		
		updateUserData,
		deleteUserData,
		updateUserDataWithPermission,
		getAccountsFromSegment,
        
        // 玩家搜索
        searchPlayerByPlayFabId,
        searchPlayerByDisplayName,
        getPlayerProfile,
        getPlayerInventory,
        getPlayerStatistics,
        getUserData,
        
        // 关联平台
        getLinkedPlatformAccounts,
        batchGetLinkedAccounts,
        
        // 分段
        getAllSegments,
        
        // 登录注册
        playFabLogin,
        playfabClientRegister,
        playfabClientResetPassword
    };
    
    // 支持多种模块系统
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PlayFabSDK;
    } else if (typeof define === 'function' && define.amd) {
        define([], function() { return PlayFabSDK; });
    } else {
        global.PlayFabSDK = PlayFabSDK;
    }
    
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
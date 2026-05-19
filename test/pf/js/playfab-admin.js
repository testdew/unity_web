// PlayFab 管理核心逻辑 - 直接调用 PlayFab API
import { 
    searchPlayerByPlayFabId, 
    searchPlayerByDisplayName, 
    banPlayer, 
    unbanPlayer, 
    updateBanInfo,
    getSegmentsList,
    getUserData,
    getAccountsFromSegment,
    applyFilters
} from './playfab-api.js';

// 全局配置（从参数传入）
let TITLE_ID = '';
let SECRET_KEY = '';

// 全局状态
let currentPlayFabPlayers = [];
let currentPlayFabSearchKeyword = '';
let currentPlayFabSearchType = 'username';
let currentBanPlayerId = null;
let currentUpdateBanId = null;
let segmentsList = [];
let showAdvancedSearch = false;
let currentFilterParams = {};

/**
 * 初始化 PlayFab 管理模块
 * @param {string} titleId - PlayFab Title ID
 * @param {string} secretKey - PlayFab Secret Key
 */
export function initPlayFabAdmin(titleId, secretKey) {
    TITLE_ID = titleId;
    SECRET_KEY = secretKey;
    
    if (!TITLE_ID || !SECRET_KEY) {
        console.error('PlayFab 配置缺失');
        const container = document.getElementById('playfabPlayersList');
        if (container) {
            container.innerHTML = '<div class="playfab-empty-state">请通过 URL 参数传入 titleId 和 secretKey</div>';
        }
        return;
    }
    
    // 加载分段列表
    loadSegmentsList();
    // 绑定事件
    bindEvents();
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 搜索按钮
    const searchBtn = document.getElementById('playfabSearchBtn');
    if (searchBtn) {
        const newBtn = searchBtn.cloneNode(true);
        searchBtn.parentNode.replaceChild(newBtn, searchBtn);
        newBtn.onclick = searchPlayFabPlayer;
    }
    
    // 高级筛选按钮
    const advancedBtn = document.getElementById('playfabAdvancedBtn');
    if (advancedBtn) {
        const newBtn = advancedBtn.cloneNode(true);
        advancedBtn.parentNode.replaceChild(newBtn, advancedBtn);
        newBtn.onclick = toggleAdvancedSearch;
    }
    
    // 刷新分段按钮
    const refreshSegmentsBtn = document.getElementById('playfabRefreshSegmentsBtn');
    if (refreshSegmentsBtn) {
        const newBtn = refreshSegmentsBtn.cloneNode(true);
        refreshSegmentsBtn.parentNode.replaceChild(newBtn, refreshSegmentsBtn);
        newBtn.onclick = refreshSegments;
    }
    
    // 高级搜索应用按钮
    const applyFilterBtn = document.getElementById('playfabApplyFilterBtn');
    if (applyFilterBtn) {
        const newBtn = applyFilterBtn.cloneNode(true);
        applyFilterBtn.parentNode.replaceChild(newBtn, applyFilterBtn);
        newBtn.onclick = performAdvancedSearch;
    }
    
    // 重置筛选按钮
    const resetFilterBtn = document.getElementById('playfabResetFilterBtn');
    if (resetFilterBtn) {
        const newBtn = resetFilterBtn.cloneNode(true);
        resetFilterBtn.parentNode.replaceChild(newBtn, resetFilterBtn);
        newBtn.onclick = resetAdvancedSearch;
    }
    
    // 回车搜索
    const searchInput = document.getElementById('playfabSearchKeyword');
    if (searchInput) {
        const newInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newInput, searchInput);
        newInput.onkeypress = function(e) {
            if (e.key === 'Enter') searchPlayFabPlayer();
        };
    }
    
    // 全局封禁确认按钮
    const confirmBanBtn = document.getElementById('confirmBanBtn');
    if (confirmBanBtn) {
        const newBtn = confirmBanBtn.cloneNode(true);
        confirmBanBtn.parentNode.replaceChild(newBtn, confirmBanBtn);
        newBtn.onclick = confirmBan;
    }
    
    // 全局更新封禁确认按钮
    const confirmUpdateBanBtn = document.getElementById('confirmUpdateBanBtn');
    if (confirmUpdateBanBtn) {
        const newBtn = confirmUpdateBanBtn.cloneNode(true);
        confirmUpdateBanBtn.parentNode.replaceChild(newBtn, confirmUpdateBanBtn);
        newBtn.onclick = confirmUpdateBan;
    }
}

/**
 * 加载分段列表
 */
async function loadSegmentsList() {
    try {
        segmentsList = await getSegmentsList(TITLE_ID, SECRET_KEY);
        renderSegmentsList(segmentsList);
    } catch (err) {
        console.error('加载分段列表失败:', err);
        renderSegmentsList([]);
    }
}

/**
 * 渲染分段下拉框
 */
function renderSegmentsList(segments) {
    const select = document.getElementById('playfabFilterSegmentId');
    if (!select) return;
    
    let html = '<option value="">不限</option>';
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        html += `<option value="${seg.Id}">${escapeHtml(seg.Name)} (${seg.Id.substring(0, 8)}...)</option>`;
    }
    select.innerHTML = html;
}

/**
 * 刷新分段列表
 */
async function refreshSegments() {
    await loadSegmentsList();
    showToast('分段列表已刷新', false);
}

/**
 * 搜索玩家（基础搜索）
 */
async function searchPlayFabPlayer() {
    const keyword = document.getElementById('playfabSearchKeyword').value.trim();
    const searchType = document.getElementById('playfabSearchType').value;
    
    if (!keyword) {
        showToast('请输入搜索关键词', true);
        return;
    }
    
    currentPlayFabSearchKeyword = keyword;
    currentPlayFabSearchType = searchType;
    currentFilterParams = {};
    
    showToast('搜索中...', false);
    
    try {
        let player = null;
        if (searchType === 'playFabId') {
            player = await searchPlayerByPlayFabId(TITLE_ID, SECRET_KEY, keyword);
        } else {
            player = await searchPlayerByDisplayName(TITLE_ID, SECRET_KEY, keyword);
        }
        
        const players = player ? [player] : [];
        currentPlayFabPlayers = players;
        renderPlayFabPlayers(players);
        
        if (players.length === 0) {
            const msg = `未找到 ${searchType === 'playFabId' ? 'PlayFab ID' : '显示名称'} 为 "${keyword}" 的玩家`;
            showToast(msg, true);
        } else {
            showToast('搜索成功', false);
        }
    } catch (err) {
        showToast('搜索失败: ' + err.message, true);
        currentPlayFabPlayers = [];
        renderPlayFabPlayers([]);
    }
}

/**
 * 执行高级搜索
 */
async function performAdvancedSearch() {
    const segmentId = document.getElementById('playfabFilterSegmentId').value;
    const lastLoginDays = document.getElementById('playfabFilterLastLoginDays').value;
    const notLoginDays = document.getElementById('playfabFilterNotLoginDays').value;
    const minDiamond = document.getElementById('playfabFilterMinDiamond').value;
    const maxDiamond = document.getElementById('playfabFilterMaxDiamond').value;
    const bannedStatus = document.getElementById('playfabFilterBannedStatus').value;
    
    // 构建筛选条件
    const filters = {};
    if (lastLoginDays && lastLoginDays !== '') filters.lastLoginDays = parseInt(lastLoginDays);
    if (notLoginDays && notLoginDays !== '') filters.notLoginDays = parseInt(notLoginDays);
    if (minDiamond && minDiamond !== '') filters.minDiamond = parseInt(minDiamond);
    if (maxDiamond && maxDiamond !== '') filters.maxDiamond = parseInt(maxDiamond);
    if (bannedStatus && bannedStatus !== '') filters.isBanned = bannedStatus === 'true';
    
    currentFilterParams = filters;
    
    // 检查是否有分段ID或筛选条件
    if (!segmentId && Object.keys(filters).length === 0) {
        showToast('请选择分段或填写筛选条件', true);
        return;
    }
    
    showToast('正在从分段获取玩家数据...', false);
    
    try {
        let players = [];
        
        // 如果选择了分段，从分段获取玩家
        if (segmentId) {
            showToast('正在导出分段数据，请稍候...', false);
            players = await getAccountsFromSegment(TITLE_ID, SECRET_KEY, segmentId);
            showToast(`分段导出完成，共 ${players.length} 个玩家`, false);
        }
        
        // 应用筛选条件
        if (Object.keys(filters).length > 0 && players.length > 0) {
            players = applyFilters(players, filters);
            showToast(`筛选完成，剩余 ${players.length} 个玩家`, false);
        } else if (Object.keys(filters).length > 0 && players.length === 0) {
            // 如果没有分段但只有筛选条件，提示需要分段
            showToast('高级筛选需要先选择分段', true);
            return;
        }
        
        // 获取每个玩家的详细信息（封禁状态等）
        const detailedPlayers = [];
        for (let i = 0; i < players.length; i++) {
            try {
                const detail = await searchPlayerByPlayFabId(TITLE_ID, SECRET_KEY, players[i].playFabId);
                if (detail) {
                    detailedPlayers.push(detail);
                }
            } catch (err) {
                console.error('获取玩家详情失败:', players[i].playFabId, err);
            }
            // 添加延迟避免请求过快
            if (i % 10 === 0) {
                await new Promise(r => setTimeout(r, 100));
            }
        }
        
        currentPlayFabPlayers = detailedPlayers;
        renderPlayFabPlayers(detailedPlayers);
        
        if (detailedPlayers.length === 0) {
            showToast('未找到符合条件的玩家', true);
        } else {
            showToast(`找到 ${detailedPlayers.length} 个玩家`, false);
        }
    } catch (err) {
        console.error('高级搜索失败:', err);
        showToast('高级搜索失败: ' + err.message, true);
        currentPlayFabPlayers = [];
        renderPlayFabPlayers([]);
    }
}

/**
 * 重置高级筛选
 */
function resetAdvancedSearch() {
    document.getElementById('playfabFilterLastLoginDays').value = '';
    document.getElementById('playfabFilterNotLoginDays').value = '';
    document.getElementById('playfabFilterMinDiamond').value = '';
    document.getElementById('playfabFilterMaxDiamond').value = '';
    document.getElementById('playfabFilterBannedStatus').value = '';
    document.getElementById('playfabFilterSegmentId').value = '';
    currentFilterParams = {};
    showToast('筛选条件已重置', false);
}

/**
 * 切换高级筛选面板
 */
function toggleAdvancedSearch() {
    showAdvancedSearch = !showAdvancedSearch;
    const panel = document.getElementById('playfabAdvancedPanel');
    if (panel) {
        panel.style.display = showAdvancedSearch ? 'block' : 'none';
    }
}

/**
 * 渲染玩家列表
 */
function renderPlayFabPlayers(players) {
    const container = document.getElementById('playfabPlayersList');
    if (!container) return;
    
    if (!players || players.length === 0) {
        container.innerHTML = '<div class="playfab-empty-state">暂无玩家数据</div>';
        return;
    }
    
    let html = '<div class="playfab-table-wrapper">';
    html += '<table class="playfab-table">';
    html += '<thead><tr>';
    html += '<th>PlayFab ID</th>';
    html += '<th>显示名</th>';
    html += '<th>钻石</th>';
    html += '<th>状态</th>';
    html += '<th>冻结原因</th>';
    html += '<th>冻结到期</th>';
    html += '<th>操作</th>';
    html += '</thead>';
    html += '<tbody>';
    
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const isBanned = p.isBanned;
        const playFabIdEscaped = escapeHtml(p.playFabId);
        const displayNameEscaped = escapeHtml(p.displayName || '-');
        const banReasonEscaped = isBanned ? escapeHtml(p.banReason || '未提供') : '-';
        let banExpiresText = '-';
        if (isBanned && p.banExpires) {
            banExpiresText = new Date(p.banExpires).toLocaleString();
        } else if (isBanned) {
            banExpiresText = '永久';
        }
        const statusText = isBanned ? '已冻结' : '正常';
        const statusClass = isBanned ? 'playfab-badge-banned' : 'playfab-badge-normal';
        
        html += '<tr>';
        html += `<td><code>${playFabIdEscaped}</code></tr>`;
        html += `<td>${displayNameEscaped}</td>`;
        html += `<td>💎 ${p.diamondBalance || 0}</td>`;
        html += `<td><span class="playfab-badge ${statusClass}">${statusText}</span></td>`;
        html += `<td>${banReasonEscaped}</td>`;
        html += `<td>${banExpiresText}</td>`;
        html += `<td><div class="playfab-flex" style="gap:5px;">`;
        html += `<button class="playfab-btn playfab-btn-primary playfab-btn-sm btn-view-detail" data-id="${p.playFabId}">详情</button>`;
        if (isBanned) {
            if (p.banId) {
                html += `<button class="playfab-btn playfab-btn-warning playfab-btn-sm btn-update-ban" data-id="${p.banId}" data-reason="${escapeHtml(p.banReason || '')}">更新</button>`;
            }
            html += `<button class="playfab-btn playfab-btn-success playfab-btn-sm btn-unban" data-id="${p.playFabId}">解冻</button>`;
        } else {
            html += `<button class="playfab-btn playfab-btn-danger playfab-btn-sm btn-ban" data-id="${p.playFabId}">冻结</button>`;
        }
        html += `</div></td>`;
        html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    // 绑定表格内按钮事件
    bindTableEvents();
}

/**
 * 绑定表格内按钮事件
 */
function bindTableEvents() {
    // 详情按钮
    document.querySelectorAll('.btn-view-detail').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => viewPlayerDetail(newBtn.getAttribute('data-id'));
    });
    
    // 封禁按钮
    document.querySelectorAll('.btn-ban').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => {
            const playFabId = newBtn.getAttribute('data-id');
            showBanModal(playFabId);
        };
    });
    
    // 解封按钮
    document.querySelectorAll('.btn-unban').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => {
            const playFabId = newBtn.getAttribute('data-id');
            unbanPlayerAction(playFabId);
        };
    });
    
    // 更新封禁按钮
    document.querySelectorAll('.btn-update-ban').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => {
            const banId = newBtn.getAttribute('data-id');
            const reason = newBtn.getAttribute('data-reason');
            showUpdateBanModal(banId, reason);
        };
    });
}

/**
 * 查看玩家详情（新窗口）
 */
function viewPlayerDetail(playFabId) {
    const url = `./playfab-detail.html?playFabId=${playFabId}&titleId=${TITLE_ID}&secretKey=${encodeURIComponent(SECRET_KEY)}`;
    window.open(url, '_blank');
}

/**
 * 显示封禁弹窗
 */
function showBanModal(playFabId) {
    currentBanPlayerId = playFabId;
    const modal = document.getElementById('playfabBanModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('banReason').value = '';
        document.getElementById('banDuration').value = '0';
        document.getElementById('banIpAddress').value = '';
    }
}

/**
 * 关闭封禁弹窗
 */
function closeBanModal() {
    const modal = document.getElementById('playfabBanModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentBanPlayerId = null;
}

/**
 * 确认封禁
 */
async function confirmBan() {
    const reason = document.getElementById('banReason').value;
    const duration = parseInt(document.getElementById('banDuration').value);
    const ipAddress = document.getElementById('banIpAddress').value;
    
    if (!reason) {
        showToast('请输入冻结原因', true);
        return;
    }
    
    const confirmBtn = document.getElementById('confirmBanBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '处理中...';
    }
    
    try {
        await banPlayer(TITLE_ID, SECRET_KEY, currentBanPlayerId, reason, duration, ipAddress);
        showToast('冻结成功', false);
        closeBanModal();
        // 重新搜索刷新列表
        if (currentPlayFabSearchKeyword) {
            await searchPlayFabPlayer();
        } else if (Object.keys(currentFilterParams).length > 0) {
            await performAdvancedSearch();
        }
    } catch (err) {
        showToast('冻结失败: ' + err.message, true);
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '确认冻结';
        }
    }
}

/**
 * 显示更新封禁弹窗
 */
function showUpdateBanModal(banId, currentReason) {
    currentUpdateBanId = banId;
    const modal = document.getElementById('playfabUpdateBanModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('updateBanReason').value = currentReason || '';
        document.getElementById('updateBanDuration').value = '0';
    }
}

/**
 * 关闭更新封禁弹窗
 */
function closeUpdateBanModal() {
    const modal = document.getElementById('playfabUpdateBanModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentUpdateBanId = null;
}

/**
 * 确认更新封禁
 */
async function confirmUpdateBan() {
    const reason = document.getElementById('updateBanReason').value;
    const duration = parseInt(document.getElementById('updateBanDuration').value);
    
    if (!reason) {
        showToast('请输入冻结原因', true);
        return;
    }
    
    const confirmBtn = document.getElementById('confirmUpdateBanBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '处理中...';
    }
    
    try {
        await updateBanInfo(TITLE_ID, SECRET_KEY, currentUpdateBanId, reason, duration);
        showToast('更新成功', false);
        closeUpdateBanModal();
        // 重新搜索刷新列表
        if (currentPlayFabSearchKeyword) {
            await searchPlayFabPlayer();
        } else if (Object.keys(currentFilterParams).length > 0) {
            await performAdvancedSearch();
        }
    } catch (err) {
        showToast('更新失败: ' + err.message, true);
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '确认更新';
        }
    }
}

/**
 * 解封玩家
 */
async function unbanPlayerAction(playFabId) {
    if (!confirm('确定要解冻该玩家吗？')) return;
    
    try {
        await unbanPlayer(TITLE_ID, SECRET_KEY, playFabId);
        showToast('解冻成功', false);
        // 重新搜索刷新列表
        if (currentPlayFabSearchKeyword) {
            await searchPlayFabPlayer();
        } else if (Object.keys(currentFilterParams).length > 0) {
            await performAdvancedSearch();
        }
    } catch (err) {
        showToast('解冻失败: ' + err.message, true);
    }
}

/**
 * 显示提示
 */
function showToast(msg, isError) {
    const toast = document.getElementById('playfabToast');
    if (toast) {
        toast.textContent = msg;
        toast.style.backgroundColor = isError ? '#dc2626' : '#10b981';
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    } else {
        console.log(msg);
    }
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;');
}

// 导出全局函数供 HTML 调用
window.closeBanModal = closeBanModal;
window.closeUpdateBanModal = closeUpdateBanModal;
window.confirmBan = confirmBan;
window.confirmUpdateBan = confirmUpdateBan;
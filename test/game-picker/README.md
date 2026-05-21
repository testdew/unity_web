# 🎮 游戏运营选择器

一个功能强大的游戏运营文案选择器，支持多主题切换、分类筛选、关键词搜索，可通过 iframe 嵌入其他网站使用。

## ✨ 功能特性

- 📝 **丰富的文案库**：封号类型、停服公告、系统通知、补偿公告、维护公告
- 🎨 **5种视觉主题**：暗夜游戏风、清新少女粉、科技赛博朋克、简约商务白、热血中国红
- 🔍 **实时搜索**：支持文案内容和标签搜索
- 🏷️ **分类筛选**：主类型 + 子类型两级筛选
- 💾 **主题记忆**：用户选择的主题自动保存
- 🔗 **跨域通信**：通过 postMessage 与父页面交互

## 🚀 部署到 Cloudflare Pages

### 方法1：通过 Git 部署

1. 将代码推送到 GitHub 仓库
2. 登录 Cloudflare Dashboard → Pages → 创建项目
3. 连接 GitHub 仓库
4. 部署完成

### 方法2：通过 Wrangler CLI

```bash
npx wrangler pages deploy ./game-picker --project-name=game-picker


# 使用 Google 翻译成日语，自动启用
https://testdew.github.io/unity_web/test/game-picker/index.html?translator=google&lang=ja&translate=1

# 使用百度翻译成韩语
https://testdew.github.io/unity_web/test/game-picker/index.html?t=baidu&l=ko&translate=1&baidu_app_id=2024xxxx&baidu_secret=xxxx

# 使用微软翻译成法语
https://testdew.github.io/unity_web/test/game-picker/index.html?t=microsoft&l=fr&translate=1&ms_api_key=xxxx&ms_region=global



<!-- 父页面：你的网站 -->
<input type="text" id="myInput" placeholder="点击按钮选择文案">
<button onclick="openPicker()">选择公告</button>

<div id="pickerModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999;">
    <iframe id="pickerIframe" src="https://testdew.github.io/unity_web/test/game-picker/index.html" style="width:520px; height:580px; border:none;"></iframe>
</div>

<script>
    const modal = document.getElementById('pickerModal');
    const iframe = document.getElementById('pickerIframe');

    function openPicker() {
        modal.style.display = 'flex';
    }

    window.addEventListener('message', function(e) {
        // 建议验证来源：if (e.origin !== 'https://testdew.github.io') return;
        
        if (e.data.type === 'TEXT_SELECTED') {
            document.getElementById('myInput').value = e.data.value;
            modal.style.display = 'none';
        } else if (e.data.type === 'PICKER_CLOSED') {
            modal.style.display = 'none';
        }
    });
</script>







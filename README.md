# LAN Reader for Obsidian

## 快速开始

需要桌面版 Obsidian、Node.js 18+ 与 npm。Linux 后台服务还需要 systemd 和 Python 3。

```bash
git clone git@github.com:huerli/obsidian-lan-reader.git
cd obsidian-lan-reader
npm ci
npm run build
npm test
```

将 `dist/main.js`、`dist/manifest.json`、`dist/daemon.cjs` 复制到：

```text
你的笔记库/.obsidian/plugins/lan-reader/
```

Linux 安装独立后台服务：

```bash
./scripts/install-background.sh "/绝对路径/你的笔记库"
# 如需未登录时也能随系统启动：
loginctl enable-linger "$USER"
```

在 Obsidian「设置 → 第三方插件」启用 LAN Reader，进入插件设置，勾选要发布的笔记。其他设备打开 `http://你的局域网IP:18081`。

安装脚本不安装依赖；使用当前 Node.js 的绝对路径，支持带空格的库路径，每个用户配置一个库。替换 Node.js 安装或移动库之后需重新执行安装脚本。关闭 Obsidian 不影响后台；电脑需保持开机、不休眠。

停止服务：在插件设置点击「停止后台」，或运行：

```bash
systemctl --user stop lan-reader.service
# 同时取消开机自启：
systemctl --user disable --now lan-reader.service
```

## 功能

- 逐篇发布与撤回，默认不发布任何文档；直接访问也校验发布名单。
- 后台常驻、统一端口，插件内启动/停止/重启与开机自启控制。
- 现代阅读页面、明暗主题、手机布局、文章目录与打印。
- 多级文件夹分组、文档数量、展开收起、标题和路径搜索。
- 已发布笔记关系图谱，支持双链和普通 Markdown 链接、拖动缩放、搜索与局部关系。
- 图片自动内嵌 Base64；右键转换本地或 HTTPS 外链图片，修改前备份。
- HTML 与内联 CSS 过滤后渲染，支持表格、颜色、字号等排版。
- 可选访问密码，用户名固定为 `reader`。

## 发布与图片

共享文件夹限制可发布范围；未发布笔记不会出现在列表或图谱中。发布后直接读取最新内容，不生成发布快照。撤回阻止后续访问，无法收回已经保存的副本。

笔记编辑区或文件列表右键可以打开主页、发布/撤回、转换图片。文档转换前备份到库内 `.obsidian/lan-reader-backups/`，不删除原图片。HTTPS 下载单图最多 15 MB，网络空闲超时 20 秒，失败保留链接。需要登录的外链不一定能够下载。

## 平台与限制

当前统一后台模式支持 **Linux/systemd**。清单声明桌面插件，但 Windows/macOS 尚无独立后台安装和控制适配。

仅支持安全过滤后的 HTML 和内联 CSS，不加载外部样式表，不执行脚本、DataviewJS 或 `<style>` 块。Mermaid、LaTeX、笔记嵌入暂不专门渲染。代码块暂无语法着色，图片转换暂不处理引用式 Markdown 图片。

默认端口 18081，可在插件中修改并应用。HTTP 未加密，适用于可信局域网；请勿将其映射到公网。HTTPS 外链图片由读者浏览器访问对应站点。隐藏路径与符号链接不会由后台开放。

## 开发与验证

```bash
npm ci
npm run build
npm test
```

测试覆盖独立后台运行、发布撤回、范围检查、附件访问、密码认证、HTML/CSS 过滤、链接与 Base64 转换、图谱权限。

```bash
systemctl --user status lan-reader.service
journalctl --user -u lan-reader.service -n 40
```

更新时先覆盖三个构建文件，保留 `data.json`，在插件中点击「应用并重新加载插件」。若仍运行旧代码，在第三方插件列表关闭后重新启用 LAN Reader。

## 源码结构

| 文件 | 用途 |
| --- | --- |
| `main.js` | Obsidian 设置、发布管理、右键菜单、HTTP 请求处理 |
| `daemon.js` | 独立后台入口与文件系统适配 |
| `core.cjs` | Markdown 渲染、HTML 过滤、图片转换 |
| `web.cjs` | 阅读页面与文件夹导航 |
| `graph.cjs` / `graph-web.cjs` | 关系分析与交互图谱 |
| `download.cjs` | HTTPS 图片下载 |
| `scripts/install-background.sh` | Linux 用户级后台安装 |

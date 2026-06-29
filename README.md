# 工作区码头 (Workspace Dock)

> 运维工程师的「智能书签 + 快照抽屉」工具

Workspace Dock 是一款跨平台桌面应用，帮助运维工程师高效管理 SSH 连接、保存/恢复终端会话状态，并在多项目、多环境之间快速切换。

**仓库**: [github.com/MMCISAGOODMAN/workspace-dock](https://github.com/MMCISAGOODMAN/workspace-dock)

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/version-v0.2.0-green)
![Electron](https://img.shields.io/badge/Electron-33-47848F)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 功能一览

### 书签与连接

| 功能 | 说明 |
|------|------|
| 三维书签树 | 项目 → 环境 → 角色 → 主机，四层结构管理多环境资产 |
| 系统 / 内置终端 | 可切换系统终端 SSH 或内置 xterm.js 终端 |
| 多终端窗口 | 支持多个独立终端窗口，右键「在新终端窗口打开」 |
| 全局搜索 | `Cmd/Ctrl + P` 搜索主机、应用、快照；`>` 前缀显示快捷操作 |
| 临时 SSH | 24 小时有效的快捷 SSH 连接，可转为正式书签 |
| 剪贴板 | 独立区域展示复制内容，点击复制；与 SSH 无关 |
| 区域截图 | 框选屏幕区域，自动复制到剪贴板 |
| 主机标签 | 为主机添加搜索别名（如 `pay-db`），提升 Cmd+P 命中率 |
| 主机在线检测 | 书签树实时显示主机连通状态 |
| 编辑 / 删除 | 项目、环境、角色、主机均支持右键编辑与删除 |
| 拖拽排序 | 节点可拖拽调整顺序、跨层级移动 |
| 拖出到外部 | 拖出面板可导出 SSH 命令或 JSON（终端、编辑器等） |
| 导入 / 导出 | 书签 JSON 导入导出（默认合并模式） |

### 快照

| 功能 | 说明 |
|------|------|
| 手动快照 | 保存当前活跃 SSH 会话列表 |
| 自动快照 | 定时自动保存（可配置间隔，最多 50 条） |
| 快照对比 | 恢复前对比差异：主机增减、IP/路径变更 |
| 布局恢复 | 还原终端窗口位置、尺寸、多窗口分组 |
| 快照导出 | 导出快照 JSON 文件 |
| 快照导入 | 导入快照 JSON（合并，最多 50 条） |

### SSH 与安全

| 功能 | 说明 |
|------|------|
| 密钥管理 | 扫描 `~/.ssh` 密钥，显示指纹，选择默认私钥 |
| 密码短语 | 支持加密私钥，可记住密码短语（系统密钥链） |
| 批量执行 | 勾选多台主机，批量执行命令并查看输出 |
| 环境染色 | Dock 窗口彩色边框标识环境（生产红 / 测试绿等） |

### 协作与外观

| 功能 | 说明 |
|------|------|
| 团队同步 | 内置 HTTP 服务分享书签，或拉取远程团队书签 |
| 收藏应用 | 本地应用与网页 URL 收藏，Dock 栏一键全部启动 |
| 应用排序 | 拖拽调整收藏应用启动顺序 |
| 主题 | 深色 / 浅色 / 跟随系统 |

---

## 技术栈

- **桌面框架**: Electron 33
- **前端**: React 18 + TypeScript + TailwindCSS
- **终端**: xterm.js + ssh2
- **状态管理**: Zustand
- **本地存储**: electron-store
- **打包**: electron-builder + GitHub Actions

---

## 快速开始

### 环境要求

- Node.js 18+
- macOS / Windows / Linux

### 安装与运行

```bash
git clone https://github.com/MMCISAGOODMAN/workspace-dock.git
cd workspace-dock
npm install
npm run dev
```

### 本地打包

```bash
npm run dist:mac    # macOS .dmg
npm run dist:win    # Windows .exe
npm run dist:linux  # Linux AppImage
```

### 开发环境注意

若 `npm run dev` 报错，可能是 `ELECTRON_RUN_AS_NODE=1` 环境变量导致：

```bash
unset ELECTRON_RUN_AS_NODE
npm run dev
```

---

## 使用指南

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + P` | 全局搜索（主机 / 应用 / 快照 / 快捷操作） |
| `Cmd/Ctrl + B` | 展开 / 收起面板 |
| `Cmd/Ctrl + Shift + S` | 区域截图（复制到剪贴板） |
| `Esc` | 关闭搜索 / 取消截图 |

### 面板与 Dock

右侧浮动 Dock 提供五个标签：**书签**、**快照**、**临时 SSH**、**剪贴板**、**应用**。

- **折叠态**：垂直图标栏，悬停显示名称；有剪贴板内容时剪贴板图标显示黄点
- **展开态**：图标标签栏 + 当前标签名称；顶部工具栏含搜索、截图、设置
- 再次点击当前标签或 `Cmd/Ctrl + B` 可收起面板

### 书签树

右侧浮动 Dock：**书签**、**快照**、**临时 SSH**、**剪贴板**、**应用** 五个标签，点击展开面板。

- 点击 **+** 添加项目 / 环境 / 角色 / 主机
- **右键** 项目 / 环境 / 角色 / 主机 → 编辑或删除
- **拖拽** 调整顺序或跨层级移动；拖出面板可导出 SSH 命令
- 顶部 **导出 / 导入** 按钮管理书签 JSON

### 连接主机

1. 点击主机条目即可连接（默认使用设置中的终端方式）
2. 右键 → 复制 IP / SSH 命令 / 编辑 / 删除
3. 内置终端模式下：右键 → **在新终端窗口打开**

### 内置终端

**设置 → SSH → 使用内置终端** 开启后：

- 独立终端窗口，多标签 SSH 会话
- 标签按环境染色，自动 cd 到上次路径
- 标题栏 **「+ 新窗口」** 打开更多终端窗口
- 需本机 SSH 私钥（`~/.ssh/id_ed25519` 等）或在设置中选择密钥

### 批量执行命令

1. 勾选多台主机（hover 显示复选框）
2. 点击 Dock 栏终端图标（带数量角标）
3. 输入命令 → 二次确认 → 查看各主机输出

### 快照

**保存**：Dock 栏快照标签 → 保存当前会话

**恢复**：点击快照卡片 → 自动对比上一快照差异 → 还原连接与窗口布局

**自动快照**：设置 → 自动快照 → 启用并设置间隔

### 区域截图

点击 Dock 栏或面板顶部的 **截图** 图标（裁剪框），或使用 `Cmd/Ctrl + Shift + S`：

1. Dock 窗口自动隐藏，屏幕变暗
2. 拖拽框选要截取的区域
3. 松开鼠标后截图自动复制到剪贴板，可直接粘贴到 IM / 文档
4. `Esc` 取消

macOS 首次使用需在 **系统设置 → 隐私与安全性 → 屏幕录制** 中允许 Workspace Dock。

### 全局搜索

`Cmd/Ctrl + P` 打开命令面板：

- **主机**：输入名称、IP、项目或标签，Enter 连接
- **应用**：输入应用名，Enter 启动
- **快照**：输入快照名，Enter 恢复
- **快捷操作**：空搜索时显示，或输入 `>` 过滤（全部启动应用、保存快照、切换面板等）

### 剪贴板

独立 **剪贴板** 标签，与 SSH / 书签无关：

- 复制任意文本后自动显示
- 点击内容或 **复制** 按钮重新复制
- **展开** 可查看 / 编辑全文后再复制
- 若识别到 IP/主机，底部可选添加为临时 SSH（需主动点击）

### 临时 SSH

24 小时自动过期，点击条目发起 SSH 连接。点击 **→** 可转为正式书签。

### 收藏应用

**管理**：Dock 栏 **应用** 标签 → 添加本地应用或网页 URL

**启动**：

- **一键全部启动**：Dock 栏火箭图标（有收藏时显示数量角标），无需展开面板
- **单个启动**：应用列表中点击条目

支持 Chrome、终端、Grafana 等常用工具；本地应用可通过文件选择器添加，可选启动参数。列表支持拖拽排序，会自动显示应用图标（本地应用读取系统图标，网页拉取 favicon）。

### SSH 密钥

**设置 → SSH → SSH 密钥**

- 自动扫描 `~/.ssh`（id_ed25519 / id_rsa / id_ecdsa）
- 显示指纹，选择默认密钥，或浏览自定义私钥

**加密密钥（密码短语）**

- 连接时自动弹出输入框，或预先在设置中配置
- 勾选「记住密码短语」由系统密钥链加密存储

### 团队书签同步

**作为服务端**

1. 设置 → 团队同步 → 启用本地同步服务
2. 同事访问 `http://<你的IP>:9876/api/bookmarks`

**作为客户端**

1. 设置 → 填写远程 URL（如 `http://192.168.1.100:9876`）
2. 点击「拉取书签」或「推送书签」

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/bookmarks` | 获取书签 JSON |
| PUT | `/api/bookmarks` | 上传书签 JSON |
| GET | `/api/health` | 健康检查 |

### 环境窗口染色

**设置 → 窗口安全 → 启用环境窗口染色**

| 环境 | 边框颜色 |
|------|----------|
| 生产 | 红色 |
| 测试 | 绿色 |
| 预发布 | 黄色 |
| 开发 | 蓝色 |

### 主题

**设置 → 外观** → 深色 / 浅色 / 跟随系统

---

## 项目结构

```
src/
├── main/              # Electron 主进程
│   ├── apps/          # 收藏应用启动与图标
│   ├── clipboard/     # 剪贴板监听
│   ├── screenshot/    # 区域截图
│   ├── terminal/      # 多窗口 xterm 会话管理
│   ├── sync/          # HTTP 书签同步
│   └── ssh/           # SSH 连接、密钥、密码短语
├── renderer/          # React UI
│   ├── components/    # 书签树、快照、剪贴板、应用等
│   ├── screenshot/    # 截图选区 overlay
│   └── terminal/      # 内置终端窗口
└── shared/            # 类型、书签操作、剪贴板解析
```

---

## 发布与下载

推送 `v*` 标签后，GitHub Actions 自动在三端打包并创建 [Release](https://github.com/MMCISAGOODMAN/workspace-dock/releases)。

```bash
git tag v0.2.0
git push origin master --tags
```

| 平台 | 产物 |
|------|------|
| macOS | `Workspace Dock-0.2.0-arm64.dmg`、`Workspace Dock-0.2.0-x64.dmg` 等 |
| Windows | `Workspace Dock-0.2.0-x64.exe`（安装包 + 便携版） |
| Linux | `Workspace Dock-0.2.0-x64.AppImage`、`Workspace Dock-0.2.0-amd64.deb` |

版本历史见 [CHANGELOG.md](CHANGELOG.md)。

---

## License

MIT — 详见 [LICENSE](LICENSE)

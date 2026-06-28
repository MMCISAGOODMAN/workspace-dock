# 工作区码头 (Workspace Dock)

> 运维工程师的「智能书签 + 快照抽屉」工具

Workspace Dock 是一款跨平台桌面应用，帮助运维工程师高效管理 SSH 连接、保存/恢复终端会话状态，并在多项目、多环境之间快速切换。

**仓库**: [github.com/MMCISAGOODMAN/workspace-dock](https://github.com/MMCISAGOODMAN/workspace-dock)

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![Version](https://img.shields.io/badge/version-v0.1-green)
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
| 全局搜索 | `Cmd/Ctrl + P` 快速定位主机、项目、环境 |
| 临时收藏 | 24 小时有效的快捷连接，过期自动清理 |
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
| `Cmd/Ctrl + P` | 全局搜索 |
| `Cmd/Ctrl + B` | 展开 / 收起面板 |
| `Esc` | 关闭搜索 |

### 书签树

右侧 Dock 栏三个标签：**书签**、**快照**、**临时**。

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

## 发布与 CI

推送 `v*` 格式 tag 后，GitHub Actions 自动在三端构建并创建 Release：

| 平台 | 产物 |
|------|------|
| macOS | `.dmg` + `.zip`（x64 + arm64） |
| Windows | NSIS 安装包 + portable |
| Linux | `.AppImage` + `.deb` |

```bash
git tag v0.1.0
git push origin master --tags
```

推送到 `master` 分支或 PR 时，CI 工作流运行 lint 与 build 检查。

**Actions 权限**：仓库 Settings → Actions → General → Workflow permissions 设为 **Read and write**。

---

## 项目结构

```
src/
├── main/              # Electron 主进程
│   ├── terminal/      # 多窗口 xterm 会话管理
│   ├── sync/          # HTTP 书签同步
│   ├── ssh/           # SSH 连接、密钥、密码短语
│   └── auto-snapshot.ts
├── renderer/          # React UI
│   ├── terminal/      # 内置终端窗口
│   └── components/
└── shared/            # 类型、书签操作、拖拽导出
```

---

## License

MIT — 详见 [LICENSE](LICENSE)

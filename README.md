# Novel Writer

在 **Cursor / VS Code** 里写小说：章节存成工作区 Markdown，方便 Git 备份与多设备同步。

**摸鱼布局（v0.2）**：上方主编辑区显示假代码，下方像终端一样的 **Console / node** 面板里写正文——路过的人看起来像在看日志/调试。

## Features

- **底部 Console 写作**：终端风格面板，正文不占满屏
- **上方代码掩护**：打开章节时自动在主编辑区打开假 `utils.js`
- **工作区存储**：`novel/novel.json` + `novel/chapters/*.md`
- **章节树**：新建 / 打开 / 重命名 / 删除 / 上移 / 下移
- **字数统计**：中文按字、英文按词；状态栏显示本章、全书、目标进度
- **Boss Mode**：`Ctrl+Shift+B` 关掉底部面板，只留代码；再按切回写作
- **导出**：合并全书或导出当前章为 `.md`

## Workspace layout

```
┌─────────────────────────────────────┐
│  主编辑区：假 utils.js（看起来在写代码） │
├─────────────────────────────────────┤
│  Console / node：小说正文（像终端）     │
└─────────────────────────────────────┘

<workspace>/
  novel/
    novel.json
    chapters/
      001-第一章-引子.md
```

设置 `novelWriter.root` 可改文件夹名（默认 `novel`）。

## Getting started

1. 打开任意工作区文件夹
2. 点击左侧活动栏 **Novel Writer** 图标
3. **Initialize Novel Folder**
4. 点击章节 → 上方出现代码，下方 **Console** 面板开始写
5. 老板靠近：`Ctrl+Shift+B` 隐藏底部面板；再按恢复

可用拖拽把底部面板调矮一点，更像终端高度。

## Commands

| Command | Default key |
|---------|-------------|
| Novel: Toggle Boss Mode | `Ctrl+Shift+B` |
| Novel: Focus Draft Console | `Ctrl+Alt+\`` |
| Novel: New Chapter | `Ctrl+Alt+N` |
| Novel: Initialize Novel Folder | — |
| Novel: Export Merged Markdown | — |
| Novel: Set Chapter Target Word Count | — |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `novelWriter.root` | `novel` | 小说根目录（相对工作区） |
| `novelWriter.defaultTarget` | `3000` | 新章节默认目标字数 |

## Install from VSIX (Cursor)

1. `Extensions: Install from VSIX...`
2. 选择 `novel-writer-0.1.0.vsix`
3. Reload 窗口

或命令行：

```bash
cursor --install-extension novel-writer-0.1.0.vsix
```

## Package locally

需要本机已安装 Node.js：

```bash
cd novel-writer-ext
npx @vscode/vsce package --no-dependencies
```

也可使用仓库内脚本（不依赖 vsce，纯打包 zip）：

```bash
python scripts/pack_vsix.py
```

## Publish to marketplace

### VS Code Marketplace

1. 在 [Azure DevOps](https://marketplace.visualstudio.com/manage) 创建 Publisher
2. `package.json` 中 `publisher` 已设为 `EileenLiberty`（发布扩展市场前需在 Marketplace 注册同名 Publisher）
3. 创建 Personal Access Token（Marketplace 权限）
4. 登录并发布：

```bash
npx @vscode/vsce login EileenLiberty
npx @vscode/vsce publish
```

### Open VSX（Cursor 用户常用）

1. 注册 [Open VSX](https://open-vsx.org/)
2. 获取 namespace token
3. 使用 [ovsx](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)：

```bash
npx ovsx publish novel-writer-0.1.0.vsix -p <token>
```

## Privacy

本扩展 **不采集数据、不联网**。小说正文只保存在你的工作区文件中。

## License

MIT

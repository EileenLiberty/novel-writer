# 发布指南

## 1. 本地安装（Cursor）

扩展已打包为同目录下的 `novel-writer-0.1.0.vsix`。

1. 打开命令面板（`Ctrl+Shift+P`）
2. 运行 **Extensions: Install from VSIX...**
3. 选择 `novel-writer-ext/novel-writer-0.1.0.vsix`
4. Reload 窗口
5. 左侧活动栏出现 **Novel Writer** 图标

重新打包：

```bash
python scripts/pack_vsix.py
```

## 2. 改成你的 Publisher

编辑 `package.json`：

- `publisher`：改成你在 Marketplace / Open VSX 注册的 ID
- `repository.url` / `bugs.url`：改成你的仓库地址

## 3. 发布到 VS Code Marketplace

1. 注册 https://marketplace.visualstudio.com/manage
2. 创建 Publisher
3. 在 Azure DevOps 创建 PAT（勾选 Marketplace 权限）
4. 安装 Node.js 后执行：

```bash
cd novel-writer-ext
npx @vscode/vsce login <your-publisher>
npx @vscode/vsce package --no-dependencies
npx @vscode/vsce publish --no-dependencies
```

注意：个人发布者可能需要支付一次性 Marketplace 注册费用（以微软当前政策为准）。

## 4. 发布到 Open VSX（Cursor 推荐）

Cursor 扩展市场主要使用 Open VSX。

1. 注册 https://open-vsx.org/
2. 创建 namespace 与 access token
3. 执行：

```bash
npx ovsx publish novel-writer-0.1.0.vsix -p <token>
```

## 5. 版本升级

1. 修改 `package.json` 的 `version`
2. 更新 `CHANGELOG.md`
3. 重新 `python scripts/pack_vsix.py` 或 `vsce package`
4. 再次 publish

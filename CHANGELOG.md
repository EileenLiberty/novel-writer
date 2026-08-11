# Change Log

## 0.2.3

- 修复：删改文中内容时页面被拽回顶部；仅在文末写作/换行时自动滚动

## 0.2.2

- Console 换行/输入时自动滚动，光标始终可见，无需手动拖滚动条

## 0.2.1

- Console 写作区：按 Enter 自动首行缩进两个全角空格（小说排版）
- Shift+Enter 换行不缩进
- 设置项 `novelWriter.autoIndent` / `novelWriter.indentText` 可开关与自定义缩进

## 0.2.0

- Writing moves to a bottom **Console / node** panel (terminal-like)
- Opening a chapter shows decoy `utils.js` in the main editor
- Auto-save from the panel into `novel/chapters/*.md`
- Boss Mode hides the bottom panel and focuses cover code; toggle restores the panel
- Status bar shows Console word count while drafting

## 0.1.0

- Initial release
- Activity bar chapter tree for workspace `novel/` folder
- Markdown chapters under `novel/chapters/`
- Status bar word count (CJK + English words)
- Boss Mode (`Ctrl+Shift+B`) switches to decoy `utils.js`
- Export merged novel or current chapter as Markdown
- Commands: init, new/rename/delete chapter, move up/down, set target

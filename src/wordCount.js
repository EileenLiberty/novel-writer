const vscode = require('vscode');
const store = require('./novelStore');

class WordCountStatus {
  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = 'novelWriter.setTarget';
    this.item.tooltip = 'Novel Writer 字数统计（点击设置本章目标）';
    this._timer = null;
    this._disposables = [];
  }

  activate(context) {
    context.subscriptions.push(this.item);
    this._disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.update()),
      vscode.workspace.onDidChangeTextDocument((e) => {
        const ed = vscode.window.activeTextEditor;
        if (ed && e.document === ed.document) this.scheduleUpdate();
      }),
      vscode.workspace.onDidSaveTextDocument(() => this.update())
    );
    this._disposables.forEach((d) => context.subscriptions.push(d));
    this.update();
  }

  scheduleUpdate() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this.update(), 300);
  }

  async update() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !store.isChapterUri(editor.document.uri)) {
      this.item.hide();
      return;
    }

    const meta = await store.loadMeta();
    if (!meta) {
      this.item.hide();
      return;
    }

    const found = store.findChapterByUri(editor.document.uri, meta);
    if (!found) {
      this.item.hide();
      return;
    }

    const chapterWords = store.countWords(editor.document.getText());
    let totalWords = 0;
    const all = await store.readAllChapterContents(meta);
    for (const item of all) {
      if (item.chapter.id === found.chapter.id) {
        totalWords += chapterWords;
      } else {
        totalWords += store.countWords(item.content);
      }
    }

    const target = found.chapter.target || 0;
    const pct = target > 0 ? Math.min(100, Math.round((chapterWords / target) * 100)) : null;
    const parts = [
      `字数 ${chapterWords.toLocaleString()}`,
      `全书 ${totalWords.toLocaleString()}`,
      `第 ${found.index + 1}/${meta.chapters.length} 章`
    ];
    if (pct !== null) parts.push(`目标 ${pct}%`);

    this.item.text = `$(book) ${parts.join(' | ')}`;
    this.item.show();
  }

  dispose() {
    if (this._timer) clearTimeout(this._timer);
    this.item.dispose();
  }
}

module.exports = { WordCountStatus };

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const store = require('./novelStore');

class BossKey {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.context = context;
    this.active = false;
    /** @type {vscode.Uri|null} */
    this.previousChapterUri = null;
  }

  async toggle() {
    if (this.active) {
      await this.exit();
    } else {
      await this.enter();
    }
  }

  _loadDecoySource() {
    const decoyPath = path.join(this.context.extensionPath, 'media', 'decoy-utils.js');
    try {
      return fs.readFileSync(decoyPath, 'utf8');
    } catch {
      return "// utils.js\nconsole.log('ok');\n";
    }
  }

  async enter() {
    const editor = vscode.window.activeTextEditor;
    if (editor && store.isChapterUri(editor.document.uri)) {
      this.previousChapterUri = editor.document.uri;
      if (editor.document.isDirty) {
        await editor.document.save();
      }
    } else if (!this.previousChapterUri) {
      const meta = await store.loadMeta();
      if (meta && meta.chapters.length) {
        this.previousChapterUri = store.getChapterUri(meta.chapters[0].id, meta);
      }
    }

    const content = this._loadDecoySource();
    const doc = await vscode.workspace.openTextDocument({
      language: 'javascript',
      content
    });
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Active,
      preserveFocus: false
    });
    this.active = true;
    vscode.window.setStatusBarMessage(
      'Novel Writer: Boss Mode ON (Ctrl+Shift+B 切回)',
      3000
    );
  }

  async exit() {
    this.active = false;
    if (this.previousChapterUri) {
      try {
        const doc = await vscode.workspace.openTextDocument(this.previousChapterUri);
        await vscode.window.showTextDocument(doc, {
          preview: false,
          viewColumn: vscode.ViewColumn.Active
        });
        vscode.window.setStatusBarMessage('Novel Writer: Boss Mode OFF', 2000);
        return;
      } catch {
        // fall through
      }
    }
    vscode.window.setStatusBarMessage(
      'Novel Writer: Boss Mode OFF（无章节可恢复）',
      3000
    );
  }

  isActive() {
    return this.active;
  }
}

module.exports = { BossKey };

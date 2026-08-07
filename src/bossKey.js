const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class BossKey {
  /**
   * @param {vscode.ExtensionContext} context
   * @param {{ draft?: import('./draftPanel').DraftPanelProvider }} [deps]
   */
  constructor(context, deps) {
    this.context = context;
    this.deps = deps || {};
    this.coverActive = false;
    /** @type {vscode.TextDocument|null} */
    this._coverDoc = null;
  }

  _loadDecoySource() {
    const decoyPath = path.join(this.context.extensionPath, 'media', 'decoy-utils.js');
    try {
      return fs.readFileSync(decoyPath, 'utf8');
    } catch {
      return "// utils.js\nconsole.log('ok');\n";
    }
  }

  /**
   * Ensure decoy JS is shown in the main editor (code on top).
   * @param {{ preserveFocus?: boolean }} [opts]
   */
  async showCover(opts) {
    const preserveFocus = !!(opts && opts.preserveFocus);
    // Reuse existing untitled cover tab if still open
    if (this._coverDoc && !this._coverDoc.isClosed) {
      await vscode.window.showTextDocument(this._coverDoc, {
        preview: false,
        viewColumn: vscode.ViewColumn.One,
        preserveFocus
      });
      return;
    }
    const content = this._loadDecoySource();
    const doc = await vscode.workspace.openTextDocument({
      language: 'javascript',
      content
    });
    this._coverDoc = doc;
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.One,
      preserveFocus
    });
  }

  /**
   * Boss panic: cover on top + hide bottom draft panel.
   */
  async enter() {
    if (this.deps.draft) {
      await this.deps.draft.hidePanel();
    }
    await this.showCover({ preserveFocus: false });
    this.coverActive = true;
    vscode.window.setStatusBarMessage(
      'Novel Writer: Cover ON — Ctrl+Shift+B 回到底部写作',
      3500
    );
  }

  /**
   * Back to writing: keep cover on top, reopen bottom draft panel.
   */
  async exit() {
    this.coverActive = false;
    await this.showCover({ preserveFocus: true });
    if (this.deps.draft) {
      const id = this.deps.draft.getActiveChapterId();
      if (id) {
        await this.deps.draft.reveal();
      } else {
        await vscode.commands.executeCommand('workbench.action.togglePanel');
        await this.deps.draft.reveal();
      }
    }
    vscode.window.setStatusBarMessage(
      'Novel Writer: 底部面板写作 · 上方为代码掩护',
      3000
    );
  }

  async toggle() {
    if (this.coverActive) {
      await this.exit();
    } else {
      await this.enter();
    }
  }

  isActive() {
    return this.coverActive;
  }
}

module.exports = { BossKey };

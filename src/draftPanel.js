const vscode = require('vscode');
const store = require('./novelStore');

/**
 * Bottom panel draft editor (terminal-like). Writes to novel chapter md files.
 */
class DraftPanelProvider {
  /**
   * @param {vscode.ExtensionContext} context
   * @param {{ onWordsChanged?: (info: object) => void }} [hooks]
   */
  constructor(context, hooks) {
    this.context = context;
    this.hooks = hooks || {};
    /** @type {vscode.WebviewView|null} */
    this.view = null;
    /** @type {string|null} */
    this.chapterId = null;
    /** @type {string} */
    this.title = '';
    /** @type {vscode.Uri|null} */
    this.uri = null;
    this._saveTimer = null;
    this._pendingContent = null;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };
    webviewView.webview.html = this._html();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (!msg || !msg.type) return;
      if (msg.type === 'ready') {
        if (this.chapterId) {
          await this._pushState();
        } else {
          this._post({ type: 'empty' });
        }
        return;
      }
      if (msg.type === 'change') {
        this._pendingContent = msg.content || '';
        this._scheduleSave();
        this._emitWords(this._pendingContent);
        return;
      }
      if (msg.type === 'saveNow') {
        await this._flushSave();
      }
    });

    webviewView.onDidDispose(() => {
      this.view = null;
    });
  }

  /**
   * Open a chapter in the bottom panel (does not open md in main editor).
   * @param {string} chapterId
   */
  async openChapter(chapterId) {
    const meta = await store.loadMeta();
    if (!meta) throw new Error('小说尚未初始化');
    const ch = meta.chapters.find((c) => c.id === chapterId);
    if (!ch) throw new Error('章节不存在');
    const uri = store.getChapterUri(chapterId, meta);
    if (!uri) throw new Error('章节文件不存在');

    await this._flushSave();

    this.chapterId = chapterId;
    this.title = ch.title;
    this.uri = uri;

    let content = '';
    if (store.fsExists(uri)) {
      const raw = await vscode.workspace.fs.readFile(uri);
      content = Buffer.from(raw).toString('utf8');
    }
    this._pendingContent = content;

    await vscode.commands.executeCommand('novelWriter.draft.focus');
    await this._pushState(content);
    this._emitWords(content);
  }

  getActiveChapterId() {
    return this.chapterId;
  }

  getActiveContent() {
    return this._pendingContent;
  }

  getActiveUri() {
    return this.uri;
  }

  async reveal() {
    await vscode.commands.executeCommand('novelWriter.draft.focus');
  }

  /**
   * Hide bottom panel (Boss cover).
   */
  async hidePanel() {
    await this._flushSave();
    try {
      await vscode.commands.executeCommand('workbench.action.closePanel');
    } catch {
      // ignore
    }
  }

  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._flushSave().catch(() => {});
    }, 800);
  }

  async _flushSave() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    if (!this.uri || this._pendingContent === null) return;
    await vscode.workspace.fs.writeFile(
      this.uri,
      Buffer.from(this._pendingContent, 'utf8')
    );
    this._post({ type: 'saved' });
  }

  async _pushState(content) {
    if (content === undefined) {
      if (this.uri && store.fsExists(this.uri)) {
        const raw = await vscode.workspace.fs.readFile(this.uri);
        content = Buffer.from(raw).toString('utf8');
        this._pendingContent = content;
      } else {
        content = this._pendingContent || '';
      }
    }
    const words = store.countWords(content || '');
    this._post({
      type: 'load',
      title: this.title,
      content: content || '',
      words
    });
  }

  _emitWords(content) {
    if (typeof this.hooks.onWordsChanged === 'function') {
      this.hooks.onWordsChanged({
        chapterId: this.chapterId,
        title: this.title,
        content: content || '',
        words: store.countWords(content || '')
      });
    }
  }

  _post(msg) {
    if (this.view) {
      this.view.webview.postMessage(msg);
    }
  }

  _html() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root {
    --bg: var(--vscode-panel-background, #1e1e1e);
    --fg: var(--vscode-terminal-foreground, #cccccc);
    --muted: var(--vscode-descriptionForeground, #858585);
    --accent: var(--vscode-terminal-ansiGreen, #89d185);
    --border: var(--vscode-panel-border, #333);
    --font: var(--vscode-editor-font-family, Consolas, monospace);
    --fs: var(--vscode-editor-font-size, 13px);
  }
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: var(--bg); color: var(--fg);
    font-family: var(--font); font-size: var(--fs);
  }
  #wrap {
    display: flex; flex-direction: column; height: 100%;
  }
  #bar {
    display: flex; align-items: center; gap: 10px;
    padding: 4px 10px;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
    font-size: 12px;
    user-select: none;
    flex-shrink: 0;
  }
  #bar .prompt { color: var(--accent); }
  #bar .title { color: var(--fg); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #bar .meta { color: var(--muted); }
  #editor {
    flex: 1; width: 100%;
    border: none; outline: none; resize: none;
    background: transparent; color: var(--fg);
    font-family: var(--font); font-size: var(--fs);
    line-height: 1.55;
    padding: 8px 10px 16px;
    box-sizing: border-box;
    white-space: pre-wrap;
  }
  #empty {
    display: none; flex: 1;
    align-items: center; justify-content: center;
    color: var(--muted); font-size: 12px; padding: 16px; text-align: center;
  }
  body.empty #editor, body.empty #bar .title, body.empty #bar .meta { display: none; }
  body.empty #empty { display: flex; }
</style>
</head>
<body class="empty">
  <div id="wrap">
    <div id="bar">
      <span class="prompt">$</span>
      <span class="title" id="title">node repl</span>
      <span class="meta" id="meta"></span>
      <span class="meta" id="save">ready</span>
    </div>
    <textarea id="editor" spellcheck="false" placeholder=""></textarea>
    <div id="empty">从左侧章节树打开章节 · 上方保持代码编辑器 · 在此区域写作</div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const editor = document.getElementById('editor');
    const titleEl = document.getElementById('title');
    const metaEl = document.getElementById('meta');
    const saveEl = document.getElementById('save');
    let applying = false;

    function setWords(n) {
      metaEl.textContent = (n || 0).toLocaleString() + ' words';
    }

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === 'load') {
        document.body.classList.remove('empty');
        applying = true;
        titleEl.textContent = 'session/' + (msg.title || 'draft');
        editor.value = msg.content || '';
        setWords(msg.words || 0);
        saveEl.textContent = 'synced';
        applying = false;
        editor.focus();
      } else if (msg.type === 'empty') {
        document.body.classList.add('empty');
        titleEl.textContent = 'node repl';
        metaEl.textContent = '';
        saveEl.textContent = 'ready';
      } else if (msg.type === 'saved') {
        saveEl.textContent = 'synced';
      } else if (msg.type === 'words') {
        setWords(msg.words);
      }
    });

    editor.addEventListener('input', () => {
      if (applying) return;
      saveEl.textContent = 'writing…';
      const content = editor.value;
      const cjk = (content.match(/[\\u4e00-\\u9fff]/g) || []).length;
      const words = (content.replace(/[\\u4e00-\\u9fff]/g, ' ').match(/[a-zA-Z0-9]+/g) || []).length;
      setWords(cjk + words);
      vscode.postMessage({ type: 'change', content });
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        vscode.postMessage({ type: 'saveNow' });
      }
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }
}

module.exports = { DraftPanelProvider };

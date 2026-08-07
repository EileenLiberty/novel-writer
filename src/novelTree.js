const vscode = require('vscode');
const store = require('./novelStore');

class ChapterItem extends vscode.TreeItem {
  /**
   * @param {import('./novelStore').ChapterMeta} chapter
   * @param {number} index
   * @param {number} total
   */
  constructor(chapter, index, total) {
    super(chapter.title, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'chapter';
    this.chapter = chapter;
    this.index = index;
    this.id = chapter.id;
    this.tooltip = `${chapter.title}\n目标 ${chapter.target || 0} 字 · ${index + 1}/${total}`;
    this.description = `${index + 1}/${total}`;
    this.iconPath = new vscode.ThemeIcon('markdown');
    this.command = {
      command: 'novelWriter.openChapter',
      title: 'Open Chapter',
      arguments: [chapter.id]
    };
  }
}

class NovelRootItem extends vscode.TreeItem {
  /**
   * @param {string} title
   * @param {number} count
   */
  constructor(title, count) {
    super(title, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'novelRoot';
    this.iconPath = new vscode.ThemeIcon('book');
    this.description = `${count} 章`;
    this.tooltip = title;
  }
}

class EmptyItem extends vscode.TreeItem {
  constructor() {
    super('点击 + 初始化小说文件夹', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('info');
    this.command = {
      command: 'novelWriter.initNovel',
      title: 'Initialize'
    };
  }
}

class NovelTreeProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  /**
   * @param {vscode.TreeItem|undefined} element
   */
  async getChildren(element) {
    if (!store.getWorkspaceFolder()) {
      const item = new vscode.TreeItem('请先打开工作区文件夹');
      item.iconPath = new vscode.ThemeIcon('folder-opened');
      return [item];
    }

    const meta = await store.loadMeta();
    if (!meta) {
      return [new EmptyItem()];
    }

    if (!element) {
      return [new NovelRootItem(meta.title, meta.chapters.length)];
    }

    if (element.contextValue === 'novelRoot') {
      return meta.chapters.map(
        (ch, i) => new ChapterItem(ch, i, meta.chapters.length)
      );
    }

    return [];
  }
}

module.exports = {
  NovelTreeProvider,
  ChapterItem
};

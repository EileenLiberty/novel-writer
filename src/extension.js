const vscode = require('vscode');
const { NovelTreeProvider } = require('./novelTree');
const { WordCountStatus } = require('./wordCount');
const { BossKey } = require('./bossKey');
const { DraftPanelProvider } = require('./draftPanel');
const { registerCommands } = require('./commands');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const tree = new NovelTreeProvider();
  const wordCount = new WordCountStatus();
  const draft = new DraftPanelProvider(context, {
    onWordsChanged: (info) => wordCount.onPanelWords(info)
  });
  const boss = new BossKey(context, { draft });
  wordCount.deps = { draft };

  context.subscriptions.push(
    vscode.window.createTreeView('novelWriter.chapters', {
      treeDataProvider: tree,
      showCollapseAll: true
    }),
    vscode.window.registerWebviewViewProvider('novelWriter.draft', draft, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  wordCount.activate(context);
  registerCommands(context, { tree, boss, wordCount, draft });

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => tree.refresh())
  );
}

function deactivate() {}

module.exports = { activate, deactivate };

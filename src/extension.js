const vscode = require('vscode');
const { NovelTreeProvider } = require('./novelTree');
const { WordCountStatus } = require('./wordCount');
const { BossKey } = require('./bossKey');
const { registerCommands } = require('./commands');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const tree = new NovelTreeProvider();
  const wordCount = new WordCountStatus();
  const boss = new BossKey(context);

  context.subscriptions.push(
    vscode.window.createTreeView('novelWriter.chapters', {
      treeDataProvider: tree,
      showCollapseAll: true
    })
  );

  wordCount.activate(context);
  registerCommands(context, { tree, boss, wordCount });

  // Refresh tree when workspace folders change
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => tree.refresh())
  );
}

function deactivate() {}

module.exports = { activate, deactivate };

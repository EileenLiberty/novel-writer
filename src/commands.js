const vscode = require('vscode');
const store = require('./novelStore');

/**
 * @param {{ tree: import('./novelTree').NovelTreeProvider, boss: import('./bossKey').BossKey, wordCount: import('./wordCount').WordCountStatus, draft: import('./draftPanel').DraftPanelProvider }} deps
 */
function registerCommands(context, deps) {
  const { tree, boss, wordCount, draft } = deps;

  async function openInDraft(chapterId) {
    await draft.openChapter(chapterId);
    // Keep decoy code in the main editor so it looks like coding
    await boss.showCover({ preserveFocus: true });
    await draft.reveal();
  }

  const refreshAll = async () => {
    tree.refresh();
    await wordCount.update();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('novelWriter.initNovel', async () => {
      try {
        const title = await vscode.window.showInputBox({
          prompt: '小说名称',
          value: '我的小说',
          placeHolder: '我的小说'
        });
        if (title === undefined) return;
        await store.ensureNovelInitialized(title.trim() || '我的小说');
        await refreshAll();
        vscode.window.showInformationMessage(`已初始化小说文件夹：${store.getRootName()}/`);
        const meta = await store.loadMeta();
        if (meta && meta.chapters[0]) {
          await openInDraft(meta.chapters[0].id);
        }
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.newChapter', async () => {
      try {
        if (!(await store.loadMeta())) {
          await store.ensureNovelInitialized();
        }
        const title = await vscode.window.showInputBox({
          prompt: '章节标题',
          placeHolder: '第二章'
        });
        if (title === undefined) return;
        const { chapter } = await store.addChapter(title.trim() || undefined);
        await refreshAll();
        await openInDraft(chapter.id);
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.openChapter', async (chapterId) => {
      try {
        const meta = await store.loadMeta();
        if (!meta) return;
        let id = chapterId;
        if (!id || typeof id !== 'string') {
          if (chapterId && chapterId.chapter) id = chapterId.chapter.id;
        }
        if (!id) return;
        await openInDraft(id);
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.focusDraft', async () => {
      try {
        await boss.showCover({ preserveFocus: true });
        await draft.reveal();
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.renameChapter', async (item) => {
      try {
        const chapter = item && item.chapter;
        if (!chapter) return;
        const title = await vscode.window.showInputBox({
          prompt: '新章节标题',
          value: chapter.title
        });
        if (title === undefined) return;
        await store.renameChapter(chapter.id, title);
        await refreshAll();
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.deleteChapter', async (item) => {
      try {
        const chapter = item && item.chapter;
        if (!chapter) return;
        const confirm = await vscode.window.showWarningMessage(
          `确定删除章节「${chapter.title}」？文件将从磁盘删除。`,
          { modal: true },
          '删除'
        );
        if (confirm !== '删除') return;
        await store.deleteChapter(chapter.id);
        await refreshAll();
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.moveChapterUp', async (item) => {
      try {
        const chapter = item && item.chapter;
        if (!chapter) return;
        await store.moveChapter(chapter.id, 'up');
        await refreshAll();
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.moveChapterDown', async (item) => {
      try {
        const chapter = item && item.chapter;
        if (!chapter) return;
        await store.moveChapter(chapter.id, 'down');
        await refreshAll();
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.setTarget', async (item) => {
      try {
        const meta = await store.loadMeta();
        if (!meta) {
          vscode.window.showWarningMessage('请先初始化小说');
          return;
        }
        let chapter = item && item.chapter;
        if (!chapter) {
          const panelId = draft.getActiveChapterId();
          if (panelId) {
            chapter = meta.chapters.find((c) => c.id === panelId);
          }
        }
        if (!chapter) {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            const found = store.findChapterByUri(editor.document.uri, meta);
            if (found) chapter = found.chapter;
          }
        }
        if (!chapter) {
          vscode.window.showWarningMessage('请先打开或选中一个章节');
          return;
        }
        const value = await vscode.window.showInputBox({
          prompt: `设置「${chapter.title}」的目标字数`,
          value: String(chapter.target || store.getDefaultTarget()),
          validateInput: (v) => (/^\d+$/.test(v) ? null : '请输入非负整数')
        });
        if (value === undefined) return;
        chapter.target = parseInt(value, 10);
        await store.saveMeta(meta);
        await refreshAll();
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.renameNovel', async () => {
      try {
        const meta = await store.loadMeta();
        if (!meta) return;
        const title = await vscode.window.showInputBox({
          prompt: '小说名称',
          value: meta.title
        });
        if (title === undefined) return;
        meta.title = title.trim() || meta.title;
        await store.saveMeta(meta);
        await refreshAll();
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.refresh', async () => {
      await refreshAll();
    }),

    vscode.commands.registerCommand('novelWriter.bossMode', async () => {
      await boss.toggle();
    }),

    vscode.commands.registerCommand('novelWriter.exportMerged', async () => {
      try {
        const meta = await store.loadMeta();
        if (!meta) {
          vscode.window.showWarningMessage('请先初始化小说');
          return;
        }
        const parts = await store.readAllChapterContents(meta);
        let md = `# ${meta.title}\n\n`;
        for (const p of parts) {
          const body = (p.content || '').replace(/^#\s+.+\n+/, '');
          md += `## ${p.chapter.title}\n\n${body.trim()}\n\n---\n\n`;
        }
        const folder = store.getWorkspaceFolder();
        if (!folder) return;
        const defaultUri = vscode.Uri.joinPath(folder.uri, `${meta.title}.md`);
        const uri = await vscode.window.showSaveDialog({
          defaultUri,
          filters: { Markdown: ['md'] }
        });
        if (!uri) return;
        await vscode.workspace.fs.writeFile(uri, Buffer.from(md, 'utf8'));
        vscode.window.showInformationMessage(`已导出：${uri.fsPath}`);
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    }),

    vscode.commands.registerCommand('novelWriter.exportCurrent', async () => {
      try {
        const meta = await store.loadMeta();
        if (!meta) {
          vscode.window.showWarningMessage('请先打开一个章节');
          return;
        }
        let chapter = null;
        let text = '';
        const panelId = draft.getActiveChapterId();
        if (panelId) {
          chapter = meta.chapters.find((c) => c.id === panelId);
          text = draft.getActiveContent() || '';
        }
        if (!chapter) {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            const found = store.findChapterByUri(editor.document.uri, meta);
            if (found) {
              chapter = found.chapter;
              text = editor.document.getText();
            }
          }
        }
        if (!chapter) {
          vscode.window.showWarningMessage('请先在底部 Console 打开一个章节');
          return;
        }
        const folder = store.getWorkspaceFolder();
        if (!folder) return;
        const safe = chapter.title.replace(/[\\/:*?"<>|]/g, '_');
        const defaultUri = vscode.Uri.joinPath(folder.uri, `${safe}.md`);
        const uri = await vscode.window.showSaveDialog({
          defaultUri,
          filters: { Markdown: ['md'] }
        });
        if (!uri) return;
        await vscode.workspace.fs.writeFile(uri, Buffer.from(text, 'utf8'));
        vscode.window.showInformationMessage(`已导出：${uri.fsPath}`);
      } catch (e) {
        vscode.window.showErrorMessage(String(e.message || e));
      }
    })
  );

  // Watch novel folder for external changes
  const root = store.getNovelRootUri();
  if (root) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(root, '**/*')
    );
    watcher.onDidCreate(() => tree.refresh());
    watcher.onDidDelete(() => tree.refresh());
    watcher.onDidChange(() => {
      tree.refresh();
      wordCount.update();
    });
    context.subscriptions.push(watcher);
  }
}

module.exports = { registerCommands };

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * @typedef {{ id: string, title: string, file: string, target: number }} ChapterMeta
 * @typedef {{ title: string, chapters: ChapterMeta[], updatedAt: number }} NovelMeta
 */

function getRootName() {
  return vscode.workspace.getConfiguration('novelWriter').get('root', 'novel');
}

function getDefaultTarget() {
  return vscode.workspace.getConfiguration('novelWriter').get('defaultTarget', 3000);
}

function getWorkspaceFolder() {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length ? folders[0] : null;
}

function getNovelRootUri() {
  const folder = getWorkspaceFolder();
  if (!folder) return null;
  return vscode.Uri.joinPath(folder.uri, getRootName());
}

function getChaptersDirUri() {
  const root = getNovelRootUri();
  if (!root) return null;
  return vscode.Uri.joinPath(root, 'chapters');
}

function getMetaUri() {
  const root = getNovelRootUri();
  if (!root) return null;
  return vscode.Uri.joinPath(root, 'novel.json');
}

function fsExists(uri) {
  try {
    fs.accessSync(uri.fsPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<NovelMeta|null>}
 */
async function loadMeta() {
  const metaUri = getMetaUri();
  if (!metaUri || !fsExists(metaUri)) return null;
  const raw = await vscode.workspace.fs.readFile(metaUri);
  const text = Buffer.from(raw).toString('utf8');
  /** @type {NovelMeta} */
  const data = JSON.parse(text);
  if (!data.chapters) data.chapters = [];
  if (!data.title) data.title = '我的小说';
  return data;
}

/**
 * @param {NovelMeta} meta
 */
async function saveMeta(meta) {
  const metaUri = getMetaUri();
  if (!metaUri) throw new Error('No workspace folder open');
  meta.updatedAt = Date.now();
  const content = Buffer.from(JSON.stringify(meta, null, 2), 'utf8');
  await vscode.workspace.fs.writeFile(metaUri, content);
}

function uid() {
  return 'ch' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function sanitizeFilePart(title) {
  return String(title || 'untitled')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'untitled';
}

function padIndex(n) {
  return String(n).padStart(3, '0');
}

/**
 * @param {number} index1Based
 * @param {string} title
 */
function chapterFileName(index1Based, title) {
  return `${padIndex(index1Based)}-${sanitizeFilePart(title)}.md`;
}

function chineseChapterTitle(n) {
  const map = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (n >= 1 && n <= 10) return `第${map[n - 1]}章`;
  return `第${n}章`;
}

/**
 * Count words: CJK chars + English/number words.
 * @param {string} text
 */
function countWords(text) {
  if (!text) return 0;
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[a-zA-Z0-9]+/g) || []).length;
  return cjk + words;
}

async function ensureNovelInitialized(title) {
  const root = getNovelRootUri();
  const chaptersDir = getChaptersDirUri();
  if (!root || !chaptersDir) {
    throw new Error('请先打开一个工作区文件夹');
  }

  if (!fsExists(root)) {
    await vscode.workspace.fs.createDirectory(root);
  }
  if (!fsExists(chaptersDir)) {
    await vscode.workspace.fs.createDirectory(chaptersDir);
  }

  let meta = await loadMeta();
  if (!meta) {
    const firstTitle = chineseChapterTitle(1) + ' 引子';
    const file = chapterFileName(1, firstTitle);
    const chapterUri = vscode.Uri.joinPath(chaptersDir, file);
    await vscode.workspace.fs.writeFile(
      chapterUri,
      Buffer.from(`# ${firstTitle}\n\n`, 'utf8')
    );
    meta = {
      title: title || '我的小说',
      updatedAt: Date.now(),
      chapters: [
        {
          id: uid(),
          title: firstTitle,
          file,
          target: getDefaultTarget()
        }
      ]
    };
    await saveMeta(meta);
  } else if (title) {
    meta.title = title;
    await saveMeta(meta);
  }
  return meta;
}

/**
 * @param {NovelMeta} meta
 */
async function renumberChapterFiles(meta) {
  const chaptersDir = getChaptersDirUri();
  if (!chaptersDir) return;

  for (let i = 0; i < meta.chapters.length; i++) {
    const ch = meta.chapters[i];
    const desired = chapterFileName(i + 1, ch.title);
    if (ch.file === desired) continue;
    const from = vscode.Uri.joinPath(chaptersDir, ch.file);
    const to = vscode.Uri.joinPath(chaptersDir, desired);
    if (fsExists(from)) {
      if (fsExists(to) && from.fsPath !== to.fsPath) {
        // avoid overwrite: append short id
        const alt = chapterFileName(i + 1, ch.title + '-' + ch.id.slice(-4));
        const altUri = vscode.Uri.joinPath(chaptersDir, alt);
        await vscode.workspace.fs.rename(from, altUri, { overwrite: false });
        ch.file = alt;
      } else {
        await vscode.workspace.fs.rename(from, to, { overwrite: false });
        ch.file = desired;
      }
    } else {
      ch.file = desired;
    }
  }
}

/**
 * @param {string} title
 */
async function addChapter(title) {
  const meta = (await loadMeta()) || (await ensureNovelInitialized());
  const chaptersDir = getChaptersDirUri();
  if (!chaptersDir) throw new Error('No workspace');

  const n = meta.chapters.length + 1;
  const chTitle = title || chineseChapterTitle(n);
  const file = chapterFileName(n, chTitle);
  const uri = vscode.Uri.joinPath(chaptersDir, file);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(`# ${chTitle}\n\n`, 'utf8'));

  const chapter = {
    id: uid(),
    title: chTitle,
    file,
    target: getDefaultTarget()
  };
  meta.chapters.push(chapter);
  await saveMeta(meta);
  return { meta, chapter, uri };
}

/**
 * @param {string} chapterId
 * @param {string} newTitle
 */
async function renameChapter(chapterId, newTitle) {
  const meta = await loadMeta();
  if (!meta) throw new Error('小说尚未初始化');
  const ch = meta.chapters.find((c) => c.id === chapterId);
  if (!ch) throw new Error('章节不存在');
  ch.title = newTitle.trim() || ch.title;
  await renumberChapterFiles(meta);
  await saveMeta(meta);
  return meta;
}

/**
 * @param {string} chapterId
 */
async function deleteChapter(chapterId) {
  const meta = await loadMeta();
  if (!meta) throw new Error('小说尚未初始化');
  const chaptersDir = getChaptersDirUri();
  if (!chaptersDir) throw new Error('No workspace');

  const idx = meta.chapters.findIndex((c) => c.id === chapterId);
  if (idx < 0) throw new Error('章节不存在');
  const [removed] = meta.chapters.splice(idx, 1);
  const fileUri = vscode.Uri.joinPath(chaptersDir, removed.file);
  if (fsExists(fileUri)) {
    await vscode.workspace.fs.delete(fileUri);
  }
  await renumberChapterFiles(meta);
  await saveMeta(meta);
  return meta;
}

/**
 * @param {string} chapterId
 * @param {'up'|'down'} direction
 */
async function moveChapter(chapterId, direction) {
  const meta = await loadMeta();
  if (!meta) throw new Error('小说尚未初始化');
  const idx = meta.chapters.findIndex((c) => c.id === chapterId);
  if (idx < 0) throw new Error('章节不存在');
  const target = direction === 'up' ? idx - 1 : idx + 1;
  if (target < 0 || target >= meta.chapters.length) return meta;
  const tmp = meta.chapters[idx];
  meta.chapters[idx] = meta.chapters[target];
  meta.chapters[target] = tmp;
  await renumberChapterFiles(meta);
  await saveMeta(meta);
  return meta;
}

/**
 * @param {string} chapterId
 */
function getChapterUri(chapterId, meta) {
  const chaptersDir = getChaptersDirUri();
  if (!chaptersDir || !meta) return null;
  const ch = meta.chapters.find((c) => c.id === chapterId);
  if (!ch) return null;
  return vscode.Uri.joinPath(chaptersDir, ch.file);
}

/**
 * @param {vscode.Uri} uri
 * @param {NovelMeta|null} meta
 */
function findChapterByUri(uri, meta) {
  if (!meta || !uri) return null;
  const chaptersDir = getChaptersDirUri();
  if (!chaptersDir) return null;
  const base = chaptersDir.fsPath.replace(/\\/g, '/').toLowerCase();
  const filePath = uri.fsPath.replace(/\\/g, '/').toLowerCase();
  if (!filePath.startsWith(base)) return null;
  const file = path.basename(uri.fsPath);
  const idx = meta.chapters.findIndex((c) => c.file === file);
  if (idx < 0) return null;
  return { chapter: meta.chapters[idx], index: idx };
}

/**
 * @param {NovelMeta} meta
 */
async function readAllChapterContents(meta) {
  const chaptersDir = getChaptersDirUri();
  if (!chaptersDir) return [];
  const result = [];
  for (const ch of meta.chapters) {
    const uri = vscode.Uri.joinPath(chaptersDir, ch.file);
    let content = '';
    if (fsExists(uri)) {
      const raw = await vscode.workspace.fs.readFile(uri);
      content = Buffer.from(raw).toString('utf8');
    }
    result.push({ chapter: ch, content });
  }
  return result;
}

function isChapterUri(uri) {
  if (!uri || uri.scheme !== 'file') return false;
  const chaptersDir = getChaptersDirUri();
  if (!chaptersDir) return false;
  const base = chaptersDir.fsPath.replace(/\\/g, '/').toLowerCase().replace(/\/$/, '');
  const filePath = uri.fsPath.replace(/\\/g, '/').toLowerCase();
  return filePath.startsWith(base + '/') && filePath.endsWith('.md');
}

module.exports = {
  getRootName,
  getDefaultTarget,
  getWorkspaceFolder,
  getNovelRootUri,
  getChaptersDirUri,
  getMetaUri,
  fsExists,
  loadMeta,
  saveMeta,
  uid,
  countWords,
  ensureNovelInitialized,
  addChapter,
  renameChapter,
  deleteChapter,
  moveChapter,
  getChapterUri,
  findChapterByUri,
  readAllChapterContents,
  isChapterUri,
  renumberChapterFiles,
  chapterFileName
};

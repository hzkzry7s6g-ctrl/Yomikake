import type { EntityTable, Table } from 'dexie';
import { db, newUid, type Book, type BookStatus, type Character, type LabelUsage, type Note, type Relation, type Synced, type Term, type Tombstone } from './db';
import { hueFromText } from '../lib/presets';

const now = () => Date.now();
const fresh = () => ({ uid: newUid(), updatedAt: now(), createdAt: now() });

export interface NewBook {
  title: string;
  author?: string;
  coverUrl?: string;
  totalPages?: number;
  status?: BookStatus;
}

export async function addBook(input: NewBook): Promise<number> {
  const t = now();
  const status = input.status ?? 'reading';
  return (await db.books.add({
    ...fresh(),
    title: input.title.trim(),
    author: input.author,
    coverUrl: input.coverUrl,
    totalPages: input.totalPages,
    currentPage: status === 'done' && input.totalPages ? input.totalPages : 0,
    status,
    hue: hueFromText(input.title),
    startedAt: status === 'reading' ? t : undefined,
    finishedAt: status === 'done' ? t : undefined,
  })) as number;
}

export async function updateBook(id: number, changes: Partial<Book>) {
  await db.books.update(id, { ...changes, updatedAt: now() });
}

function clampPage(book: Book, page: number) {
  const max = book.totalPages && book.totalPages > 0 ? book.totalPages : Infinity;
  return Math.max(0, Math.min(Math.round(page), max));
}

/** ページを記録する。戻り値は元に戻す用の直前のページ */
export async function setPage(id: number, page: number): Promise<number> {
  const book = await db.books.get(id);
  if (!book) return 0;
  const prev = book.currentPage;
  const changes: Partial<Book> = { currentPage: clampPage(book, page) };
  // ページを進めたら自動で「読書中」にする
  if (book.status === 'want' || book.status === 'paused') {
    changes.status = 'reading';
    changes.startedAt = book.startedAt ?? now();
  }
  await updateBook(id, changes);
  return prev;
}

export async function addPages(id: number, delta: number): Promise<number> {
  const book = await db.books.get(id);
  if (!book) return 0;
  return setPage(id, book.currentPage + delta);
}

export async function setStatus(id: number, status: BookStatus) {
  const book = await db.books.get(id);
  if (!book) return;
  const changes: Partial<Book> = { status };
  if (status === 'reading') changes.startedAt = book.startedAt ?? now();
  if (status === 'done') {
    changes.finishedAt = now();
    if (book.totalPages) changes.currentPage = book.totalPages;
  }
  await updateBook(id, changes);
}

/** 削除した記録の uid を残し、同期で相手から復活しないようにする */
async function bury(records: { uid: string }[]) {
  const t = now();
  await db.tombstones.bulkPut(records.map((r) => ({ uid: r.uid, deletedAt: t })));
}

const ALL_TABLES = [db.books, db.notes, db.characters, db.relations, db.terms, db.labelUsage, db.tombstones];

export async function deleteBook(id: number) {
  await db.transaction('rw', ALL_TABLES, async () => {
    const book = await db.books.get(id);
    const children = await Promise.all([
      db.notes.where('bookId').equals(id).toArray(),
      db.characters.where('bookId').equals(id).toArray(),
      db.relations.where('bookId').equals(id).toArray(),
      db.terms.where('bookId').equals(id).toArray(),
    ]);
    await bury([...(book ? [book] : []), ...children.flat()]);
    await db.notes.where('bookId').equals(id).delete();
    await db.characters.where('bookId').equals(id).delete();
    await db.relations.where('bookId').equals(id).delete();
    await db.terms.where('bookId').equals(id).delete();
    await db.books.delete(id);
  });
}

async function pageOf(bookId: number) {
  return (await db.books.get(bookId))?.currentPage ?? 0;
}

/** メモは現在ページに自動で紐づける */
export async function addNote(bookId: number, stamp: string, body?: string): Promise<number> {
  const id = (await db.notes.add({
    ...fresh(),
    bookId,
    stamp,
    body: body?.trim() || undefined,
    page: await pageOf(bookId),
  })) as number;
  await updateBook(bookId, {});
  return id;
}

export async function deleteNote(id: number) {
  await db.transaction('rw', [db.notes, db.tombstones], async () => {
    const note = await db.notes.get(id);
    if (note) await bury([note]);
    await db.notes.delete(id);
  });
}

export async function addCharacter(bookId: number, name: string): Promise<number> {
  return (await db.characters.add({
    ...fresh(),
    bookId,
    name: name.trim(),
    firstPage: await pageOf(bookId),
  })) as number;
}

export async function deleteCharacter(id: number) {
  await db.transaction('rw', [db.characters, db.relations, db.tombstones], async () => {
    const character = await db.characters.get(id);
    const rels = await db.relations.filter((r) => r.fromId === id || r.toId === id).toArray();
    await bury([...(character ? [character] : []), ...rels]);
    await db.relations.bulkDelete(rels.map((r) => r.id));
    await db.characters.delete(id);
  });
}

export async function addRelation(bookId: number, fromId: number, toId: number, label: string) {
  const text = label.trim();
  await db.transaction('rw', [db.relations, db.labelUsage, db.books], async () => {
    await db.relations.add({
      ...fresh(),
      bookId,
      fromId,
      toId,
      label: text,
      revealedPage: await pageOf(bookId),
    });
    const usage = await db.labelUsage.get(text);
    await db.labelUsage.put({ label: text, count: (usage?.count ?? 0) + 1 });
  });
}

export async function deleteRelation(id: number) {
  await db.transaction('rw', [db.relations, db.tombstones], async () => {
    const rel = await db.relations.get(id);
    if (rel) await bury([rel]);
    await db.relations.delete(id);
  });
}

export async function addTerm(bookId: number, name: string): Promise<number> {
  return (await db.terms.add({
    ...fresh(),
    bookId,
    name: name.trim(),
    firstPage: await pageOf(bookId),
  })) as number;
}

export async function deleteTerm(id: number) {
  await db.transaction('rw', [db.terms, db.tombstones], async () => {
    const term = await db.terms.get(id);
    if (term) await bury([term]);
    await db.terms.delete(id);
  });
}

/* ---------------- 同期・バックアップ ----------------
 * 端末内の数値 id は端末ごとに違うので、ファイルには uid で参照を書く。
 * 取り込むときは uid で照合し、updatedAt が新しいほうを残す(マージ)。
 */

type Out<T> = Omit<T, 'id' | 'bookId' | 'fromId' | 'toId'>;

export interface SyncFile {
  app: 'yomikake';
  version: 2;
  exportedAt: string;
  books: Out<Book>[];
  notes: (Out<Note> & { bookUid: string })[];
  characters: (Out<Character> & { bookUid: string })[];
  relations: (Out<Relation> & { bookUid: string; fromUid: string; toUid: string })[];
  terms: (Out<Term> & { bookUid: string })[];
  labelUsage: LabelUsage[];
  tombstones: Tombstone[];
}

/** 版1(uid なし)の古いバックアップ */
interface LegacyBackup {
  app: 'yomikake';
  version: 1;
  books: Book[];
  notes: Note[];
  characters: Character[];
  relations: Relation[];
  terms: Term[];
  labelUsage: LabelUsage[];
}

export async function exportAll(): Promise<SyncFile> {
  const [books, notes, characters, relations, terms, labelUsage, tombstones] = await Promise.all([
    db.books.toArray(),
    db.notes.toArray(),
    db.characters.toArray(),
    db.relations.toArray(),
    db.terms.toArray(),
    db.labelUsage.toArray(),
    db.tombstones.toArray(),
  ]);
  const bookUid = new Map(books.map((b) => [b.id, b.uid]));
  const charUid = new Map(characters.map((c) => [c.id, c.uid]));
  const child = <T extends { id: number; bookId: number }>({ id: _id, bookId, ...rest }: T) => ({
    ...rest,
    bookUid: bookUid.get(bookId)!,
  });
  return {
    app: 'yomikake',
    version: 2,
    exportedAt: new Date().toISOString(),
    books: books.map(({ id: _id, ...rest }) => rest),
    notes: notes.filter((n) => bookUid.has(n.bookId)).map(child),
    characters: characters.filter((c) => bookUid.has(c.bookId)).map(child),
    terms: terms.filter((t) => bookUid.has(t.bookId)).map(child),
    relations: relations
      .filter((r) => bookUid.has(r.bookId) && charUid.has(r.fromId) && charUid.has(r.toId))
      .map(({ fromId, toId, ...r }) => ({ ...child(r), fromUid: charUid.get(fromId)!, toUid: charUid.get(toId)! })),
    labelUsage,
    tombstones,
  };
}

export interface MergeResult {
  added: number;
  updated: number;
  deleted: number;
}

export class LegacyBackupError extends Error {
  constructor() {
    super('古い形式のバックアップです');
  }
}

export function checkSyncFile(data: unknown): SyncFile | LegacyBackup {
  const d = data as { app?: string; version?: number } | null;
  if (d?.app !== 'yomikake') throw new Error('よみかけの同期ファイルではありません');
  if (d.version !== 1 && d.version !== 2) throw new Error('このファイルの形式には対応していません。アプリを更新してください');
  return data as SyncFile | LegacyBackup;
}

/** 相手の端末の記録を取り込んで合体させる。何度取り込んでも結果は同じ */
export async function mergeAll(data: unknown): Promise<MergeResult> {
  const file = checkSyncFile(data);
  if (file.version !== 2) throw new LegacyBackupError();
  const result: MergeResult = { added: 0, updated: 0, deleted: 0 };

  await db.transaction('rw', ALL_TABLES, async () => {
    // 1. 相手で削除されたものを、こちらでも削除する(削除後にこちらで編集したものは残す)
    for (const t of file.tombstones) {
      const mine = await db.tombstones.get(t.uid);
      if (!mine || mine.deletedAt < t.deletedAt) await db.tombstones.put(t);
      for (const table of [db.books, db.notes, db.characters, db.relations, db.terms] as Table<Synced & { id: number }, number>[]) {
        const local = await table.where('uid').equals(t.uid).first();
        if (local && local.updatedAt <= t.deletedAt) {
          await table.delete(local.id);
          result.deleted++;
        }
      }
    }

    // 2. uid で照合して、新しいほうを残す
    async function upsert<T extends Synced & { id: number }>(table: EntityTable<T, 'id'>, rec: Omit<T, 'id'>) {
      const dead = await db.tombstones.get(rec.uid);
      if (dead && dead.deletedAt >= rec.updatedAt) return;
      const local = await table.where('uid').equals(rec.uid).first();
      if (!local) {
        await table.add(rec as never);
        result.added++;
      } else if (local.updatedAt < rec.updatedAt) {
        // updatedAt を含めて渡すので、更新フックで現在時刻に書き換わらない
        await table.update(local.id as never, rec as never);
        result.updated++;
      }
    }

    for (const b of file.books) await upsert(db.books, b);
    const bookId = new Map((await db.books.toArray()).map((b) => [b.uid, b.id]));

    for (const { bookUid, ...c } of file.characters) {
      const id = bookId.get(bookUid);
      if (id !== undefined) await upsert(db.characters, { ...c, bookId: id });
    }
    for (const { bookUid, ...t } of file.terms) {
      const id = bookId.get(bookUid);
      if (id !== undefined) await upsert(db.terms, { ...t, bookId: id });
    }
    for (const { bookUid, ...n } of file.notes) {
      const id = bookId.get(bookUid);
      if (id !== undefined) await upsert(db.notes, { ...n, bookId: id });
    }
    const charId = new Map((await db.characters.toArray()).map((c) => [c.uid, c.id]));
    for (const { bookUid, fromUid, toUid, ...r } of file.relations) {
      const id = bookId.get(bookUid);
      const fromId = charId.get(fromUid);
      const toId = charId.get(toUid);
      if (id !== undefined && fromId !== undefined && toId !== undefined) {
        await upsert(db.relations, { ...r, bookId: id, fromId, toId });
      }
    }

    // 3. よく使う関係ラベルの回数は多いほうを採る
    for (const u of file.labelUsage) {
      const mine = await db.labelUsage.get(u.label);
      if (!mine || mine.count < u.count) await db.labelUsage.put(u);
    }

    // 4. 親(本・人物)が消えて行き場のなくなった記録を片付ける
    const books = new Set(await db.books.toCollection().primaryKeys());
    const chars = new Set(await db.characters.toCollection().primaryKeys());
    const orphan = (x: { bookId: number }) => !books.has(x.bookId);
    await db.notes.filter(orphan).delete();
    await db.characters.filter(orphan).delete();
    await db.terms.filter(orphan).delete();
    await db.relations.filter((r) => orphan(r) || !chars.has(r.fromId) || !chars.has(r.toId)).delete();
  });
  return result;
}

/** 版1の古いバックアップからの復元(全置き換え) */
export async function replaceWithLegacy(data: unknown) {
  const file = checkSyncFile(data);
  if (file.version !== 1) throw new Error('古い形式のバックアップではありません');
  await db.transaction('rw', ALL_TABLES, async () => {
    await Promise.all(ALL_TABLES.map((t) => t.clear()));
    // uid と updatedAt は作成フックで付く
    await db.books.bulkAdd(file.books);
    await db.notes.bulkAdd(file.notes);
    await db.characters.bulkAdd(file.characters);
    await db.relations.bulkAdd(file.relations);
    await db.terms.bulkAdd(file.terms);
    await db.labelUsage.bulkAdd(file.labelUsage);
  });
}

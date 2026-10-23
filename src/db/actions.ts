import { db, type Book, type BookStatus } from './db';
import { hueFromText } from '../lib/presets';

const now = () => Date.now();

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
    title: input.title.trim(),
    author: input.author,
    coverUrl: input.coverUrl,
    totalPages: input.totalPages,
    currentPage: status === 'done' && input.totalPages ? input.totalPages : 0,
    status,
    hue: hueFromText(input.title),
    startedAt: status === 'reading' ? t : undefined,
    finishedAt: status === 'done' ? t : undefined,
    createdAt: t,
    updatedAt: t,
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

export async function deleteBook(id: number) {
  await db.transaction('rw', [db.books, db.notes, db.characters, db.relations, db.terms], async () => {
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
    bookId,
    stamp,
    body: body?.trim() || undefined,
    page: await pageOf(bookId),
    createdAt: now(),
  })) as number;
  await updateBook(bookId, {});
  return id;
}

export async function addCharacter(bookId: number, name: string): Promise<number> {
  return (await db.characters.add({
    bookId,
    name: name.trim(),
    firstPage: await pageOf(bookId),
    createdAt: now(),
  })) as number;
}

export async function deleteCharacter(id: number) {
  await db.transaction('rw', [db.characters, db.relations], async () => {
    const rels = await db.relations.filter((r) => r.fromId === id || r.toId === id).primaryKeys();
    await db.relations.bulkDelete(rels);
    await db.characters.delete(id);
  });
}

export async function addRelation(bookId: number, fromId: number, toId: number, label: string) {
  const text = label.trim();
  await db.transaction('rw', [db.relations, db.labelUsage, db.books], async () => {
    await db.relations.add({
      bookId,
      fromId,
      toId,
      label: text,
      revealedPage: await pageOf(bookId),
      createdAt: now(),
    });
    const usage = await db.labelUsage.get(text);
    await db.labelUsage.put({ label: text, count: (usage?.count ?? 0) + 1 });
  });
}

export async function addTerm(bookId: number, name: string): Promise<number> {
  return (await db.terms.add({
    bookId,
    name: name.trim(),
    firstPage: await pageOf(bookId),
    createdAt: now(),
  })) as number;
}

/** 端末内にしか保存しないので、バックアップの書き出し・読み込みを用意する */
export async function exportAll() {
  return {
    app: 'yomikake',
    version: 1,
    exportedAt: new Date().toISOString(),
    books: await db.books.toArray(),
    notes: await db.notes.toArray(),
    characters: await db.characters.toArray(),
    relations: await db.relations.toArray(),
    terms: await db.terms.toArray(),
    labelUsage: await db.labelUsage.toArray(),
  };
}

export async function importAll(data: Awaited<ReturnType<typeof exportAll>>) {
  if (data?.app !== 'yomikake') throw new Error('よみかけのバックアップファイルではありません');
  await db.transaction(
    'rw',
    [db.books, db.notes, db.characters, db.relations, db.terms, db.labelUsage],
    async () => {
      await Promise.all([
        db.books.clear(),
        db.notes.clear(),
        db.characters.clear(),
        db.relations.clear(),
        db.terms.clear(),
        db.labelUsage.clear(),
      ]);
      await db.books.bulkAdd(data.books);
      await db.notes.bulkAdd(data.notes);
      await db.characters.bulkAdd(data.characters);
      await db.relations.bulkAdd(data.relations);
      await db.terms.bulkAdd(data.terms);
      await db.labelUsage.bulkAdd(data.labelUsage);
    },
  );
}

import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { expect, it } from 'vitest';

it('版1のデータに uid と updatedAt が付く', async () => {
  // 同期機能より前の版で保存されていたデータ
  const v1 = new Dexie('yomikake');
  v1.version(1).stores({
    books: '++id, status, updatedAt',
    notes: '++id, bookId, createdAt',
    characters: '++id, bookId',
    relations: '++id, bookId',
    terms: '++id, bookId',
    labelUsage: 'label',
  });
  await v1.table('books').add({ title: '罪と罰', currentPage: 30, status: 'reading', hue: 0, createdAt: 1, updatedAt: 5 });
  await v1.table('notes').add({ bookId: 1, page: 10, stamp: 'bookmark', createdAt: 2 });
  v1.close();

  const { db } = await import('./db');
  const [book] = await db.books.toArray();
  const [note] = await db.notes.toArray();
  expect(book.uid).toMatch(/^[0-9a-f-]{32,36}$/);
  expect(note.uid).not.toBe(book.uid);
  // 本の updatedAt は並び順に使うので、移行で変わらない
  expect(book.updatedAt).toBe(5);
  expect(note.updatedAt).toBe(2);
});

import Dexie, { type EntityTable } from 'dexie';

export type BookStatus = 'reading' | 'want' | 'done' | 'paused';

export interface Book {
  id: number;
  title: string;
  author?: string;
  coverUrl?: string;
  totalPages?: number;
  currentPage: number;
  status: BookStatus;
  /** 表紙がないときの本の色(色相 0-359)。本の取り違え防止に常に表示する */
  hue: number;
  rating?: number;
  startedAt?: number;
  finishedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: number;
  bookId: number;
  page: number;
  stamp: string;
  body?: string;
  createdAt: number;
}

export interface Character {
  id: number;
  bookId: number;
  name: string;
  aliases?: string;
  description?: string;
  /** 初登場ページ。現在ページがこれ未満なら非表示(ネタバレ防止) */
  firstPage: number;
  /** 相関図でドラッグして置いた位置 */
  x?: number;
  y?: number;
  createdAt: number;
}

export interface Relation {
  id: number;
  bookId: number;
  /** 「from は to の label」と読む */
  fromId: number;
  toId: number;
  label: string;
  revealedPage: number;
  createdAt: number;
}

export interface Term {
  id: number;
  bookId: number;
  name: string;
  description?: string;
  firstPage: number;
  createdAt: number;
}

export interface LabelUsage {
  label: string;
  count: number;
}

export const db = new Dexie('yomikake') as Dexie & {
  books: EntityTable<Book, 'id'>;
  notes: EntityTable<Note, 'id'>;
  characters: EntityTable<Character, 'id'>;
  relations: EntityTable<Relation, 'id'>;
  terms: EntityTable<Term, 'id'>;
  labelUsage: EntityTable<LabelUsage, 'label'>;
};

db.version(1).stores({
  books: '++id, status, updatedAt',
  notes: '++id, bookId, createdAt',
  characters: '++id, bookId',
  relations: '++id, bookId',
  terms: '++id, bookId',
  labelUsage: 'label',
});

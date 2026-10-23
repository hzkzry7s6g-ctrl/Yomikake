import Dexie, { type EntityTable } from 'dexie';

export type BookStatus = 'reading' | 'want' | 'done' | 'paused';

/** 端末をまたいで同じ記録を見分けるための共通項目 */
export interface Synced {
  /** 端末に依存しない不変の ID。同期時はこれで照合する */
  uid: string;
  /** 同期時、同じ uid なら新しいほうを採用する */
  updatedAt: number;
}

export interface Book extends Synced {
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
}

export interface Note extends Synced {
  id: number;
  bookId: number;
  page: number;
  stamp: string;
  body?: string;
  createdAt: number;
}

export interface Character extends Synced {
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

export interface Relation extends Synced {
  id: number;
  bookId: number;
  /** 「from は to の label」と読む */
  fromId: number;
  toId: number;
  label: string;
  revealedPage: number;
  createdAt: number;
}

export interface Term extends Synced {
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

/** 削除した記録の印。同期相手のファイルから復活しないようにする */
export interface Tombstone {
  uid: string;
  deletedAt: number;
}

export const db = new Dexie('yomikake') as Dexie & {
  books: EntityTable<Book, 'id'>;
  notes: EntityTable<Note, 'id'>;
  characters: EntityTable<Character, 'id'>;
  relations: EntityTable<Relation, 'id'>;
  terms: EntityTable<Term, 'id'>;
  labelUsage: EntityTable<LabelUsage, 'label'>;
  tombstones: EntityTable<Tombstone, 'uid'>;
};

db.version(1).stores({
  books: '++id, status, updatedAt',
  notes: '++id, bookId, createdAt',
  characters: '++id, bookId',
  relations: '++id, bookId',
  terms: '++id, bookId',
  labelUsage: 'label',
});

export const SYNCED_TABLES = ['books', 'notes', 'characters', 'relations', 'terms'] as const;

db.version(2)
  .stores({
    books: '++id, status, updatedAt, &uid',
    notes: '++id, bookId, createdAt, &uid',
    characters: '++id, bookId, &uid',
    relations: '++id, bookId, &uid',
    terms: '++id, bookId, &uid',
    labelUsage: 'label',
    tombstones: 'uid',
  })
  .upgrade(async (tx) => {
    for (const name of SYNCED_TABLES) {
      await tx
        .table(name)
        .toCollection()
        .modify((r: Partial<Synced> & { createdAt?: number }) => {
          r.uid ??= newUid();
          r.updatedAt ??= r.createdAt ?? Date.now();
        });
    }
  });

export function newUid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // http で開いたとき(LAN での開発など)は randomUUID がない
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 追加・更新のたびに uid と updatedAt を自動で付けるので、各画面で意識しなくてよい
for (const name of SYNCED_TABLES) {
  const table = db.table(name);
  table.hook('creating', (_key, obj: Partial<Synced>) => {
    obj.uid ??= newUid();
    obj.updatedAt ??= Date.now();
  });
  table.hook('updating', (mods: object) => {
    // 同期で相手の updatedAt をそのまま入れるときや、移行で uid を付けるときは触らない
    if ('updatedAt' in mods || 'uid' in mods) return undefined;
    return { updatedAt: Date.now() };
  });
}

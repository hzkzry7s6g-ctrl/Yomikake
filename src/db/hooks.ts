import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export const useBooks = () => useLiveQuery(() => db.books.orderBy('updatedAt').reverse().toArray());

export const useBook = (id: number) => useLiveQuery(() => db.books.get(id), [id]);

export function useBookData(bookId: number) {
  return useLiveQuery(async () => {
    const [notes, characters, relations, terms] = await Promise.all([
      db.notes.where('bookId').equals(bookId).toArray(),
      db.characters.where('bookId').equals(bookId).toArray(),
      db.relations.where('bookId').equals(bookId).toArray(),
      db.terms.where('bookId').equals(bookId).toArray(),
    ]);
    notes.sort((a, b) => b.page - a.page || b.createdAt - a.createdAt);
    characters.sort((a, b) => a.firstPage - b.firstPage || a.createdAt - b.createdAt);
    terms.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    return { notes, characters, relations, terms };
  }, [bookId]);
}

export const useLabelUsage = () =>
  useLiveQuery(async () => (await db.labelUsage.toArray()).sort((a, b) => b.count - a.count));

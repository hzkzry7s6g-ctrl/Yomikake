import { useState } from 'react';
import type { Book } from '../db/db';
import { addPages, setPage } from '../db/actions';
import { navigate } from '../lib/router';
import { NoteSheet } from './NoteSheet';
import { PageSheet } from './PageSheet';
import { useToast } from './Toast';

/** ホームと本の画面で共通の大きなボタン。どれも1〜2タップで記録が終わる */
export function QuickActions({ book, onPeople }: { book: Book; onPeople?: () => void }) {
  const toast = useToast();
  const [sheet, setSheet] = useState<'page' | 'note' | null>(null);

  const plus10 = async () => {
    const prev = await addPages(book.id, 10);
    toast(`p.${prev} → p.${Math.min(prev + 10, book.totalPages || Infinity)}`, () => setPage(book.id, prev));
  };

  return (
    <>
      <div className="quick-actions">
        <button className="qa-btn qa-main" onClick={plus10}>
          <span className="qa-icon">＋10</span>
          <span>ページ</span>
        </button>
        <button className="qa-btn" onClick={() => setSheet('page')}>
          <span className="qa-icon">📍</span>
          <span>ここまで</span>
        </button>
        <button className="qa-btn" onClick={() => setSheet('note')}>
          <span className="qa-icon">🔖</span>
          <span>メモ</span>
        </button>
        <button
          className="qa-btn"
          onClick={onPeople ?? (() => navigate(`/book/${book.id}/people?add`))}
        >
          <span className="qa-icon">👤</span>
          <span>人物</span>
        </button>
      </div>
      {sheet === 'page' && <PageSheet book={book} onClose={() => setSheet(null)} />}
      {sheet === 'note' && <NoteSheet book={book} onClose={() => setSheet(null)} />}
    </>
  );
}

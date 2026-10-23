import type { Book, BookStatus } from '../../db/db';
import { deleteBook, setStatus, updateBook } from '../../db/actions';
import { STATUS_LABELS } from '../../lib/presets';
import { navigate } from '../../lib/router';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';

export function BookSettings({ book, onClose }: { book: Book; onClose: () => void }) {
  const toast = useToast();
  return (
    <Sheet title="本の設定" onClose={onClose}>
      <div className="segmented">
        {(Object.keys(STATUS_LABELS) as BookStatus[]).map((s) => (
          <button
            key={s}
            className={book.status === s ? 'active' : ''}
            onClick={async () => {
              await setStatus(book.id, s);
              if (s === 'done') toast('🎉 読了おめでとうございます!');
            }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {book.status === 'done' && (
        <div className="stars" aria-label="評価">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={n <= (book.rating ?? 0) ? 'on' : ''}
              aria-label={`${n}つ星`}
              onClick={() => updateBook(book.id, { rating: n === book.rating ? undefined : n })}
            >
              ★
            </button>
          ))}
        </div>
      )}
      <label className="field">
        タイトル
        <input defaultValue={book.title} onChange={(e) => e.target.value.trim() && updateBook(book.id, { title: e.target.value.trim() })} />
      </label>
      <label className="field">
        著者
        <input defaultValue={book.author} onChange={(e) => updateBook(book.id, { author: e.target.value || undefined })} />
      </label>
      <label className="field-inline">
        総ページ数
        <input
          type="number"
          inputMode="numeric"
          defaultValue={book.totalPages}
          onChange={(e) => updateBook(book.id, { totalPages: Number(e.target.value) || undefined })}
        />
      </label>
      <button
        className="danger-link"
        onClick={async () => {
          if (!confirm(`「${book.title}」と、そのメモ・人物・用語をすべて削除しますか?`)) return;
          await deleteBook(book.id);
          navigate('/', true);
        }}
      >
        この本を削除
      </button>
    </Sheet>
  );
}

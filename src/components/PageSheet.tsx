import { useState } from 'react';
import type { Book } from '../db/db';
import { setPage, updateBook } from '../db/actions';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

/** 「ここまで読んだ」: ボタン・スライダー・数字のどれでも合わせて1タップで記録 */
export function PageSheet({ book, onClose }: { book: Book; onClose: () => void }) {
  const toast = useToast();
  const [page, setLocal] = useState(book.currentPage);
  const [total, setTotal] = useState(book.totalPages ? String(book.totalPages) : '');
  const max = Number(total) > 0 ? Number(total) : undefined;
  const bump = (d: number) => setLocal((p) => Math.max(0, Math.min(p + d, max ?? Infinity)));

  const save = async () => {
    if (max !== book.totalPages) await updateBook(book.id, { totalPages: max });
    const prev = await setPage(book.id, page);
    toast(`p.${page} まで記録しました`, () => setPage(book.id, prev));
    onClose();
  };

  return (
    <Sheet title="ここまで読んだ" onClose={onClose}>
      <div className="page-display">
        <span className="page-display-p">p.</span>
        <input
          className="page-display-input"
          type="number"
          inputMode="numeric"
          aria-label="ページ"
          value={page}
          onChange={(e) => setLocal(Math.max(0, Number(e.target.value) || 0))}
          onFocus={(e) => e.target.select()}
        />
        {max && <span className="page-display-total">/ {max}</span>}
      </div>
      {max && (
        <input
          className="slider"
          type="range"
          min={0}
          max={max}
          value={Math.min(page, max)}
          aria-label="ページのスライダー"
          onChange={(e) => setLocal(Number(e.target.value))}
        />
      )}
      <div className="stepper">
        {[-10, -1, 1, 5, 10, 30].map((d) => (
          <button key={d} className="step-btn" onClick={() => bump(d)}>
            {d > 0 ? `+${d}` : d}
          </button>
        ))}
      </div>
      {!book.totalPages && (
        <label className="field-inline">
          総ページ数(任意)
          <input type="number" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} />
        </label>
      )}
      <button className="primary big" onClick={save}>
        記録する
      </button>
    </Sheet>
  );
}

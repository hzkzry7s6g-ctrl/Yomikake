import type { CSSProperties } from 'react';
import type { Book } from '../db/db';

/** 表紙がなくても本ごとの色と頭文字で見分けられるようにする */
export function BookCover({ book, size = 48 }: { book: Pick<Book, 'title' | 'coverUrl' | 'hue'>; size?: number }) {
  const style = { width: size, height: Math.round(size * 1.42), '--hue': book.hue } as CSSProperties;
  if (book.coverUrl) {
    return <img className="cover" src={book.coverUrl} alt="" style={style} loading="lazy" />;
  }
  return (
    <div className="cover cover-fallback" style={style} aria-hidden>
      {[...book.title][0]}
    </div>
  );
}

export function Progress({ book }: { book: Pick<Book, 'currentPage' | 'totalPages'> }) {
  const pct = book.totalPages ? Math.min(100, (book.currentPage / book.totalPages) * 100) : 0;
  return (
    <div className="progress">
      <div className="progress-bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-text">
        p.{book.currentPage}
        {book.totalPages ? ` / ${book.totalPages}` : ''}
      </span>
    </div>
  );
}

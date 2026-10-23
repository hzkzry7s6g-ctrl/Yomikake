import { useRef, type CSSProperties } from 'react';
import type { Book, BookStatus } from '../../db/db';
import { exportAll, importAll } from '../../db/actions';
import { useBooks } from '../../db/hooks';
import { STATUS_LABELS } from '../../lib/presets';
import { navigate } from '../../lib/router';
import { BookCover, Progress } from '../../components/BookBadge';
import { QuickActions } from '../../components/QuickActions';
import { useToast } from '../../components/Toast';

export function Home() {
  const books = useBooks();
  if (!books) return null;

  const by = (s: BookStatus) => books.filter((b) => b.status === s);
  const reading = by('reading');
  const [current, ...others] = reading;
  const year = new Date().getFullYear();
  const doneThisYear = by('done').filter((b) => b.finishedAt && new Date(b.finishedAt).getFullYear() === year).length;

  return (
    <div className="page home">
      <header className="home-header">
        <h1>よみかけ</h1>
        {doneThisYear > 0 && <span className="badge">{year}年 読了 {doneThisYear}冊</span>}
      </header>

      {books.length === 0 && (
        <div className="welcome">
          <p>読んでいる本を登録しましょう。</p>
          <p className="hint">バーコードを読むか、タイトルを少し打つだけで登録できます。</p>
          <button className="primary big" onClick={() => navigate('/add')}>
            ＋ 最初の本を追加
          </button>
        </div>
      )}

      {current && (
        <section className="hero" style={{ '--hue': current.hue } as CSSProperties}>
          <p className="section-label">いま読んでいる本</p>
          <button className="hero-book" onClick={() => navigate(`/book/${current.id}`)}>
            <BookCover book={current} size={64} />
            <div className="hero-text">
              <strong>{current.title}</strong>
              {current.author && <span className="muted">{current.author}</span>}
              <Progress book={current} />
            </div>
            <span className="chevron">›</span>
          </button>
          <QuickActions book={current} />
        </section>
      )}

      {others.length > 0 && <Shelf title="ほかに読書中" books={others} open />}
      {(['want', 'paused', 'done'] as const).map(
        (s) => by(s).length > 0 && <Shelf key={s} title={STATUS_LABELS[s]} books={by(s)} open={s === 'want'} />,
      )}

      {books.length > 0 && <Backup />}

      {books.length > 0 && (
        <button className="fab" onClick={() => navigate('/add')} aria-label="本を追加">
          ＋ 本
        </button>
      )}
    </div>
  );
}

function Shelf({ title, books, open }: { title: string; books: Book[]; open?: boolean }) {
  return (
    <details className="shelf" open={open}>
      <summary>
        {title} <small>{books.length}</small>
      </summary>
      <ul>
        {books.map((b) => (
          <li key={b.id}>
            <button className="shelf-row" onClick={() => navigate(`/book/${b.id}`)} style={{ '--hue': b.hue } as CSSProperties}>
              <BookCover book={b} size={36} />
              <span className="shelf-text">
                <strong>{b.title}</strong>
                <span className="muted">
                  {b.status === 'done'
                    ? `${b.rating ? '★'.repeat(b.rating) + ' ' : ''}${b.finishedAt ? new Date(b.finishedAt).toLocaleDateString('ja-JP') : ''}`
                    : `p.${b.currentPage}${b.totalPages ? ` / ${b.totalPages}` : ''}`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Backup() {
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  return (
    <section className="backup">
      <p className="hint">記録はこの端末の中だけに保存されます。機種変更の前にバックアップしてください。</p>
      <div className="row">
        <button
          className="secondary"
          onClick={async () => {
            const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `yomikake-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          バックアップを保存
        </button>
        <button className="secondary" onClick={() => file.current?.click()}>
          バックアップから復元
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f || !confirm('いまの記録をすべて置き換えて復元しますか?')) return;
            try {
              await importAll(JSON.parse(await f.text()));
              toast('復元しました');
            } catch (err) {
              toast(err instanceof Error ? err.message : '復元できませんでした');
            }
          }}
        />
      </div>
    </section>
  );
}

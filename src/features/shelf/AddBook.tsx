import { useCallback, useEffect, useState } from 'react';
import type { BookStatus } from '../../db/db';
import { addBook, type NewBook } from '../../db/actions';
import { searchBooks, type BookCandidate } from '../../lib/bookSearch';
import { hueFromText, STATUS_LABELS } from '../../lib/presets';
import { navigate } from '../../lib/router';
import { BookCover } from '../../components/BookBadge';
import { Scanner } from './Scanner';

/** 候補を1タップで登録。見つからなければ入力したタイトルだけで登録できる */
export function AddBook() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<BookStatus>('reading');
  const [results, setResults] = useState<BookCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchBooks(q, ctrl.signal));
        setOffline(false);
      } catch {
        if (!ctrl.signal.aborted) setOffline(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [query]);

  const add = async (b: NewBook) => {
    const id = await addBook({ ...b, status });
    navigate(`/book/${id}`, true);
  };

  const onDetect = useCallback((isbn: string) => {
    setScanning(false);
    setQuery(isbn);
  }, []);

  return (
    <div className="page add-book">
      <header className="simple-header">
        <button className="icon-btn" aria-label="戻る" onClick={() => history.back()}>
          ‹
        </button>
        <h1>本を追加</h1>
      </header>

      <button className="primary big" onClick={() => setScanning(true)}>
        📷 バーコードで追加
      </button>
      <div className="search">
        <input
          type="search"
          autoFocus
          placeholder="タイトル・著者・ISBN"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="segmented">
        {(['reading', 'want', 'done'] as const).map((s) => (
          <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {query.trim() && (
        <ul className="results">
          {!/^\d[\d-]{8,}$/.test(query.trim()) && (
            <li>
              <button className="result manual" onClick={() => add({ title: query })}>
                <BookCover book={{ title: query.trim(), hue: hueFromText(query.trim()) }} size={40} />
                <span className="result-text">
                  <strong>「{query.trim()}」で登録</strong>
                  <span className="muted">タイトルだけで登録して、あとから直せます</span>
                </span>
              </button>
            </li>
          )}
          {loading && <li className="hint center">検索中…</li>}
          {offline && <li className="hint center">オフラインのため検索できません。タイトルだけで登録できます。</li>}
          {results.map((r, i) => (
            <li key={`${r.isbn ?? r.title}-${i}`}>
              <button className="result" onClick={() => add(r)}>
                <BookCover book={{ title: r.title, coverUrl: r.coverUrl, hue: hueFromText(r.title) }} size={40} />
                <span className="result-text">
                  <strong>{r.title}</strong>
                  <span className="muted">
                    {[r.author, r.totalPages && `${r.totalPages}ページ`].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {scanning && <Scanner onDetect={onDetect} onClose={() => setScanning(false)} />}
    </div>
  );
}

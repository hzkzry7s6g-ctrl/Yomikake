import { useState, type CSSProperties } from 'react';
import { addCharacter } from '../../db/actions';
import { useBook, useBookData } from '../../db/hooks';
import { navigate, type BookTab } from '../../lib/router';
import { visibleCharacters, visibleRelations, visibleTerms } from '../../lib/spoiler';
import { stampOf, STATUS_LABELS } from '../../lib/presets';
import { BookCover, Progress } from '../../components/BookBadge';
import { QuickActions } from '../../components/QuickActions';
import { AddNamesSheet } from '../../components/AddNamesSheet';
import { usePeople } from '../characters/usePeople';
import { RelationGraph } from '../graph/RelationGraph';
import { BookSettings } from './BookSettings';
import { CharacterList, GraphTab, HiddenBanner, NoteList, TermsTab } from './tabs';

const TAB_LABELS: Record<BookTab, string> = {
  review: '復習',
  notes: 'メモ',
  people: '人物',
  graph: '相関図',
  terms: '用語',
};

export function BookPage({ id, tab, add }: { id: number; tab: BookTab; add: boolean }) {
  const book = useBook(id);
  const data = useBookData(id);
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(add);
  const [settings, setSettings] = useState(false);

  const characters = data?.characters ?? [];
  const relations = data?.relations ?? [];
  const page = book?.currentPage ?? 0;
  const chars = visibleCharacters(characters, page, showAll);
  const rels = visibleRelations(relations, chars.items, page, showAll);
  const terms = visibleTerms(data?.terms ?? [], page, showAll);
  const people = usePeople(id, chars.items, rels.items);

  if (book === undefined || data === undefined) return null;
  if (book === null) {
    return (
      <div className="page">
        <p className="empty">この本は見つかりませんでした。</p>
        <button className="secondary big" onClick={() => navigate('/')}>
          ホームへ
        </button>
      </div>
    );
  }

  const go = (t: BookTab) => navigate(`/book/${id}/${t}`, true);
  const lastBookmark = data.notes.find((n) => n.stamp === 'bookmark');

  return (
    <div className="page book-page" style={{ '--hue': book.hue } as CSSProperties}>
      <header className="book-header">
        <button className="icon-btn" aria-label="戻る" onClick={() => navigate('/')}>
          ‹
        </button>
        <BookCover book={book} size={36} />
        <div className="book-header-text">
          <h1>{book.title}</h1>
          <Progress book={book} />
        </div>
        <button className="icon-btn" aria-label="本の設定" onClick={() => setSettings(true)}>
          ⋯
        </button>
      </header>

      <nav className="tabs" role="tablist">
        {(Object.keys(TAB_LABELS) as BookTab[]).map((t) => (
          <button key={t} role="tab" aria-selected={t === tab} className={t === tab ? 'active' : ''} onClick={() => go(t)}>
            {TAB_LABELS[t]}
            {t === 'notes' && data.notes.length > 0 && <small>{data.notes.length}</small>}
            {t === 'people' && characters.length > 0 && <small>{chars.items.length}</small>}
          </button>
        ))}
      </nav>

      <main className="book-main">
        {tab === 'review' && (
          <section className="review">
            <p className="review-lead">
              {book.status === 'reading' ? '前回の続き' : STATUS_LABELS[book.status]} — p.{book.currentPage} まで読みました
            </p>
            {lastBookmark?.body && (
              <div className="callout">
                🔖 p.{lastBookmark.page}: {lastBookmark.body}
              </div>
            )}
            <h3 className="sub">
              ここまでの人物 <small>{chars.items.length}人</small>
            </h3>
            {chars.items.length === 0 ? (
              <p className="hint">人物はまだいません。</p>
            ) : (
              <>
                {chars.items.length > 1 && (
                  <RelationGraph characters={chars.items} relations={rels.items} onTap={people.tap} selectedId={people.selected} />
                )}
                <CharacterList characters={chars.items} relations={rels.items} selected={people.selected} onTap={people.tap} />
              </>
            )}
            {terms.items.length > 0 && (
              <>
                <h3 className="sub">用語</h3>
                <div className="chips">
                  {terms.items.map((t) => (
                    <span key={t.id} className="chip chip-static" title={t.description}>
                      {t.name}
                      {t.description && <small>: {t.description}</small>}
                    </span>
                  ))}
                </div>
              </>
            )}
            <h3 className="sub">最近のメモ</h3>
            <NoteList notes={data.notes} limit={5} />
            {data.notes.length > 5 && (
              <button className="link" onClick={() => go('notes')}>
                すべてのメモを見る({data.notes.length}件)
              </button>
            )}
            <HiddenBanner count={chars.hiddenCount + rels.hiddenCount + terms.hiddenCount} onShow={() => setShowAll(true)} />
          </section>
        )}
        {tab === 'notes' && (
          <section>
            <StampSummary notes={data.notes} />
            <NoteList notes={data.notes} />
          </section>
        )}
        {tab === 'people' && (
          <section>
            <HiddenBanner count={chars.hiddenCount} onShow={() => setShowAll(true)} />
            <CharacterList characters={chars.items} relations={rels.items} selected={people.selected} onTap={people.tap} />
            {chars.items.length > 1 && <p className="hint center">人物をタップ → 相手をタップで関係をつくれます。</p>}
          </section>
        )}
        {tab === 'graph' && (
          <GraphTab
            characters={chars.items}
            relations={rels.items}
            selected={people.selected}
            onTap={people.tap}
            hidden={chars.hiddenCount + rels.hiddenCount}
            onShowAll={() => setShowAll(true)}
          />
        )}
        {tab === 'terms' && <TermsTab book={book} terms={terms.items} hidden={terms.hiddenCount} onShowAll={() => setShowAll(true)} />}
        {showAll && (
          <button className="link center-block" onClick={() => setShowAll(false)}>
            🙈 先の情報をまた隠す
          </button>
        )}
      </main>

      <footer className="bottom-bar">
        {people.bar}
        <QuickActions
          book={book}
          onPeople={() => {
            if (tab !== 'people' && tab !== 'graph') go('people');
            setAdding(true);
          }}
        />
      </footer>

      {adding && (
        <AddNamesSheet
          title="人物を追加"
          placeholder="例: ラスコーリニコフ"
          page={book.currentPage}
          onAdd={(name) => addCharacter(id, name)}
          onClose={() => {
            setAdding(false);
            if (add) navigate(`/book/${id}/people`, true);
          }}
        />
      )}
      {people.sheets}
      {settings && <BookSettings book={book} onClose={() => setSettings(false)} />}
    </div>
  );
}

function StampSummary({ notes }: { notes: { stamp: string }[] }) {
  const counts = new Map<string, number>();
  for (const n of notes) counts.set(n.stamp, (counts.get(n.stamp) ?? 0) + 1);
  if (counts.size === 0) return null;
  return (
    <div className="stamp-summary">
      {[...counts].map(([k, n]) => (
        <span key={k}>
          {stampOf(k).emoji} {n}
        </span>
      ))}
    </div>
  );
}

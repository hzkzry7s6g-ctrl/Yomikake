import { useState } from 'react';
import type { Book, Character, Note, Relation, Term } from '../../db/db';
import { db } from '../../db/db';
import { addTerm, deleteNote, deleteTerm } from '../../db/actions';
import { stampOf } from '../../lib/presets';
import { AddNamesSheet } from '../../components/AddNamesSheet';
import { Sheet } from '../../components/Sheet';
import { RelationGraph } from '../graph/RelationGraph';

export function HiddenBanner({ count, onShow }: { count: number; onShow: () => void }) {
  if (count === 0) return null;
  return (
    <div className="hidden-banner">
      <span>🙈 この先のページで分かる情報 {count}件を隠しています</span>
      <button className="link" onClick={onShow}>
        表示する
      </button>
    </div>
  );
}

export function CharacterList({
  characters,
  relations,
  selected,
  onTap,
}: {
  characters: Character[];
  relations: Relation[];
  selected: number | null;
  onTap: (id: number) => void;
}) {
  const nameOf = (id: number) => characters.find((c) => c.id === id)?.name;
  if (characters.length === 0) {
    return <div className="empty">まだ人物がいません。下の「👤 人物」から名前だけで追加できます。</div>;
  }
  return (
    <ul className="people">
      {characters.map((c) => {
        const rels = relations
          .filter((r) => r.fromId === c.id && nameOf(r.toId))
          .map((r) => `${nameOf(r.toId)}の${r.label}`);
        return (
          <li key={c.id}>
            <button className={`person${selected === c.id ? ' selected' : ''}`} onClick={() => onTap(c.id)}>
              <span className="person-name">
                {c.name}
                {c.aliases && <small>({c.aliases})</small>}
              </span>
              {c.description && <span className="person-desc">{c.description}</span>}
              {rels.length > 0 && <span className="person-rels">{rels.join(' / ')}</span>}
              <span className="person-page">p.{c.firstPage}〜</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function NoteList({ notes, limit }: { notes: Note[]; limit?: number }) {
  const [editing, setEditing] = useState<Note | null>(null);
  const shown = limit ? notes.slice(0, limit) : notes;
  if (notes.length === 0) {
    return <div className="empty">まだメモがありません。「🔖 メモ」からスタンプ1つで残せます。</div>;
  }
  return (
    <>
      <ul className="notes">
        {shown.map((n) => {
          const s = stampOf(n.stamp);
          return (
            <li key={n.id}>
              <button className="note" onClick={() => setEditing(n)}>
                <span className="note-stamp" aria-label={s.label}>
                  {s.emoji}
                </span>
                <span className="note-page">p.{n.page}</span>
                <span className="note-body">{n.body ?? <span className="muted">{s.label}</span>}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {editing && (
        <Sheet title={`${stampOf(editing.stamp).emoji} p.${editing.page} のメモ`} onClose={() => setEditing(null)}>
          <textarea
            className="note-input"
            rows={4}
            autoFocus
            placeholder="文字を足す(自動保存)"
            defaultValue={editing.body}
            onChange={(e) => db.notes.update(editing.id, { body: e.target.value || undefined })}
          />
          <label className="field-inline">
            ページ
            <input
              type="number"
              inputMode="numeric"
              defaultValue={editing.page}
              onChange={(e) => db.notes.update(editing.id, { page: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <button
            className="danger-link"
            onClick={async () => {
              await deleteNote(editing.id);
              setEditing(null);
            }}
          >
            このメモを削除
          </button>
        </Sheet>
      )}
    </>
  );
}

export function TermsTab({ book, terms, hidden, onShowAll }: { book: Book; terms: Term[]; hidden: number; onShowAll: () => void }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  return (
    <section>
      <HiddenBanner count={hidden} onShow={onShowAll} />
      {terms.length === 0 ? (
        <div className="empty">地名・組織・魔法の名前など、この本だけの用語をためておけます。</div>
      ) : (
        <ul className="terms">
          {terms.map((t) => (
            <li key={t.id}>
              <button className="term" onClick={() => setEditing(t)}>
                <strong>{t.name}</strong>
                <span>{t.description ?? <span className="muted">説明なし(タップで追加)</span>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="secondary big" onClick={() => setAdding(true)}>
        ＋ 用語を追加
      </button>
      {adding && (
        <AddNamesSheet
          title="用語・設定を追加"
          placeholder="例: 王立図書院"
          page={book.currentPage}
          onAdd={(name) => addTerm(book.id, name)}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && (
        <Sheet title={editing.name} onClose={() => setEditing(null)}>
          <label className="field">
            名前
            <input defaultValue={editing.name} onChange={(e) => e.target.value.trim() && db.terms.update(editing.id, { name: e.target.value.trim() })} />
          </label>
          <label className="field">
            説明
            <textarea
              rows={3}
              autoFocus
              defaultValue={editing.description}
              onChange={(e) => db.terms.update(editing.id, { description: e.target.value || undefined })}
            />
          </label>
          <button
            className="danger-link"
            onClick={async () => {
              await deleteTerm(editing.id);
              setEditing(null);
            }}
          >
            この用語を削除
          </button>
        </Sheet>
      )}
    </section>
  );
}

export function GraphTab({
  characters,
  relations,
  selected,
  onTap,
  hidden,
  onShowAll,
}: {
  characters: Character[];
  relations: Relation[];
  selected: number | null;
  onTap: (id: number) => void;
  hidden: number;
  onShowAll: () => void;
}) {
  return (
    <section>
      <HiddenBanner count={hidden} onShow={onShowAll} />
      <RelationGraph characters={characters} relations={relations} onTap={onTap} selectedId={selected} />
      {characters.length > 1 && (
        <p className="hint center">人物をタップ → 相手をタップで関係をつくれます。ドラッグで並べ替え。</p>
      )}
    </section>
  );
}

import type { Character, Relation } from '../../db/db';
import { db } from '../../db/db';
import { deleteCharacter, deleteRelation } from '../../db/actions';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';

/** 人物の詳細。入力はすべて自動保存 */
export function CharacterCard({
  character: c,
  characters,
  relations,
  onClose,
  onLink,
}: {
  character: Character;
  characters: Character[];
  relations: Relation[];
  onClose: () => void;
  onLink: () => void;
}) {
  const toast = useToast();
  const nameOf = (id: number) => characters.find((x) => x.id === id)?.name ?? '?';
  const mine = relations.filter((r) => r.fromId === c.id || r.toId === c.id);
  const update = (changes: Partial<Character>) => db.characters.update(c.id, changes);

  return (
    <Sheet title={c.name} onClose={onClose}>
      <label className="field">
        名前
        <input defaultValue={c.name} onChange={(e) => e.target.value.trim() && update({ name: e.target.value.trim() })} />
      </label>
      <label className="field">
        別名・呼び名
        <input
          defaultValue={c.aliases}
          placeholder="例: 若旦那、ミーシャ"
          onChange={(e) => update({ aliases: e.target.value || undefined })}
        />
      </label>
      <label className="field">
        どんな人?
        <textarea
          defaultValue={c.description}
          rows={2}
          placeholder="例: 主人公の叔父。港町の商人"
          onChange={(e) => update({ description: e.target.value || undefined })}
        />
      </label>
      <label className="field-inline">
        初登場 p.
        <input
          type="number"
          inputMode="numeric"
          defaultValue={c.firstPage}
          onChange={(e) => update({ firstPage: Math.max(0, Number(e.target.value) || 0) })}
        />
      </label>

      <h3 className="sub">関係</h3>
      {mine.length === 0 && <p className="hint">まだありません</p>}
      <ul className="rel-list">
        {mine.map((r) => (
          <li key={r.id}>
            <span>
              {nameOf(r.fromId)} は {nameOf(r.toId)} の<strong>{r.label}</strong>
              <small> (p.{r.revealedPage})</small>
            </span>
            <button className="icon-btn" aria-label="関係を削除" onClick={() => deleteRelation(r.id)}>
              🗑
            </button>
          </li>
        ))}
      </ul>
      <button className="secondary big" onClick={onLink}>
        🔗 この人の関係をつくる
      </button>
      <button
        className="danger-link"
        onClick={async () => {
          if (!confirm(`「${c.name}」を削除しますか?関係も消えます。`)) return;
          await deleteCharacter(c.id);
          toast(`${c.name} を削除しました`);
          onClose();
        }}
      >
        この人物を削除
      </button>
    </Sheet>
  );
}

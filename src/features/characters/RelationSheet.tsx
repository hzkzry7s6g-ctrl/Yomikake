import { useState } from 'react';
import type { Character } from '../../db/db';
import { addRelation } from '../../db/actions';
import { useLabelUsage } from '../../db/hooks';
import { RELATION_LABELS } from '../../lib/presets';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';

/** 「A は B の ◯◯」をチップ1タップで登録する */
export function RelationSheet({
  bookId,
  a,
  b,
  onClose,
}: {
  bookId: number;
  a: Character;
  b: Character;
  onClose: () => void;
}) {
  const toast = useToast();
  const usage = useLabelUsage() ?? [];
  const [from, setFrom] = useState(a);
  const [to, setTo] = useState(b);
  const [custom, setCustom] = useState('');

  // よく使う関係ほど先頭に出す
  const used = usage.map((u) => u.label);
  const labels = [...used, ...RELATION_LABELS.filter((l) => !used.includes(l))];

  const save = async (label: string) => {
    if (!label.trim()) return;
    await addRelation(bookId, from.id, to.id, label);
    toast(`${from.name} は ${to.name} の${label.trim()}`);
    onClose();
  };

  return (
    <Sheet title="関係をつくる" onClose={onClose}>
      <div className="relation-sentence">
        <strong>{from.name}</strong> は <strong>{to.name}</strong> の…
        <button
          className="swap-btn"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          ⇄ 入れ替え
        </button>
      </div>
      <div className="chips">
        {labels.map((l) => (
          <button key={l} className="chip" onClick={() => save(l)}>
            {l}
          </button>
        ))}
      </div>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save(custom);
        }}
      >
        <input placeholder="ほかの関係(例: 幼なじみ)" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button className="primary" type="submit" disabled={!custom.trim()}>
          追加
        </button>
      </form>
    </Sheet>
  );
}

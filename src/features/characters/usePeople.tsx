import { useState } from 'react';
import type { Character, Relation } from '../../db/db';
import { CharacterCard } from './CharacterCard';
import { RelationSheet } from './RelationSheet';

/**
 * 人物リストと相関図で共通のタップ操作。
 * 1人目をタップ → 2人目をタップ → 関係チップをタップ、の3タップで関係ができる。
 * 選択中の人をもう一度タップすると詳細カードを開く。
 */
export function usePeople(bookId: number, characters: Character[], relations: Relation[]) {
  const [selected, setSelected] = useState<number | null>(null);
  const [card, setCard] = useState<number | null>(null);
  const [pair, setPair] = useState<[number, number] | null>(null);
  const find = (id: number | null) => characters.find((c) => c.id === id);

  const tap = (id: number) => {
    if (selected === null) setSelected(id);
    else if (selected === id) {
      setSelected(null);
      setCard(id);
    } else {
      setPair([selected, id]);
      setSelected(null);
    }
  };

  const selectedChar = find(selected);
  const cardChar = find(card);
  const pairChars = pair ? [find(pair[0]), find(pair[1])] : null;

  const bar = selectedChar && (
        <div className="select-bar" role="status">
          <span>
            <strong>{selectedChar.name}</strong> を選択中。相手をタップすると関係をつくれます
          </span>
          <div className="select-bar-actions">
            <button
              className="secondary"
              onClick={() => {
                setCard(selectedChar.id);
                setSelected(null);
              }}
            >
              詳細
            </button>
            <button className="secondary" onClick={() => setSelected(null)}>
              解除
            </button>
          </div>
        </div>
  );

  const sheets = (
    <>
      {cardChar && (
        <CharacterCard
          key={cardChar.id}
          character={cardChar}
          characters={characters}
          relations={relations}
          onClose={() => setCard(null)}
          onLink={() => {
            setCard(null);
            setSelected(cardChar.id);
          }}
        />
      )}
      {pairChars?.[0] && pairChars[1] && (
        <RelationSheet bookId={bookId} a={pairChars[0]} b={pairChars[1]} onClose={() => setPair(null)} />
      )}
    </>
  );

  /** bar は下部バーの中、sheets は画面全体に重ねて表示する */
  return { selected, tap, bar, sheets };
}

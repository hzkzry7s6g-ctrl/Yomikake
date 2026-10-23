import { useState } from 'react';
import type { Book } from '../db/db';
import { addNote } from '../db/actions';
import { db } from '../db/db';
import { STAMPS } from '../lib/presets';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

/** スタンプをタップした瞬間に保存。文字は書いても書かなくてもよい */
export function NoteSheet({ book, onClose }: { book: Book; onClose: () => void }) {
  const toast = useToast();
  const [body, setBody] = useState('');

  const save = async (stamp: string, emoji: string) => {
    const id = await addNote(book.id, stamp, body);
    toast(`${emoji} p.${book.currentPage} に残しました`, () => db.notes.delete(id));
    onClose();
  };

  return (
    <Sheet title={`メモ(p.${book.currentPage})`} onClose={onClose}>
      <p className="hint">スタンプをタップすると保存します。文字は任意です。</p>
      <div className="stamp-grid">
        {STAMPS.map((s) => (
          <button key={s.key} className="stamp-btn" onClick={() => save(s.key, s.emoji)}>
            <span className="stamp-emoji">{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      <textarea
        className="note-input"
        placeholder="ひとこと(任意)。音声入力も使えます"
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
    </Sheet>
  );
}

import { useRef, useState } from 'react';
import { Sheet } from './Sheet';

/** 名前だけを連続で追加できる入力。Enter で次の名前へ進む */
export function AddNamesSheet({
  title,
  placeholder,
  page,
  onAdd,
  onClose,
}: {
  title: string;
  placeholder: string;
  page: number;
  onAdd: (name: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const text = name.trim();
    if (!text) return;
    // 保存を待つ間に次の名前を打ち始めても消えないよう、先に空にする
    setName('');
    input.current?.focus();
    await onAdd(text);
    setAdded((a) => [...a, text]);
  };

  return (
    <Sheet title={title} onClose={onClose}>
      <p className="hint">名前だけでOK。p.{page} で登場として記録します。説明はあとからでも書けます。</p>
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          ref={input}
          autoFocus
          enterKeyHint="next"
          placeholder={placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="primary" type="submit" disabled={!name.trim()}>
          追加
        </button>
      </form>
      {added.length > 0 && (
        <div className="chips">
          {added.map((n, i) => (
            <span key={i} className="chip chip-static">
              ✓ {n}
            </span>
          ))}
        </div>
      )}
      <button className="secondary big" onClick={onClose}>
        完了
      </button>
    </Sheet>
  );
}

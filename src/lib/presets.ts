export interface Stamp {
  key: string;
  emoji: string;
  label: string;
}

/** メモはこのスタンプを1タップするだけで残せる。文字は任意 */
export const STAMPS: Stamp[] = [
  { key: 'bookmark', emoji: '🔖', label: 'しおり' },
  { key: 'important', emoji: '⭐', label: '大事' },
  { key: 'question', emoji: '❓', label: 'わからない' },
  { key: 'foreshadow', emoji: '🔍', label: '伏線かも' },
  { key: 'quote', emoji: '💬', label: '引用' },
  { key: 'moved', emoji: '😭', label: '泣ける' },
  { key: 'funny', emoji: '😂', label: '笑える' },
  { key: 'surprise', emoji: '😲', label: '驚き' },
];

export const stampOf = (key: string): Stamp =>
  STAMPS.find((s) => s.key === key) ?? { key, emoji: '📝', label: 'メモ' };

/** 「A は B の ◯◯」の ◯◯ に入るもの */
export const RELATION_LABELS = [
  '友人',
  '恋人',
  '夫',
  '妻',
  '親',
  '子',
  '兄',
  '弟',
  '姉',
  '妹',
  '家族',
  '主君',
  '部下',
  '師匠',
  '弟子',
  '同僚',
  '仲間',
  'ライバル',
  '敵',
  '片思い',
  '知人',
];

export const STATUS_LABELS = {
  reading: '読書中',
  want: '読みたい',
  done: '読了',
  paused: '中断',
} as const;

export function hueFromText(text: string): number {
  let h = 0;
  for (const c of text) h = (h * 31 + c.codePointAt(0)!) % 360;
  return h;
}

import { describe, expect, it } from 'vitest';
import type { Character, Relation } from '../db/db';
import { visibleCharacters, visibleRelations } from './spoiler';

const ch = (id: number, firstPage: number): Character => ({
  id,
  bookId: 1,
  name: `人物${id}`,
  firstPage,
  createdAt: 0,
});
const rel = (id: number, fromId: number, toId: number, revealedPage: number): Relation => ({
  id,
  bookId: 1,
  fromId,
  toId,
  label: '友人',
  revealedPage,
  createdAt: 0,
});

const characters = [ch(1, 0), ch(2, 50), ch(3, 120)];
const relations = [rel(1, 1, 2, 60), rel(2, 1, 3, 120), rel(3, 1, 2, 200)];

describe('ネタバレ防止フィルタ', () => {
  it('現在ページより後に初登場する人物は隠す', () => {
    const v = visibleCharacters(characters, 100);
    expect(v.items.map((c) => c.id)).toEqual([1, 2]);
    expect(v.hiddenCount).toBe(1);
  });

  it('ちょうどそのページに来たら表示する', () => {
    expect(visibleCharacters(characters, 120).items).toHaveLength(3);
  });

  it('関係は判明ページと両端の人物の両方を満たすときだけ表示する', () => {
    const shown = visibleCharacters(characters, 100).items;
    const v = visibleRelations(relations, shown, 100);
    expect(v.items.map((r) => r.id)).toEqual([1]);
    expect(v.hiddenCount).toBe(2);
  });

  it('ページを戻すと関係も消える', () => {
    const shown = visibleCharacters(characters, 55).items;
    expect(visibleRelations(relations, shown, 55).items).toEqual([]);
  });

  it('showAll ならすべて表示する', () => {
    const shown = visibleCharacters(characters, 0, true).items;
    expect(shown).toHaveLength(3);
    expect(visibleRelations(relations, shown, 0, true).items).toHaveLength(3);
  });
});

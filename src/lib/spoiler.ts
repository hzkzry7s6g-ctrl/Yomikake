import type { Character, Relation, Term } from '../db/db';

/** その情報が判明したページまで読み進めていれば表示してよい */
export function isRevealed(page: number, currentPage: number): boolean {
  return page <= currentPage;
}

export interface Visible<T> {
  items: T[];
  hiddenCount: number;
}

export function visibleCharacters(
  characters: Character[],
  currentPage: number,
  showAll = false,
): Visible<Character> {
  const items = showAll
    ? characters
    : characters.filter((c) => isRevealed(c.firstPage, currentPage));
  return { items, hiddenCount: characters.length - items.length };
}

export function visibleTerms(terms: Term[], currentPage: number, showAll = false): Visible<Term> {
  const items = showAll ? terms : terms.filter((t) => isRevealed(t.firstPage, currentPage));
  return { items, hiddenCount: terms.length - items.length };
}

/** 関係自体が判明済みで、かつ両端の人物も表示されているものだけを出す */
export function visibleRelations(
  relations: Relation[],
  shownCharacters: Character[],
  currentPage: number,
  showAll = false,
): Visible<Relation> {
  const shown = new Set(shownCharacters.map((c) => c.id));
  const items = relations.filter(
    (r) =>
      shown.has(r.fromId) &&
      shown.has(r.toId) &&
      (showAll || isRevealed(r.revealedPage, currentPage)),
  );
  return { items, hiddenCount: relations.length - items.length };
}

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './db';
import {
  addBook,
  addCharacter,
  addNote,
  addRelation,
  deleteNote,
  exportAll,
  mergeAll,
  setPage,
  type SyncFile,
} from './actions';

/** 端末を切り替えたことにする(データベースを作り直すので、連番の id も 1 から振り直される) */
const switchDevice = async () => {
  await db.delete();
  await db.open();
};
/** iCloud Drive を通したのと同じく、JSON にして戻す */
const viaFile = async (): Promise<SyncFile> => JSON.parse(JSON.stringify(await exportAll()));

beforeEach(async () => {
  await switchDevice();
  // 操作ごとに時刻が進むようにする
  let t = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => (t += 1000));
});

describe('同期ファイルのマージ', () => {
  it('両方の端末の記録が合体し、関係の参照も正しい', async () => {
    // 端末A
    const a = await addBook({ title: '罪と罰' });
    const r = await addCharacter(a, 'ラスコーリニコフ');
    const s = await addCharacter(a, 'ソーニャ');
    await addRelation(a, r, s, '恋人');
    const fileA = await viaFile();

    // 端末B
    await switchDevice();
    const b = await addBook({ title: '白痴' });
    await addNote(b, 'bookmark', 'ここまで');
    // B では A と同じ数値 id が別の本に使われている
    expect(b).toBe(a);

    const res = await mergeAll(fileA);
    expect(res).toEqual({ added: 4, updated: 0, deleted: 0 });

    const books = await db.books.toArray();
    expect(books.map((x) => x.title).sort()).toEqual(['白痴', '罪と罰']);
    const crime = books.find((x) => x.title === '罪と罰')!;
    const chars = await db.characters.where('bookId').equals(crime.id).toArray();
    expect(chars.map((c) => c.name).sort()).toEqual(['ソーニャ', 'ラスコーリニコフ']);
    const [rel] = await db.relations.where('bookId').equals(crime.id).toArray();
    const name = (id: number) => chars.find((c) => c.id === id)?.name;
    expect([name(rel.fromId), rel.label, name(rel.toId)]).toEqual(['ラスコーリニコフ', '恋人', 'ソーニャ']);
    // 白痴のメモは白痴に付いたまま
    const idiot = books.find((x) => x.title === '白痴')!;
    expect(await db.notes.where('bookId').equals(idiot.id).count()).toBe(1);
  });

  it('同じファイルを何度取り込んでも重複しない', async () => {
    const a = await addBook({ title: '罪と罰' });
    await addCharacter(a, 'ソーニャ');
    const file = await viaFile();
    await switchDevice();
    await mergeAll(file);
    expect(await mergeAll(file)).toEqual({ added: 0, updated: 0, deleted: 0 });
    expect(await db.books.count()).toBe(1);
    expect(await db.characters.count()).toBe(1);
  });

  it('同じ記録は新しく更新したほうが残る', async () => {
    const a = await addBook({ title: '罪と罰' });
    const old = await viaFile();
    await setPage(a, 120);
    const newer = await viaFile();

    await switchDevice();
    await mergeAll(newer);
    await mergeAll(old);
    expect((await db.books.toArray())[0].currentPage).toBe(120);
  });

  it('削除したメモが相手のファイルから復活しない', async () => {
    const a = await addBook({ title: '罪と罰' });
    const n = await addNote(a, 'question');
    const before = await viaFile(); // 削除前に保存したファイル

    await deleteNote(n);
    const after = await viaFile();

    // 削除前のファイルを持っている端末に、削除後のファイルを取り込む
    await switchDevice();
    await mergeAll(before);
    expect(await db.notes.count()).toBe(1);
    const res = await mergeAll(after);
    expect(res.deleted).toBe(1);
    expect(await db.notes.count()).toBe(0);

    // 古いファイルをもう一度取り込んでも戻らない
    await mergeAll(before);
    expect(await db.notes.count()).toBe(0);
  });

  it('よみかけ以外のファイルは取り込まない', async () => {
    await expect(mergeAll({ foo: 1 })).rejects.toThrow('よみかけ');
  });
});

import { useEffect, useRef, useState } from 'react';
import { exportAll, LegacyBackupError, mergeAll, replaceWithLegacy } from '../../db/actions';
import { lastSynced, markSynced, saveFile, SYNC_FILE_NAME, toSyncFile } from '../../lib/syncFile';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';

/**
 * iCloud Drive にファイルを置いて端末間で記録をそろえる。
 * ① 取り込む(相手の記録と合体)→ ② 保存する、の順で使う。
 */
export function SyncSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [last, setLast] = useState(lastSynced);
  const [imported, setImported] = useState(false);

  // 共有シートはタップ直後にしか開けないので、保存するファイルは先に作っておく
  const prepare = async () => setFile(toSyncFile(await exportAll()));
  useEffect(() => {
    void prepare();
  }, []);

  const onPick = async (picked: File) => {
    let data: unknown;
    try {
      data = JSON.parse(await picked.text());
    } catch {
      toast('ファイルを読み込めませんでした');
      return;
    }
    try {
      const r = await mergeAll(data);
      toast(r.added + r.updated + r.deleted === 0 ? 'すでに最新です' : `取り込みました(追加${r.added}・更新${r.updated}・削除${r.deleted})`);
    } catch (e) {
      if (!(e instanceof LegacyBackupError)) {
        toast(e instanceof Error ? e.message : '取り込めませんでした');
        return;
      }
      if (!confirm('古い形式のバックアップです。いまの記録をすべて置き換えて復元しますか?')) return;
      await replaceWithLegacy(data);
      toast('復元しました');
    }
    markSynced();
    setLast(Date.now());
    setImported(true);
    await prepare();
  };

  const onSave = async () => {
    if (!file) return;
    try {
      const r = await saveFile(file);
      if (r === 'cancelled') return;
      setLast(Date.now());
      toast(r === 'shared' ? '保存しました' : 'ダウンロードしました');
    } catch {
      toast('保存できませんでした');
    }
  };

  return (
    <Sheet title="☁️ iCloud で同期" onClose={onClose}>
      <p className="hint">
        iCloud Drive に置いた <code>{SYNC_FILE_NAME}</code> を通して、iPhone・iPad の記録をそろえます。
        両方の端末で書いた記録は消えずに合体します。
      </p>

      <button className="secondary big sync-step" onClick={() => input.current?.click()}>
        <span className="sync-num">①</span>
        <span>
          <strong>iCloud から取り込む</strong>
          <small>ほかの端末で保存したファイルを選ぶ</small>
        </span>
        {imported && <span className="sync-done">✓</span>}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void onPick(f);
        }}
      />

      <button className="primary big sync-step" onClick={onSave} disabled={!file}>
        <span className="sync-num">②</span>
        <span>
          <strong>iCloud へ保存</strong>
          <small>「"ファイル"に保存」→ iCloud Drive を選ぶ</small>
        </span>
      </button>

      <p className="hint center">
        {last ? `最終同期: ${new Date(last).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' })}` : 'まだ同期していません'}
      </p>

      <details className="sync-help">
        <summary>はじめての方へ</summary>
        <ol>
          <li>この端末で「② iCloud へ保存」→「"ファイル"に保存」→ iCloud Drive に「よみかけ」フォルダを作って保存。</li>
          <li>もう一方の端末で「① iCloud から取り込む」→ そのファイルを選ぶ。</li>
          <li>以降は、読む前に①、読み終わったら②。保存のときは同じファイルを「置き換え」てください。</li>
        </ol>
      </details>
    </Sheet>
  );
}

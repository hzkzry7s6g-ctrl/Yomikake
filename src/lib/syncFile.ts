import type { SyncFile } from '../db/actions';

export const SYNC_FILE_NAME = 'yomikake-sync.json';
const LAST_SYNC_KEY = 'yomikake:lastSync';

export function toSyncFile(data: SyncFile): File {
  return new File([JSON.stringify(data)], SYNC_FILE_NAME, { type: 'application/json' });
}

/**
 * 共有シートを出して iCloud Drive などに保存してもらう。
 * iOS ではタップ直後でないと共有シートが開けないので、ファイルは事前に作っておいて渡す。
 */
export async function saveFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      throw e;
    }
    markSynced();
    return 'shared';
  }
  // 共有シートがない環境(PC のブラウザなど)はダウンロードにする
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
  markSynced();
  return 'downloaded';
}

export function markSynced() {
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    // プライベートブラウズなどで保存できなくても同期自体には影響しない
  }
}

export function lastSynced(): number | null {
  try {
    const v = Number(localStorage.getItem(LAST_SYNC_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

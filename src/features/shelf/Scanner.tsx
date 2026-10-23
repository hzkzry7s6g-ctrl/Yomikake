import { useEffect, useRef, useState } from 'react';
import { normalizeIsbn } from '../../lib/bookSearch';

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** 本の裏のバーコード(ISBN、978/979 で始まる方)をカメラで読む */
export function Scanner({ onDetect, onClose }: { onDetect: (isbn: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let stopZxing: (() => void) | undefined;

    const found = (text: string) => {
      const isbn = normalizeIsbn(text);
      if (!isbn || !/^97[89]/.test(isbn) || stopped) return false;
      stopped = true;
      navigator.vibrate?.(50);
      onDetect(isbn);
      return true;
    };

    (async () => {
      try {
        if (window.BarcodeDetector) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const v = video.current!;
          v.srcObject = stream;
          await v.play();
          const detector = new window.BarcodeDetector({ formats: ['ean_13'] });
          const loop = async () => {
            if (stopped) return;
            const codes = await detector.detect(v).catch(() => []);
            if (codes.some((c) => found(c.rawValue))) return;
            requestAnimationFrame(loop);
          };
          void loop();
        } else {
          // iPhone の Safari などは BarcodeDetector がないので ZXing で読む
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: 'environment' } },
            video.current!,
            (result) => {
              if (result && found(result.getText())) controls.stop();
            },
          );
          stopZxing = () => controls.stop();
        }
      } catch {
        setError('カメラを使えませんでした。設定でカメラを許可するか、タイトルで検索してください。');
      }
    })();

    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
      stopZxing?.();
    };
  }, [onDetect]);

  return (
    <div className="scanner">
      <video ref={video} playsInline muted />
      <div className="scanner-frame" />
      <p className="scanner-hint">{error ?? '本の裏の「978」で始まるバーコードを枠に入れてください'}</p>
      <button className="secondary big scanner-close" onClick={onClose}>
        閉じる
      </button>
    </div>
  );
}

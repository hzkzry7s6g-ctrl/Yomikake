export interface BookCandidate {
  title: string;
  author?: string;
  coverUrl?: string;
  totalPages?: number;
  isbn?: string;
}

const https = (url?: string) => url?.replace(/^http:/, 'https:');

export function normalizeIsbn(text: string): string | null {
  const digits = text.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (/^97[89]\d{10}$/.test(digits) || /^\d{9}[\dX]$/.test(digits)) return digits;
  return null;
}

interface GoogleVolume {
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    pageCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

async function searchGoogle(q: string, signal?: AbortSignal): Promise<BookCandidate[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&printType=books`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: GoogleVolume[] };
  return (json.items ?? [])
    .filter((v) => v.volumeInfo.title)
    .map(({ volumeInfo: v }) => ({
      title: v.subtitle ? `${v.title} ${v.subtitle}` : v.title!,
      author: v.authors?.join('、'),
      totalPages: v.pageCount || undefined,
      coverUrl: https(v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail),
      isbn: v.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier,
    }));
}

interface OpenBdItem {
  summary: { title: string; author?: string; cover?: string; isbn: string };
  onix?: { DescriptiveDetail?: { Extent?: { ExtentValue?: string }[] } };
}

/** 日本の本は openBD のほうが情報が正確なので ISBN ではこちらを先に引く */
async function lookupOpenBd(isbn: string, signal?: AbortSignal): Promise<BookCandidate | null> {
  const res = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`, { signal });
  if (!res.ok) return null;
  const [item] = (await res.json()) as (OpenBdItem | null)[];
  if (!item) return null;
  const pages = Number(item.onix?.DescriptiveDetail?.Extent?.[0]?.ExtentValue);
  return {
    title: item.summary.title,
    author: item.summary.author?.replace(/／著|\/著/g, '').trim() || undefined,
    coverUrl: item.summary.cover || undefined,
    totalPages: Number.isFinite(pages) && pages > 0 ? pages : undefined,
    isbn,
  };
}

export async function searchBooks(text: string, signal?: AbortSignal): Promise<BookCandidate[]> {
  const isbn = normalizeIsbn(text);
  if (isbn) {
    const [openBd, google] = await Promise.all([
      lookupOpenBd(isbn, signal).catch(() => null),
      searchGoogle(`isbn:${isbn}`, signal).catch(() => []),
    ]);
    if (openBd) {
      // ページ数や表紙が openBD にないときは Google で補う
      const g = google[0];
      return [
        { ...openBd, totalPages: openBd.totalPages ?? g?.totalPages, coverUrl: openBd.coverUrl ?? g?.coverUrl },
      ];
    }
    return google;
  }
  return searchGoogle(text, signal);
}

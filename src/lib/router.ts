import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'add' }
  | { name: 'book'; id: number; tab: BookTab; add: boolean };

export type BookTab = 'review' | 'notes' | 'people' | 'graph' | 'terms';
const TABS: BookTab[] = ['review', 'notes', 'people', 'graph', 'terms'];

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'add') return { name: 'add' };
  if (parts[0] === 'book' && Number(parts[1])) {
    const tab = TABS.includes(parts[2] as BookTab) ? (parts[2] as BookTab) : 'review';
    return { name: 'book', id: Number(parts[1]), tab, add: query.split('&').includes('add') };
  }
  return { name: 'home' };
}

export function navigate(path: string, replace = false) {
  const hash = `#${path}`;
  if (replace) history.replaceState(null, '', hash);
  else history.pushState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);
  return route;
}

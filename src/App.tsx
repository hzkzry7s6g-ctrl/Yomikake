import { ToastProvider } from './components/Toast';
import { BookPage } from './features/book/BookPage';
import { AddBook } from './features/shelf/AddBook';
import { Home } from './features/shelf/Home';
import { useRoute } from './lib/router';

export function App() {
  const route = useRoute();
  return (
    <ToastProvider>
      {route.name === 'home' && <Home />}
      {route.name === 'add' && <AddBook />}
      {route.name === 'book' && <BookPage key={route.id} id={route.id} tab={route.tab} add={route.add} />}
    </ToastProvider>
  );
}

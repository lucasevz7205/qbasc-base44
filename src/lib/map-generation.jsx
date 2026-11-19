import React from 'react';

const MapGeneration = React.createContext(null);

export function MapGenerationProvider({ children }) {
  const [flashcardsLoading, setFlashcardsLoading] = React.useState(false);
  const [flashcardReviews, setFlashcardReviews] = React.useState({});
  const [ganLoading, setGanLoading] = React.useState(false);
  const [ganError, setGanError] = React.useState('');
  const [ganReviews, setGanReviews] = React.useState({});
  const ganTask = React.useRef(null);
  const [notice, setNotice] = React.useState('');
  React.useEffect(() => () => { if (ganTask.current) ganTask.current.discard = true; }, []);
  return <MapGeneration.Provider value={{ flashcardsLoading, setFlashcardsLoading, flashcardReviews, setFlashcardReviews, ganLoading, setGanLoading, ganError, setGanError, ganReviews, setGanReviews, ganTask, setNotice }}>
    {children}
    {notice && <aside className="qb-panel qb-panel--sunken" role="status" style={{position:'fixed',bottom:16,left:16,zIndex:80,padding:12,maxWidth:'min(420px,75vw)'}}>
      {notice} <button className="qb-btn qb-btn--ghost qb-btn--sm" aria-label="Fechar aviso" onClick={() => setNotice('')}>×</button>
    </aside>}
  </MapGeneration.Provider>;
}

export const useMapGeneration = () => React.useContext(MapGeneration);

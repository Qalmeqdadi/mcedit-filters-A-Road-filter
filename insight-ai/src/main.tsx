import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppStateProvider } from './hooks/useAppState';
import { ClientProvider } from './hooks/useClient';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      <ClientProvider>
        <App />
      </ClientProvider>
    </AppStateProvider>
  </StrictMode>,
);

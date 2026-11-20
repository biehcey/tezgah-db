import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApiProvider, createHttpApiClient } from './api/client';
import { App } from './App';
import { BildirimSaglayici } from './ortak/Bildirimler';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiProvider client={createHttpApiClient()}>
      <BildirimSaglayici>
        <App />
      </BildirimSaglayici>
    </ApiProvider>
  </StrictMode>,
);

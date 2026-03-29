import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import { App } from '@/app/App';
import { AppProvider } from '@/app/state/AppContext';
import '@/styles.css';

const queryClient = new QueryClient();

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('Nova versao do painel disponivel.');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <App />
      </AppProvider>
    </QueryClientProvider>
  </StrictMode>
);

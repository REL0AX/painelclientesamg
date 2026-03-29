import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/app/App';
import { AppProvider } from '@/app/state/AppContext';
import { registerAppServiceWorker } from '@/shared/lib/pwa';
import '@/styles.css';

const queryClient = new QueryClient();

registerAppServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <App />
      </AppProvider>
    </QueryClientProvider>
  </StrictMode>
);

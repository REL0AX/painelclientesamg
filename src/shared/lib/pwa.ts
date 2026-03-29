export function registerAppServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const promptForRefresh = (registration: ServiceWorkerRegistration) => {
    if (!registration.waiting) {
      return;
    }

    const shouldRefresh = window.confirm(
      'Uma nova versao do painel esta disponivel. Deseja atualizar agora?'
    );

    if (shouldRefresh) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      promptForRefresh(registration);

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;

        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener('statechange', () => {
          if (
            installingWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            promptForRefresh(registration);
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    } catch (error) {
      console.warn('Falha ao registrar o service worker do painel.', error);
    }
  });
}

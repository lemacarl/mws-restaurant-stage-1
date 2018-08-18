/**
 * Register service worker
 */

registerServiceWorker = () => {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.register('/sw.js').then(reg => {
      if (!navigator.serviceWorker.controller) return;

      if (reg.waiting) {
        updateReady(reg.waiting);
        return;
      }

      if (reg.installing) {
        trackInstalling(reg.installing);
        return;
      }

      reg.addEventListener('updatefound', () => trackInstalling(reg.installing));
    });

    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if(refreshing) return;
      window.location.reload();
      refreshing = true;
    })
}

updateReady = (worker) => {
  const toast = Toast.create({
    text: "New version available.",
    button: "Refresh",
    callback: event => {
      event.preventDefault();
      worker.postMessage({action: 'skipWaiting'});
    }
  });
}

trackInstalling = (worker) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        updateReady(worker);
      }
    });
}
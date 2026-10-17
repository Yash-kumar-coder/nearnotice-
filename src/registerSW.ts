export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (import.meta.env.DEV) {
            console.log('NearNotice PWA ServiceWorker registered with scope:', registration.scope);
          }
        })
        .catch((error) => {
          console.error('NearNotice PWA ServiceWorker registration failed:', error);
        });
    });
  }
}

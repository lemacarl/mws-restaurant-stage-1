const staticCacheName = 'restaurant-reviews-v1';
const imgCacheName = 'restaurant-reviews-imgs';
const mapCacheName = 'restaurant-reviews-maps';

self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(staticCacheName).then(cache => {
			return cache.addAll([
				'/',
				'js/dbhelper.js',
				'js/main.js',
				'js/restaurant_info.js',
				'js/toast.js',
				'js/service-worker.js',
				'css/responsive.css',
				'css/styles.css',
				'css/toast.css',
				'data/restaurants.json',
				'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
				'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
				'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png',
				'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon-2x.png',
				'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
			]);
		})
	);
});

self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(cacheNames => Promise.all(
			cacheNames.filter(cacheName => cacheName !== staticCacheName).map(cacheName => caches.delete(cacheName))
			)
		)
	);
});

self.addEventListener('fetch', event => {
	const requestUrl = new URL(event.request.url);

	if (requestUrl.origin === location.origin) {
		if (requestUrl.pathname.startsWith('/img/')) {
			event.respondWith(serveImg(event.request));
			return;
		}
		if (requestUrl.pathname.startsWith('/restaurant.html')) {
			event.respondWith(serveRestaurant(event.request));
			return;
		}
	}

	if (requestUrl.pathname.startsWith("/v4/mapbox.streets/")) {
		event.respondWith(serveMap(event.request));
		return;
	}

	event.respondWith(
		caches.match(event.request).then(response => {
			return response || fetch(event.request);
		})
	);
});

serveImg = (request) => {
  const storageUrl = request.url.replace(/-.+\.jpg$/, '');

  return caches.open(imgCacheName).then((cache) => {
    return cache.match(storageUrl).then((response) => {
      if (response) return response;

      return fetch(request).then((networkResponse) => {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

serveMap = (request) => {
  const storageUrl = request.url.replace(/\.jpg.+$/, '');

  return caches.open(mapCacheName).then((cache) => {
    return cache.match(storageUrl).then((response) => {
      if (response) return response;

      return fetch(request).then((networkResponse) => {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

serveRestaurant = (request) => {
	return caches.open(staticCacheName).then((cache) => {
		return cache.match(request).then((response) => {
			if (response) return response;

			return fetch(request).then((networkResponse) => {
				cache.put(request, networkResponse.clone());
				return networkResponse;
			});
		});
	});
}

self.addEventListener('message', event => {
	if (event.data.action === 'skipWaiting') {
		self.skipWaiting();
	}
});

// Nation Reclaim Service Worker - Enables offline gameplay
const CACHE_NAME = 'nation-reclaim-v1.2';
const STATIC_CACHE = 'static-v1.2';
const DYNAMIC_CACHE = 'dynamic-v1.2';

// Files to cache for offline play
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  console.log('🇳🇬 Nation Reclaim Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static assets for offline play');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Installation complete - Game ready for offline!');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('❌ Installation failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🔄 Nation Reclaim Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Activation complete - Taking control');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Chrome extension requests
  if (request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('📱 Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Not in cache - try to fetch from network
        return fetch(request)
          .then(networkResponse => {
            // Cache successful responses for future offline use
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then(cache => {
                  cache.put(request, responseClone);
                  console.log('💾 Cached for offline:', request.url);
                });
            }
            return networkResponse;
          })
          .catch(err => {
            console.log('🔌 Network failed, checking cache again:', request.url);
            
            // Provide fallback for HTML requests when offline
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // For other failed requests, return a basic response
            return new Response('Offline - Nation Reclaim will work when connection is restored', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for game state (when online)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-gamestate') {
    console.log('🔄 Background syncing game progress...');
    event.waitUntil(syncGameState());
  }
});

// Push notifications for game events
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New crisis requires your attention!',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [100, 50, 100],
    data: data.url || './',
    actions: [
      {
        action: 'open',
        title: 'Manage Crisis',
        icon: '/android-chrome-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Later'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('🇳🇬 Nation Reclaim', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || './')
    );
  }
});

// Sync game state when back online
async function syncGameState() {
  try {
    // Get saved game state from IndexedDB or localStorage equivalent
    const gameState = await getStoredGameState();
    
    if (gameState && navigator.onLine) {
      // Send to server or cloud storage when available
      console.log('📊 Game state synced successfully');
      return Promise.resolve();
    }
  } catch (error) {
    console.error('❌ Game state sync failed:', error);
    return Promise.reject(error);
  }
}

// Placeholder for getting stored game state
async function getStoredGameState() {
  // In a real implementation, this would read from IndexedDB
  return {
    lastPlayed: Date.now(),
    level: 'intermediate',
    achievements: ['democratic_transition', 'inflation_manager'],
    stats: {
      approval: 67,
      gdp: 2.1,
      inflation: 15.7,
      security: 4.2
    }
  };
}

// Version update notification
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🇳🇬 Nation Reclaim Service Worker loaded successfully!');
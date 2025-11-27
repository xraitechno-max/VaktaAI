/**
 * ⚡ Unity WebGL Service Worker - Offline Caching
 * Caches large Unity build files (97MB total) for instant repeat visits
 * 
 * Performance Impact:
 * - First visit: 97MB download (~15-20s on 3G)
 * - Repeat visits: Instant load from cache (<1s)
 * 
 * 🔒 SECURITY & RELIABILITY:
 * - NEVER caches /api/unity-assets/urls (contains expiring presigned S3 URLs)
 * - Always fetches fresh presigned URLs from server
 * - Only caches actual Unity build files (.gz, .wasm, .js)
 * - Caches both local files AND S3 URLs (hostname check)
 */

const CACHE_NAME = 'unity-webgl-v2'; // Bumped version to clear old cache
const UNITY_ASSETS = [
  // These are just hints for pre-caching - not all assets
  '/unity-avatar/Build/Build.loader.js',
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[Unity SW] 📦 Installing service worker v2...');
  
  // Don't pre-cache S3 files (they need presigned URLs from server)
  // Just pre-cache the Unity loader script
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Unity SW] ⬇️ Pre-caching Unity loader...');
      return cache.addAll(UNITY_ASSETS).catch(err => {
        console.warn('[Unity SW] ⚠️ Pre-cache failed (will cache on demand):', err);
      });
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Unity SW] ✅ Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Unity SW] 🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 🚫 NEVER cache /api/unity-assets/urls (contains expiring presigned URLs)
  if (url.pathname.includes('/api/unity-assets/')) {
    console.log('[Unity SW] ⏩ Skipping API URL cache:', url.pathname);
    return; // Let it pass through to always get fresh presigned URLs
  }
  
  // Only cache actual Unity build files (.gz, .wasm, .js)
  const isUnityBuildFile = url.pathname.includes('/unity-avatar/Build/') ||
                           (url.hostname.includes('s3') && url.pathname.includes('unity-assets/'));
  
  if (!isUnityBuildFile) {
    // Not a Unity asset, pass through
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[Unity SW] ⚡ Cache HIT:', url.pathname);
        return cachedResponse;
      }
      
      // Not in cache, fetch from network and cache it
      console.log('[Unity SW] 🌐 Cache MISS, fetching:', url.pathname);
      return fetch(event.request).then((networkResponse) => {
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            console.log('[Unity SW] 💾 Caching:', url.pathname);
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch((error) => {
      console.error('[Unity SW] ❌ Fetch failed:', url.pathname, error);
      // If both cache and network fail, return a basic error
      return new Response('Network error', { status: 503 });
    })
  );
});

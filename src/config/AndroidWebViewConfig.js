// AndroidWebViewConfig.js
// Configuration for integrating the responsive booking calendar into Android WebView
// Perfect for creating a dedicated POS app

// WebView Configuration for Android POS Application
export const webViewConfig = {
  // Viewport settings for optimal touch experience
  viewport: {
    width: 'device-width',
    initialScale: 1.0,
    maximumScale: 1.0,
    userScalable: 'no', // Prevents accidental pinch-to-zoom in POS environment
    viewportFit: 'cover',
    targetDensityDpi: 'device-dpi',
  },

  // Meta tags for PWA-like experience
  metaTags: `
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#2563eb">
    <meta name="msapplication-navbutton-color" content="#2563eb">
    <meta name="apple-mobile-web-app-title" content="POS Booking System">
  `,

  // CSS for preventing unwanted touch behaviors
  touchOptimizations: `
    <style>
      /* Prevent text selection and context menus in POS environment */
      * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      
      /* Allow text selection in form inputs */
      input, textarea, select {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
      
      /* Optimize scrolling performance */
      * {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
      
      /* Remove default button styles for better touch experience */
      button, input[type="button"], input[type="submit"] {
        -webkit-appearance: none;
        appearance: none;
        border-radius: 8px;
      }
      
      /* Prevent zoom on input focus */
      input, select, textarea {
        font-size: 16px !important;
        transform: translateZ(0);
      }
      
      /* Hide scrollbars for cleaner POS look */
      ::-webkit-scrollbar {
        display: none;
      }
      
      /* Optimize for full-screen experience */
      html, body {
        margin: 0;
        padding: 0;
        height: 100vh;
        overflow-x: hidden;
        background-color: #ffffff;
      }
    </style>
  `,
}

// Android WebView Settings (for native app integration)
export const androidWebViewSettings = {
  // Java/Kotlin WebView configuration
  settings: `
    webView.getSettings().setJavaScriptEnabled(true);
    webView.getSettings().setDomStorageEnabled(true);
    webView.getSettings().setLoadWithOverviewMode(true);
    webView.getSettings().setUseWideViewPort(true);
    webView.getSettings().setSupportZoom(false);
    webView.getSettings().setBuiltInZoomControls(false);
    webView.getSettings().setDisplayZoomControls(false);
    webView.getSettings().setAllowFileAccess(true);
    webView.getSettings().setAllowContentAccess(true);
    webView.getSettings().setGeolocationEnabled(false);
    
    // Performance optimizations
    webView.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
    webView.getSettings().setRenderPriority(WebSettings.RenderPriority.HIGH);
    webView.getSettings().setEnableSmoothTransition(true);
    
    // Security settings for POS environment
    webView.getSettings().setSavePassword(false);
    webView.getSettings().setSaveFormData(false);
    webView.getSettings().setAllowFileAccessFromFileURLs(false);
    webView.getSettings().setAllowUniversalAccessFromFileURLs(false);
  `,

  // Touch handling optimizations
  touchHandling: `
    // Disable long press context menu
    webView.setOnLongClickListener(new View.OnLongClickListener() {
        @Override
        public boolean onLongClick(View v) {
            return true;
        }
    });
    
    // Optimize touch responsiveness
    webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
    webView.setVerticalScrollBarEnabled(false);
    webView.setHorizontalScrollBarEnabled(false);
  `,
}

// PWA Manifest for standalone app experience
export const pwaManifest = {
  name: 'POS Booking System',
  short_name: 'POS Bookings',
  description: 'Professional booking calendar for POS systems',
  start_url: '/',
  display: 'standalone',
  orientation: 'landscape-primary',
  theme_color: '#2563eb',
  background_color: '#ffffff',
  icons: [
    {
      src: '/icon-72x72.png',
      sizes: '72x72',
      type: 'image/png',
    },
    {
      src: '/icon-96x96.png',
      sizes: '96x96',
      type: 'image/png',
    },
    {
      src: '/icon-128x128.png',
      sizes: '128x128',
      type: 'image/png',
    },
    {
      src: '/icon-144x144.png',
      sizes: '144x144',
      type: 'image/png',
    },
    {
      src: '/icon-152x152.png',
      sizes: '152x152',
      type: 'image/png',
    },
    {
      src: '/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
    },
    {
      src: '/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
  categories: ['business', 'productivity'],
  screenshots: [
    {
      src: '/screenshot-wide.png',
      sizes: '1280x720',
      type: 'image/png',
      form_factor: 'wide',
    },
  ],
}

// Recommended HTML template for POS deployment
export const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${webViewConfig.metaTags}
  <title>POS Booking System</title>
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/png" href="/icon-32x32.png">
  
  ${webViewConfig.touchOptimizations}
  
  <!-- Preload critical fonts for better performance -->
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
  
  <!-- Critical CSS inlined for faster loading -->
  <style>
    /* Critical above-the-fold styles */
    .loading-spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <!-- Loading state for better perceived performance -->
  <div id="loading" class="loading-spinner">
    <div>
      <div class="spinner"></div>
      <p style="margin-top: 16px; color: #6b7280;">Loading POS System...</p>
    </div>
  </div>
  
  <!-- React app mount point -->
  <div id="root" style="display: none;"></div>
  
  <!-- Service Worker registration for offline support -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
          .then(function(registration) {
            console.log('SW registered: ', registration);
          })
          .catch(function(registrationError) {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
    
    // Hide loading spinner once app loads
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('root').style.display = 'block';
      }, 100);
    });
  </script>
  
  <!-- Main app bundle -->
  <script src="/static/js/main.js"></script>
</body>
</html>
`

// Service Worker for offline functionality
export const serviceWorkerConfig = `
// Service Worker for POS Booking System
const CACHE_NAME = 'pos-booking-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/icon-192x192.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
`

// React app entry point optimizations
export const appEntryOptimizations = `
// App.js optimizations for POS environment
import React, { Suspense, lazy, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy load the booking calendar for better initial load
const BookingCalendar = lazy(() => import('./components/BookingCalendar'));

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1>POS System Error</h1>
      <p>Something went wrong with the booking system.</p>
      <button 
        onClick={resetErrorBoundary}
        style={{
          padding: '12px 24px',
          backgroundColor: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '16px'
        }}
      >
        Restart System
      </button>
    </div>
  );
}

// Loading component for better UX
function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f9fafb'
    }}>
      <div>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#6b7280' }}>
          Loading Calendar...
        </p>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Prevent context menu on long press (POS optimization)
    const preventContextMenu = (e) => {
      e.preventDefault();
      return false;
    };
    
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('selectstart', preventContextMenu);
    
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventContextMenu);
    };
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<LoadingFallback />}>
        <BookingCalendar />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
`

// Deployment checklist for POS systems
export const deploymentChecklist = `
# POS System Deployment Checklist

## Pre-deployment
- [ ] Test on target Android tablet models
- [ ] Verify touch responsiveness on various screen sizes
- [ ] Test in landscape and portrait orientations
- [ ] Validate offline functionality
- [ ] Check performance with large datasets
- [ ] Ensure proper error handling

## Security Considerations
- [ ] Enable HTTPS for all communication
- [ ] Implement proper authentication
- [ ] Sanitize all user inputs
- [ ] Use secure session management
- [ ] Regular security updates

## Performance Optimization
- [ ] Enable gzip compression
- [ ] Implement CDN for static assets
- [ ] Optimize images (WebP format when possible)
- [ ] Minify JavaScript and CSS
- [ ] Enable browser caching
- [ ] Monitor core web vitals

## Android WebView Integration
- [ ] Configure WebView settings per androidWebViewSettings
- [ ] Implement proper error handling for network issues
- [ ] Add loading states for better UX
- [ ] Test JavaScript bridge if needed for native features
- [ ] Implement proper back button handling

## Testing Protocol
- [ ] Unit tests for critical components
- [ ] Integration tests for booking flow
- [ ] End-to-end testing on actual hardware
- [ ] Performance testing under load
- [ ] Accessibility testing (for compliance)
- [ ] Cross-browser testing

## Production Setup
- [ ] Configure production build optimizations
- [ ] Set up monitoring and logging
- [ ] Implement automated backups
- [ ] Configure load balancing if needed
- [ ] Set up health checks
- [ ] Plan for scaling
`

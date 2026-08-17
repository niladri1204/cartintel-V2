import { detectProduct } from './detector';
import { processProduct } from '../intelligence';

function init() {
  const result = detectProduct();
  
  if (result.isProductPage) {
    // 1. Maintain backward compatibility for Phase 2.1
    chrome.storage.local.set({ 'cartintel-current-product': result });

    console.log(
      '%c🛍️ CartIntel Product Detected!',
      'color: #00e676; font-size: 14px; font-weight: bold; background: #222; padding: 4px 8px; border-radius: 4px;'
    );
    console.table({
      Title: result.title,
      Price: result.price !== null ? `${result.price} ${result.currency || ''}` : null,
      Image: result.image,
      URL: result.url,
      Hostname: result.hostname
    });

    // 2. Intelligence Engine Integration (Phase 2.2.5)
    try {
      const intelligence = processProduct({
        title: result.title,
        price: result.price,
        currency: result.currency,
        image: result.image,
        url: result.url,
        hostname: result.hostname
      });

      chrome.storage.local.set({ 'cartintel-product-intelligence': intelligence });

      console.log(
        '%c🧠 CartIntel Product Intelligence Processed',
        'color: #00bcd4; font-size: 13px; font-weight: bold; background: #222; padding: 3px 6px; border-radius: 4px;'
      );
      
      console.table({
        Fingerprint: intelligence.fingerprint,
        Brand: intelligence.brand,
        Category: intelligence.category,
        Confidence: `${intelligence.confidence}%`
      });

    } catch (err) {
      console.error('CartIntel: Failed to process product intelligence.', err);
    }
  } else {
    // Clear storage if navigation leaves product page
    chrome.storage.local.remove(['cartintel-current-product', 'cartintel-product-intelligence']);
    console.log(
      '%cℹ️ CartIntel: Not a product page',
      'color: #9e9e9e; font-size: 12px;'
    );
  }
}

// 3. Message listener for Popup requests
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'force_detect') {
    init();
    sendResponse({ status: 'started' });
  }
});

// 4. SPA Navigation Tracking
let lastUrl = location.href;

function handleUrlChange() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    // Temporarily invalidate old product data on navigation
    chrome.storage.local.remove(['cartintel-current-product', 'cartintel-product-intelligence']);
    // Wait for DOM to update
    setTimeout(init, 1500);
  }
}

const originalPushState = history.pushState;
history.pushState = function(...args) {
  originalPushState.apply(this, args);
  handleUrlChange();
};

const originalReplaceState = history.replaceState;
history.replaceState = function(...args) {
  originalReplaceState.apply(this, args);
  handleUrlChange();
};

window.addEventListener('popstate', handleUrlChange);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

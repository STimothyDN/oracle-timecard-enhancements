// Main content script - initialize and run all enhancements
(() => {
  // Create and configure the enhancement manager
  const manager = new EnhancementManager();

  // Register all available enhancements
  manager.registerEnhancement(new TimecardTotalsEnhancement());
  manager.registerEnhancement(new WeekendShadingEnhancement());
  manager.registerEnhancement(new AlternateLineShadingEnhancement());

  // Initialize the manager
  manager.init().catch(error => {
    console.error('Failed to initialize timecard enhancements:', error);
  });

  // Listen for messages from popup/options page
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'getEnhancements':
        sendResponse({ enhancements: manager.getAllEnhancements() });
        break;
        
      case 'toggleEnhancement':
        manager.setEnhancementEnabled(request.name, request.enabled)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Indicates async response
        
      case 'updateWeekendColor':
        const weekendShading = manager.enhancements.get('weekend-shading');
        if (weekendShading && weekendShading.setShadeColor) {
          weekendShading.setShadeColor(request.color);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Weekend shading enhancement not found' });
        }
        break;
	  case 'updateAlternateRowColor':
        const alternateShading = manager.enhancements.get('alternate-line-shading');
        if (alternateShading && alternateShading.setShadeColor) {
          alternateShading.setShadeColor(request.color);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Alternate row shading enhancement not found' });
        }
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    manager.cleanup();
  });
})();

// Main content script - initialize and run all enhancements
(() => {
  // Create and configure the enhancement manager
  const manager = new EnhancementManager();

  // Make manager globally accessible for inter-enhancement communication
  window.enhancementManager = manager;

  // Register all available enhancements
  manager.registerEnhancement(new TimecardTotalsEnhancement());
  manager.registerEnhancement(new WeekendShadingEnhancement());
  manager.registerEnhancement(new AlternateLineShadingEnhancement());
  manager.registerEnhancement(new DynamicRedLineEnhancement());
  // Previous timecard is action-only; registered directly, not via manager
  window._previousTimecardEnhancement = new PreviousTimecardEnhancement();

  // Initialize the manager. Messages wait on this so a popup opened during
  // startup sees saved preferences and can't race enhancement initialization.
  const ready = manager.init().catch(error => {
    console.error('Failed to initialize timecard enhancements:', error);
  });

  async function handleMessage(request) {
    switch (request?.action) {
      case 'getEnhancements':
        return { enhancements: manager.getAllEnhancements() };

      case 'toggleEnhancement':
        await manager.setEnhancementEnabled(request.name, request.enabled);
        return { success: true };

      case 'updateWeekendColor': {
        const weekendShading = manager.enhancements.get('weekend-shading');
        if (!weekendShading?.setShadeColor) {
          return { success: false, error: 'Weekend shading enhancement not found' };
        }
        weekendShading.setShadeColor(request.color);

        // Update alternate line shading after weekend color change
        const alternateShading = manager.enhancements.get('alternate-line-shading');
        if (alternateShading?.enabled) {
          alternateShading.scheduleRefresh(100);
        }
        return { success: true };
      }

      case 'updateRedLineColor': {
        const dynamicRedLine = manager.enhancements.get('dynamic-red-line');
        if (!dynamicRedLine?.setRedLineColor) {
          return { success: false, error: 'Dynamic red line enhancement not found' };
        }
        dynamicRedLine.setRedLineColor(request.color);
        return { success: true };
      }

      case 'updateAlternateRowColor': {
        const alternateShading = manager.enhancements.get('alternate-line-shading');
        if (!alternateShading?.setAlternateShadeColor) {
          return { success: false, error: 'Alternate row shading enhancement not found' };
        }
        alternateShading.setAlternateShadeColor(request.color);
        return { success: true };
      }

      case 'showPreviousTimecardData':
        if (!window._previousTimecardEnhancement?.showModal) {
          return { success: false, error: 'Previous timecard enhancement not found' };
        }
        window._previousTimecardEnhancement.showModal(request.prevData, request.currentData);
        return { success: true };

      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  // Listen for messages from popup/options page
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    ready
      .then(() => handleMessage(request))
      .then(sendResponse, error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  });

  // No unload cleanup: the page's DOM is discarded anyway, and tearing down on
  // beforeunload left enhancements disabled if navigation was cancelled or the
  // page was restored from the back/forward cache.
})();

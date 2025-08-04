/**
 * Enhancement Manager
 * Manages all timecard enhancements and user preferences
 */
class EnhancementManager {
  constructor() {
    this.enhancements = new Map();
    this.mutationObserver = null;
    this.debounceId = null;
    this.initialized = false;
  }

  /**
   * Register an enhancement
   * @param {Enhancement} enhancement 
   */
  registerEnhancement(enhancement) {
    this.enhancements.set(enhancement.name, enhancement);
  }

  /**
   * Initialize the manager and all enabled enhancements
   */
  async init() {
    if (this.initialized) return;

    // Load user preferences
    await this.loadPreferences();

    // Initialize enabled enhancements
    for (const enhancement of this.enhancements.values()) {
      if (enhancement.enabled) {
        await enhancement.init();
      }
    }

    // Set up mutation observer
    this.setupMutationObserver();

    // Initial update after page load
    window.addEventListener("load", () => {
      setTimeout(() => this.updateAll(), 500);
    });

    this.initialized = true;
  }

  /**
   * Update all enabled enhancements
   */
  async updateAll() {
    for (const enhancement of this.enhancements.values()) {
      if (enhancement.enabled) {
        await enhancement.update();
      }
    }
  }

  /**
   * Enable/disable an enhancement
   * @param {string} name - Enhancement name
   * @param {boolean} enabled - Whether to enable the enhancement
   */
  async setEnhancementEnabled(name, enabled) {
    const enhancement = this.enhancements.get(name);
    if (!enhancement) {
        throw new Error(`Enhancement '${name}' not found`);
    }

    // Prevent rapid toggling issues
    if (enhancement.enabled === enabled) {
        return;
    }

    await enhancement.setEnabled(enabled);
    await this.savePreferences();
    
    // Coordinate between related enhancements
    if (name === 'weekend-shading' || name === 'alternate-line-shading') {
      await this.coordinateShadingEnhancements(name, enabled);
    }
    
    // Force an update if enabling
    if (enabled) {
        setTimeout(() => enhancement.update(), 100);
    }
  }

  /**
   * Coordinate between shading enhancements to prevent conflicts
   * @param {string} changedEnhancement - The enhancement that was toggled
   * @param {boolean} enabled - Whether it was enabled or disabled
   */
  async coordinateShadingEnhancements(changedEnhancement, enabled) {
    const weekendShading = this.enhancements.get('weekend-shading');
    const alternateShading = this.enhancements.get('alternate-line-shading');
    
    if (!weekendShading || !alternateShading) return;
    
    // Small delay to ensure DOM is in correct state
    setTimeout(async () => {
      // If weekend shading was changed, update alternate shading
      if (changedEnhancement === 'weekend-shading' && alternateShading.enabled && alternateShading.forceUpdate) {
        await alternateShading.forceUpdate();
      }
      
      // If alternate shading was changed and weekend is enabled, update both
      if (changedEnhancement === 'alternate-line-shading' && weekendShading.enabled) {
        if (alternateShading.enabled && alternateShading.forceUpdate) {
          await alternateShading.forceUpdate();
        }
      }
    }, 150);
  }

  /**
   * Get all enhancements with their current state
   */
  getAllEnhancements() {
    return Array.from(this.enhancements.values()).map(enhancement => ({
      name: enhancement.name,
      description: enhancement.description,
      enabled: enhancement.enabled,
      defaultEnabled: enhancement.defaultEnabled
    }));
  }

  /**
   * Load user preferences from storage
   */
  async loadPreferences() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['enhancementPreferences'], (result) => {
        const preferences = result.enhancementPreferences || {};
        
        // Apply saved preferences
        for (const [name, enhancement] of this.enhancements) {
          if (preferences[name] !== undefined) {
            enhancement.enabled = preferences[name];
          }
        }
        
        resolve();
      });
    });
  }

  /**
   * Save user preferences to storage
   */
  async savePreferences() {
    const preferences = {};
    for (const [name, enhancement] of this.enhancements) {
      preferences[name] = enhancement.enabled;
    }

    return new Promise((resolve) => {
      chrome.storage.sync.set({ enhancementPreferences: preferences }, resolve);
    });
  }

  /**
   * Set up debounced mutation observer
   */
  setupMutationObserver() {
    const debouncedUpdate = () => {
      clearTimeout(this.debounceId);
      this.debounceId = setTimeout(() => this.updateAll(), 250);
    };

    this.mutationObserver = new MutationObserver(debouncedUpdate);
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    clearTimeout(this.debounceId);
    
    // Cleanup all enhancements
    for (const enhancement of this.enhancements.values()) {
      enhancement.cleanup();
    }
  }
}

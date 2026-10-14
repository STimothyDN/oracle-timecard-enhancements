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
        await this.runEnhancementTask(enhancement, 'init');
      }
    }

    // Set up mutation observer
    this.setupMutationObserver();

    // Initial update after page load. Content scripts run at document_idle, so
    // the load event may already have fired by the time we get here.
    const scheduleInitialUpdate = () => setTimeout(() => this.updateAll(), 500);
    if (document.readyState === 'complete') {
      scheduleInitialUpdate();
    } else {
      window.addEventListener('load', scheduleInitialUpdate, { once: true });
    }

    this.initialized = true;
  }

  /**
   * Update all enabled enhancements
   */
  async updateAll() {
    for (const enhancement of this.enhancements.values()) {
      if (enhancement.enabled) {
        await this.runEnhancementTask(enhancement, 'update');
      }
    }
  }

  async runEnhancementTask(enhancement, method) {
    if (!enhancement || typeof enhancement[method] !== 'function') return;

    try {
      await enhancement[method]();
    } catch (error) {
      console.error(`Enhancement '${enhancement.name}' failed during ${method}:`, error);
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
      this.coordinateShadingEnhancements(name);
    }

    // Force an update if enabling
    if (enabled) {
        setTimeout(() => this.runEnhancementTask(enhancement, 'update'), 100);
    }
  }

  /**
   * Coordinate between shading enhancements to prevent conflicts
   * @param {string} changedEnhancement - The enhancement that was toggled
   */
  coordinateShadingEnhancements(changedEnhancement) {
    const weekendShading = this.enhancements.get('weekend-shading');
    const alternateShading = this.enhancements.get('alternate-line-shading');

    if (!weekendShading || !alternateShading) return;

    // Re-shade alternate rows once the DOM settles. Requests are coalesced, and the
    // refresh is skipped if alternate shading is disabled by the time it runs.
    if (changedEnhancement === 'weekend-shading' || weekendShading.enabled) {
      alternateShading.scheduleRefresh?.(150);
    }
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
    const result = await readSyncStorage(['enhancementPreferences']);
    const preferences = result.enhancementPreferences || {};

    // Apply saved preferences
    for (const [name, enhancement] of this.enhancements) {
      if (preferences[name] !== undefined) {
        enhancement.enabled = preferences[name];
      }
    }
  }

  /**
   * Save user preferences to storage
   */
  async savePreferences() {
    const preferences = {};
    for (const [name, enhancement] of this.enhancements) {
      preferences[name] = enhancement.enabled;
    }

    await writeSyncStorage({ enhancementPreferences: preferences });
  }

  /**
   * Set up debounced mutation observer
   */
  setupMutationObserver() {
    const observerTarget = document.body || document.documentElement;
    if (!observerTarget) return;

    this.mutationObserver = new MutationObserver((records) => {
      // Ignore batches caused only by our own UI (e.g. modal progress updates)
      if (records.every(record => this.isOwnUiMutation(record))) return;

      clearTimeout(this.debounceId);
      this.debounceId = setTimeout(() => this.updateAll(), 250);
    });
    this.mutationObserver.observe(observerTarget, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  /**
   * Whether a mutation happened inside, or only added/removed, extension-owned UI
   * @param {MutationRecord} record
   */
  isOwnUiMutation(record) {
    const selector = `[${OTE_UI_ATTRIBUTE}]`;
    const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
    if (target?.closest(selector)) return true;
    if (record.type !== 'childList') return false;

    const changedNodes = [...record.addedNodes, ...record.removedNodes];
    return changedNodes.length > 0 && changedNodes.every(node =>
      node.nodeType === Node.ELEMENT_NODE && node.matches(selector)
    );
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    clearTimeout(this.debounceId);

    // Cleanup all enhancements
    for (const enhancement of this.enhancements.values()) {
      this.runEnhancementTask(enhancement, 'cleanup');
    }
  }
}

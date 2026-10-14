/**
 * Attribute that marks DOM owned by this extension (modal, toasts) so the
 * manager can ignore mutations it caused itself.
 */
const OTE_UI_ATTRIBUTE = 'data-ote-ui';

/**
 * Read from chrome.storage.sync. Resolves with {} (callers fall back to their
 * defaults) instead of hanging or throwing when storage is unavailable, e.g.
 * after the extension is reloaded and this content script is orphaned.
 */
function readSyncStorage(keys) {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    console.warn('Timecard enhancements: could not read settings:', chrome.runtime.lastError.message);
                    resolve({});
                    return;
                }
                resolve(result || {});
            });
        } catch (error) {
            console.warn('Timecard enhancements: could not read settings:', error);
            resolve({});
        }
    });
}

/**
 * Write to chrome.storage.sync. Never rejects; failures are logged.
 */
function writeSyncStorage(items) {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.set(items, () => {
                if (chrome.runtime.lastError) {
                    console.warn('Timecard enhancements: could not save settings:', chrome.runtime.lastError.message);
                }
                resolve();
            });
        } catch (error) {
            console.warn('Timecard enhancements: could not save settings:', error);
            resolve();
        }
    });
}

/**
 * Base class for all timecard enhancements
 */
class Enhancement {
    constructor(name, description, defaultEnabled = true) {
        this.name = name;
        this.description = description;
        this.defaultEnabled = defaultEnabled;
        this.enabled = defaultEnabled;
        this.initialized = false;
        this._initPromise = null;
        this._stateChange = Promise.resolve();
    }

    /**
     * Initialize the enhancement
     * Called when the enhancement is enabled
     */
    async init() {
        if (this.initialized) return;
        // Share an in-flight initialization so concurrent callers don't run onInit twice
        if (!this._initPromise) {
            this._initPromise = (async () => {
                try {
                    await this.onInit();
                    this.initialized = true;
                } finally {
                    this._initPromise = null;
                }
            })();
        }
        await this._initPromise;
    }

    /**
     * Cleanup the enhancement
     * Called when the enhancement is disabled
     */
    async cleanup() {
        // Let an in-flight init finish so it can't re-apply changes after cleanup
        if (this._initPromise) await this._initPromise.catch(() => {});
        if (!this.initialized) return;
        await this.onCleanup();
        this.initialized = false;
    }

    /**
     * Update the enhancement
     * Called when the DOM changes and enhancement is enabled
     */
    async update() {
        if (!this.enabled || !this.initialized) return;
        await this.onUpdate();
    }

    /**
     * Enable/disable the enhancement
     */
    async setEnabled(enabled) {
        if (this.enabled === enabled) return;

        this.enabled = enabled;

        // Serialize transitions so rapid toggles can't interleave init/cleanup;
        // each queued step applies whatever state was requested most recently.
        const applyLatestState = () => (this.enabled ? this.init() : this.cleanup());
        this._stateChange = this._stateChange.then(applyLatestState, applyLatestState);
        await this._stateChange;
    }

    /**
     * Restore a cell's inline background to a previously recorded value
     * @param {HTMLElement} cell
     * @param {string|undefined} originalColor - '' or undefined removes the inline color
     */
    restoreBackgroundColor(cell, originalColor) {
        if (originalColor) {
            cell.style.backgroundColor = originalColor;
        } else {
            cell.style.removeProperty('background-color');
        }
    }

    // Override these methods in subclasses
    async onInit() {}
    async onCleanup() {}
    async onUpdate() {}
}

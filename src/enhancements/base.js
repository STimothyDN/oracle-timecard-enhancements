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
    }

    /**
     * Initialize the enhancement
     * Called when the enhancement is enabled
     */
    async init() {
        if (this.initialized) return;
        await this.onInit();
        this.initialized = true;
    }

    /**
     * Cleanup the enhancement
     * Called when the enhancement is disabled
     */
    async cleanup() {
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
        
        if (enabled) {
        await this.init();
        } else {
        await this.cleanup();
        }
    }

    // Override these methods in subclasses
    async onInit() {}
    async onCleanup() {}
    async onUpdate() {}
}

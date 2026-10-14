/**
 * Weekend Shading Enhancement
 * Applies subtle background shading to weekend columns
 */
class WeekendShadingEnhancement extends Enhancement {
  constructor() {
    super(
      'weekend-shading',
      'Apply subtle gray shading to weekend columns (Saturday & Sunday)',
      true
    );
    this.shadeColor = "rgb(251,249,248)";
    this.originalColors = new Map(); // Store original colors for cleanup
  }

  async onInit() {
    // Load saved color preference
    await this.loadColorPreference();

    // Initial shading
    this.shadeWeekends();
  }

  async onCleanup() {
    // Remove weekend shading
    this.removeWeekendShading();

    // Notify alternate shading to update
    this.notifyAlternateShading();
  }

  async onUpdate() {
    this.shadeWeekends();
  }

  /**
   * Force update - called when other enhancements change state
   */
  async forceUpdate() {
    if (this.enabled && this.initialized) {
      this.shadeWeekends();
    }
  }

  /**
   * Notify alternate shading enhancement to update
   */
  notifyAlternateShading() {
    if (typeof window !== 'undefined' && window.enhancementManager) {
      const alternateShading = window.enhancementManager.enhancements.get('alternate-line-shading');
      if (alternateShading && alternateShading.enabled && alternateShading.scheduleRefresh) {
        alternateShading.scheduleRefresh(50);
      }
    }
  }

  // Find the left offsets of weekend columns
  findWeekendOffsets() {
    const offsets = new Set();
    const headerCells = document.querySelectorAll('.oj-datagrid-column-header-cell');
    headerCells.forEach((cell) => {
      const left = cell.style.left;
      if (left && (cell.textContent.includes('Sat,') || cell.textContent.includes('Sun,'))) {
        offsets.add(left);
      }
    });
    return offsets;
  }

  /**
   * Shade cells in weekend columns and restore any that are no longer in one.
   * Only cells whose state actually changes are touched, so repeated passes over
   * an unchanged grid don't rewrite every cell.
   */
  shadeWeekends() {
    const offsets = this.findWeekendOffsets();
    const targetCells = [];
    if (offsets.size) {
      const gridCells = document.querySelectorAll(
        '.oj-datagrid-cell,.oj-datagrid-column-header-cell,.oj-datagrid-column-end-header-cell'
      );
      gridCells.forEach((cell) => {
        if (offsets.has(cell.style.left)) targetCells.push(cell);
      });
    }
    const targets = new Set(targetCells);

    // Restore cells that are shaded but no longer in a weekend column
    document.querySelectorAll('[data-weekend-shaded="true"]').forEach((cell) => {
      if (targets.has(cell)) return;
      this.restoreBackgroundColor(cell, this.originalColors.get(cell));
      cell.removeAttribute('data-weekend-shaded');
    });

    const originalColors = new Map();
    targetCells.forEach((cell) => {
      const alreadyShaded = cell.dataset.weekendShaded === 'true';

      // Remember the pre-shading color, unless alternate shading already owns it
      if (!cell.dataset.alternateRowsShaded) {
        originalColors.set(cell, alreadyShaded
          ? (this.originalColors.get(cell) ?? '')
          : (cell.style.backgroundColor || ''));
      }

      cell.style.backgroundColor = this.shadeColor;
      if (!alreadyShaded) cell.dataset.weekendShaded = 'true';
    });
    this.originalColors = originalColors;

    // Notify alternate shading to update after weekend shading is applied
    this.notifyAlternateShading();
  }

  removeWeekendShading() {
    const shadedCells = document.querySelectorAll('[data-weekend-shaded="true"]');
    shadedCells.forEach((cell) => {
        // Restore original color (or remove the style if none was stored)
        this.restoreBackgroundColor(cell, this.originalColors.get(cell));
        cell.removeAttribute('data-weekend-shaded');
    });
    this.originalColors.clear();
  }

  /**
   * Update shade color
   * @param {string} color - CSS color value
   */
  setShadeColor(color) {
    this.shadeColor = color;
    if (this.enabled && this.initialized) {
      this.shadeWeekends();
    }
  }

  /**
   * Load saved color preference and apply it
   */
  async loadColorPreference() {
    const result = await readSyncStorage(['weekendShadeColor']);
    if (result.weekendShadeColor) {
      this.shadeColor = result.weekendShadeColor;
    }
  }
}

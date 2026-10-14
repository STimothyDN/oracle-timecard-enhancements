/**
 * Alternate Shading Enhancement
 * Applies subtle background shading to alternate rows
 */
class AlternateLineShadingEnhancement extends Enhancement {
  constructor() {
    super(
      'alternate-line-shading',
      'Apply subtle gray shading to alternate rows',
      true
    );
    this.alternateShadeColor = "rgb(245,254,255)";
    this.originalColors = new Map(); // Store original colors for cleanup
    this.refreshTimer = null;
  }

  async onInit() {
    // Load saved color preference
    await this.loadColorPreference();

    // Initial shading
    this.shadeAlternateRows();
  }

  async onCleanup() {
    this.cancelScheduledRefresh();

    // Remove alternate row shading
    this.removeAlternateRowsShading();
  }

  async onUpdate() {
    this.shadeAlternateRows();
  }

  /**
   * Force update - called when other enhancements change state
   */
  async forceUpdate() {
    if (this.enabled && this.initialized) {
      this.shadeAlternateRows();
    }
  }

  /**
   * Request a deferred re-shade (e.g. after weekend shading changes). Repeated
   * requests collapse into a single pass, and any full pass that runs first
   * cancels the pending one.
   * @param {number} delay - Milliseconds to wait for the DOM to settle
   */
  scheduleRefresh(delay = 50) {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.forceUpdate();
    }, delay);
  }

  cancelScheduledRefresh() {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }

  /**
   * Check if weekend shading enhancement is enabled
   * @returns {boolean} True if weekend shading is enabled
   */
  isWeekendShadingEnabled() {
    // Try to access the enhancement manager through the global scope
    if (typeof window !== 'undefined' && window.enhancementManager) {
      const weekendShading = window.enhancementManager.enhancements.get('weekend-shading');
      return weekendShading && weekendShading.enabled && weekendShading.initialized;
    }

    // Fallback: check if weekend shading has been applied to any cells
    return document.querySelector('[data-weekend-shaded="true"]') !== null;
  }

  /**
   * Find the cells that belong in alternate (shaded) rows
   * @returns {Set<Element>} Cells to shade, excluding weekend-shaded cells when weekend shading is on
   */
  findAlternateRowCells() {
    const isWeekendShadingEnabled = this.isWeekendShadingEnabled();
    const cells = new Set();

    const addCell = (cell) => {
      // Skip if this cell has weekend shading (weekend takes priority)
      if (isWeekendShadingEnabled && cell.dataset.weekendShaded === 'true') {
        return;
      }
      cells.add(cell);
    };

    // Cells are listed row by row, so flip shading every rowLength cells
    const addAlternateRows = (rowCells, rowLength) => {
      const safeRowLength = Math.max(rowLength, 1);
      let shade = true;
      let start = 0;
      rowCells.forEach((cell) => {
        if (start % safeRowLength === 0) {
          shade = !shade;
        }
        start++;
        if (shade) {
          addCell(cell);
        }
      });
    };

    const frozenCellsLength = document.querySelectorAll(".oj-datagrid-column-header-frozen div div div:nth-child(even)").length;
    const timeCellsLength = document.querySelectorAll(".oj-datagrid-column-header-cell:nth-child(even)").length - frozenCellsLength;

    /* get numbers and totals */
    document.querySelectorAll(
      '.oj-datagrid-row-header-cell:nth-child(even),.oj-datagrid-row-end-header-cell:nth-child(even)'
    ).forEach(addCell);

    /* frozen cells */
    addAlternateRows(
      document.querySelectorAll(".oj-datagrid-cell.oj-form-control-inherit.oj-datagrid-cell-frozen.oj-form-control-inherit.oj-fa-time-hcm-dg-header-cell-padding.oj-typography-body-sm.oj-fa-time-hcm-dg-row-height"),
      frozenCellsLength
    );

    /* time entry cells */
    addAlternateRows(
      document.querySelectorAll(".oj-datagrid-databody .oj-datagrid-cell"),
      timeCellsLength
    );

    return cells;
  }

  /**
   * Shade alternate rows and restore any cells that are no longer in one.
   * Only cells whose state actually changes are touched, so repeated passes over
   * an unchanged grid don't rewrite every cell.
   */
  shadeAlternateRows() {
    // This full pass supersedes any refresh that was waiting to run
    this.cancelScheduledRefresh();

    const targets = this.findAlternateRowCells();

    // Restore cells that are shaded but no longer in an alternate row
    // (weekend shading keeps ownership of its cells' color)
    document.querySelectorAll('[data-alternate-rows-shaded="true"]').forEach((cell) => {
      if (targets.has(cell)) return;
      if (!cell.dataset.weekendShaded) {
        this.restoreBackgroundColor(cell, this.originalColors.get(cell));
      }
      cell.removeAttribute('data-alternate-rows-shaded');
    });

    // Keep stored colors for weekend-shaded cells so they can be restored later
    const originalColors = new Map();
    this.originalColors.forEach((color, cell) => {
      if (cell.dataset.weekendShaded) {
        originalColors.set(cell, color);
      }
    });

    targets.forEach((cell) => {
      const alreadyShaded = cell.dataset.alternateRowsShaded === 'true';

      // Remember the pre-shading color, unless weekend shading already owns it
      if (!cell.dataset.weekendShaded) {
        originalColors.set(cell, alreadyShaded
          ? (this.originalColors.get(cell) ?? '')
          : (cell.style.backgroundColor || ''));
      }

      cell.style.backgroundColor = this.alternateShadeColor;
      if (!alreadyShaded) cell.dataset.alternateRowsShaded = 'true';
    });
    this.originalColors = originalColors;
  }

  removeAlternateRowsShading() {
    const shadedCells = document.querySelectorAll('[data-alternate-rows-shaded="true"]');

    shadedCells.forEach((cell) => {
        // Only restore color if this cell doesn't have weekend shading
        if (!cell.dataset.weekendShaded) {
          this.restoreBackgroundColor(cell, this.originalColors.get(cell));
        }
        cell.removeAttribute('data-alternate-rows-shaded');
    });

    // Only clear colors for cells that don't have weekend shading
    const cellsToRemove = [];
    this.originalColors.forEach((color, cell) => {
      if (!cell.dataset.weekendShaded) {
        cellsToRemove.push(cell);
      }
    });
    cellsToRemove.forEach(cell => this.originalColors.delete(cell));
  }

  /**
   * Update shade color
   * @param {string} color - CSS color value
   */
  setAlternateShadeColor(color) {
    this.alternateShadeColor = color;
    if (this.enabled && this.initialized) {
      this.shadeAlternateRows();
    }
  }

  /**
   * Load saved color preference and apply it
   */
  async loadColorPreference() {
    const result = await readSyncStorage(['alternateShadeColor']);
    if (result.alternateShadeColor) {
      this.alternateShadeColor = result.alternateShadeColor;
    }
  }
}

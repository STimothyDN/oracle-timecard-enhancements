/**
 * Alternate Shading Enhancement
 * Applies subtle background shading to alternate columns
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
  }

  async onInit() {
    // Load saved color preference
    await this.loadColorPreference();
    
    // Initial shading
    this.shadeAlternateRows();
  }

  async onCleanup() {
    // Remove alternate row shading
    this.removeAlternateRowsShading();
  }

  async onUpdate() {
    this.removeAlternateRowsShading();
    this.shadeAlternateRows();
  }

  /**
   * Force update - called when other enhancements change state
   */
  async forceUpdate() {
    if (this.enabled && this.initialized) {
      this.removeAlternateRowsShading();
      this.shadeAlternateRows();
    }
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
   * Find the left offsets of weekend columns (copied from weekend shading enhancement)
   * @returns {Array<string>} Array of left offset values for weekend columns
   */
  findWeekendOffsets() {
    const offsets = [];
    const headerCells = document.querySelectorAll('.oj-datagrid-column-header-cell');
    headerCells.forEach((cell) => {
      if (cell.textContent.includes('Sat,') || cell.textContent.includes('Sun,')) {
        offsets.push(cell.style.left);
      }
    });
    return offsets;
  }

  shadeAlternateRows() {
    const isWeekendShadingEnabled = this.isWeekendShadingEnabled();
    
    const processCell = (cell) => {
        // Skip if this cell has weekend shading (weekend takes priority)
        if (isWeekendShadingEnabled && cell.dataset.weekendShaded === 'true') {
          return;
        }
        
        // Only store original color if this cell doesn't have any shading applied yet
        if (!this.originalColors.has(cell) && !cell.dataset.alternateRowsShaded && !cell.dataset.weekendShaded) {
            this.originalColors.set(cell, cell.style.backgroundColor || '');
        }
        
        // Apply alternate shading
        cell.style.backgroundColor = this.alternateShadeColor;
        cell.dataset.alternateRowsShaded = 'true';
    };
    
    const frozenCellsLength = document.querySelectorAll(".oj-datagrid-column-header-frozen div div div:nth-child(even)").length;
    const timeCellsLength = document.querySelectorAll(".oj-datagrid-column-header-cell:nth-child(even)").length - frozenCellsLength;
    
    /* get numbers and totals */
    const gridCells = document.querySelectorAll(
      '.oj-datagrid-row-header-cell:nth-child(even),.oj-datagrid-row-end-header-cell:nth-child(even)'
    );
    
    gridCells.forEach(processCell);
    
    /* get frozen Cells Length */
    var frozenCells = document.querySelectorAll(".oj-datagrid-cell.oj-form-control-inherit.oj-datagrid-cell-frozen.oj-form-control-inherit.oj-fa-time-hcm-dg-header-cell-padding.oj-typography-body-sm.oj-fa-time-hcm-dg-row-height");
    var shade = true;
    var start = 0;
    frozenCells.forEach((cell) => {
        if(start % frozenCellsLength === 0){
            shade = !shade;
        }
        start++;
        if(shade){
            processCell(cell);
        }
    });
    
    /* get grid cells length */
    var timeCells = document.querySelectorAll(".oj-datagrid-databody .oj-datagrid-cell");
    var shade = true;
    var start = 0;
    timeCells.forEach((cell) => {
        if(start % timeCellsLength === 0){
            shade = !shade;
        }
        start++;
        if(shade){
            processCell(cell);
        }
    });
  }

  removeAlternateRowsShading() {
    const shadedCells = document.querySelectorAll('[data-alternate-rows-shaded="true"]');
    
    shadedCells.forEach((cell) => {
        // Only restore color if this cell doesn't have weekend shading
        if (!cell.dataset.weekendShaded) {
          const originalColor = this.originalColors.get(cell);
          if (originalColor !== undefined) {
            if (originalColor === '') {
              cell.style.removeProperty('background-color');
            } else {
              cell.style.backgroundColor = originalColor;
            }
          } else {
            cell.style.removeProperty('background-color');
          }
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
      this.removeAlternateRowsShading();
      this.shadeAlternateRows();
    }
  }

  /**
   * Load saved color preference and apply it
   */
  async loadColorPreference() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['alternateShadeColor'], (result) => {
        if (result.alternateShadeColor) {
          this.alternateShadeColor = result.alternateShadeColor;
        }
        resolve();
      });
    });
  }
}

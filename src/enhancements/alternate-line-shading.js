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
    this.alternateShadeColor = "rgb(251,249,248)";
    this.originalColors = new Map(); // Store original colors for cleanup
  }

  async onInit() {
    // Initial shading
    this.shadeAlternateRows();
  }

  async onCleanup() {
    // Remove alternate row shading
    this.removeAlternateRowsShading();
  }

  async onUpdate() {
    this.shadeAlternateRows();
  }

  // Find the left offsets of alternate columns
  findAlternateRowsOffsets() {
    const offsets = [];
    const headerCells = document.querySelectorAll('.oj-datagrid-row-header-cell:nth-child(even)');
    headerCells.forEach((cell) => {
        offsets.push(cell.style.left);
    });
    return offsets;
  }

  shadeAlternateRows() {
    const offsets = this.findAlternateRowsOffsets();
	
	const frozenCellsLength = document.querySelectorAll(".oj-datagrid-column-header-frozen div div div:nth-child(even)").length;
	const timeCellsLength = document.querySelectorAll(".oj-datagrid-column-header-cell:nth-child(even)").length - frozenCellsLength;
	
	/* get numbers and totals */
    const gridCells = document.querySelectorAll(
      '.oj-datagrid-row-header-cell:nth-child(even),.oj-datagrid-row-end-header-cell:nth-child(even)'
    );
    
    gridCells.forEach((cell) => {
        // Store original color if not already stored
        if (!this.originalColors.has(cell)) {
          this.originalColors.set(cell, cell.style.backgroundColor || '');
        }
        cell.style.backgroundColor = this.alternateShadeColor;
        cell.dataset.alternateRowsShaded = 'true';
    });
	
	
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
			// Store original color if not already stored
			if (!this.originalColors.has(cell)) {
			  this.originalColors.set(cell, cell.style.backgroundColor || '');
			}
			cell.style.backgroundColor = this.alternateShadeColor;
			cell.dataset.alternateRowsShaded = 'true';			
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
			// Store original color if not already stored
			if (!this.originalColors.has(cell)) {
			  this.originalColors.set(cell, cell.style.backgroundColor || '');
			}
			cell.style.backgroundColor = this.alternateShadeColor;
			cell.dataset.alternateRowsShaded = 'true';			
		}
	});
  }

  removeAlternateRows() {
    const shadedCells = document.querySelectorAll('[data-alternate-rows-shaded="true"]');
    shadedCells.forEach((cell) => {
        // Restore original color
        const originalColor = this.originalColors.get(cell);
        if (originalColor !== undefined) {
        cell.style.backgroundColor = originalColor;
        } else {
        // If no original color stored, remove the style
        cell.style.removeProperty('background-color');
        }
        cell.removeAttribute('data-alternate-rows-shaded');
    });
    this.originalColors.clear();
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
}

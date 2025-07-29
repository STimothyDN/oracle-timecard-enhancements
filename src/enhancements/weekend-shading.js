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
    // Initial shading
    this.shadeWeekends();
  }

  async onCleanup() {
    // Remove weekend shading
    this.removeWeekendShading();
  }

  async onUpdate() {
    this.shadeWeekends();
  }

  // Find the left offsets of weekend columns
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

  shadeWeekends() {
    const offsets = this.findWeekendOffsets();
    const gridCells = document.querySelectorAll(
      '.oj-datagrid-cell,.oj-datagrid-column-header-cell,.oj-datagrid-column-end-header-cell'
    );
    
    gridCells.forEach((cell) => {
      if (offsets.includes(cell.style.left)) {
        // Store original color if not already stored
        if (!this.originalColors.has(cell)) {
          this.originalColors.set(cell, cell.style.backgroundColor || '');
        }
        cell.style.backgroundColor = this.shadeColor;
        cell.dataset.weekendShaded = 'true';
      }
    });
  }

  removeWeekendShading() {
    const shadedCells = document.querySelectorAll('[data-weekend-shaded="true"]');
    shadedCells.forEach((cell) => {
        // Restore original color
        const originalColor = this.originalColors.get(cell);
        if (originalColor !== undefined) {
        cell.style.backgroundColor = originalColor;
        } else {
        // If no original color stored, remove the style
        cell.style.removeProperty('background-color');
        }
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
}

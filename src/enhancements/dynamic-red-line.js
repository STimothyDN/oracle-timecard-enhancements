/**
 * Dynamic Red Line Enhancement
 * Shows a single red line before the current date column instead of static weekly red lines
 */
class DynamicRedLineEnhancement extends Enhancement {
  static WEEK_BORDER_CLASS = 'oj-fa-time-hcm-dg-weekstart-border';
  static DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  static MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  constructor() {
    super(
      'dynamic-red-line',
      'Display a single red line before the current date column instead of static weekly lines',
      true
    );
    this.redLineColor = 'rgb(214,45,32)'; // Default Oracle red color
    this.styleElement = null; // For injecting custom CSS
  }

  async onInit() {
    // Load saved color preference
    await this.loadColorPreference();

    // Inject custom CSS for color override
    this.injectCustomCSS();

    // Apply the dynamic red line
    this.applyDynamicRedLine();
  }

  async onCleanup() {
    this.removeDynamicRedLine();
  }

  async onUpdate() {
    this.applyDynamicRedLine();
  }

  /**
   * Get today's date in the format used by the timecard headers
   * @returns {string} Today's date formatted like "Mon, Jan 27" or "Sun, Aug 03"
   */
  getTodayDateString() {
    const today = new Date();
    const dayName = DynamicRedLineEnhancement.DAY_NAMES[today.getDay()];
    const monthName = DynamicRedLineEnhancement.MONTH_NAMES[today.getMonth()];
    const date = today.getDate().toString().padStart(2, '0'); // Add leading zero for single digits

    return `${dayName},${monthName} ${date}`;
  }

  /**
   * Find the column immediately before today's column
   * @returns {Element|null} The header cell element for the day before today
   */
  findColumnBeforeToday() {
    const todayString = this.getTodayDateString();
    const headers = Array.from(
      document.querySelectorAll('.oj-datagrid-column-header-cell'),
      cell => ({ cell, text: cell.textContent.trim(), left: Number.parseInt(cell.style.left, 10) })
    );

    // Find the column header that matches today's date
    const todayHeader = headers.find(header => header.text.includes(todayString));
    if (!todayHeader || Number.isNaN(todayHeader.left)) return null;

    // Only date column headers (those with a position and a day name), left to right
    const dateHeaders = headers
      .filter(header =>
        !Number.isNaN(header.left) &&
        DynamicRedLineEnhancement.DAY_NAMES.some(day => header.text.includes(day))
      )
      .sort((a, b) => a.left - b.left);

    // Find the column immediately before today's column
    for (let i = 1; i < dateHeaders.length; i++) {
      if (dateHeaders[i].left === todayHeader.left) {
        return dateHeaders[i - 1].cell;
      }
    }

    return null;
  }

  /**
   * Get all cells in a specific column position (based on left offset)
   * @param {string} leftOffset - The CSS left offset value
   * @returns {Element[]} All cells at that column position
   */
  getCellsAtColumn(leftOffset) {
    const cells = document.querySelectorAll(
      '.oj-datagrid-cell,.oj-datagrid-column-header-cell,.oj-datagrid-column-end-header-cell'
    );
    return Array.from(cells).filter(cell => cell.style.left === leftOffset);
  }

  /**
   * Remove all existing Oracle week-start border classes
   */
  removeExistingRedLines() {
    const cellsWithWeekBorder = document.querySelectorAll(`.${DynamicRedLineEnhancement.WEEK_BORDER_CLASS}`);
    cellsWithWeekBorder.forEach(cell => {
      if (!cell.dataset.dynamicRedLineActive) {
        cell.classList.remove(DynamicRedLineEnhancement.WEEK_BORDER_CLASS);
        cell.dataset.dynamicRedLineRemoved = 'true';
      }
    });
  }

  /**
   * Apply the dynamic red line before today's column. Cells that already carry
   * the line are left alone, so repeated passes don't churn classes.
   */
  applyDynamicRedLine() {
    try {
      const borderClass = DynamicRedLineEnhancement.WEEK_BORDER_CLASS;

      // Cells in the column before today (none if today isn't on this timecard)
      const columnBeforeToday = this.findColumnBeforeToday();
      const columnLeftOffset = columnBeforeToday?.style.left;
      const lineCells = new Set(columnLeftOffset ? this.getCellsAtColumn(columnLeftOffset) : []);

      // Clear our line from cells that are no longer in that column
      document.querySelectorAll('[data-dynamic-red-line-active="true"]').forEach(cell => {
        if (lineCells.has(cell)) return;
        cell.classList.remove(borderClass);
        cell.removeAttribute('data-dynamic-red-line-active');
      });

      // Remove all existing Oracle week-start borders
      this.removeExistingRedLines();

      // Apply the Oracle week-start border class to all cells in the column before today
      lineCells.forEach(cell => {
        if (!cell.classList.contains(borderClass)) {
          cell.classList.add(borderClass);
        }
        if (cell.dataset.dynamicRedLineActive !== 'true') {
          cell.dataset.dynamicRedLineActive = 'true';
        }
      });

    } catch (error) {
      console.error('Dynamic Red Line error:', error);
    }
  }

  /**
   * Remove the dynamic red line and restore original state
   */
  removeDynamicRedLine() {
    const borderClass = DynamicRedLineEnhancement.WEEK_BORDER_CLASS;

    // Remove our added red lines
    const activeCells = document.querySelectorAll('[data-dynamic-red-line-active="true"]');
    activeCells.forEach(cell => {
      cell.classList.remove(borderClass);
      cell.removeAttribute('data-dynamic-red-line-active');
    });

    // Restore the original Oracle week-start borders that we removed
    const removedCells = document.querySelectorAll('[data-dynamic-red-line-removed="true"]');
    removedCells.forEach(cell => {
      cell.classList.add(borderClass);
      cell.removeAttribute('data-dynamic-red-line-removed');
    });

    // Remove custom CSS if it exists
    this.removeCustomCSS();
  }

  /**
   * Convert RGB color string to individual RGB values
   * @param {string} rgbString - RGB color string like "rgb(214,45,32)"
   * @returns {object} Object with r, g, b properties
   */
  parseRgbColor(rgbString) {
    const match = String(rgbString).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
      };
    }
    // Default to Oracle red if parsing fails
    return { r: 214, g: 45, b: 32 };
  }

  /**
   * Inject custom CSS to override the red line color
   */
  injectCustomCSS() {
    // Remove existing style element if it exists
    this.removeCustomCSS();

    const { r, g, b } = this.parseRgbColor(this.redLineColor);

    // Create a new style element
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'dynamic-red-line-style';
    this.styleElement.textContent = `
      :root {
        --oj-palette-danger-rgb-100: ${r}, ${g}, ${b};
      }
    `;

    // Append to head
    (document.head || document.documentElement).appendChild(this.styleElement);
  }

  /**
   * Remove custom CSS
   */
  removeCustomCSS() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  /**
   * Update red line color
   * @param {string} color - CSS color value in rgb format
   */
  setRedLineColor(color) {
    this.redLineColor = color;
    if (this.enabled && this.initialized) {
      this.injectCustomCSS();
    }
  }

  /**
   * Load saved color preference and apply it
   */
  async loadColorPreference() {
    const result = await readSyncStorage(['redLineColor']);
    if (result.redLineColor) {
      this.redLineColor = result.redLineColor;
    }
  }
}

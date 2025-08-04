/**
 * Dynamic Red Line Enhancement
 * Shows a single red line before the current date column instead of static weekly red lines
 */
class DynamicRedLineEnhancement extends Enhancement {
  constructor() {
    super(
      'dynamic-red-line',
      'Display a single red line before the current date column instead of static weekly lines',
      true
    );
    this.processedCells = new Set(); // Track cells we've modified
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
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[today.getDay()];
    const monthName = monthNames[today.getMonth()];
    const date = today.getDate().toString().padStart(2, '0'); // Add leading zero for single digits
    
    return `${dayName},${monthName} ${date}`;
  }

  /**
   * Find the column header that matches today's date
   * @returns {Element|null} The header cell element for today's date
   */
  findTodayColumn() {
    const todayString = this.getTodayDateString();
    const headerCells = document.querySelectorAll('.oj-datagrid-column-header-cell');
    
    for (const cell of headerCells) {
      if (cell.textContent.trim().includes(todayString)) {
        return cell;
      }
    }
    
    return null;
  }

  /**
   * Find the column immediately before today's column
   * @returns {Element|null} The header cell element for the day before today
   */
  findColumnBeforeToday() {
    const todayColumn = this.findTodayColumn();
    if (!todayColumn) return null;

    const todayLeftOffset = parseInt(todayColumn.style.left);
    if (isNaN(todayLeftOffset)) return null;

    // Find only date column headers (those that contain day names and dates)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const headerCells = Array.from(document.querySelectorAll('.oj-datagrid-column-header-cell'))
      .filter(cell => {
        // Only include cells that have a left position and contain date information
        if (!cell.style.left || isNaN(parseInt(cell.style.left))) return false;
        
        const cellText = cell.textContent.trim();
        // Check if the cell contains a day name (indicating it's a date column)
        return dayNames.some(day => cellText.includes(day));
      })
      .sort((a, b) => parseInt(a.style.left) - parseInt(b.style.left));

    // Find the column immediately before today's column
    for (let i = 0; i < headerCells.length; i++) {
      if (parseInt(headerCells[i].style.left) === todayLeftOffset && i > 0) {
        return headerCells[i - 1];
      }
    }

    return null;
  }

  /**
   * Get all cells in a specific column position (based on left offset)
   * @param {string} leftOffset - The CSS left offset value
   * @returns {NodeList} All cells at that column position
   */
  getCellsAtColumn(leftOffset) {
    return document.querySelectorAll(
      `.oj-datagrid-cell[style*="left: ${leftOffset}"], ` +
      `.oj-datagrid-column-header-cell[style*="left: ${leftOffset}"], ` +
      `.oj-datagrid-column-end-header-cell[style*="left: ${leftOffset}"]`
    );
  }

  /**
   * Remove all existing Oracle week-start border classes
   */
  removeExistingRedLines() {
    const cellsWithWeekBorder = document.querySelectorAll('.oj-fa-time-hcm-dg-weekstart-border');
    cellsWithWeekBorder.forEach(cell => {
      // Only process cells that we haven't already modified
      if (!cell.dataset.dynamicRedLineActive && !cell.dataset.dynamicRedLineRemoved) {
        cell.classList.remove('oj-fa-time-hcm-dg-weekstart-border');
        this.processedCells.add(cell);
        cell.dataset.dynamicRedLineRemoved = 'true';
      }
    });
  }

  /**
   * Apply the dynamic red line before today's column
   */
  applyDynamicRedLine() {
    try {
      // Clear any previous state first (in case of multiple updates)
      this.clearPreviousState();
      
      // Remove all existing Oracle week-start borders
      this.removeExistingRedLines();
      
      // Find the column before today
      const columnBeforeToday = this.findColumnBeforeToday();
      if (!columnBeforeToday) {
        console.log('Dynamic Red Line: Column before today not found');
        return;
      }
      
      const columnLeftOffset = columnBeforeToday.style.left;
      if (!columnLeftOffset) {
        console.log('Dynamic Red Line: Could not determine column position');
        return;
      }
      
      // Apply the Oracle week-start border class to all cells in the column before today
      const columnCells = this.getCellsAtColumn(columnLeftOffset);
      columnCells.forEach(cell => {
        cell.classList.add('oj-fa-time-hcm-dg-weekstart-border');
        this.processedCells.add(cell);
        cell.dataset.dynamicRedLineActive = 'true';
      });
      
      console.log(`Dynamic Red Line: Applied red line before ${this.getTodayDateString()}`);
      
    } catch (error) {
      console.error('Dynamic Red Line error:', error);
    }
  }

  /**
   * Clear any previous state from this enhancement
   */
  clearPreviousState() {
    // Remove any lingering active red lines from previous runs
    const previousActiveCells = document.querySelectorAll('[data-dynamic-red-line-active="true"]');
    previousActiveCells.forEach(cell => {
      cell.classList.remove('oj-fa-time-hcm-dg-weekstart-border');
      cell.removeAttribute('data-dynamic-red-line-active');
      this.processedCells.delete(cell);
    });
  }

  /**
   * Remove the dynamic red line and restore original state
   */
  removeDynamicRedLine() {
    // Remove our added red lines
    const activeCells = document.querySelectorAll('[data-dynamic-red-line-active="true"]');
    activeCells.forEach(cell => {
      cell.classList.remove('oj-fa-time-hcm-dg-weekstart-border');
      cell.removeAttribute('data-dynamic-red-line-active');
      this.processedCells.delete(cell); // Remove from tracking
    });

    // Restore the original Oracle week-start borders that we removed
    const removedCells = document.querySelectorAll('[data-dynamic-red-line-removed="true"]');
    removedCells.forEach(cell => {
      cell.classList.add('oj-fa-time-hcm-dg-weekstart-border');
      cell.removeAttribute('data-dynamic-red-line-removed');
      this.processedCells.delete(cell); // Remove from tracking
    });

    // Clear our tracking set completely
    this.processedCells.clear();
    
    // Remove custom CSS if it exists
    this.removeCustomCSS();
  }

  /**
   * Convert RGB color string to individual RGB values
   * @param {string} rgbString - RGB color string like "rgb(214,45,32)"
   * @returns {object} Object with r, g, b properties
   */
  parseRgbColor(rgbString) {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
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
    document.head.appendChild(this.styleElement);
  }

  /**
   * Remove custom CSS
   */
  removeCustomCSS() {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
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
    return new Promise((resolve) => {
      chrome.storage.sync.get(['redLineColor'], (result) => {
        if (result.redLineColor) {
          this.redLineColor = result.redLineColor;
        }
        resolve();
      });
    });
  }
}

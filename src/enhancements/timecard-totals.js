/**
 * Timecard Totals Enhancement
 * Calculates and displays total hours in the bottom-right corner
 */
class TimecardTotalsEnhancement extends Enhancement {
  constructor() {
    super(
      'timecard-totals',
      'Calculate and display total hours in the bottom-right corner',
      true
    );
  }

  async onInit() {
    // Initial calculation
    this.updateCornerTotal();
  }

  async onCleanup() {
    // Clear the corner cell
    const corner = document.getElementById("timecard-datagrid:bcorner");
    if (corner) {
      corner.textContent = '';
    }
  }

  async onUpdate() {
    this.updateCornerTotal();
  }

  // Parse "4.5 hours" or "1 hour" into 4.5 or 1.0
  parseHours(str) {
    const m = (str || "").match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
  }

  updateCornerTotal() {
    try {
      // Grab every per-row total in the last column
      const rowEnd = document.getElementById("timecard-datagrid:rowEndHeader");
      if (!rowEnd) return;

      const rowCells = Array.from(
        rowEnd.querySelectorAll(".oj-datagrid-end-header-cell")
      );
      if (!rowCells.length) return;

      // Sum
      const total = rowCells
        .map(cell => this.parseHours(cell.textContent))
        .reduce((sum, v) => sum + v, 0);

      const formatted = total.toFixed(2) + " hours";

      // Bottom-right corner cell
      const corner = document.getElementById("timecard-datagrid:bcorner");
      if (!corner) return;

      // One of the cells in the bottom row
      const sampleCell = document.querySelector(
        "#timecard-datagrid\\:columnEndHeader .oj-datagrid-end-header-cell"
      );

      // Copy the JET classes from one of the cells in the bottom row
      if (sampleCell) {
        corner.className = sampleCell.className;
      }

      // Only overwrite if it's changed
      if (corner.textContent.trim() !== formatted) {
        corner.textContent = formatted;
      }
    } catch (e) {
      console.error("Timecard totals error:", e);
      // Swallow so we don't break Oracle's scripts
    }
  }
}

(() => {
  // parse "4.5 hours" or "1 hour" into 4.5 or 1.0
  function parseHours(str) {
    const m = (str||"").match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
  }

  function updateCornerTotal() {
    try {
      // grab every per-row total in the last column
      const rowEnd = document.getElementById("timecard-datagrid:rowEndHeader");
      if (!rowEnd) return;

      const rowCells = Array.from(
        rowEnd.querySelectorAll(".oj-datagrid-end-header-cell")
      );
      if (!rowCells.length) return;

      // sum
      const total = rowCells
        .map(cell => parseHours(cell.textContent))
        .reduce((sum, v) => sum + v, 0);

      const formatted = total.toFixed(2) + " hours";

      // bottom-right corner cell
      const corner = document.getElementById("timecard-datagrid:bcorner");
      if (!corner) return;

      // one of the cells in the bottom row
      const sampleCell = document.querySelector(
        "#timecard-datagrid\\:columnEndHeader .oj-datagrid-end-header-cell"
      );

      // copy the JET classes from one of the cells in the bottom row
      corner.className = sampleCell.className;

      // only overwrite if it’s changed
      if (corner.textContent.trim() !== formatted) {
        corner.textContent = formatted;
      }
    } catch (e) {
      console.error("Timecard totals error:", e);
      // swallow so we don’t break Oracle’s scripts
    }
  }

  // run once after the grid has (probably) rendered
  window.addEventListener("load", () => setTimeout(updateCornerTotal, 500));

  // debounced MutationObserver to handle re‑renders
  let debounceId = null;
  function debounced() {
    clearTimeout(debounceId);
    debounceId = setTimeout(updateCornerTotal, 250);
  }
  new MutationObserver(debounced).observe(document.body, {
    childList: true,
    subtree: true
  });
})();
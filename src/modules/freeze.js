/**
 * Freeze Module — sticky frozen columns with left-offset calculation.
 */

const FreezeModule = {
  name: 'Freeze',

  // Compute cumulative left offsets from declared column widths.
  // table-layout: fixed ensures the browser respects these exact widths,
  // so declared width = rendered width — no DOM measurement needed.
  //
  // A column is frozen when any of these is true:
  //   col.isFrozen = true                — explicit per-column freeze
  //   col.freeze = 'Left'/'Fixed'        — Syncfusion new API (left/fixed = sticky left)
  //   col.lockColumn = true              — lock column (also frozen)
  //   grid._opts.frozenColumns = N       — first N columns are frozen (grid-level)
  _isFrozen(grid, col, colIndex) {
    if (col.isFrozen || col.lockColumn)          return true;
    if (col.freeze === 'Left' || col.freeze === 'Fixed') return true;
    const fc = parseInt(grid._opts.frozenColumns, 10);
    if (!isNaN(fc) && fc > 0 && colIndex < fc)  return true;
    return false;
  },
  _computeOffsets(grid) {
    const cols = grid._orderedCols();
    const offsets = new Array(cols.length).fill(-1);
    let cum = 0;
    let lastIdx = -1;
    cols.forEach((col, i) => {
      if (!FreezeModule._isFrozen(grid, col, i)) return;
      offsets[i] = cum;
      cum += grid._colWidths[i] !== undefined ? grid._colWidths[i] : grid.helpers.parseWidth(col.width);
      lastIdx = i;
    });
    return { offsets, lastIdx };
  },

  headerCell(grid, th, col, colIndex) {
    if (!FreezeModule._isFrozen(grid, col, colIndex)) return;

    const { offsets, lastIdx } = FreezeModule._computeOffsets(grid);
    th.classList.add('ug-frozen');
    th.style.left = offsets[colIndex] + 'px';
    if (colIndex === lastIdx) th.classList.add('ug-frozen-last');
  },

  bodyCell(grid, td, col, data, colIndex) {
    if (!FreezeModule._isFrozen(grid, col, colIndex)) return;

    const { offsets, lastIdx } = FreezeModule._computeOffsets(grid);
    td.classList.add('ug-frozen');
    td.style.left = offsets[colIndex] + 'px';
    if (colIndex === lastIdx) td.classList.add('ug-frozen-last');
  },
};

export default FreezeModule;
export { FreezeModule };

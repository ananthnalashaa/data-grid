/**
 * Reorder Module — drag-and-drop column reordering.
 */

const ReorderModule = {
  name: 'Reorder',

  init(grid) {
    grid._dragColIdx = null;
  },

  headerCell(grid, th, col, colIndex) {
    if (!grid._opts.allowReordering) return;
    // Only explicit allowReordering:false blocks dragging (same as Syncfusion).
    // Checkbox columns are allowed to be reordered.
    if (col.allowReordering === false) return;

    const { el } = grid.helpers;

    // Entire header is draggable — no grip indicator needed
    th.setAttribute('draggable', 'true');
    th.addEventListener('dragstart', () => { grid._dragColIdx = colIndex; });
    th.addEventListener('dragover', e => { e.preventDefault(); th.style.outline = '1px solid #007bff'; th.style.outlineOffset = '-1px'; });
    th.addEventListener('dragleave', () => { th.style.outline = ''; th.style.outlineOffset = ''; });
    th.addEventListener('drop', e => {
      e.preventDefault();
      th.style.outline = '';
      th.style.outlineOffset = '';
      ReorderModule._drop(grid, colIndex);
    });
  },

  _drop(grid, targetIdx) {
    if (grid._dragColIdx === null || grid._dragColIdx === targetIdx) return;

    const base = grid._colOrder || grid._columns.map((_, i) => i);
    const order = base.slice();
    const moved = order.splice(grid._dragColIdx, 1)[0];
    order.splice(targetIdx, 0, moved);
    grid._colOrder = order;
    grid._dragColIdx = null;
    grid.render();
  },
};

export default ReorderModule;
export { ReorderModule };

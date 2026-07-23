/**
 * Resize Module — drag column borders to resize.
 */

const ResizeModule = {
  name: 'Resize',

  init(grid) {
    grid._resizeState = null;
    grid._resizeMove = ResizeModule._onMove.bind(null, grid);
    grid._resizeUp   = ResizeModule._onUp.bind(null, grid);
    document.addEventListener('mousemove', grid._resizeMove);
    document.addEventListener('mouseup', grid._resizeUp);
  },

  destroy(grid) {
    document.removeEventListener('mousemove', grid._resizeMove);
    document.removeEventListener('mouseup', grid._resizeUp);
  },

  headerCell(grid, th, col, colIndex) {
    if (!grid._opts.allowResizing || col.type === 'checkbox') return;

    const handle = grid.helpers.el('div', { className: 'ug-resize-handle' });
    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      grid._resizeState = {
        idx: colIndex,
        startX: e.clientX,
        startW: grid._colWidths[colIndex] !== undefined
          ? grid._colWidths[colIndex]
          : grid.helpers.parseWidth(col.width),
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    th.appendChild(handle);
  },

  _onMove(grid, e) {
    if (!grid._resizeState) return;
    const { idx, startX, startW } = grid._resizeState;
    const col  = grid._orderedCols()[idx];
    const minW = col && col.minWidth ? grid.helpers.parseWidth(col.minWidth) : 40;
    const maxW = col && col.maxWidth ? grid.helpers.parseWidth(col.maxWidth) : Infinity;
    const newW = Math.max(minW, Math.min(maxW, startW + (e.clientX - startX)));
    grid._colWidths[idx] = newW;
    const colEls = grid._table.querySelectorAll('colgroup col');
    if (colEls[idx]) colEls[idx].style.width = newW + 'px';
  },

  _onUp(grid) {
    if (!grid._resizeState) return;
    grid._resizeState = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  },
};

export default ResizeModule;
export { ResizeModule };

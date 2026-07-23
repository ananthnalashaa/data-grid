/**
 * Detail Row Module — expandable master-detail rows.
 */

const DetailRowModule = {
  name: 'DetailRow',

  init(grid) {
    grid._expandedKeys = new Set();
  },

  bodyCell(grid, td, col, data, colIndex) {
    if (!grid._opts.detailTemplate) return;
    // Only augment the first non-checkbox column
    const cols = grid._orderedCols();
    const firstDataIdx = cols.findIndex(c => c.type !== 'checkbox');
    if (colIndex !== firstDataIdx) return;

    const { el } = grid.helpers;
    const key = grid.getRowKey(data, 0);
    const isExpanded = grid._expandedKeys.has(key);

    // Wrap existing content with expand button
    const wrap = el('div', { className: 'ug-cell-expand' });
    const btn = el('button', {
      className: 'ug-expand-btn' + (isExpanded ? ' open' : ''),
      title: isExpanded ? 'Collapse' : 'Expand',
    }, [isExpanded ? '\u2212' : '+']);

    btn.addEventListener('click', e => {
      e.stopPropagation();
      DetailRowModule._toggle(grid, key);
    });

    wrap.appendChild(btn);
    // Move existing TD children into wrap
    while (td.firstChild) wrap.appendChild(td.firstChild);
    td.appendChild(wrap);
  },

  afterBodyRow(grid, tr, data, rowIndex, tbody) {
    if (!grid._opts.detailTemplate) return;

    const key = grid.getRowKey(data, rowIndex);
    if (!grid._expandedKeys.has(key)) return;

    const { el } = grid.helpers;
    const totalCols = grid._orderedCols().length;

    const detailTr = el('tr', { className: 'ug-row-detail' });
    const detailTd = el('td', { colSpan: String(totalCols) });
    const inner = el('div', { className: 'ug-detail-inner' });

    const tpl = grid._opts.detailTemplate(data);
    if (typeof tpl === 'string') inner.innerHTML = tpl;
    else if (tpl instanceof HTMLElement) inner.appendChild(tpl);

    detailTd.appendChild(inner);
    detailTr.appendChild(detailTd);
    tbody.appendChild(detailTr);
  },

  _toggle(grid, key) {
    if (grid._expandedKeys.has(key)) grid._expandedKeys.delete(key);
    else grid._expandedKeys.add(key);
    grid.render();
  },
};

export default DetailRowModule;
export { DetailRowModule };

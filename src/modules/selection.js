/**
 * Selection Module — row selection (single/multi/checkbox/programmatic).
 */

const SelectionModule = {
  name: 'Selection',

  init(grid) {
    grid._selectedKeys = new Set();
    grid._headerCheckbox = null;
  },

  headerCell(grid, th, col) {
    if (col.type !== 'checkbox') return;

    const { el } = grid.helpers;
    const checkWrap = th.querySelector('.ug-cell-check');
    if (!checkWrap) return;

    const cb = el('input', { type: 'checkbox', 'aria-label': 'Select all rows' });
    cb.addEventListener('change', () => SelectionModule._onSelectAll(grid, cb.checked));
    checkWrap.appendChild(cb);
    grid._headerCheckbox = cb;
  },

  bodyRow(grid, tr, data, rowIndex) {
    if (!grid._opts.allowSelection) return;

    const key = grid.getRowKey(data, rowIndex);
    tr._ugKey = key;

    if (grid._selectedKeys.has(key)) tr.classList.add('ug-row-selected');

    const ss = grid._opts.selectionSettings || {};
    if (!ss.checkboxOnly) {
      tr.addEventListener('click', e => {
        if (e.target.closest('.ug-expand-btn, .ug-cell-check input')) return;
        SelectionModule._onRowClick(grid, data, rowIndex, e);
      });
    }
  },

  bodyCell(grid, td, col, data, colIndex, rowIndex) {
    if (col.type !== 'checkbox') return;

    const { el } = grid.helpers;
    const key = grid.getRowKey(data, rowIndex);
    const checkWrap = td.querySelector('.ug-cell-check');
    if (!checkWrap) return;

    const cb = el('input', { type: 'checkbox', 'aria-label': 'Select row' });
    cb.checked = grid._selectedKeys.has(key);
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('change', () => {
      SelectionModule._onCheckboxChange(grid, data, rowIndex, cb.checked);
    });
    checkWrap.appendChild(cb);
  },

  afterRender(grid) {
    SelectionModule._syncHeaderCheckbox(grid);
  },

  _onRowClick(grid, data, rowIndex, e) {
    const ss = grid._opts.selectionSettings || {};
    const key = grid.getRowKey(data, rowIndex);
    const isMulti = ss.type === 'Multiple' && (e.ctrlKey || e.metaKey);

    // Emit rowSelecting with cancel option
    const selectingArgs = { data, rowIndex, cancel: false };
    grid.emit('rowSelecting', selectingArgs);
    if (selectingArgs.cancel) return;

    if (!isMulti) {
      if (grid._selectedKeys.has(key) && grid._selectedKeys.size === 1) {
        grid._selectedKeys.clear();
        grid.emit('rowDeselected', { data, rowIndex });
      } else {
        grid._selectedKeys.clear();
        grid._selectedKeys.add(key);
        grid.emit('rowSelected', { data, rowIndex });
      }
    } else {
      if (grid._selectedKeys.has(key)) {
        grid._selectedKeys.delete(key);
        grid.emit('rowDeselected', { data, rowIndex });
      } else {
        grid._selectedKeys.add(key);
        grid.emit('rowSelected', { data, rowIndex });
      }
    }

    SelectionModule._syncUI(grid);
  },

  _onCheckboxChange(grid, data, rowIndex, checked) {
    const ss = grid._opts.selectionSettings || {};
    const key = grid.getRowKey(data, rowIndex);

    if (ss.type !== 'Multiple') grid._selectedKeys.clear();
    if (checked) {
      grid._selectedKeys.add(key);
      grid.emit('rowSelected', { data, rowIndex });
    } else {
      grid._selectedKeys.delete(key);
      grid.emit('rowDeselected', { data, rowIndex });
    }
    SelectionModule._syncUI(grid);
  },

  _onSelectAll(grid, checked) {
    const records = grid._currentViewData || [];
    records.forEach((data, i) => {
      const key = grid.getRowKey(data, i);
      if (checked) grid._selectedKeys.add(key);
      else grid._selectedKeys.delete(key);
    });
    SelectionModule._syncUI(grid);
  },

  _syncUI(grid) {
    if (!grid._tbody) return;
    grid._tbody.querySelectorAll('tr').forEach(tr => {
      if (tr._ugKey === undefined) return;
      const sel = grid._selectedKeys.has(tr._ugKey);
      tr.classList.toggle('ug-row-selected', sel);
      const cb = tr.querySelector('.ug-cell-check input[type="checkbox"]');
      if (cb) cb.checked = sel;
    });
    SelectionModule._syncHeaderCheckbox(grid);
  },

  _syncHeaderCheckbox(grid) {
    if (!grid._headerCheckbox) return;
    const records = grid._currentViewData || [];
    let selected = 0;
    records.forEach((data, i) => {
      if (grid._selectedKeys.has(grid.getRowKey(data, i))) selected++;
    });
    grid._headerCheckbox.checked = records.length > 0 && selected === records.length;
    grid._headerCheckbox.indeterminate = false;
  },

  methods: {
    selectRow(grid, index) {
      const records = grid._currentViewData || [];
      const item = records[index];
      if (!item) return;
      grid._selectedKeys.clear();
      grid._selectedKeys.add(grid.getRowKey(item, index));
      SelectionModule._syncUI(grid);
      grid.emit('rowSelected', { data: item, rowIndex: index });
    },

    selectRows(grid, indexes) {
      const records = grid._currentViewData || [];
      grid._selectedKeys.clear();
      indexes.forEach(i => {
        const item = records[i];
        if (item) grid._selectedKeys.add(grid.getRowKey(item, i));
      });
      SelectionModule._syncUI(grid);
    },

    clearSelection(grid) {
      grid._selectedKeys.clear();
      SelectionModule._syncUI(grid);
    },

    getCurrentViewRecords(grid) {
      return grid._currentViewData || [];
    },

    /** Returns the currently selected row data objects */
    getSelectedRecords(grid) {
      const keys = grid._selectedKeys;
      const data = grid._currentViewData || [];
      return data.filter((d, i) => keys.has(grid.getRowKey(d, i)));
    },

    /** Async alias for Blazor/Syncfusion parity */
    async GetSelectedRecordsAsync(grid) {
      return SelectionModule.methods.getSelectedRecords(grid);
    },
  },
};

export default SelectionModule;
export { SelectionModule };

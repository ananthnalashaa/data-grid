/**
 * Sort Module — single and multi-column sorting.
 *
 * Single sort:  click a header                   → cycle asc → desc → none
 * Multi sort:   Ctrl/Cmd+click                   → add/toggle column in sort stack
 * Remove one:   Shift+click on already-sorted col → remove that column from stack
 *
 * Options:
 *   allowSorting      {boolean} — enable sorting (grid-level)
 *   allowMultiSorting {boolean} — enable Ctrl+click multi-column sort
 *   sortSettings      { columns: [{ field, direction }] } — initial sort state
 */

const SortModule = {
  name: 'Sort',

  init(grid) {
    // _sortColumns: [{ field: string, direction: 'Ascending'|'Descending' }]
    grid._sortColumns = [];

    // Apply initial sort from sortSettings
    const ss = grid._opts.sortSettings;
    if (ss && Array.isArray(ss.columns) && ss.columns.length > 0) {
      grid._sortColumns = ss.columns.map(c => ({ field: c.field, direction: c.direction || 'Ascending' }));
    }

    // Keep single-sort aliases in sync for backward-compatibility
    SortModule._syncAliases(grid);
  },

  headerCell(grid, th, col) {
    if (!grid._opts.allowSorting) return;
    if (col.allowSorting === false || col.type === 'checkbox' || !col.field) return;

    const { el } = grid.helpers;

    // Sort arrows
    th.querySelector('.ug-th-inner').appendChild(
      el('span', { className: 'ug-sort-arrows', 'aria-hidden': 'true' }, [
        el('span', { className: 'ug-arr-up' }),
        el('span', { className: 'ug-arr-dn' }),
      ])
    );

    // Active sort state
    const idx = grid._sortColumns.findIndex(s => s.field === col.field);
    if (idx !== -1) {
      th.classList.add(grid._sortColumns[idx].direction === 'Ascending' ? 'ug-sort-asc' : 'ug-sort-desc');
      // Priority badge (shown when more than one column is sorted)
      if (grid._sortColumns.length > 1) {
        const badge = el('span', { className: 'ug-sort-badge', 'aria-hidden': 'true' }, [String(idx + 1)]);
        th.querySelector('.ug-th-inner').appendChild(badge);
      }
    }

    // Click handler
    th.style.cursor = 'pointer';
    th.addEventListener('click', e => {
      if (e.target.closest('.ug-resize-handle')) return;
      const isMulti  = !!(e.ctrlKey || e.metaKey);  // Ctrl/Cmd → add to stack
      const isRemove = !!e.shiftKey;                 // Shift   → remove from stack
      SortModule._toggle(grid, col.field, isMulti, isRemove);
    });
  },

  transformData(grid, data) {
    if (grid._serverSide) return data;
    if (!grid._sortColumns.length) return data;

    return data.slice().sort((a, b) => {
      for (const { field, direction } of grid._sortColumns) {
        const av = a[field] != null ? a[field] : '';
        const bv = b[field] != null ? b[field] : '';
        const cmp = (typeof av === 'number' && typeof bv === 'number')
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
        if (cmp !== 0) return direction === 'Ascending' ? cmp : -cmp;
      }
      return 0;
    });
  },

  // ── Imperative helpers ──────────────────────────────────────────────────

  /** Add/toggle a column in the sort stack. Called by header clicks and sortColumn() */
  _toggle(grid, field, isMulti, isRemove) {
    const multiEnabled = grid._opts.allowMultiSorting !== false;
    const existingIdx  = grid._sortColumns.findIndex(s => s.field === field);

    if (isRemove && existingIdx !== -1) {
      // Shift+click — remove this column from the stack
      grid._sortColumns.splice(existingIdx, 1);
    } else if (isMulti && multiEnabled) {
      if (existingIdx === -1) {
        grid._sortColumns.push({ field, direction: 'Ascending' });
      } else {
        const cur = grid._sortColumns[existingIdx];
        if (cur.direction === 'Ascending') {
          cur.direction = 'Descending';
        } else {
          grid._sortColumns.splice(existingIdx, 1); // third click removes
        }
      }
    } else {
      // Single-column: replace entire sort stack
      if (existingIdx === -1 || grid._sortColumns.length > 1) {
        grid._sortColumns = [{ field, direction: 'Ascending' }];
      } else if (grid._sortColumns[0].direction === 'Ascending') {
        grid._sortColumns[0].direction = 'Descending';
      } else {
        grid._sortColumns = []; // third click clears
      }
    }

    SortModule._syncAliases(grid);

    const dir = grid._sortColumns.find(s => s.field === field)?.direction || '';
    grid.emit('actionBegin', { requestType: 'sorting', columnName: field, direction: dir });
    grid._emitDataState('sorting');
    // onSortChange(col, dir) — direct callback alias used by some consumers
    if (grid._opts.onSortChange) {
      grid._opts.onSortChange(field, grid._sortDir || null);
    }
    if (grid._remoteSrc) {
      grid._currentPage = 1;
      grid._fetchRemote().then(() => {
        grid.emit('actionComplete', { requestType: 'sorting', columnName: field, direction: dir });
      });
    } else {
      grid.render();
      grid.emit('actionComplete', { requestType: 'sorting', columnName: field, direction: dir });
    }
  },

  /** Keep legacy _sortField/_sortDir aliases in sync (used by _emitDataState) */
  _syncAliases(grid) {
    const first = grid._sortColumns[0];
    grid._sortField = first ? first.field     : null;
    grid._sortDir   = first ? first.direction : null;
  },

  methods: {
    /**
     * Sort a column programmatically.
     * @param {string}  field
     * @param {string}  direction    'Ascending' | 'Descending'
     * @param {boolean} isMultiSort  true = add to stack, false = replace stack
     */
    sortColumn(grid, field, direction, isMultiSort) {
      const dir = direction || 'Ascending';
      if (isMultiSort && grid._opts.allowMultiSorting !== false) {
        const idx = grid._sortColumns.findIndex(s => s.field === field);
        if (idx === -1) grid._sortColumns.push({ field, direction: dir });
        else grid._sortColumns[idx].direction = dir;
      } else {
        grid._sortColumns = [{ field, direction: dir }];
      }
      SortModule._syncAliases(grid);
      grid.render();
      grid.emit('actionComplete', { requestType: 'sorting', columnName: field, direction: dir });
    },

    /** Remove sort for one column */
    removeSortColumn(grid, field) {
      grid._sortColumns = grid._sortColumns.filter(s => s.field !== field);
      SortModule._syncAliases(grid);
      grid.render();
    },

    /** Clear all sorting */
    clearSorting(grid) {
      grid._sortColumns = [];
      SortModule._syncAliases(grid);
      grid.render();
    },

    /** Get current sort state (mirrors sortSettings shape) */
    getSortedColumns(grid) {
      return grid._sortColumns.slice();
    },
  },
};

export default SortModule;
export { SortModule };


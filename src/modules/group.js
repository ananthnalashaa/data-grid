/**
 * Group Module — multi-level grouping with collapse/expand.
 *
 * Options (via grid._opts):
 *   allowGrouping   {boolean}   — enable grouping
 *   groupSettings   {object}    — grouping configuration
 *     .columns          {string[]}  — initial group fields
 *     .showDropArea     {boolean}   — show/hide drag-drop panel (default: true)
 *     .showGroupedColumn {boolean}  — keep grouped cols visible (default: false)
 *
 * Column-level:
 *   allowGrouping   {boolean}   — false = column cannot be grouped
 */

const GroupModule = {
  name: 'Group',

  init(grid) {
    grid._groupFields       = [];
    grid._collapsedGroups   = new Set();
    grid._allGroupKeys      = []; // populated by buildRenderItems; used by collapseAll
    grid._groupSortDirs     = new Map();

    // Apply initial groups from groupSettings
    const gs = grid._opts.groupSettings || {};
    if (Array.isArray(gs.columns) && gs.columns.length > 0) {
      grid._groupFields = gs.columns.slice();
    }
  },

  afterMount(grid) {
    if (!grid._opts.allowGrouping) return;
    const gs = grid._opts.groupSettings || {};
    if (gs.showDropArea === false) return; // panel hidden

    const { el } = grid.helpers;
    grid._groupPanel = el('div', { className: 'ug-group-panel' });

    grid._groupPanel.addEventListener('dragover', e => {
      e.preventDefault();
      grid._groupPanel.classList.add('ug-drag-over');
    });
    grid._groupPanel.addEventListener('dragleave', () => {
      grid._groupPanel.classList.remove('ug-drag-over');
    });
    grid._groupPanel.addEventListener('drop', e => {
      e.preventDefault();
      grid._groupPanel.classList.remove('ug-drag-over');
      if (grid._dragColIdx == null) return;

      // _dragColIdx is set from _visibleCols() index (see _renderHeader).
      // Using _visibleCols() here ensures the indices always match,
      // even when some columns are hidden by grouping.
      const visCols = grid._visibleCols ? grid._visibleCols() : grid._orderedCols();
      const col = visCols[grid._dragColIdx];
      if (col && col.field && col.allowGrouping !== false) {
        GroupModule._addField(grid, col.field);
      }
      grid._dragColIdx = null;
    });

    grid._root.insertBefore(grid._groupPanel, grid._root.firstChild);
  },

  // Make column headers draggable for the group panel — independent of allowReordering
  headerCell(grid, th, col) {
    if (!grid._opts.allowGrouping) return;
    if (col.type === 'checkbox' || col.allowGrouping === false || !col.field) return;

    // Only add drag if not already made draggable by the reorder module
    if (th.getAttribute('draggable') !== 'true') {
      th.setAttribute('draggable', 'true');
      th.addEventListener('dragstart', () => {
        // Use _visibleCols() indexOf so the index matches _renderHeader's colIndex
        const visCols = grid._visibleCols ? grid._visibleCols() : grid._orderedCols();
        grid._dragColIdx = visCols.indexOf(col);
      });
      th.addEventListener('dragend', () => {});
    }
  },

  beforeRender(grid) {
    // Clear group toggles from previous render.
    grid._groupToggles = [];

    // ── Manage showGroupedColumn ─────────────────────────────────────────
    const gs = grid._opts.groupSettings || {};
    const showGroupedCol = gs.showGroupedColumn === true;

    // Reset all group-hide flags first
    grid._columns.forEach(col => { col._hiddenByGroup = false; });

    // Hide grouped columns from the table unless showGroupedColumn is true
    if (!showGroupedCol && grid._opts.allowGrouping) {
      grid._columns.forEach(col => {
        if (col.field && grid._groupFields.includes(col.field)) {
          col._hiddenByGroup = true;
        }
      });
    }

    // ── Render group panel ───────────────────────────────────────────────
    if (grid._opts.allowGrouping && grid._groupPanel) {
      GroupModule._renderPanel(grid);
    }
  },

  // ── Data pipeline ──────────────────────────────────────────────────────

  buildRenderItems(grid, items) {
    if (grid._groupFields.length === 0) return items;
    grid._allGroupKeys = []; // reset before rebuilding
    return GroupModule._groupLevel(grid, items, 0);
  },

  /** Recursive multi-level grouping */
  _groupLevel(grid, items, depth) {
    if (depth >= grid._groupFields.length) return items;

    const field = grid._groupFields[depth];
    const buckets = new Map();

    items.forEach(item => {
      if (item.type !== 'row') return;
      const k = String(item.data[field] != null ? item.data[field] : '');
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(item);
    });

    const dir = grid._groupSortDirs.get(field) || 'asc';
    const sortedKeys = Array.from(buckets.keys()).sort((a, b) =>
      dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );

    const result = [];
    sortedKeys.forEach(key => {
      const rowItems = buckets.get(key);
      const groupKey = depth + ':' + key;
      grid._allGroupKeys.push(groupKey);

      result.push({
        type: 'group',
        field,
        value: rowItems[0].data[field],
        key: groupKey,
        count: rowItems.length,
        depth,
        _render: GroupModule._renderGroupRow.bind(
          null, grid, field, key, rowItems, depth, groupKey
        ),
      });

      const sub = GroupModule._groupLevel(grid, rowItems, depth + 1);
      if (!grid._collapsedGroups.has(groupKey)) {
        result.push(...sub);
      }
    });

    return result;
  },

  // ── DOM rendering ──────────────────────────────────────────────────────

  _renderGroupRow(grid, field, key, rowItems, depth, groupKey, tbody) {
    const { el } = grid.helpers;
    const isOpen   = !grid._collapsedGroups.has(groupKey);
    const cols     = grid._visibleCols ? grid._visibleCols() : grid._orderedCols();
    const hasCheck = cols.some(c => c.type === 'checkbox');
    const totalCols = cols.length;

    const tr = el('tr', { className: 'ug-row-group' });

    if (false && hasCheck) {
      const checkTd = el('td', { className: 'ug-frozen', style: { left: '0px' } });
      checkTd.appendChild(el('div', { className: 'ug-cell-check' },
        [el('input', { type: 'checkbox' })]));
      tr.appendChild(checkTd);
    }

    const span = totalCols;
    const td = el('td', { colSpan: String(span) });

    // If frozen columns exist, wrap group content in a sticky div so it stays visible on h-scroll.
    const hasFrozen = !!(grid._frozenFieldSet && grid._frozenFieldSet.size > 0) ||
      cols.some((c) => c.isFrozen || c.lockColumn || c.freeze === 'Left' || c.freeze === 'Fixed');

    // Indent nested levels
    const paddingLeft = (depth * 24 + 12) + 'px';

    const arrow  = el('span', { className: 'ug-group-arrow' + (isOpen ? ' open' : '') });
    const hdrCol = cols.find(c => c.field === field);
    const label  = (hdrCol && hdrCol.headerText) || field;
    const val    = rowItems[0].data[field] != null ? rowItems[0].data[field] : key;

    const toggle = el('span', { className: 'ug-group-toggle' }, [
      arrow,
      document.createTextNode(label + ': ' + String(val) + ' - ' + rowItems.length + (rowItems.length === 1 ? ' item' : ' items')),
    ]);

    toggle.addEventListener('click', () => {
      grid._collapsedGroups.has(groupKey)
        ? grid._collapsedGroups.delete(groupKey)
        : grid._collapsedGroups.add(groupKey);
      grid.render();
    });

    // If frozen columns exist, track this toggle for scroll-based positioning.
    const hasFrozen = !!(grid._frozenFieldSet && grid._frozenFieldSet.size > 0) ||
      cols.some((c) => c.isFrozen || c.lockColumn || c.freeze === 'Left' || c.freeze === 'Fixed');
    if (hasFrozen) {
      if (!grid._groupToggles) grid._groupToggles = [];
      grid._groupToggles.push(toggle);
    }

    td.style.setProperty('padding-left', paddingLeft, 'important');
    td.appendChild(toggle);
    tr.appendChild(td);
    tbody.appendChild(tr);
  },

  _renderPanel(grid) {
    const { el } = grid.helpers;
    grid._groupPanel.innerHTML = '';

    if (grid._groupFields.length === 0) {
      grid._groupPanel.appendChild(
        el('span', {}, ['Drag a column header here to group its column'])
      );
    } else {
      grid._groupFields.forEach(f => {
        const col  = grid._orderedCols().find(c => c.field === f);
        const dir  = grid._groupSortDirs.get(f) || 'asc';
        const chip = el('span', { className: 'ug-group-chip' }, [(col && col.headerText) || f]);
        const sortBtn = el('span', {
          className: 'ug-group-chip-sort ' + (dir === 'asc' ? 'ug-group-chip-sort-asc' : 'ug-group-chip-sort-desc'),
          title: dir === 'asc' ? 'Sorted Ascending' : 'Sorted Descending',
        });
        sortBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          grid._groupSortDirs.set(f, dir === 'asc' ? 'desc' : 'asc');
          grid.render();
        });
        const x = el('span', { className: 'ug-group-chip-x', title: 'Remove group' }, ['\u00d7']);
        x.addEventListener('click', () => GroupModule._removeField(grid, f));
        chip.appendChild(sortBtn);
        chip.appendChild(x);
        grid._groupPanel.appendChild(chip);
      });
    }
  },

  // ── Internal field management ──────────────────────────────────────────

  _addField(grid, field) {
    if (grid._groupFields.includes(field)) return;
    grid._groupFields.push(field);
    grid._collapsedGroups.clear();
    grid.emit('actionBegin', { requestType: 'grouping', columnName: field });
    grid._emitDataState('grouping');
    grid.render();
    // Auto-collapse all groups after initial render populates _allGroupKeys
    grid._allGroupKeys.forEach(k => grid._collapsedGroups.add(k));
    grid.render();
    grid.emit('actionComplete', { requestType: 'grouping', columnName: field });
  },

  _removeField(grid, field) {
    grid._groupFields = grid._groupFields.filter(f => f !== field);
    grid.emit('actionBegin', { requestType: 'ungrouping', columnName: field });
    grid._emitDataState('ungrouping');
    grid.render();
    grid.emit('actionComplete', { requestType: 'ungrouping', columnName: field });
  },

  // ── Public imperative methods (mixed into grid instance) ───────────────

  methods: {
    /** Collapse all group rows at all levels */
    groupCollapseAll(grid) {
      grid._allGroupKeys.forEach(k => grid._collapsedGroups.add(k));
      grid.render();
    },

    /** Expand all group rows at all levels */
    groupExpandAll(grid) {
      grid._collapsedGroups.clear();
      grid.render();
    },

    /** Group by field programmatically */
    groupColumn(grid, field) {
      GroupModule._addField(grid, field);
    },

    /** Ungroup a field programmatically */
    ungroupColumn(grid, field) {
      GroupModule._removeField(grid, field);
    },

    /** Remove all grouping */
    clearGrouping(grid) {
      grid._groupFields = [];
      grid._collapsedGroups.clear();
      grid.emit('actionBegin', { requestType: 'ungrouping', columnName: null });
      grid.render();
      grid.emit('actionComplete', { requestType: 'ungrouping', columnName: null });
    },

    // Legacy aliases kept for backwards compatibility
    addGroupField(grid, field)    { GroupModule._addField(grid, field); },
    removeGroupField(grid, field) { GroupModule._removeField(grid, field); },
  },
};

export default GroupModule;
export { GroupModule };
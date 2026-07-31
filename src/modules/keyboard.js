/**
 * Keyboard Module — grid keyboard navigation.
 *
 * Keys (body rows):
 *   Arrow Up/Down     — move active row; Up from row 0 enters header focus
 *   Arrow Left/Right  — move active cell within row
 *   Home / End        — jump to first / last cell in row
 *   Enter             — left-click the active row (selection, same as Syncfusion)
 *   Space             — toggle checkbox on active row
 *   Ctrl+A            — select all visible rows
 *   Escape            — close context menu / clear active
 *   Page Up/Down      — navigate pages (if allowPaging) or jump to first/last row
 *
 * Keys (column headers — when enableHeaderFocus:true or after ArrowUp from row 0):
 *   Arrow Left/Right  — move between column headers
 *   Enter / Space     — trigger sort on the focused header
 *   Arrow Down        — return to body, row 0
 *   Escape            — return to body
 *
 * Options (via grid._opts):
 *   enableHeaderFocus {boolean} — make header cells Tab-focusable + sort on Enter
 */

const KeyboardModule = {
  name: 'Keyboard',

  init(grid) {
    grid._activeRowIdx   = -1;
    grid._activeColIdx   = 0;
    grid._inHeaderMode   = false; // true when focus is on a column header
    grid._activeHdrIdx   = 0;    // which header is focused
  },

  afterMount(grid) {
    const vp = grid._viewport;
    vp.setAttribute('tabindex', '0');
    vp.setAttribute('role', 'grid');
    vp.setAttribute('aria-label', 'Data grid — use arrow keys to navigate');

    grid._kbHandler = e => KeyboardModule._onKey(grid, e);
    vp.addEventListener('keydown', grid._kbHandler);

    // Focus viewport on click so keyboard nav works immediately after mouse use
    vp.addEventListener('mousedown', () => {
      if (document.activeElement !== vp) vp.focus({ preventScroll: true });
    });

    // Clear active highlight when clicking outside the grid
    grid._docClickHandler = (e) => {
      if (grid._container && !grid._container.contains(e.target)) {
        grid._activeRowIdx = -1;
        grid._activeColIdx = 0;
        KeyboardModule._applyActiveHighlight(grid);
      }
    };
    document.addEventListener('mousedown', grid._docClickHandler);
  },

  destroy(grid) {
    if (grid._kbHandler) {
      grid._viewport?.removeEventListener('keydown', grid._kbHandler);
    }
    if (grid._docClickHandler) {
      document.removeEventListener('mousedown', grid._docClickHandler);
    }
  },

  afterRender(grid) {
    KeyboardModule._applyActiveHighlight(grid);

    // ARIA roles on table structure
    if (grid._table) {
      grid._table.setAttribute('role', 'grid');
      grid._thead?.querySelector('tr')?.setAttribute('role', 'row');
      grid._thead?.querySelectorAll('th').forEach((th, i) => {
        th.setAttribute('role', 'columnheader');
        th.setAttribute('aria-colindex', String(i + 1));
        if (grid._opts.enableHeaderFocus) th.setAttribute('tabindex', '0');
      });
    }

    // ARIA on body rows
    let rowNum = 1;
    grid._tbody?.querySelectorAll('tr').forEach(tr => {
      if (tr.classList.contains('ug-row-group') ||
          tr.classList.contains('ug-row-detail') ||
          tr.classList.contains('ug-row-empty')) return;
      tr.setAttribute('role', 'row');
      tr.setAttribute('aria-rowindex', String(rowNum++));
      tr.querySelectorAll('td').forEach((td, ci) => {
        td.setAttribute('role', 'gridcell');
        td.setAttribute('aria-colindex', String(ci + 1));
      });
    });
  },

  // ── Set active row AND active cell when user clicks a row ────────────────
  bodyRow(grid, tr) {
    tr.addEventListener('click', (e) => {
      const rows = KeyboardModule._dataRows(grid);
      const idx  = Array.from(rows).indexOf(tr);
      if (idx === -1) return;

      grid._activeRowIdx = idx;

      // Identify which cell was clicked so the outline lands on the right column
      const clickedTd = e.target.closest('td');
      if (clickedTd) {
        const cells  = Array.from(tr.querySelectorAll('td'));
        const colIdx = cells.indexOf(clickedTd);
        if (colIdx !== -1) grid._activeColIdx = colIdx;
      }

      KeyboardModule._applyActiveHighlight(grid);
    });
  },

  // ── Key handler ────────────────────────────────────────────────────────
  _onKey(grid, e) {
    // ── Header mode ───────────────────────────────────────────────────
    if (grid._inHeaderMode) {
      KeyboardModule._onHeaderKey(grid, e);
      return;
    }

    const rows     = KeyboardModule._dataRows(grid);
    const rowCount = rows.length;
    const cols     = grid._visibleCols ? grid._visibleCols() : grid._orderedCols();
    const colCount = cols.length;

    if (rowCount > 0 && grid._activeRowIdx < 0) grid._activeRowIdx = 0;

    switch (e.key) {

      // ── Vertical navigation ──────────────────────────────────────────
      case 'ArrowDown':
        e.preventDefault();
        if (rowCount > 0)
          grid._activeRowIdx = Math.min(grid._activeRowIdx + 1, rowCount - 1);
        KeyboardModule._applyActiveHighlight(grid);
        KeyboardModule._scrollToActive(grid, rows);
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (grid._activeRowIdx <= 0) {
          // At or before first row — enter header focus mode
          KeyboardModule._enterHeaderMode(grid);
        } else {
          grid._activeRowIdx--;
          KeyboardModule._applyActiveHighlight(grid);
          KeyboardModule._scrollToActive(grid, rows);
        }
        break;

      // ── Horizontal navigation ────────────────────────────────────────
      case 'ArrowRight':
        e.preventDefault();
        grid._activeColIdx = Math.min((grid._activeColIdx || 0) + 1, colCount - 1);
        KeyboardModule._applyActiveHighlight(grid);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        grid._activeColIdx = Math.max((grid._activeColIdx || 0) - 1, 0);
        KeyboardModule._applyActiveHighlight(grid);
        break;

      case 'Home':
        e.preventDefault();
        grid._activeColIdx = 0;
        if (e.ctrlKey) { grid._activeRowIdx = 0; KeyboardModule._scrollToActive(grid, rows); }
        KeyboardModule._applyActiveHighlight(grid);
        break;

      case 'End':
        e.preventDefault();
        grid._activeColIdx = colCount - 1;
        if (e.ctrlKey) { grid._activeRowIdx = rowCount - 1; KeyboardModule._scrollToActive(grid, rows); }
        KeyboardModule._applyActiveHighlight(grid);
        break;

      // ── Page navigation ──────────────────────────────────────────────
      case 'PageDown':
        e.preventDefault();
        if (grid._opts.allowPaging && typeof grid.goToPage === 'function') {
          grid.goToPage((grid._currentPage || 1) + 1);
        } else {
          grid._activeRowIdx = rowCount - 1;
          KeyboardModule._applyActiveHighlight(grid);
          KeyboardModule._scrollToActive(grid, rows);
        }
        break;

      case 'PageUp':
        e.preventDefault();
        if (grid._opts.allowPaging && typeof grid.goToPage === 'function') {
          grid.goToPage(Math.max(1, (grid._currentPage || 1) - 1));
        } else {
          grid._activeRowIdx = 0;
          KeyboardModule._applyActiveHighlight(grid);
          KeyboardModule._scrollToActive(grid, rows);
        }
        break;

      // ── Row actions ───────────────────────────────────────────────────
      // Enter = left click (row selection) — same as Syncfusion
      case 'Enter': {
        e.preventDefault();
        const tr = rows[grid._activeRowIdx];
        if (tr) tr.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: e.ctrlKey, metaKey: e.metaKey }));
        break;
      }

      case ' ': {
        e.preventDefault();
        const tr = rows[grid._activeRowIdx];
        if (!tr) break;
        const cb = tr.querySelector('.ug-cell-check input[type="checkbox"]');
        if (cb) {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          tr.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        break;
      }

      // ── Select all ───────────────────────────────────────────────────
      case 'a':
      case 'A':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (grid._headerCheckbox) {
            grid._headerCheckbox.checked = !grid._headerCheckbox.checked;
            grid._headerCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        break;

      // ── Dismiss ──────────────────────────────────────────────────────
      case 'Escape':
        e.preventDefault();
        if (grid._ctxMenuEl) grid._ctxMenuEl.style.display = 'none';
        grid._activeRowIdx = -1;
        KeyboardModule._applyActiveHighlight(grid);
        break;
    }
  },

  // ── Helpers ────────────────────────────────────────────────────────────

  /** All navigable data rows (excluding group/detail/empty rows) */
  _dataRows(grid) {
    return grid._tbody
      ? grid._tbody.querySelectorAll(
          'tr:not(.ug-row-group):not(.ug-row-detail):not(.ug-row-empty):not(.ug-vertical-row)')
      : [];
  },

  // ── Header mode ────────────────────────────────────────────────────────

  _enterHeaderMode(grid) {
    grid._inHeaderMode = true;
    grid._activeHdrIdx = grid._activeColIdx || 0;
    grid._activeRowIdx = -1;
    KeyboardModule._applyActiveHighlight(grid);
    KeyboardModule._applyHeaderHighlight(grid);
  },

  _exitHeaderMode(grid, toRowIdx) {
    grid._inHeaderMode = false;
    KeyboardModule._clearHeaderHighlight(grid);
    if (toRowIdx !== undefined) grid._activeRowIdx = toRowIdx;
    KeyboardModule._applyActiveHighlight(grid);
  },

  _onHeaderKey(grid, e) {
    const ths = Array.from(grid._thead?.querySelectorAll('th') || []);
    if (!ths.length) return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        grid._activeHdrIdx = Math.min((grid._activeHdrIdx || 0) + 1, ths.length - 1);
        KeyboardModule._applyHeaderHighlight(grid);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        grid._activeHdrIdx = Math.max((grid._activeHdrIdx || 0) - 1, 0);
        KeyboardModule._applyHeaderHighlight(grid);
        break;

      case 'ArrowDown':
        e.preventDefault();
        // Move back to body, first row, same column
        grid._activeColIdx = grid._activeHdrIdx;
        KeyboardModule._exitHeaderMode(grid, 0);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        // Trigger sort on the focused header
        ths[grid._activeHdrIdx]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        break;

      case 'Escape':
        e.preventDefault();
        grid._activeColIdx = grid._activeHdrIdx;
        KeyboardModule._exitHeaderMode(grid, 0);
        break;

      case 'Home':
        e.preventDefault();
        grid._activeHdrIdx = 0;
        KeyboardModule._applyHeaderHighlight(grid);
        break;

      case 'End':
        e.preventDefault();
        grid._activeHdrIdx = ths.length - 1;
        KeyboardModule._applyHeaderHighlight(grid);
        break;
    }
  },

  _applyHeaderHighlight(grid) {
    const ths = Array.from(grid._thead?.querySelectorAll('th') || []);
    ths.forEach(th => th.classList.remove('ug-th-active'));
    const active = ths[grid._activeHdrIdx || 0];
    if (active) {
      active.classList.add('ug-th-active');
      active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  },

  _clearHeaderHighlight(grid) {
    grid._thead?.querySelectorAll('.ug-th-active').forEach(th => th.classList.remove('ug-th-active'));
  },

  _applyActiveHighlight(grid) {
    if (!grid._tbody) return;

    // Clear previous
    grid._tbody.querySelectorAll('.ug-row-active').forEach(r => r.classList.remove('ug-row-active'));
    grid._tbody.querySelectorAll('.ug-cell-active').forEach(c => c.classList.remove('ug-cell-active'));

    if (grid._activeRowIdx < 0) return;

    const rows = KeyboardModule._dataRows(grid);
    const tr   = rows[grid._activeRowIdx];
    if (!tr) return;

    tr.classList.add('ug-row-active');
    tr.setAttribute('aria-selected', 'true');

    const cells    = tr.querySelectorAll('td');
    const activeCell = cells[grid._activeColIdx || 0];
    if (activeCell) activeCell.classList.add('ug-cell-active');
  },

  _scrollToActive(grid, rows) {
    const tr = rows[grid._activeRowIdx];
    if (tr) tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },
};

export default KeyboardModule;
export { KeyboardModule };

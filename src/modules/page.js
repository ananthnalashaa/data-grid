/**
 * Page Module — pagination with built-in pager UI.
 *
 * pageSettings options:
 *   pageSize     {number}           — rows per page (default: 12)
 *   pageCount    {number}           — visible page buttons (default: 5)
 *   currentPage  {number}           — initial page (default: 1)
 *   pageSizes    {boolean|Array}    — true → ['5','10','15','20','All']
 *                                     Array → custom list (can include 'All')
 *                                     false → no dropdown
 *
 * 'All' in pageSizes → shows every record on one page.
 *
 * Internal sentinel: grid._pageSize === 0  means "All records".
 */

const PageModule = {
  name: 'Page',

  init(grid) {
    const ps = grid._opts.pageSettings || {};

    // Initial page from config (default 1)
    grid._currentPage = Math.max(1, parseInt(ps.currentPage, 10) || 1);

    // Initial page size — 0 is the sentinel for "All"
    const cfgSize = ps.pageSize;
    grid._pageSize = (cfgSize === 'All' || cfgSize === 0)
      ? 0
      : (parseInt(cfgSize, 10) || 12);
  },

  afterMount(grid) {
    if (!grid._opts.allowPaging) return;
    grid._pagerEl = grid.helpers.el('div', { className: 'ug-pager' });
    grid._root.appendChild(grid._pagerEl);
  },

  sliceData(grid, data) {
    if (!grid._opts.allowPaging) return data;

    if (grid._serverSide) {
      grid._totalRecords = grid._totalRecordsCount;
      return data;
    }

    grid._totalRecords = data.length;

    // pageSize 0 = "All" — no slicing
    if (grid._pageSize === 0) {
      grid._currentPage = 1;
      return data;
    }

    const totalPgs = Math.max(1, Math.ceil(data.length / grid._pageSize));
    grid._currentPage = grid.helpers.clamp(grid._currentPage, 1, totalPgs);
    const start = (grid._currentPage - 1) * grid._pageSize;
    return data.slice(start, start + grid._pageSize);
  },

  afterRender(grid) {
    if (!grid._opts.allowPaging || !grid._pagerEl) return;
    PageModule._renderPager(grid);
  },

  _renderPager(grid) {
    const pager = grid._pagerEl;
    pager.innerHTML = '';

    const { el, clamp } = grid.helpers;
    const total    = grid._totalRecords || 0;
    const isAll    = grid._pageSize === 0;
    const totalPgs = isAll ? 1 : Math.max(1, Math.ceil(total / grid._pageSize));
    const page     = clamp(grid._currentPage, 1, totalPgs);
    const end      = isAll ? total : Math.min(page * grid._pageSize, total);
    const start    = total === 0 ? 0 : isAll ? 1 : (page - 1) * grid._pageSize + 1;

    // Info
    pager.appendChild(el('span', { className: 'ug-pager-info' },
      [total === 0 ? 'No records to display' : start + '\u2013' + end + ' of ' + total + ' records']));

    // ── Page size dropdown ─────────────────────────────────────────────
    const psCfg = grid._opts.pageSettings || {};

    // Resolve the options list
    let sizeOpts;
    if (psCfg.pageSizes === false) {
      sizeOpts = [];
    } else if (Array.isArray(psCfg.pageSizes)) {
      sizeOpts = psCfg.pageSizes.map(String);
    } else {
      // true or anything else → Syncfusion default
      sizeOpts = ['5', '10', '15', '20', 'All'];
    }

    // Ensure the current pageSize is in the list (prevents blank selection)
    if (sizeOpts.length > 0) {
      const currentLabel = isAll ? 'All' : String(grid._pageSize);
      if (!sizeOpts.includes(currentLabel)) {
        // Insert at the right numeric position
        const inserted = [...sizeOpts];
        if (!isAll) {
          const insertPos = inserted.findIndex(s => s !== 'All' && Number(s) > grid._pageSize);
          inserted.splice(insertPos === -1 ? inserted.length : insertPos, 0, currentLabel);
          sizeOpts = inserted;
        }
      }
    }

    if (sizeOpts.length > 0) {
      const wrap   = el('div', { className: 'ug-pager-sizes' }, ['Rows per page:\u00a0']);
      const select = el('select', { 'aria-label': 'Rows per page' });

      const currentLabel = isAll ? 'All' : String(grid._pageSize);
      sizeOpts.forEach(s => {
        const opt = el('option', { value: s }, [s]);
        if (s === currentLabel) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        const val = select.value;
        if (val === 'All') {
          grid._pageSize = 0; // sentinel for "All"
        } else {
          const n = parseInt(val, 10);
          grid._pageSize = isNaN(n) ? 12 : n;
        }
        grid._currentPage = 1;        // Direct callback alias
        grid._opts.onPageSizeChange?.(grid._pageSize === 0 ? 'All' : grid._pageSize);        if (grid._remoteSrc) {
          grid._fetchRemote();
        } else {
          grid.render();
        }
      });

      wrap.appendChild(select);
      pager.appendChild(wrap);
    }

    // ── Page buttons ───────────────────────────────────────────────────
    const pageCount = psCfg.pageCount || 5;
    const half = Math.floor(pageCount / 2);
    let winStart = Math.max(1, page - half);
    const winEnd = Math.min(totalPgs, winStart + pageCount - 1);
    if (winEnd - winStart + 1 < pageCount) winStart = Math.max(1, winEnd - pageCount + 1);

    const pagesDiv = el('div', { className: 'ug-pager-pages' });

    const btn = (text, target, disabled, active) => {
      const b = el('button', {
        className: 'ug-page-btn' + (active ? ' active' : '') + (disabled ? ' disabled' : ''),
      }, [text]);
      if (!disabled) b.addEventListener('click', () => PageModule._goTo(grid, target));
      return b;
    };

    if (!isAll) {
      pagesDiv.appendChild(btn('\u00AB', 1,          page <= 1));
      pagesDiv.appendChild(btn('\u2039', page - 1,   page <= 1));
      if (winStart > 1) {
        pagesDiv.appendChild(btn('1', 1));
        pagesDiv.appendChild(el('span', { className: 'ug-page-ellipsis' }, ['\u2026']));
      }
      for (let p = winStart; p <= winEnd; p++) {
        pagesDiv.appendChild(btn(String(p), p, false, p === page));
      }
      if (winEnd < totalPgs) {
        pagesDiv.appendChild(el('span', { className: 'ug-page-ellipsis' }, ['\u2026']));
        pagesDiv.appendChild(btn(String(totalPgs), totalPgs));
      }
      pagesDiv.appendChild(btn('\u203A', page + 1,   page >= totalPgs));
      pagesDiv.appendChild(btn('\u00BB', totalPgs,   page >= totalPgs));
    }

    pager.appendChild(pagesDiv);
  },

  _goTo(grid, p) {
    const isAll = grid._pageSize === 0;
    const total = grid._serverSide ? grid._totalRecordsCount : (grid._totalRecords || 0);
    const totalPgs = isAll ? 1 : Math.max(1, Math.ceil(total / grid._pageSize));
    grid._currentPage = grid.helpers.clamp(p, 1, totalPgs);
    grid._emitDataState('paging');

    // Direct callback aliases
    grid._opts.onPageChange?.(grid._currentPage);

    if (grid._remoteSrc) {
      grid._fetchRemote().then(() => {
        grid.emit('actionComplete', { requestType: 'paging', currentPage: grid._currentPage });
      });
    } else {
      grid.render();
      grid.emit('actionComplete', { requestType: 'paging', currentPage: grid._currentPage });
    }
  },

  methods: {
    /** Navigate to a specific page (mirrors Syncfusion's grid.pagerModule.goToPage) */
    goToPage(grid, page) {
      PageModule._goTo(grid, page);
    },

    /** Get current page number */
    getCurrentPage(grid) {
      return grid._currentPage;
    },

    /** Get current page size (returns 'All' if all-records mode) */
    getPageSize(grid) {
      return grid._pageSize === 0 ? 'All' : grid._pageSize;
    },
  },
};

export default PageModule;
export { PageModule };
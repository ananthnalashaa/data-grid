/**
 * UniversalGrid — Core
 *
 * Lean grid kernel with a plugin module system.
 * All features (sort, page, selection, etc.) live in separate modules
 * that hook into lifecycle events exposed by the core.
 *
 * @module universal-grid/core
 */

'use strict';

/* ─── Shared helpers (available to modules via grid.helpers) ──────────────── */

const helpers = {
  parseWidth(w) {
    if (w === undefined || w === null || w === '') return 120;
    const n = typeof w === 'number' ? w : parseInt(String(w), 10);
    return isNaN(n) ? 120 : n;
  },

  cellValue(obj, field) {
    if (!field || !obj) return '';
    const v = obj[field];
    return v == null ? '' : String(v);
  },

  escapeXml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
        else if (k.startsWith('on') && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        }
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      if (!Array.isArray(children)) children = [children];
      children.forEach(c => {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  },

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  /**
   * Format a cell value using a Syncfusion-compatible format string or object.
   * Supports: C / C2, N / N2, P / P2 (numbers) and date skeletons / pattern strings.
   */
  formatValue(value, format, colType) {
    if (value == null || value === '') return '';
    if (!format) return String(value);

    // Unpack object format  { type, format }
    let fmt = format, typ = colType || '';
    if (typeof format === 'object' && format !== null) {
      fmt = format.format;
      typ = format.type || typ;
    }
    fmt = String(fmt || '');
    typ = String(typ).toLowerCase();

    // ─ Number formats ─────────────────────────────────────
    if (typeof value === 'number' || typ === 'number') {
      const num = Number(value);
      if (isNaN(num)) return String(value);
      const dec = fmt.length > 1 ? parseInt(fmt.slice(1), 10) : 2;
      if (/^C\d*$/i.test(fmt)) return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(num);
      if (/^N\d*$/i.test(fmt)) return new Intl.NumberFormat(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(num);
      if (/^P\d*$/i.test(fmt)) return new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(num);
      // custom number pattern (e.g. '##.0000')
      return helpers._applyNumberPattern(num, fmt);
    }

    // ─ Date / datetime formats ───────────────────────────
    if (typ === 'date' || typ === 'datetime' || value instanceof Date ||
        (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d.getTime())) return String(value);
      // Syncfusion skeletons
      if (fmt === 'yMd')      return d.toLocaleDateString();
      if (fmt === 'yMMM')     return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      if (fmt === 'yMMMd')    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      if (fmt === 'short')    return d.toLocaleDateString(undefined, { dateStyle: 'short' });
      if (fmt === 'd')        return d.toLocaleDateString();
      if (fmt === 'D')        return d.toLocaleDateString(undefined, { dateStyle: 'full' });
      // pattern string
      return helpers._applyDatePattern(d, fmt);
    }

    return String(value);
  },

  _applyDatePattern(d, fmt) {
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    const hrs12 = d.getHours() % 12 || 12;
    return fmt
      .replace(/yyyy/g, d.getFullYear())
      .replace(/yy/g,   String(d.getFullYear()).slice(-2))
      .replace(/MMMM/g, d.toLocaleDateString(undefined, { month: 'long' }))
      .replace(/MMM/g,  d.toLocaleDateString(undefined, { month: 'short' }))
      .replace(/MM/g,   pad(d.getMonth() + 1))
      .replace(/M/g,    d.getMonth() + 1)
      .replace(/EEEE/g, d.toLocaleDateString(undefined, { weekday: 'long' }))
      .replace(/EEE/g,  d.toLocaleDateString(undefined, { weekday: 'short' }))
      .replace(/dd/g,   pad(d.getDate()))
      .replace(/d/g,    d.getDate())
      .replace(/HH/g,   pad(d.getHours()))
      .replace(/H/g,    d.getHours())
      .replace(/hh/g,   pad(hrs12))
      .replace(/h/g,    hrs12)
      .replace(/mm/g,   pad(d.getMinutes()))
      .replace(/ss/g,   pad(d.getSeconds()))
      .replace(/a/g,    d.getHours() >= 12 ? 'PM' : 'AM');
  },

  _applyNumberPattern(num, fmt) {
    // Very basic: just fall back to fixed decimals from '#' patterns
    const decimals = (fmt.split('.')[1] || '').replace(/[^0#]/g, '').length;
    return num.toFixed(decimals);
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODULE LIFECYCLE HOOKS
   ─────────────────────────────────────────────────────────────────────────
   Modules are plain objects with a `name` and any of these optional hooks:

   init(grid)                          — one-time setup (add state, bind listeners)
   destroy(grid)                       — cleanup
   transformData(grid, data) → data    — modify data array (sort, filter)
   sliceData(grid, data) → data        — slice data array (pagination)
   buildRenderItems(grid, data) → items — restructure into render items (grouping)
   beforeRender(grid)                  — called before each render cycle
   headerCell(grid, th, col, colIndex) — augment a header cell
   bodyRow(grid, tr, data, rowIndex)   — augment a body row
   bodyCell(grid, td, col, data, colIndex, rowIndex) — augment a body cell
   afterBodyRow(grid, tr, data, rowIndex, tbody) — add extra rows (detail row)
   afterRender(grid)                   — called after each render cycle
   afterMount(grid)                    — called after shell is appended to DOM

   Additionally, a `methods` object on the module will be mixed into
   the grid instance, making them callable as grid.methodName().
═══════════════════════════════════════════════════════════════════════════ */

const HOOK_NAMES = [
  'init', 'destroy',
  'transformData', 'sliceData', 'buildRenderItems',
  'beforeRender', 'afterRender', 'afterMount',
  'headerCell', 'bodyRow', 'bodyCell', 'afterBodyRow',
];

/* ═══════════════════════════════════════════════════════════════════════════
   UNIVERSAL GRID — CORE CLASS
═══════════════════════════════════════════════════════════════════════════ */

class UniversalGrid {
  /**
   * @param {HTMLElement} container — DOM element to mount into
   * @param {object}      options  — grid configuration
   */
  constructor(container, options) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('UniversalGrid: container must be a valid HTMLElement');
    }

    /** @type {HTMLElement} */
    this._container = container;

    /** Grid options (merged with defaults) */
    this._opts = Object.assign({}, UniversalGrid.defaults, options);

    /** Column definitions */
    this._columns = (this._opts.columns || []).map((c, i) => Object.assign({ _idx: i }, c));

    // ─── Data source ──────────────────────────────────────────────────────
    // Supports three types:
    //   1. Array        — local data, used directly
    //   2. string (URL) — fetched via GET; response may be [] or {result,count}
    //   3. Function     — async fn(query) → [] or {result,count} (server-side)
    const src = this._opts.dataSource;
    if (typeof src === 'string' || typeof src === 'function') {
      this._remoteSrc = src;   // remote
      this._dataSource = [];
    } else {
      this._remoteSrc = null;
      this._dataSource = src || [];
    }
    // Server-side mode: true when remote response includes { result, count }
    this._serverSide = false;
    // Total count supplied by server (used for paging display)
    this._totalRecordsCount = this._dataSource.length;
    // Guard against concurrent fetches
    this._isFetching = false;

    /** Column width overrides (index → px) */
    this._colWidths = {};

    /** Column order (null = default) */
    this._colOrder = null;

    /** Shared helpers — modules access via grid.helpers */
    this.helpers = helpers;

    // Expose columns as a mutable public property (Syncfusion pattern)
    Object.defineProperty(this, 'columns', {
      get: () => this._columns,
      set: (cols) => this.setColumns(cols),
      enumerable: true,
    });

    // Media-query hide styles injected per instance
    this._mediaStyleEl = null;

    // DOM references
    this._root     = null;
    this._viewport = null;
    this._table    = null;
    this._thead    = null;
    this._tbody    = null;

    // Module system
    this._modules = [];
    this._hooks   = {};
    HOOK_NAMES.forEach(h => { this._hooks[h] = []; });

    // Register modules from constructor options or static registry
    const modules = this._opts.modules || UniversalGrid._registeredModules || [];
    modules.forEach(mod => this._installModule(mod));

    // Mount & render
    this._mount();
    this._callHook('afterMount');
    if (this._remoteSrc) {
      this._fetchRemote();
    } else {
      this.render();
    }
  }

  /* ─── Static defaults ─────────────────────────────────────────────────── */

  static get defaults() {
    return {
      dataSource:       [],
      columns:          [],
      height:           'auto',
      primaryKey:       null,
      modules:          null, // if null, uses UniversalGrid._registeredModules
    };
  }

  /* ─── Static module registration (global) ────────────────────────────── */

  /** @type {Array} */
  static _registeredModules = [];

  /**
   * Register a module globally — all future instances will include it.
   * @param {object} mod — module object with `name` and lifecycle hooks
   */
  static use(mod) {
    if (!mod || !mod.name) throw new Error('Module must have a name');
    if (!UniversalGrid._registeredModules.some(m => m.name === mod.name)) {
      UniversalGrid._registeredModules.push(mod);
    }
  }

  /* ─── Module installation (instance) ──────────────────────────────────── */

  _installModule(mod) {
    if (!mod || !mod.name) return;
    if (this._modules.some(m => m.name === mod.name)) return;

    this._modules.push(mod);

    // Register hooks
    HOOK_NAMES.forEach(hookName => {
      if (typeof mod[hookName] === 'function') {
        this._hooks[hookName].push(mod[hookName]);
      }
    });

    // Mix in public methods
    if (mod.methods) {
      Object.keys(mod.methods).forEach(key => {
        if (typeof mod.methods[key] === 'function') {
          this[key] = mod.methods[key].bind(null, this);
        }
      });
    }

    // Call init
    if (typeof mod.init === 'function') {
      mod.init(this);
    }
  }

  /* ─── Hook caller ─────────────────────────────────────────────────────── */

  /**
   * Call all registered hooks of a given name.
   * For data-transform hooks, the result is piped through each handler.
   */
  _callHook(name, ...args) {
    const fns = this._hooks[name];
    if (!fns || fns.length === 0) return args[0];

    // Pipeline hooks — each transforms the data and passes to next
    if (name === 'transformData' || name === 'sliceData' || name === 'buildRenderItems') {
      let data = args[0];
      fns.forEach(fn => { data = fn(this, data) || data; });
      return data;
    }

    // Broadcast hooks — each is called independently
    fns.forEach(fn => fn(this, ...args));
    return args[0];
  }

  /* ─── Public API (core) ───────────────────────────────────────────────── */

  /** Replace data and re-render.
   * Accepts:
   *   - Array                  → local data
   *   - { result, count }      → server-side result (from dataStateChange pull pattern)
   *   - string (URL)           → remote fetch
   *   - async Function(query)  → remote fetch via function
   */
  setDataSource(data) {
    if (typeof data === 'string' || typeof data === 'function') {
      this._remoteSrc = data;
      this._dataSource = [];
      this._serverSide = false;
      this._fetchRemote();
    } else if (data && !Array.isArray(data) && data.result !== undefined) {
      // Server-side pull pattern: { result: [], count: N }
      this._remoteSrc = null;
      this._serverSide = true;
      this._dataSource = data.result || [];
      this._totalRecordsCount = data.count || 0;
      this.render();
    } else {
      this._remoteSrc = null;
      this._serverSide = false;
      this._dataSource = data || [];
      this._totalRecordsCount = this._dataSource.length;
      this.render();
    }
  }

  /**
   * Update data source and/or columns simultaneously.
   * Mirrors Syncfusion's changeDataSource(data, columns).
   * @param {Array|string|Function|null} data
   * @param {Array|null} columns
   */
  changeDataSource(data, columns) {
    if (columns) {
      this._columns = columns.map((c, i) => Object.assign({ _idx: i }, c));
      this._colWidths = {};
      this._colOrder = null;
    }
    if (data != null) {
      this.setDataSource(data);
    } else if (columns) {
      this.render();
    }
  }

  /**
   * Update any grid option and re-render.
   * Mirrors Syncfusion's setProperties({ dataSource: ... }).
   * @param {object} props
   */
  setProperties(props) {
    Object.assign(this._opts, props);
    if ('dataSource' in props) {
      this.setDataSource(props.dataSource);
      return;
    }
    this.render();
  }

  /** Update columns and re-render */
  setColumns(cols) {
    this._columns = (cols || []).map((c, i) => Object.assign({ _idx: i }, c));
    this._colWidths = {};
    this._colOrder = null;
    this.render();
  }

  /** Get ordered column configs */
  getColumns() {
    return this._orderedCols();
  }

  /** Emit a named event callback from options */
  emit(name, args) {
    const cb = this._opts[name];
    if (typeof cb === 'function') cb(args);
  }

  /**
   * Build and emit the `dataStateChange` event (Syncfusion pull-pattern compatibility).
   * Payload shape matches Syncfusion: { skip, take, sorted, group, action: { requestType } }
   * Consumers can handle this event and call grid.setDataSource({ result, count }) themselves
   * instead of providing a dataSource function.
   * @param {string} requestType — 'sorting' | 'paging' | 'grouping' | 'ungrouping'
   */
  _emitDataState(requestType) {
    const state = {
      skip:   this._opts.allowPaging ? ((this._currentPage || 1) - 1) * (this._pageSize || 25) : 0,
      take:   this._opts.allowPaging ? (this._pageSize || 25) : undefined,
      sorted: (this._sortColumns || []).map(s => ({ name: s.field, direction: s.direction })),
      group:  (this._groupFields || []).slice(),
      action: { requestType },
    };
    this.emit('dataStateChange', state);
  }

  /** Full re-render — alias: refreshColumns() */
  render() {
    this._callHook('beforeRender');
    this._injectMediaStyles();
    this._renderColgroup();
    this._renderHeader();
    this._renderBody();
    this._callHook('afterRender');
    this.emit('dataBound');
  }

  /** Syncfusion alias — re-render after mutating grid.columns */
  refreshColumns() { this.render(); }

  /**
   * Show loading overlay. Called automatically during remote fetch.
   * Can also be called manually before external data fetch operations.
   * Alias: showSpinner() — matches Syncfusion API.
   */
  showLoading() {
    if (!this._root || this._root.querySelector('.ug-loading-overlay')) return;
    const overlay = this.helpers.el('div', { className: 'ug-loading-overlay' }, [
      this.helpers.el('div', { className: 'ug-spinner' }),
    ]);
    this._root.appendChild(overlay);
  }

  /** Syncfusion API alias for showLoading() */
  showSpinner() { this.showLoading(); }

  /**
   * Hide the loading overlay.
   * Alias: hideSpinner() — matches Syncfusion API.
   */
  hideLoading() {
    if (!this._root) return;
    const overlay = this._root.querySelector('.ug-loading-overlay');
    if (overlay) overlay.remove();
  }

  /** Syncfusion API alias for hideLoading() */
  hideSpinner() { this.hideLoading(); }

  /** Teardown */
  destroy() {
    this._callHook('destroy');
    if (this._root && this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }
    this._root = null;
  }

  async refreshAsync() {
    if (this._remoteSrc) {
      await this._fetchRemote();
    } else {
      this.render();
    }
  }

  /* ─── Remote data fetch ───────────────────────────────────────────────── */

  async _fetchRemote() {
    if (this._isFetching) return;
    this._isFetching = true;
    this.showLoading();

    // Build query object for function-based sources
    const sortCols = this._sortColumns || [];
    const query = {
      skip:          this._currentPage != null ? (this._currentPage - 1) * (this._pageSize || 25) : 0,
      take:          this._pageSize || 25,
      sortField:     sortCols.length ? sortCols[0].field     : null,  // primary sort
      sortDir:       sortCols.length ? sortCols[0].direction : null,
      sorted:        sortCols.slice(),  // all sorted columns for multi-sort
      requiresCount: true,
    };

    try {
      let result;
      if (typeof this._remoteSrc === 'string') {
        // URL-based: append OData-style query params
        const url = new URL(this._remoteSrc, location.href);
        if (query.skip) url.searchParams.set('$skip', String(query.skip));
        if (query.take) url.searchParams.set('$top',  String(query.take));
        if (sortCols.length) {
          url.searchParams.set('$orderby', sortCols
            .map(s => s.field + (s.direction === 'Descending' ? ' desc' : ' asc'))
            .join(','));
        }
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        result = await res.json();
      } else {
        // Function-based
        result = await this._remoteSrc(query);
      }

      // Determine response shape
      if (result && !Array.isArray(result) && result.result !== undefined) {
        // Server-side shape: { result: [], count: number }
        this._dataSource          = result.result || [];
        this._totalRecordsCount   = result.count  || 0;
        this._serverSide          = true;
      } else {
        // Simple array — client-side operations apply
        this._dataSource          = Array.isArray(result) ? result : [];
        this._totalRecordsCount   = this._dataSource.length;
        this._serverSide          = false;
      }
    } catch (err) {
      console.error('UniversalGrid: remote fetch failed', err);
      this._dataSource          = [];
      this._totalRecordsCount   = 0;
    }

    this._isFetching = false;
    this.hideLoading();
    this.render();
  }

  /* ─── DOM mount ───────────────────────────────────────────────────────── */

  _mount() {
    const { el } = this.helpers;
    const opts = this._opts;

    // Build root class list
    const rootCls = ['ug-shell',
      opts.enableHover === false ? 'ug-no-hover' : '',
      opts.allowTextWrap         ? 'ug-text-wrap' : '',
      opts.className || opts.cssClass || '',
    ].filter(Boolean).join(' ');

    this._root = el('div', { className: rootCls });

    // Grid-level width
    if (opts.width) {
      this._root.style.width = typeof opts.width === 'number' ? opts.width + 'px' : opts.width;
    }

    // Custom row height via CSS variable
    if (opts.rowHeight) {
      this._root.style.setProperty('--ug-row-height', opts.rowHeight + 'px');
    }

    this._viewport = el('div', { className: 'ug-viewport' });
    if (opts.height !== 'auto') {
      this._viewport.style.maxHeight = typeof opts.height === 'number'
        ? opts.height + 'px' : opts.height;
    }

    this._table = el('table', { className: 'ug-table' });
    this._thead = el('thead');
    this._tbody = el('tbody');
    this._table.appendChild(this._thead);
    this._table.appendChild(this._tbody);
    this._viewport.appendChild(this._table);
    this._root.appendChild(this._viewport);

    this._container.appendChild(this._root);
  }

  /* ─── Colgroup ────────────────────────────────────────────────────────── */

  _renderColgroup() {
    const old = this._table.querySelector('colgroup');
    if (old) old.remove();
    const { el } = this.helpers;
    const cg = el('colgroup');
    this._visibleCols().forEach((col, i) => {
      const colEl = el('col');
      colEl.className = 'ug-col-' + i;
      if (this._colWidths[i] !== undefined) {
        colEl.style.width = this._colWidths[i] + 'px';
      } else if (!col.width || col.width === 'auto') {
        // auto — no explicit width, table distributes space
      } else if (typeof col.width === 'string' && col.width.includes('%')) {
        colEl.style.width = col.width;
      } else {
        colEl.style.width = helpers.parseWidth(col.width) + 'px';
      }
      cg.appendChild(colEl);
    });
    this._table.insertBefore(cg, this._thead);
  }

  /* ─── Header ──────────────────────────────────────────────────────────── */

  _renderHeader() {
    this._thead.innerHTML = '';
    const { el } = this.helpers;
    const tr = el('tr');
    const cols = this._visibleCols();  // skip hidden columns

    cols.forEach((col, i) => {
      const isCheck = col.type === 'checkbox';
      const th = el('th');

      // Build inner container
      const alignCls = col.textAlign === 'Right' ? ' ug-th-right'
        : col.textAlign === 'Center' ? ' ug-th-center' : '';
      const inner = el('div', { className: 'ug-th-inner' + alignCls });

      if (isCheck) {
        // Checkbox header is handled by the selection module
        inner.appendChild(el('div', { className: 'ug-cell-check' }));
      } else {
        // Header text or template
        const textEl = el('span', { className: 'ug-th-text' });
        if (col.headerTemplate) {
          const tpl = col.headerTemplate();
          if (typeof tpl === 'string') textEl.innerHTML = tpl;
          else if (tpl instanceof HTMLElement) textEl.appendChild(tpl);
        } else {
          textEl.textContent = col.headerText || col.field || '';
        }
        inner.appendChild(textEl);
      }

      th.appendChild(inner);

      // Let modules augment this header cell
      this._callHook('headerCell', th, col, i);

      tr.appendChild(th);
    });

    this._thead.appendChild(tr);
  }

  /* ─── Body ────────────────────────────────────────────────────────────── */

  _renderBody() {
    this._tbody.innerHTML = '';
    const { el } = this.helpers;
    const cols     = this._visibleCols();  // skip hidden columns
    const totalCols = cols.length;

    // Data pipeline
    let data = this._dataSource.slice();
    data = this._callHook('transformData', data);  // sort, filter
    data = this._callHook('sliceData', data);       // pagination

    // Store current page data for imperative API
    this._currentViewData = data;

    // Build render items (grouping or plain rows)
    let items = data.map((d, i) => ({ type: 'row', data: d, index: i }));
    items = this._callHook('buildRenderItems', items);

    if (items.length === 0) {
      const tdEmpty = el('td', { colSpan: String(totalCols) });

      // Consumer-supplied empty template takes priority
      if (this._opts.emptyTemplate) {
        const tpl = typeof this._opts.emptyTemplate === 'function'
          ? this._opts.emptyTemplate()
          : this._opts.emptyTemplate;
        if (typeof tpl === 'string')              tdEmpty.innerHTML = tpl;
        else if (tpl instanceof HTMLElement)      tdEmpty.appendChild(tpl);
      } else {
        tdEmpty.appendChild(el('div', { className: 'ug-empty-state' }, [
          el('span', { className: 'ug-empty-title' }, ['No records to display']),
          el('span', { className: 'ug-empty-sub' }, ['The grid has no data matching your criteria']),
        ]));
      }

      this._tbody.appendChild(el('tr', { className: 'ug-row-empty' }, [tdEmpty]));
      return;
    }

    items.forEach(item => {
      if (item.type === 'group') {
        // Group row rendering is handled entirely by the group module
        // via a custom element it appends directly
        if (item._render) item._render(this._tbody);
        return;
      }

      const { data: rowData, index: rowIndex } = item;

      // ── Vertical card rendering (adaptive mode) ────────────────────────
      if (this._isVertical) {
        this._renderVerticalRow(rowData, rowIndex, cols);
        return;
      }

      // ── Standard table row rendering ───────────────────────────────────
      const tr = el('tr');
      tr._ugData  = rowData;
      tr._ugIndex = rowIndex;

      // Row click / double-click
      tr.addEventListener('dblclick', () => {
        this.emit('recordDoubleClick', { rowData: rowData, rowIndex: rowIndex });
      });

      // Let modules augment the row (selection class, context menu, etc.)
      this._callHook('bodyRow', tr, rowData, rowIndex);

      // Direct row styling hooks (getRowClassName / getRowStyle)
      if (this._opts.getRowClassName) {
        const cls = this._opts.getRowClassName(rowData);
        if (cls) cls.split(/\s+/).filter(Boolean).forEach(c => tr.classList.add(c));
      }
      if (this._opts.getRowStyle) {
        const s = this._opts.getRowStyle(rowData);
        if (s) Object.assign(tr.style, s);
      }

      // rowHeight — apply per row when set
      if (this._opts.rowHeight) tr.style.height = this._opts.rowHeight + 'px';

      // Cells
      cols.forEach((col, colIdx) => {
        const td = el('td');

        if (col.type === 'checkbox') {
          // Checkbox cell — selection module fills this in via bodyCell hook
          td.appendChild(el('div', { className: 'ug-cell-check' }));
        } else if (col.displayAsCheckBox === true || col.displayAsCheckBox === 'true') {
          // boolean type rendered as a visual checkbox
          const checked = !!rowData[col.field];
          const box = el('div', { className: 'ug-cell-check' });
          const cb  = el('input', { type: 'checkbox' });
          cb.checked = checked;
          cb.disabled = true;
          box.appendChild(cb);
          td.appendChild(box);
        } else if (col.template) {
          // Syncfusion template signature: template(rowData, cellValue, fieldName)
          const cellVal = rowData[col.field];
          const tpl = col.template(rowData, cellVal, col.field);
          if (typeof tpl === 'string') td.innerHTML = tpl;
          else if (tpl instanceof HTMLElement) td.appendChild(tpl);
        } else {
          const rawVal = rowData[col.field];
          const raw    = rawVal == null ? '' : rawVal;
          // Apply format if defined
          const formatted = (col.format || col.type)
            ? helpers.formatValue(raw, col.format, col.type)
            : (raw === '' ? '' : String(raw));
          td.textContent = formatted;
          td.title = formatted;
        }

        // Alignment
        if (col.textAlign === 'Right')    td.classList.add('ug-text-right');
        if (col.textAlign === 'Center')   td.classList.add('ug-text-center');
        if (col.textAlign === 'Justify')  td.classList.add('ug-text-justify');

        // customAttributes — apply CSS class or inline style
        if (col.customAttributes) {
          if (col.customAttributes.class) {
            col.customAttributes.class.split(/\s+/).forEach(c => c && td.classList.add(c));
          }
          if (col.customAttributes.style) {
            Object.assign(td.style, col.customAttributes.style);
          }
        }

        // Let modules augment this cell (freeze offset, detail btn, etc.)
        this._callHook('bodyCell', td, col, rowData, colIdx, rowIndex);

        // queryCellInfo / onQueryCellInfo — per-cell callback (Syncfusion / Blazor)
        if (this._opts.queryCellInfo) {
          this._opts.queryCellInfo({ cell: td, data: rowData, column: col, colIndex: colIdx });
        }

        tr.appendChild(td);
      });

      this._tbody.appendChild(tr);

      // Emit rowDataBound
      this.emit('rowDataBound', { row: tr, data: rowData });

      // Let modules add rows after this one (detail row)
      this._callHook('afterBodyRow', tr, rowData, rowIndex, this._tbody);
    });
  }
  /* ─── Vertical (card) row rendering ──────────────────────────────────────── */

  _renderVerticalRow(rowData, rowIndex, cols) {
    const { el } = this.helpers;

    const tr = el('tr', { className: 'ug-vertical-row' });
    tr._ugData  = rowData;
    tr._ugIndex = rowIndex;

    // Let selection module add selection class etc.
    this._callHook('bodyRow', tr, rowData, rowIndex);

    const td = el('td', { colSpan: String(cols.length) });
    const card = el('div', { className: 'ug-card' });

    cols.forEach(col => {
      // Skip checkbox columns in card view
      if (col.type === 'checkbox') return;

      const row = el('div', { className: 'ug-card-row' });
      const label = el('span', { className: 'ug-card-label' });
      label.textContent = col.headerTemplate ? '' : (col.headerText || col.field || '');
      if (col.headerTemplate) {
        const t = col.headerTemplate();
        if (typeof t === 'string') label.innerHTML = t;
        else if (t instanceof HTMLElement) label.appendChild(t);
      }

      const value = el('span', { className: 'ug-card-value' });
      if (col.template) {
        const t = col.template(rowData, rowData[col.field], col.field);
        if (typeof t === 'string') value.innerHTML = t;
        else if (t instanceof HTMLElement) value.appendChild(t);
      } else {
        const raw = helpers.cellValue(rowData, col.field);
        value.textContent = raw;
      }

      row.appendChild(label);
      row.appendChild(value);
      card.appendChild(row);
    });

    td.appendChild(card);
    tr.appendChild(td);
    this._tbody.appendChild(tr);
    this.emit('rowDataBound', { row: tr, data: rowData });
  }
  /* ─── Column helpers ──────────────────────────────────────────────────── */

  _orderedCols() {
    // lockColumn cols always come first, then the rest in colOrder
    const base = this._colOrder
      ? this._colOrder.map(i => this._columns[i])
      : this._columns.slice();
    const locked   = base.filter(c => c.lockColumn);
    const unlocked = base.filter(c => !c.lockColumn);
    return [...locked, ...unlocked];
  }

  /** Visible columns only (excludes visible:false and group-hidden columns) */
  _visibleCols() {
    return this._orderedCols().filter(c => c.visible !== false && !c._hiddenByGroup);
  }

  // ── Imperative column API ────────────────────────────────────────

  /** Returns only visible columns */
  getVisibleColumns() { return this._visibleCols(); }

  /** Returns array of all column field names */
  getColumnFieldNames() { return this._columns.map(c => c.field).filter(Boolean); }

  /**
   * Show columns by headerText or field.
   * @param {string|string[]} keys
   * @param {'headerText'|'field'} type
   */
  showColumns(keys, type = 'headerText') {
    const arr = Array.isArray(keys) ? keys : [keys];
    this._columns.forEach(col => {
      const val = type === 'field' ? col.field : col.headerText;
      if (arr.includes(val)) col.visible = true;
    });
    this.render();
  }

  /**
   * Hide columns by headerText or field.
   * @param {string|string[]} keys
   * @param {'headerText'|'field'} type
   */
  hideColumns(keys, type = 'headerText') {
    const arr = Array.isArray(keys) ? keys : [keys];
    this._columns.forEach(col => {
      const val = type === 'field' ? col.field : col.headerText;
      if (arr.includes(val)) col.visible = false;
    });
    this.render();
  }

  // ── hideAtMedia styles ─────────────────────────────────────────

  _injectMediaStyles() {
    if (!this._root) return;
    if (this._mediaStyleEl) this._mediaStyleEl.remove();

    const rules = [];
    const uid = this._mediaStyleId = this._mediaStyleId || ('ug-ms-' + Math.random().toString(36).slice(2));
    this._root.dataset.ugid = uid;

    this._visibleCols().forEach((col, i) => {
      if (!col.hideAtMedia) return;
      rules.push(
        `@media ${col.hideAtMedia} { [data-ugid="${uid}"] .ug-col-${i} { display: none !important; } }`
      );
    });

    if (rules.length === 0) return;
    const style = document.createElement('style');
    style.textContent = rules.join('\n');
    document.head.appendChild(style);
    this._mediaStyleEl = style;
  }

  /**
   * Get the primary key value of a row, or fall back to index.
   */
  getRowKey(data, index) {
    if (this._opts.primaryKey) return data[this._opts.primaryKey] != null ? data[this._opts.primaryKey] : index;
    return index;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default UniversalGrid;
export { UniversalGrid, helpers };

/**
 * data-grid/react
 *
 * Thin React wrapper around the vanilla UniversalGrid class.
 * Exports a GridComponent whose JSX API is compatible with
 * @syncfusion/ej2-react-grids so that existing Table.tsx consumers
 * only need to change one import line.
 *
 * Usage:
 *   import { GridComponent, ColumnsDirective, ColumnDirective,
 *            Inject, Sort, Page, Group, ...  }
 *     from 'data-grid/react';
 */

import React, {
  useEffect, useRef, useImperativeHandle,
  forwardRef, useMemo, Children,
} from 'react';
import { createRoot } from 'react-dom/client';

import { UniversalGrid } from '../UniversalGrid.js';
import {
  FreezeModule, SortModule, PageModule, SelectionModule,
  ResizeModule, ReorderModule, GroupModule, DetailRowModule,
  ContextMenuModule, ExcelExportModule, KeyboardModule,
} from '../modules/index.js';

// ─── All built-in modules ────────────────────────────────────────
const ALL_MODULES = [
  FreezeModule, SortModule, PageModule, SelectionModule,
  ResizeModule, ReorderModule, GroupModule, DetailRowModule,
  ContextMenuModule, ExcelExportModule, KeyboardModule,
];

/* ═══════════════════════════════════════════════════════════════════════════
   STRUCTURAL COMPONENTS  (parsing only — render nothing)
   These mirror Syncfusion's declarative column syntax exactly.
═══════════════════════════════════════════════════════════════════════════ */

export const ColumnsDirective = ({ children }) => null;
export const ColumnDirective  = () => null;
export const Inject           = () => null;

/* ═══════════════════════════════════════════════════════════════════════════
   MODULE MOCK CONSTANTS  (compilation safety — same as Syncfusion)
═══════════════════════════════════════════════════════════════════════════ */

export const Group       = 'Group';
export const Selection   = 'Selection';
export const Freeze      = 'Freeze';
export const Page        = 'Page';
export const ContextMenu = 'ContextMenu';
export const Sort        = 'Sort';
export const Resize      = 'Resize';
export const Reorder     = 'Reorder';
export const DetailRow   = 'DetailRow';
export const ExcelExport = 'ExcelExport';
export const Keyboard    = 'Keyboard';

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE HELPERS
   React template functions return ReactNode; our vanilla grid expects
   HTMLElement | string.  wrapReactFn renders JSX into a DOM container.
═══════════════════════════════════════════════════════════════════════════ */

function wrapReactFn(fn, rootsRef) {
  return (...args) => {
    const container = document.createElement('div');
    container.style.cssText = 'display:contents';
    const root = createRoot(container);
    rootsRef.current.push(root);
    root.render(fn(...args));
    return container;
  };
}

function unmountRoots(rootsRef) {
  rootsRef.current.forEach(r => { try { r.unmount(); } catch (_) {} });
  rootsRef.current = [];
}

/* ═══════════════════════════════════════════════════════════════════════════
   GRID COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export const GridComponent = forwardRef(function GridComponent(props, ref) {
  const containerRef  = useRef(null);
  const gridRef       = useRef(null);
  const templateRoots = useRef([]);

  // ── Stable callback forwarding ──────────────────────────────────────
  // Store latest callbacks in a ref so the grid always calls the newest
  // version without needing to rebuild the grid instance on every render.
  const cbRef = useRef({});
  cbRef.current = {
    rowSelected:       props.rowSelected,
    rowDeselected:     props.rowDeselected,
    rowSelecting:      props.rowSelecting,
    rowDataBound:      props.rowDataBound,
    dataBound:         props.dataBound,
    actionBegin:       props.actionBegin,
    actionComplete:    props.actionComplete,
    recordDoubleClick: props.recordDoubleClick,
    recordClick:       props.recordClick,
    contextMenuClick:  props.contextMenuClick,
    dataStateChange:   props.dataStateChange,
    contextMenuOpen:   props.contextMenuOpen,
    onSortChange:      props.onSortChange,
    onPageChange:      props.onPageChange,
    onPageSizeChange:  props.onPageSizeChange,
  };

  // ── Parse columns from JSX children ─────────────────────────────────
  const columns = useMemo(() => {
    const arr = Children.toArray(props.children);
    const colsDir = arr.find(c => c.type === ColumnsDirective);
    if (!colsDir) return [];

    return Children.toArray(colsDir.props.children)
      .filter(c => c.type === ColumnDirective)
      .map(c => {
        const col = { ...c.props };
        // React template functions → DOM element wrappers
        if (typeof col.template === 'function') {
          const orig = col.template;
          col.template = wrapReactFn(orig, templateRoots);
        }
        if (typeof col.headerTemplate === 'function') {
          const orig = col.headerTemplate;
          col.headerTemplate = wrapReactFn(orig, templateRoots);
        }
        return col;
      });
  }, [props.children]);

  // ── Build options object ─────────────────────────────────────────────
  function buildOpts() {
    const className = [props.className, props.cssClass]
      .filter(Boolean).join(' ');

    // Wrap detailTemplate if it returns React JSX
    let detailTemplate = props.detailTemplate;
    if (typeof detailTemplate === 'function') {
      const orig = detailTemplate;
      detailTemplate = row => wrapReactFn(orig, templateRoots)(row);
    }

    return {
      modules:     ALL_MODULES,
      dataSource:  props.dataSource || [],
      columns,
      primaryKey:  props.primaryKey,
      // Feature flags
      allowSorting:    props.allowSorting,
      allowResizing:   props.allowResizing,
      allowReordering: props.allowReordering,
      allowGrouping:   props.allowGrouping,
      allowSelection:  props.allowSelection !== false,
      allowPaging:     props.allowPaging,
      enableHover:     props.enableHover !== false,
      // Settings
      selectionSettings: props.selectionSettings,
      pageSettings:      props.pageSettings,
      sortSettings:      props.sortSettings,
      groupSettings:     props.groupSettings,
      // Dimensions
      height:    props.height,
      width:     props.width,
      className,
      style:     props.style,
      // Row styling (direct options)
      getRowClassName:  props.getRowClassName,
      getRowStyle:      props.getRowStyle,
      queryCellInfo:    props.queryCellInfo || props.onQueryCellInfo,
      // Templates
      detailTemplate,
      emptyTemplate: props.emptyTemplate || props.emptyRecordTemplate,
      // Context menu
      contextMenuItems: props.contextMenuItems,
      // Misc Syncfusion options
      allowTextWrap:     props.allowTextWrap,
      rowHeight:         props.rowHeight,
      enableHeaderFocus: props.enableHeaderFocus,
      // Direct callback aliases
      onSortChange:      (...a) => cbRef.current.onSortChange?.(...a),
      onPageChange:      (...a) => cbRef.current.onPageChange?.(...a),
      onPageSizeChange:  (...a) => cbRef.current.onPageSizeChange?.(...a),
      contextMenuOpen:   (...a) => cbRef.current.contextMenuOpen?.(...a),
      // Stable callback forwarders (always call the latest version)
      rowSelected:       (...a) => cbRef.current.rowSelected?.(...a),
      rowDeselected:     (...a) => cbRef.current.rowDeselected?.(...a),
      rowSelecting:      (...a) => cbRef.current.rowSelecting?.(...a),
      rowDataBound:      (...a) => cbRef.current.rowDataBound?.(...a),
      dataBound:         (...a) => cbRef.current.dataBound?.(...a),
      actionBegin:       (...a) => cbRef.current.actionBegin?.(...a),
      actionComplete:    (...a) => cbRef.current.actionComplete?.(...a),
      recordDoubleClick: (...a) => cbRef.current.recordDoubleClick?.(...a),
      recordClick:       (...a) => cbRef.current.recordClick?.(...a),
      contextMenuClick:  (...a) => cbRef.current.contextMenuClick?.(...a),
      dataStateChange:   (...a) => cbRef.current.dataStateChange?.(...a),
    };
  }

  // ── Mount grid once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    gridRef.current = new UniversalGrid(containerRef.current, buildOpts());
    return () => {
      unmountRoots(templateRoots);
      gridRef.current?.destroy();
      gridRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── dataSource changes ───────────────────────────────────────────────
  useEffect(() => {
    if (!gridRef.current) return;
    unmountRoots(templateRoots); // clean up old template React trees
    gridRef.current.setDataSource(props.dataSource || []);
  }, [props.dataSource]);

  // ── Column changes (after initial mount) ────────────────────────────
  const isFirstColRender = useRef(true);
  useEffect(() => {
    if (isFirstColRender.current) { isFirstColRender.current = false; return; }
    if (!gridRef.current) return;
    unmountRoots(templateRoots);
    gridRef.current.setColumns(columns);
  }, [columns]);

  // ── contextMenuItems changes ─────────────────────────────────────────
  useEffect(() => {
    if (!gridRef.current) return;
    gridRef.current._opts.contextMenuItems = props.contextMenuItems;
  }, [props.contextMenuItems]);

  // ── Imperative ref methods ───────────────────────────────────────────
  useImperativeHandle(ref, () => {
    const g = () => gridRef.current;

    const handle = {
      // Selection
      selectRow:             (i)   => g()?.selectRow(i),
      selectRows:            (arr) => g()?.selectRows(arr),
      clearSelection:        ()    => g()?.clearSelection(),
      getCurrentViewRecords: ()    => g()?.getCurrentViewRecords() || [],
      getSelectedRecords:    ()    => {
        const grid = g();
        if (!grid) return [];
        const keys = grid._selectedKeys;
        const data = grid._currentViewData || [];
        return data.filter((d, i) => keys.has(grid.getRowKey(d, i)));
      },

      // Grouping
      groupCollapseAll: () => g()?.groupCollapseAll(),
      groupExpandAll:   () => g()?.groupExpandAll(),
      groupColumn:      (f) => g()?.groupColumn(f),
      ungroupColumn:    (f) => g()?.ungroupColumn(f),
      clearGrouping:    ()  => g()?.clearGrouping(),

      // Sorting
      sortColumn:   (field, dir, multi) => g()?.sortColumn(field, dir, multi),
      clearSorting: ()                  => g()?.clearSorting(),

      // Export
      ExcelExportAsync: (p) => g()?.ExcelExportAsync(p),
      PdfExportAsync:   (p) => g()?.PdfExportAsync(p),

      // Misc
      refreshAsync:  ()  => g()?.refreshAsync(),
      showSpinner:   ()  => g()?.showSpinner(),
      hideSpinner:   ()  => g()?.hideSpinner(),
      setDataSource: (d) => g()?.setDataSource(d),

      // pageSettings object (Syncfusion ref pattern: ref.current.pageSettings.currentPage)
      get pageSettings() {
        const grid = g();
        return {
          get currentPage()           { return grid?._currentPage ?? 1; },
          set currentPage(p)          { if (grid) { grid._currentPage = p; grid.render(); } },
          get totalRecordsCount()     { return grid?._totalRecords ?? 0; },
          set totalRecordsCount(n)    { if (grid) { grid._totalRecords = n; grid.render(); } },
          get pageSize()              { return grid?._pageSize ?? 12; },
          set pageSize(n)             { if (grid) { grid._pageSize = n; grid.render(); } },
        };
      },
    };

    return handle;
  }, []);

  return (
    <div
      ref={containerRef}
      style={props.width ? { width: props.width } : undefined}
    />
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   STANDALONE PAGER COMPONENT
   Mirrors Syncfusion's PagerComponent API for use outside the grid.
═══════════════════════════════════════════════════════════════════════════ */

export function PagerComponent({
  totalRecordsCount = 0,
  pageSize          = 25,
  currentPage       = 1,
  click,
  onPageChange,
  onPageSizeChange,
  pageSizes,
  pageCount         = 5,
}) {
  const containerRef = useRef(null);
  const pagerRef     = useRef(null);

  // Use vanilla PagerComponent rendered into a div
  useEffect(() => {
    if (!containerRef.current) return;
    // Dynamically import to avoid circular dep at module load
    import('../modules/page.js').then(({ PageModule }) => {
      // Build a minimal grid-like context
      const fakeGrid = {
        helpers:       { el, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
        _currentPage:  currentPage,
        _pageSize:     pageSize,
        _totalRecords: totalRecordsCount,
        _serverSide:   false,
        _pagerEl:      containerRef.current,
        _remoteSrc:    null,
        _opts: {
          allowPaging:  true,
          pageSettings: {
            pageSizes,
            pageCount,
            pageSize,
          },
        },
        emit: () => {},
        _emitDataState: () => {},
        render: () => { PageModule._renderPager(fakeGrid); },
      };
      // Patch _goTo to emit callbacks
      PageModule._goTo = (g, p) => {
        const total = g._totalRecords || 0;
        const totalPgs = Math.max(1, Math.ceil(total / g._pageSize));
        g._currentPage = Math.max(1, Math.min(p, totalPgs));
        click?.({ currentPage: g._currentPage });
        onPageChange?.(g._currentPage);
        PageModule._renderPager(g);
      };
      PageModule._renderPager(fakeGrid);
      pagerRef.current = fakeGrid;
    });
  }, []);

  // Update when controlled props change
  useEffect(() => {
    if (!pagerRef.current) return;
    pagerRef.current._currentPage  = currentPage;
    pagerRef.current._pageSize     = pageSize;
    pagerRef.current._totalRecords = totalRecordsCount;
    import('../modules/page.js').then(({ PageModule }) => {
      PageModule._renderPager(pagerRef.current);
    });
  }, [totalRecordsCount, pageSize, currentPage]);

  return <div ref={containerRef} />;
}

/* ─── helpers re-used by PagerComponent ────────────────────────────────── */

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(k => {
      if (k === 'className')                       node.className = attrs[k];
      else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
  }
  if (children) {
    [children].flat().forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }
  return node;
}

export default GridComponent;

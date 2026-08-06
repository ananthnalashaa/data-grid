// data-grid/react — TypeScript definitions
// React wrapper public API

import * as React from 'react';
import type {
  ColumnConfig, SelectionSettings, PageSettings, SortSettings, GroupSettings,
  GridOptions, ActionEventArgs, ContextMenuClickEventArgs, DataStateArgs,
  GridModule, SortDescriptor,
} from '../index';

// ── Structural components ──────────────────────────────────────────────────

export declare const ColumnsDirective: React.FC<{ children?: React.ReactNode }>;
export declare const ColumnDirective:  React.FC<ColumnConfig & { key?: React.Key }>;
export declare const Inject:           React.FC<{ services: any[] }>;

// ── Module mock constants ──────────────────────────────────────────────────

export declare const Group:       string;
export declare const Selection:   string;
export declare const Freeze:      string;
export declare const Page:        string;
export declare const ContextMenu: string;
export declare const Sort:        string;
export declare const Resize:      string;
export declare const Reorder:     string;
export declare const DetailRow:   string;
export declare const ExcelExport: string;
export declare const Keyboard:    string;

// ── GridComponent imperative handle ───────────────────────────────────────

export interface GridHandle {
  // Selection
  selectRow(index: number): void;
  selectRows(indexes: number[]): void;
  clearSelection(): void;
  getCurrentViewRecords(): any[];
  getSelectedRecords(): any[];
  GetSelectedRecordsAsync(): Promise<any[]>;

  // Grouping
  groupCollapseAll(): void;
  groupExpandAll(): void;
  groupColumn(field: string): void;
  ungroupColumn(field: string): void;
  clearGrouping(): void;

  // Sorting
  sortColumn(field: string, direction?: string, isMultiSort?: boolean): void;
  clearSorting(): void;

  // Paging
  goToPage(page: number): void;
  pageSettings: {
    currentPage: number;
    totalRecordsCount: number;
    pageSize: number;
  };

  // Export
  ExcelExportAsync(properties?: { fileName?: string }): Promise<void>;
  PdfExportAsync(properties?: any): Promise<void>;

  // Misc
  showSpinner(): void;
  hideSpinner(): void;
  refreshAsync(): Promise<void>;
  setDataSource(data: any): void;
}

// ── GridComponent props ────────────────────────────────────────────────────

export interface GridComponentProps {
  // Data
  dataSource?:  any[];
  primaryKey?:  string;

  // Columns (JSX children)
  children?: React.ReactNode;

  // Feature flags
  allowSorting?:     boolean;
  allowMultiSorting?: boolean;
  allowResizing?:    boolean;
  allowReordering?:  boolean;
  allowGrouping?:    boolean;
  allowSelection?:   boolean;
  allowPaging?:      boolean;
  allowTextWrap?:    boolean;
  enableHover?:      boolean;
  enableHeaderFocus?: boolean;
  enableVirtualization?: boolean;

  // Settings
  selectionSettings?: SelectionSettings;
  pageSettings?:      PageSettings;
  sortSettings?:      SortSettings;
  groupSettings?:     GroupSettings;

  // Frozen columns
  frozenColumns?: number;
  frozenRows?:    number;

  // Dimensions
  height?: string | number;
  width?:  string | number;
  rowHeight?: number;

  // CSS
  className?:  string;
  cssClass?:   string;
  style?:      React.CSSProperties;

  // Templates
  detailTemplate?:      (rowData: any) => React.ReactNode;
  emptyTemplate?:       (() => React.ReactNode) | string;
  emptyRecordTemplate?: (() => React.ReactNode) | string;

  // Context menu
  contextMenuItems?: Array<{ text: string; id: string; iconCss?: string } | 'separator'>;

  // Row events
  rowSelected?:       (args: { data: any; rowIndex: number }) => void;
  rowDeselected?:     (args: { data: any; rowIndex: number }) => void;
  rowSelecting?:      (args: { data: any; rowIndex: number; cancel?: boolean }) => void;
  onSelectionChange?: (args: { selectedRows: any[]; selectedRowIndexes: number[] }) => void;
  rowDataBound?:      (args: { row: HTMLTableRowElement; data: any }) => void;
  dataBound?:         () => void;
  recordDoubleClick?: (args: { rowData: any; rowIndex: number }) => void;
  recordClick?:       (args: { rowData: any; rowIndex: number }) => void;

  // Action events
  actionBegin?:    (args: ActionEventArgs) => void;
  actionComplete?: (args: ActionEventArgs) => void;

  // Context menu events
  contextMenuClick?: (args: ContextMenuClickEventArgs) => void;
  contextMenuOpen?:  (args: { items: any[]; rowData: any; cancel: boolean }) => void;

  // Data state
  dataStateChange?: (state: DataStateArgs) => void;

  // Row styling
  getRowClassName?: (rowData: any) => string;
  getRowStyle?:     (rowData: any) => React.CSSProperties;
  queryCellInfo?:   (args: { cell: HTMLTableCellElement; data: any; column: ColumnConfig; colIndex: number }) => void;
  onQueryCellInfo?: (args: { cell: HTMLTableCellElement; data: any; column: ColumnConfig; colIndex: number }) => void;

  // Callback aliases
  onSortChange?:    (field: string, direction: string | null) => void;
  onPageChange?:    (page: number) => void;
  onPageSizeChange?:(size: number | 'All') => void;
}

// ── GridComponent ──────────────────────────────────────────────────────────

export declare const GridComponent: React.ForwardRefExoticComponent<
  GridComponentProps & React.RefAttributes<GridHandle>
>;

// ── PagerComponent ────────────────────────────────────────────────────────

export interface PagerComponentProps {
  totalRecordsCount: number;
  pageSize:          number;
  currentPage:       number;
  click?:            (args: { currentPage: number }) => void;
  onPageChange?:     (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizes?:        boolean | (number | string)[];
  pageCount?:        number;
}

export declare const PagerComponent: React.FC<PagerComponentProps>;

export default GridComponent;

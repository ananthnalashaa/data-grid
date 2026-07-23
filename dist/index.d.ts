// data-grid — TypeScript definitions
// Core (vanilla JS) public API

export interface ColumnConfig {
  field?:            string;
  headerText?:       string;
  header?:           string;
  width?:            string | number;
  minWidth?:         string | number;
  maxWidth?:         string | number;
  textAlign?:        'Left' | 'Right' | 'Center' | 'Justify';
  headerTextAlign?:  'Left' | 'Right' | 'Center';
  isFrozen?:         boolean;
  freeze?:           'Left' | 'Right' | 'Fixed' | 'None';
  lockColumn?:       boolean;
  type?:             'checkbox' | 'string' | 'number' | 'boolean' | 'date' | 'datetime';
  format?:           string | { type?: string; format?: string };
  visible?:          boolean;
  hideAtMedia?:      string;
  allowSorting?:     boolean;
  allowReordering?:  boolean;
  allowResizing?:    boolean;
  allowGrouping?:    boolean;
  displayAsCheckBox?: boolean;
  customAttributes?: { class?: string; style?: Record<string, string> };
  template?:         (rowData: any, value?: any, field?: string) => HTMLElement | string;
  headerTemplate?:   () => HTMLElement | string;
  cellText?:         (rowData: any) => string;
}

export interface SelectionSettings {
  type?:              'Single' | 'Multiple';
  checkboxOnly?:      boolean;
  persistSelection?:  boolean;
  mode?:              'Row' | 'Cell';
}

export interface PageSettings {
  pageSize?:    number | 'All';
  pageCount?:   number;
  pageSizes?:   boolean | (number | string)[];
  currentPage?: number;
}

export interface SortDescriptor {
  field:     string;
  direction: 'Ascending' | 'Descending';
}

export interface SortSettings {
  columns?: SortDescriptor[];
}

export interface GroupSettings {
  columns?:           string[];
  showDropArea?:      boolean;
  showGroupedColumn?: boolean;
}

export interface GridOptions {
  // Data
  dataSource?:      any[] | string | ((query: QueryObject) => Promise<any[] | { result: any[]; count: number }>);
  columns?:         ColumnConfig[];
  primaryKey?:      string;
  modules?:         GridModule[];

  // Features
  allowSorting?:    boolean;
  allowMultiSorting?: boolean;
  allowResizing?:   boolean;
  allowReordering?: boolean;
  allowGrouping?:   boolean;
  allowSelection?:  boolean;
  allowPaging?:     boolean;
  allowTextWrap?:   boolean;
  enableHover?:     boolean;
  enableHeaderFocus?: boolean;

  // Settings
  selectionSettings?: SelectionSettings;
  pageSettings?:      PageSettings;
  sortSettings?:      SortSettings;
  groupSettings?:     GroupSettings;

  // Dimensions
  height?: string | number;
  width?:  string | number;
  rowHeight?: number;

  // CSS
  className?: string;
  cssClass?:  string;
  style?:     Partial<CSSStyleDeclaration>;

  // Templates
  detailTemplate?:      (rowData: any) => HTMLElement | string;
  emptyTemplate?:       (() => HTMLElement | string) | string;
  emptyRecordTemplate?: (() => HTMLElement | string) | string;

  // Context menu
  contextMenuItems?: Array<{ text: string; id: string; iconCss?: string } | 'separator'>;

  // Row events
  rowSelected?:       (args: { data: any; rowIndex: number }) => void;
  rowDeselected?:     (args: { data: any; rowIndex: number }) => void;
  rowSelecting?:      (args: { data: any; rowIndex: number; cancel?: boolean }) => void;
  rowDataBound?:      (args: { row: HTMLTableRowElement; data: any }) => void;
  dataBound?:         () => void;
  recordDoubleClick?: (args: { rowData: any; rowIndex: number }) => void;
  recordClick?:       (args: { rowData: any; rowIndex: number }) => void;

  // Action events
  actionBegin?:    (args: ActionEventArgs) => void;
  actionComplete?: (args: ActionEventArgs) => void;

  // Context menu events
  contextMenuClick?:  (args: ContextMenuClickEventArgs) => void;
  contextMenuOpen?:   (args: { items: any[]; rowData: any; cancel: boolean }) => void;

  // Data state
  dataStateChange?: (state: DataStateArgs) => void;

  // Row styling
  getRowClassName?: (rowData: any) => string;
  getRowStyle?:     (rowData: any) => Partial<CSSStyleDeclaration>;
  queryCellInfo?:   (args: { cell: HTMLTableCellElement; data: any; column: ColumnConfig; colIndex: number }) => void;
  onQueryCellInfo?: (args: { cell: HTMLTableCellElement; data: any; column: ColumnConfig; colIndex: number }) => void;

  // Callback aliases
  onSortChange?:    (field: string, direction: string | null) => void;
  onPageChange?:    (page: number) => void;
  onPageSizeChange?:(size: number | 'All') => void;
}

export interface ActionEventArgs {
  requestType:  'sorting' | 'grouping' | 'ungrouping' | 'paging' | 'refresh';
  columnName?:  string;
  direction?:   string;
  currentPage?: number;
}

export interface ContextMenuClickEventArgs {
  item:    { id?: string; text?: string };
  rowInfo: { rowData: any };
}

export interface DataStateArgs {
  skip?:   number;
  take?:   number;
  sorted:  Array<{ name: string; direction: string }>;
  group:   string[];
  action:  { requestType: string };
}

export interface QueryObject {
  skip:          number;
  take:          number;
  sortField:     string | null;
  sortDir:       string | null;
  sorted:        SortDescriptor[];
  requiresCount: boolean;
}

export interface GridModule {
  name: string;
  [key: string]: any;
}

// ── UniversalGrid class ────────────────────────────────────────────────────

export declare class UniversalGrid {
  constructor(container: HTMLElement, options: GridOptions);

  // Column API
  readonly columns: ColumnConfig[];
  getColumns(): ColumnConfig[];
  getColumnByField(field: string): ColumnConfig | undefined;
  getColumnByUid(uid: string): ColumnConfig | undefined;
  getVisibleColumns(): ColumnConfig[];
  getColumnFieldNames(): string[];
  setColumns(cols: ColumnConfig[]): void;
  refreshColumns(): void;
  showColumns(keys: string | string[], type?: 'headerText' | 'field'): void;
  hideColumns(keys: string | string[], type?: 'headerText' | 'field'): void;

  // Data API
  setDataSource(data: any[] | string | Function | { result: any[]; count: number }): void;
  changeDataSource(data: any, columns?: ColumnConfig[]): void;
  setProperties(props: Partial<GridOptions>): void;

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
  addGroupField(field: string): void;
  removeGroupField(field: string): void;

  // Sorting
  sortColumn(field: string, direction?: string, isMultiSort?: boolean): void;
  removeSortColumn(field: string): void;
  clearSorting(): void;
  getSortedColumns(): SortDescriptor[];

  // Paging
  goToPage(page: number): void;

  // Loading
  showLoading(): void;
  hideLoading(): void;
  showSpinner(): void;
  hideSpinner(): void;

  // Misc
  render(): void;
  refreshAsync(): Promise<void>;
  destroy(): void;
  emit(name: string, args?: any): void;
  getRowKey(data: any, index: number): string | number;

  // Export
  ExcelExportAsync(properties?: { fileName?: string }): Promise<void>;
  PdfExportAsync(properties?: any): Promise<void>;

  // Static
  static use(module: GridModule): void;
  static defaults: Partial<GridOptions>;
  static _registeredModules: GridModule[];
}

// ── Module exports ─────────────────────────────────────────────────────────

export declare const FreezeModule:      GridModule;
export declare const SortModule:        GridModule;
export declare const PageModule:        GridModule;
export declare const SelectionModule:   GridModule;
export declare const ResizeModule:      GridModule;
export declare const ReorderModule:     GridModule;
export declare const GroupModule:       GridModule;
export declare const DetailRowModule:   GridModule;
export declare const ContextMenuModule: GridModule;
export declare const ExcelExportModule: GridModule;
export declare const AdaptiveModule:    GridModule;
export declare const KeyboardModule:    GridModule;

// Short-name aliases
export declare const Freeze:      GridModule;
export declare const Sort:        GridModule;
export declare const Page:        GridModule;
export declare const Selection:   GridModule;
export declare const Resize:      GridModule;
export declare const Reorder:     GridModule;
export declare const Group:       GridModule;
export declare const DetailRow:   GridModule;
export declare const ContextMenu: GridModule;
export declare const ExcelExport: GridModule;
export declare const Adaptive:    GridModule;
export declare const Keyboard:    GridModule;

export declare const ALL_MODULES: GridModule[];

export default UniversalGrid;

/**
 * data-grid — main entry point.
 *
 * Features are opt-in via the `modules` option — mirrors Syncfusion's
 * <Inject services={[Sort, Page, Selection, ...]} /> pattern.
 *
 * Usage:
 *
 *   import { UniversalGrid, Sort, Page, Selection, Freeze,
 *            Resize, Reorder, Group, DetailRow, ContextMenu,
 *            ExcelExport, Adaptive } from 'data-grid';
 *   import 'data-grid/css';
 *
 *   new UniversalGrid(container, {
 *     modules: [Sort, Page, Selection, Freeze],   // only what you need
 *     dataSource: data,
 *     ...
 *   });
 *
 * Full-bundle convenience (all features, no tree-shaking):
 *
 *   import { UniversalGrid, ALL_MODULES } from 'data-grid';
 *   new UniversalGrid(container, { modules: ALL_MODULES, ... });
 */

export { UniversalGrid, helpers } from './src/UniversalGrid.js';

import {
  FreezeModule,
  SortModule,
  PageModule,
  SelectionModule,
  ResizeModule,
  ReorderModule,
  GroupModule,
  DetailRowModule,
  ContextMenuModule,
  ExcelExportModule,
  AdaptiveModule,
  KeyboardModule,
} from './src/modules/index.js';

// ── Long names (descriptive) ──────────────────────────────────────────────
export {
  FreezeModule,
  SortModule,
  PageModule,
  SelectionModule,
  ResizeModule,
  ReorderModule,
  GroupModule,
  DetailRowModule,
  ContextMenuModule,
  ExcelExportModule,
  AdaptiveModule,
  KeyboardModule,
};

// ── Short names (Syncfusion-compatible) ─────────────────────────────────────
export {
  FreezeModule    as Freeze,
  SortModule      as Sort,
  PageModule      as Page,
  SelectionModule as Selection,
  ResizeModule    as Resize,
  ReorderModule   as Reorder,
  GroupModule     as Group,
  DetailRowModule as DetailRow,
  ContextMenuModule  as ContextMenu,
  ExcelExportModule  as ExcelExport,
  AdaptiveModule  as Adaptive,
  KeyboardModule  as Keyboard,
};

// ── All-in-one convenience array ─────────────────────────────────────────
export const ALL_MODULES = [
  FreezeModule,
  SortModule,
  PageModule,
  SelectionModule,
  ResizeModule,
  ReorderModule,
  GroupModule,
  DetailRowModule,
  ContextMenuModule,
  ExcelExportModule,
  AdaptiveModule,
  KeyboardModule,
];

export default null; // named exports only
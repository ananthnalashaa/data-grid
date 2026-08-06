/**
 * Virtual Scroll Module — renders only visible rows for large datasets.
 * Opt-in via enableVirtualization: true in grid options.
 */

const VirtualModule = {
  name: 'Virtual',

  init(grid) {
    if (!grid._opts.enableVirtualization) return;
    grid._virtual = {
      startIndex: 0,
      endIndex: 0,
      rowHeight: grid._opts.rowHeight || 22,
      buffer: 5,
      totalHeight: 0,
    };
  },

  afterMount(grid) {
    if (!grid._virtual) return;
    const viewport = grid._el.querySelector('.ug-viewport');
    if (!viewport) return;
    grid._virtual._viewport = viewport;
    viewport.addEventListener('scroll', () => VirtualModule._onScroll(grid));
  },

  // Hook: slice items to visible range only
  sliceVirtual(grid, items) {
    if (!grid._virtual) return items;
    const vp = grid._virtual._viewport;
    if (!vp) return items;

    const { rowHeight, buffer } = grid._virtual;
    const scrollTop = vp.scrollTop;
    const vpHeight = vp.clientHeight;
    const totalRows = items.length;

    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const visibleCount = Math.ceil(vpHeight / rowHeight);
    const end = Math.min(totalRows, start + visibleCount + buffer * 2);

    grid._virtual.startIndex = start;
    grid._virtual.endIndex = end;
    grid._virtual.totalHeight = totalRows * rowHeight;
    grid._virtual._allItems = items;

    return items.slice(start, end);
  },

  // Hook: add spacers before/after visible rows
  afterBodyRender(grid) {
    if (!grid._virtual) return;
    const { startIndex, totalHeight, rowHeight } = grid._virtual;
    const tbody = grid._tbody;
    if (!tbody) return;

    const topHeight = startIndex * rowHeight;
    const renderedHeight = (grid._virtual.endIndex - startIndex) * rowHeight;
    const bottomHeight = Math.max(0, totalHeight - topHeight - renderedHeight);

    // Insert top spacer
    if (topHeight > 0) {
      const topSpacer = document.createElement('tr');
      topSpacer.className = 'ug-virtual-spacer';
      topSpacer.style.height = topHeight + 'px';
      tbody.insertBefore(topSpacer, tbody.firstChild);
    }

    // Append bottom spacer
    if (bottomHeight > 0) {
      const bottomSpacer = document.createElement('tr');
      bottomSpacer.className = 'ug-virtual-spacer';
      bottomSpacer.style.height = bottomHeight + 'px';
      tbody.appendChild(bottomSpacer);
    }
  },

  _onScroll(grid) {
    if (!grid._virtual || grid._virtual._scrolling) return;
    grid._virtual._scrolling = true;
    requestAnimationFrame(() => {
      grid._virtual._scrolling = false;
      VirtualModule._rerender(grid);
    });
  },

  _rerender(grid) {
    const vp = grid._virtual._viewport;
    if (!vp) return;

    const { rowHeight, buffer, _allItems: items } = grid._virtual;
    if (!items) return;

    const scrollTop = vp.scrollTop;
    const vpHeight = vp.clientHeight;
    const totalRows = items.length;

    const newStart = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    const visibleCount = Math.ceil(vpHeight / rowHeight);
    const newEnd = Math.min(totalRows, newStart + visibleCount + buffer * 2);

    if (newStart === grid._virtual.startIndex && newEnd === grid._virtual.endIndex) return;

    grid._virtual.startIndex = newStart;
    grid._virtual.endIndex = newEnd;

    // Notify before re-render so React can clear old portals
    if (grid._opts.onBeforeRender) grid._opts.onBeforeRender();
    grid.render();
  },
};

export { VirtualModule };

/**
 * Context Menu Module — right-click row menu.
 */

const ContextMenuModule = {
  name: 'ContextMenu',

  init(grid) {
    grid._ctxMenuEl = grid.helpers.el('div', {
      className: 'ug-ctx-menu',
      style: { display: 'none' },
    });
    document.body.appendChild(grid._ctxMenuEl);

    grid._ctxDismiss = (e) => {
      if (grid._ctxMenuEl && !grid._ctxMenuEl.contains(e.target)) {
        grid._ctxMenuEl.style.display = 'none';
      }
    };
    document.addEventListener('click', grid._ctxDismiss);
  },

  destroy(grid) {
    document.removeEventListener('click', grid._ctxDismiss);
    if (grid._ctxMenuEl && grid._ctxMenuEl.parentNode) {
      grid._ctxMenuEl.parentNode.removeChild(grid._ctxMenuEl);
    }
  },

  bodyRow(grid, tr, data) {
    const items = grid._opts.contextMenuItems;
    if (!Array.isArray(items) || items.length === 0) return;

    tr.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      ContextMenuModule._show(grid, data, e.clientX, e.clientY);
    });
  },

  _show(grid, data, x, y) {
    const { el } = grid.helpers;
    const menu = grid._ctxMenuEl;
    menu.innerHTML = '';

    // onContextMenuOpen / contextMenuOpen — fires before menu renders
    // Consumer can set args.cancel = true to suppress the menu,
    // or modify args.items to change which items appear.
    const openArgs = {
      items:   (grid._opts.contextMenuItems || []).slice(),
      rowData: data,
      cancel:  false,
    };
    grid.emit('contextMenuOpen', openArgs);
    if (openArgs.cancel) return;

    const items = openArgs.items || [];

    items.forEach(item => {
      if (item === 'separator' || (item && item.type === 'separator')) {
        menu.appendChild(el('div', { className: 'ug-ctx-divider' }));
        return;
      }
      const text = typeof item === 'string' ? item : (item.text || item.id || '');
      const id   = typeof item === 'string' ? item : (item.id || item.text || '');
      const div  = el('div', { className: 'ug-ctx-item' });

      // iconCss — Syncfusion-compatible icon class rendered before the label
      if (item.iconCss) {
        div.appendChild(el('span', { className: 'ug-ctx-icon ' + item.iconCss }));
      }
      div.appendChild(document.createTextNode(text));

      div.addEventListener('click', () => {
        grid.emit('contextMenuClick', { item: { id, text }, rowInfo: { rowData: data } });
        menu.style.display = 'none';
      });
      menu.appendChild(div);
    });

    menu.style.display = 'block';
    menu.style.top  = y + 'px';
    menu.style.left = x + 'px';
  },
};

export default ContextMenuModule;
export { ContextMenuModule };

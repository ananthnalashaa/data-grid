/**
 * Adaptive Module
 *
 * Provides mobile-friendly UI:
 *   • enableAdaptiveUI  — activates the adaptive layer (required)
 *   • rowRenderingMode  — 'Horizontal' (default) | 'Vertical' (card layout)
 *   • adaptiveUIMode    — 'Both' (default) | 'Mobile' (only on screens ≤ 767px)
 */

const AdaptiveModule = {
  name: 'Adaptive',

  init(grid) {
    grid._isAdaptive   = false;
    grid._isVertical   = false;

    const update = () => {
      if (!grid._opts.enableAdaptiveUI) {
        grid._isAdaptive = false;
        grid._isVertical = false;
        return;
      }

      const mode    = (grid._opts.adaptiveUIMode || 'Both').toLowerCase();
      const isSmall = window.matchMedia('(max-width: 767px)').matches;

      grid._isAdaptive = mode === 'both' || (mode === 'mobile' && isSmall);
      grid._isVertical = grid._isAdaptive && grid._opts.rowRenderingMode === 'Vertical';
    };

    grid._adaptiveResizeHandler = () => {
      const wasAdaptive  = grid._isAdaptive;
      const wasVertical  = grid._isVertical;
      update();
      if (wasAdaptive !== grid._isAdaptive || wasVertical !== grid._isVertical) {
        grid.render();
      }
    };

    update();
    window.addEventListener('resize', grid._adaptiveResizeHandler);
  },

  destroy(grid) {
    if (grid._adaptiveResizeHandler) {
      window.removeEventListener('resize', grid._adaptiveResizeHandler);
    }
  },

  beforeRender(grid) {
    if (!grid._root) return;
    grid._root.classList.toggle('ug-adaptive',          !!grid._isAdaptive);
    grid._root.classList.toggle('ug-adaptive-vertical', !!grid._isVertical);
  },
};

export default AdaptiveModule;
export { AdaptiveModule };

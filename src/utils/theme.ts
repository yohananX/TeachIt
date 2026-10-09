import { FontSizeSetting, ThemePaperMode } from '../types/lesson';

/**
 * Font size utilities — returns Tailwind class objects.
 * These are still used for text sizing via Tailwind utilities.
 */
export const getFontSizeClass = (size: FontSizeSetting) => {
  switch (size) {
    case 'sm':
      return {
        body: 'text-sm leading-relaxed',
        heading1: 'text-2xl font-serif font-medium',
        heading2: 'text-xl font-serif font-medium',
        heading3: 'text-base font-semibold',
        meta: 'text-xs',
        quote: 'text-sm italic',
      };
    case 'md':
      return {
        body: 'text-base leading-relaxed',
        heading1: 'text-3xl font-serif font-medium',
        heading2: 'text-2xl font-serif font-medium',
        heading3: 'text-lg font-semibold',
        meta: 'text-xs',
        quote: 'text-base italic',
      };
    case 'lg':
      return {
        body: 'text-lg leading-relaxed',
        heading1: 'text-4xl font-serif font-medium',
        heading2: 'text-3xl font-serif font-medium',
        heading3: 'text-xl font-semibold',
        meta: 'text-sm',
        quote: 'text-lg italic',
      };
    case 'xl':
      return {
        body: 'text-xl leading-relaxed',
        heading1: 'text-5xl font-serif font-medium',
        heading2: 'text-4xl font-serif font-medium',
        heading3: 'text-2xl font-semibold',
        meta: 'text-base',
        quote: 'text-xl italic',
      };
  }
};

/**
 * Paper mode — returns the mode string.
 * The actual styling is handled by CSS custom properties via [data-paper-mode] selector.
 * Components should apply the mode via `document.documentElement.dataset.paperMode = mode`.
 */
export const getPaperModeClass = (mode: ThemePaperMode): ThemePaperMode => mode;

/**
 * Apply paper mode to document root.
 * Call this when preferences change.
 */
export const applyPaperMode = (mode: ThemePaperMode): void => {
  document.documentElement.dataset.paperMode = mode;
};
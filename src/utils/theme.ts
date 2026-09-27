import { FontSizeSetting, ThemePaperMode } from '../types/lesson';

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

export const getPaperThemeClass = (mode: ThemePaperMode) => {
  switch (mode) {
    case 'warm-paper':
      return {
        bg: 'bg-[#FBF9F5]',
        cardBg: 'bg-[#F5F1E8]',
        border: 'border-[#E6DEC8]',
        text: 'text-[#1C1917]',
        mutedText: 'text-[#6B6358]',
        accent: '#9A3412', // terracotta
      };
    case 'clean-white':
      return {
        bg: 'bg-[#FFFFFF]',
        cardBg: 'bg-[#F8FAFC]',
        border: 'border-[#E2E8F0]',
        text: 'text-[#0F172A]',
        mutedText: 'text-[#64748B]',
        accent: '#1E3A8A', // deep lapis
      };
    case 'slate-focus':
      return {
        bg: 'bg-[#18181B]',
        cardBg: 'bg-[#27272A]',
        border: 'border-[#3F3F46]',
        text: 'text-[#F4F4F5]',
        mutedText: 'text-[#A1A1AA]',
        accent: '#D97706', // warm amber
      };
  }
};

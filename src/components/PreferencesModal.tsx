import React from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { useUI } from '../context/UIContext';
import { FontSizeSetting, ThemePaperMode } from '../types/lesson';
import { X, Check, RotateCcw, Type, Sun, Clock, Sparkles } from 'lucide-react';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose }) => {
  const { resetAllData } = useCurriculum();
  const { preferences, updatePreferences } = useUI();

  if (!isOpen) return null;

  const fontOptions: { key: FontSizeSetting; label: string; desc: string }[] = [
    { key: 'sm', label: 'Small', desc: 'Compact view for large monitors' },
    { key: 'md', label: 'Medium', desc: 'Standard classroom laptop scale' },
    { key: 'lg', label: 'Large', desc: 'High visibility for mobile phones' },
    { key: 'xl', label: 'Extra Large', desc: 'Legible from 4 feet away while standing' },
  ];

  const paperOptions: { key: ThemePaperMode; label: string; previewClass: string }[] = [
    { key: 'warm-paper', label: 'Archival Paper', previewClass: 'bg-[#FAF8F3] text-[#1C1917] border-[#DDD3BF]' },
    { key: 'clean-white', label: 'Clean White', previewClass: 'bg-white text-slate-900 border-slate-200' },
    { key: 'slate-focus', label: 'Dark Slate', previewClass: 'bg-stone-900 text-stone-100 border-stone-700' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#FAF8F3] border border-[#DDD3BF] rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#F2ECDD] border-b border-[#E2D8C3]">
          <div>
            <h3 className="text-base font-serif font-medium text-[#1C1917]">
              Reading & Display Settings
            </h3>
            <span className="text-xs text-[#786F62]">
              Customize classroom readability and appearance
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Font Size Selector */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-[#786F62] block mb-2 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              Lesson Text Scale (Section 23)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {fontOptions.map((opt) => {
                const isSelected = preferences.fontSize === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => updatePreferences({ fontSize: opt.key })}
                    className={`p-3 text-left rounded border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EFE8D8] border-[#9A3412] ring-1 ring-[#9A3412] text-[#1C1917]'
                        : 'bg-[#FAF7F0] border-[#DDD3BF] hover:bg-[#F2ECDD] text-[#574D42]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#9A3412]" />}
                    </div>
                    <p className="text-[11px] text-[#786F62] leading-tight">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paper Background Style */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-[#786F62] block mb-2 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" />
              Surface Appearance
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paperOptions.map((opt) => {
                const isSelected = preferences.paperMode === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => updatePreferences({ paperMode: opt.key })}
                    className={`p-2.5 rounded border text-center text-xs font-medium transition-all cursor-pointer ${opt.previewClass} ${
                      isSelected ? 'ring-2 ring-[#9A3412]' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timing guidance toggle */}
          <div className="pt-2 border-t border-[#EAE1CD]">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="pr-4">
                <span className="text-xs font-semibold text-[#1C1917] block">
                  Show Timing Guidance
                </span>
                <span className="text-[11px] text-[#786F62]">
                  Displays suggested minutes (e.g. 4 min). Timing is for guidance, not rigid timers.
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.showTimingGuidance}
                onChange={(e) => updatePreferences({ showTimingGuidance: e.target.checked })}
                className="w-4 h-4 rounded text-[#9A3412] focus:ring-[#9A3412]"
              />
            </label>
          </div>

          {/* Reset button */}
          <div className="pt-4 border-t border-[#EAE1CD] flex items-center justify-between">
            <button
              onClick={() => {
                if (window.confirm('Reset all demo lessons and curriculum to default state?')) {
                  resetAllData();
                  onClose();
                }
              }}
              className="text-xs text-[#786F62] hover:text-[#9A3412] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Curriculum Data</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#1C1917] text-white text-xs font-medium rounded hover:bg-[#333] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

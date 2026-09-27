import React, { useState } from 'react';
import { LessonResource } from '../types/lesson';
import { X, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, Play, Pause, RotateCcw } from 'lucide-react';

interface ResourceViewerModalProps {
  resource: LessonResource | null;
  onClose: () => void;
}

export const ResourceViewerModal: React.FC<ResourceViewerModalProps> = ({ resource, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(24);

  if (!resource) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150`}
      onClick={onClose}
    >
      <div
        className={`w-full bg-[#FAF8F3] border border-[#DDD3BF] rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'fixed inset-3 max-w-none max-h-none h-[calc(100vh-24px)]' : 'max-w-3xl max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#F2ECDD] border-b border-[#E2D8C3]">
          <div className="min-w-0 pr-4">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#786F62]">
              Lesson Resource · {resource.type.toUpperCase()}
            </span>
            <h3 className="text-base sm:text-lg font-serif font-medium text-[#1C1917] truncate">
              {resource.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {resource.type === 'image' && (
              <>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
                  className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom out image"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                  className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
                  title="Zoom In"
                  aria-label="Zoom in image"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
              title={isFullscreen ? 'Exit Classroom Display' : 'Classroom Presentation Mode'}
              aria-label={isFullscreen ? 'Exit full screen' : 'Full screen display'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors ml-1"
              aria-label="Close resource modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto bg-[#F7F4EC] p-4 flex items-center justify-center min-h-[300px]">
          {resource.type === 'image' && (
            <div className="flex flex-col items-center justify-center w-full max-w-full overflow-hidden">
              <div
                className="transition-transform duration-200 ease-out origin-center flex items-center justify-center"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img
                  src={resource.url}
                  alt={resource.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[60vh] max-w-full rounded shadow-md object-contain border border-[#E0D7C4]"
                />
              </div>
            </div>
          )}

          {resource.type === 'video' && (
            <div className="w-full max-w-2xl bg-black rounded-lg overflow-hidden flex flex-col shadow-lg border border-[#333]">
              <div className="relative aspect-video bg-stone-900 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 flex items-center justify-center mx-auto mb-3 cursor-pointer transition-colors"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
                  </div>
                  <p className="text-stone-300 text-sm font-medium">{resource.title}</p>
                  <p className="text-stone-500 text-xs mt-1">Classroom Educational Demonstration Player</p>
                </div>
              </div>

              {/* Video control track */}
              <div className="p-3 bg-stone-950 flex items-center gap-3 text-stone-300 text-xs">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-stone-200 hover:text-white"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="flex-1 bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#9A3412] h-full" style={{ width: `${simulatedProgress}%` }} />
                </div>
                <span className="font-mono text-[11px] text-stone-400">01:14 / 04:30</span>
              </div>
            </div>
          )}

          {resource.type === 'link' && (
            <div className="max-w-md w-full bg-[#FAF8F3] border border-[#DDD3BF] p-6 rounded-lg text-center shadow-sm">
              <span className="text-xs uppercase tracking-wider text-[#786F62] font-mono">External Web Reference</span>
              <h4 className="text-lg font-serif font-medium text-[#1C1917] mt-1 mb-2">{resource.title}</h4>
              <p className="text-sm text-[#574D42] mb-6 leading-relaxed">{resource.description}</p>
              
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#9A3412] hover:bg-[#852C0F] text-white text-xs font-semibold rounded transition-colors"
              >
                <span>Open Reference Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="text-[11px] text-[#8C8375] mt-3">
                Source: {resource.linkDomain || resource.url}
              </div>
            </div>
          )}
        </div>

        {/* Modal Caption and Teaching Notes */}
        <div className="p-4 bg-[#F2ECDD] border-t border-[#E2D8C3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#574D42]">
          <div className="max-w-xl">
            {resource.caption && (
              <p className="font-medium text-[#1C1917]">{resource.caption}</p>
            )}
            {resource.description && (
              <p className="text-[#6B6358] mt-0.5">{resource.description}</p>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[11px] text-[#8C8375]">ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

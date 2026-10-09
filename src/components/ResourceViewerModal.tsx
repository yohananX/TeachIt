import React, { useState, useEffect } from 'react';
import { LessonResource } from '../types/lesson';
import { X, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';

interface ResourceViewerModalProps {
  resource: LessonResource | null;
  onClose: () => void;
}

export const ResourceViewerModal: React.FC<ResourceViewerModalProps> = ({ resource, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!resource) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 ${isFullscreen ? 'bg-black' : ''}`}
      onClick={onClose}
    >
      <div
        className={`w-full bg-[#FAF8F3] border border-[#DDD3BF] rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'fixed inset-0 max-w-none max-h-none h-full' : 'max-w-3xl max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#F2ECDD] border-b border-[#E2D8C3]">
          <div className="min-w-0 pr-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#786F62]">
              Lesson Resource · {resource.type.toUpperCase()}
            </span>
            <h3 className="text-base sm:text-lg font-serif font-medium text-[#1C1917] truncate">
              {resource.title}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {resource.type === 'image' && (
              <>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                  className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                  className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
                  title="Zoom In"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
              title={isFullscreen ? 'Exit full screen' : 'Full screen'}
              aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto bg-[#F7F4EC] p-4 flex items-center justify-center min-h-[200px]">
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
                  className="max-h-[70vh] max-w-full rounded shadow-md object-contain border border-[#E0D7C4]"
                />
              </div>
            </div>
          )}

          {resource.type === 'video' && (
            <div className="w-full max-w-3xl">
              <video
                src={resource.url}
                controls
                className="w-full rounded-lg shadow-lg border border-[#333]"
                poster={resource.caption ? undefined : undefined}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {resource.type === 'link' && (
            <div className="max-w-md w-full bg-[#FAF8F3] border border-[#DDD3BF] p-6 rounded-lg text-center shadow-sm">
              <span className="text-xs uppercase tracking-wider text-[#786F62] font-mono">External Reference</span>
              <h4 className="text-lg font-serif font-medium text-[#1C1917] mt-1 mb-2">{resource.title}</h4>
              <p className="text-sm text-[#574D42] mb-4 leading-relaxed">{resource.description || 'No description provided.'}</p>

              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#9A3412] hover:bg-[#852C0F] text-white text-xs font-semibold rounded transition-colors"
              >
                <span>Open in Browser</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="text-[11px] text-[#8C8375] mt-3">
                Source: {resource.linkDomain || resource.url}
              </div>
            </div>
          )}
        </div>

        {/* Caption & Teaching Notes */}
        {(resource.caption || resource.description) && (
          <div className="p-4 bg-[#F2ECDD] border-t border-[#E2D8C3] text-xs text-[#574D42]">
            <div className="max-w-xl">
              {resource.caption && (
                <p className="font-medium text-[#1C1917]">{resource.caption}</p>
              )}
              {resource.description && resource.description !== resource.caption && (
                <p className="text-[#6B6358] mt-1">{resource.description}</p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2 mt-3">
              <span className="text-[11px] text-[#8C8375]">ESC to close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
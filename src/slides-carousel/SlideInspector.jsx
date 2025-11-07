import React from "react";
import { motion } from "framer-motion";
import { X, ExternalLink, CircleDot } from "lucide-react";

export default function SlideInspector({ slide, onClose }) {
  if (!slide) return null;

  // Load Font Awesome if not already loaded (for icons in bullet points)
  React.useEffect(() => {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <motion.div
      key={slide.slidenum}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", bounce: 0, duration: 0.25 }}
      className="slide-inspector absolute z-30 top-0 bottom-4 left-0 right-auto xl:left-auto xl:right-6 md:z-20 w-[340px] xl:w-[360px] xl:top-6 xl:bottom-8 pointer-events-auto"
    >
      <button
        aria-label="Close details"
        className="inline-flex absolute z-10 top-4 left-4 xl:top-4 xl:left-4 shadow-xl rounded-full p-2 bg-white ring ring-black/10 xl:shadow-2xl hover:bg-white"
        onClick={onClose}
      >
        <X className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      <div className="relative h-full overflow-y-auto rounded-none xl:rounded-3xl bg-white text-black xl:shadow-xl xl:ring ring-black/10">
        {/* Slide Image */}
        <div className="relative mt-2 xl:mt-0 px-2 xl:px-0">
          {slide.image_url ? (
            <img
              src={slide.image_url}
              alt={slide.title}
              className="w-full rounded-3xl xl:rounded-none h-80 object-cover xl:rounded-t-2xl"
            />
          ) : (
            <div className="w-full rounded-3xl xl:rounded-none h-80 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 flex items-center justify-center xl:rounded-t-2xl">
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}
        </div>

        <div className="h-[calc(100%-11rem)] sm:h-[calc(100%-14rem)]">
          <div className="p-4 sm:p-5">
            {/* Title and Subtitle */}
            <div className="text-2xl font-medium line-clamp-2">{slide.title}</div>
            <div className="text-sm mt-1 opacity-70">
              Slide {slide.slidenum} {slide.subtitle && `· ${slide.subtitle}`}
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex flex-row items-center gap-3 font-medium">
              {slide.presentation_view_url && (
                <a
                  href={slide.presentation_view_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#10a37f] text-white cursor-pointer px-4 py-1.5 text-sm hover:bg-[#0e906f] transition-colors inline-flex items-center gap-1.5"
                >
                  View Presentation
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>

            {/* Talk Track */}
            {slide.talktrack && (
              <div className="mt-5">
                <div className="text-lg font-medium mb-2">Talk Track</div>
                <p className="text-sm leading-relaxed text-gray-700">
                  {slide.talktrack}
                </p>
              </div>
            )}

            {/* Body/Bullet Points */}
            {slide.body && slide.body.length > 0 && (
              <div className="mt-5">
                <div className="text-lg font-medium mb-2">Key Points</div>
                <ul className="space-y-3">
                  {slide.body.map((bullet, idx) => (
                    <li key={idx} className="flex gap-3">
                      {bullet.icon && (
                        <i
                          className={`${bullet.icon} text-[#10a37f] mt-0.5 flex-none`}
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0 flex flex-col gap-1">
                        <div className="text-sm font-medium">{bullet.point}</div>
                        {bullet.description && (
                          <div className="text-xs text-gray-600">
                            {bullet.description}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {slide.sources && slide.sources.length > 0 && (
              <div className="mt-5 pb-4">
                <div className="text-lg font-medium mb-2">Sources</div>
                <ul className="space-y-2">
                  {slide.sources.map((source, idx) => (
                    <li key={idx}>
                      <a
                        href={source.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#10a37f] hover:underline inline-flex items-center gap-1"
                      >
                        {source.title}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

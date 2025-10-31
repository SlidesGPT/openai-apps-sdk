import { Download, ExternalLink } from "lucide-react";
import React from "react";
import { createRoot } from "react-dom/client";
import { useWidgetProps } from "../use-widget-props";

function App() {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const props = useWidgetProps({
    slide: {
      title: "Sample Slide",
      subtitle: "Subtitle here",
      slidenum: 1,
      image_url: "",
      presentation_view_url: "",
    },
  });

  const { slide } = props;

  if (!slide) {
    return (
      <div className="antialiased w-full min-h-[200px] flex items-center justify-center bg-white text-black/60">
        <p>No slide data available</p>
      </div>
    );
  }

  const hasImage = slide.image_url && slide.image_url.trim() !== "";

  return (
    <div className="antialiased w-full bg-white text-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* Slide Image */}
        <div className="relative w-full rounded-xl overflow-hidden ring-1 ring-black/10 shadow-lg">
          {hasImage && (
            <>
              {/* Loading Skeleton */}
              {!imageLoaded && !imageError && (
                <div className="w-full min-h-[400px] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 animate-pulse flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    <p className="text-sm text-gray-400">Loading slide...</p>
                  </div>
                </div>
              )}

              {/* Actual Image */}
              <img
                src={slide.image_url}
                alt={slide.title}
                className={`w-full h-auto object-contain bg-white transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0 absolute"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
              />
            </>
          )}

          {/* Error State - Only show if image actually failed to load */}
          {(!hasImage || imageError) && (
            <div className="w-full min-h-[300px] flex items-center justify-center bg-muted text-muted-foreground">
              <p>Slide image not available</p>
            </div>
          )}
        </div>

        {/* Slide Metadata */}
        <div className="mt-6 space-y-3">
          {/* <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-black/50 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  Slide {slide.slidenum}
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-black mb-1">
                {slide.title}
              </h2>
              {slide.subtitle && (
                <p className="text-base text-black/70">{slide.subtitle}</p>
              )}
            </div>
          </div> */}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {slide.presentation_view_url && (
              <a
                href={slide.presentation_view_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                View Presentation
              </a>
            )}
            {slide.image_url && (
              <a
                href={slide.image_url}
                download={`slide-${slide.slidenum}.png`}
                className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download Slide
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("slides-viewer-root")).render(<App />);

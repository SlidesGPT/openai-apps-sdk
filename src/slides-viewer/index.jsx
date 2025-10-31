import { Download, ExternalLink } from "lucide-react";
import React from "react";
import { createRoot } from "react-dom/client";
import { useWidgetProps } from "../use-widget-props";

function App() {
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

  return (
    <div className="antialiased w-full bg-white text-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* Slide Image */}
        <div className="relative w-full rounded-xl overflow-hidden ring-1 ring-black/10 shadow-lg">
          {slide.image_url ? (
            <img
              src={slide.image_url}
              alt={slide.title}
              className="w-full h-auto object-contain bg-white"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="hidden w-full min-h-[300px] items-center justify-center bg-muted text-muted-foreground"
            style={{ display: slide.image_url ? "none" : "flex" }}
          >
            <p>Slide image not available</p>
          </div>
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

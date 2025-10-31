import React from "react";
import { ExternalLink } from "lucide-react";

export default function SlideCard({ slide }) {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  if (!slide) return null;

  const hasImage = slide.image_url && slide.image_url.trim() !== "";

  return (
    <div className="min-w-[600px] max-w-[600px] w-[85vw] sm:w-[600px] select-none self-stretch flex flex-col">
      {/* Slide Image - Large like single viewer */}
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
              alt={`Slide ${slide.slidenum}`}
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
        {(!hasImage || imageError) && imageLoaded === false && (
          <div className="w-full min-h-[400px] flex items-center justify-center bg-muted text-muted-foreground">
            <p>Slide image not available</p>
          </div>
        )}
      </div>

      {/* Single View Button */}
      <div className="mt-4 flex justify-center">
        {slide.presentation_view_url && (
          <a
            href={slide.presentation_view_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            View
          </a>
        )}
      </div>
    </div>
  );
}

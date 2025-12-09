import React from "react";

export default function SlideCard({ slide, fullscreen = false, isMobile = false }) {
  const [slideLoaded, setSlideLoaded] = React.useState(false);

  if (!slide) return null;

  const hasSlide = slide.slide_url && slide.slide_url.trim() !== "";
  const hasLink = slide.presentation_view_url;

  // Determine sizing based on device and mode
  const getSizeClasses = () => {
    if (fullscreen) {
      if (isMobile) {
        return "w-[90vw] min-w-[90vw] max-w-[90vw]";
      }
      return "sm:min-w-[500px] sm:max-w-[500px] sm:w-[500px] lg:min-w-[700px] lg:max-w-[700px] lg:w-[700px] xl:min-w-[800px] xl:max-w-[800px] xl:w-[800px]";
    }
    return "min-w-[280px] max-w-[280px] w-[75vw] sm:w-[280px]";
  };

  const cardContent = (
    <div className={`relative w-full ${fullscreen ? "aspect-[16/9]" : "aspect-[16/9]"} rounded-2xl overflow-hidden ring ring-black/5 shadow-[0px_2px_6px_rgba(0,0,0,0.06)] transition-all duration-200 hover:ring-black/10 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.1)]`}>
      {/* Loading State */}
      {!slideLoaded && hasSlide && (
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-gray-300 border-r-transparent"></div>
            <p className="text-xs text-gray-400">Loading...</p>
          </div>
        </div>
      )}

      {/* Live Slide iframe */}
      {hasSlide && (
        <iframe
          src={slide.slide_url}
          className="absolute inset-0 w-full h-full border-0"
          style={{
            opacity: slideLoaded ? 1 : 0,
            transition: 'opacity 0.3s'
          }}
          onLoad={() => setSlideLoaded(true)}
          title={`Slide ${slide.slidenum}`}
          sandbox="allow-same-origin allow-scripts"
        />
      )}

      {/* No Slide State */}
      {!hasSlide && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <p className="text-xs">No slide available</p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`${getSizeClasses()} select-none`}>
      {hasLink && !fullscreen ? (
        <a
          href={slide.presentation_view_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block cursor-pointer"
        >
          {cardContent}
        </a>
      ) : (
        cardContent
      )}
    </div>
  );
}

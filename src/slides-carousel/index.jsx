import React from "react";
import { createRoot } from "react-dom/client";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, Maximize2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
  BrowserRouter,
} from "react-router-dom";
import { useWidgetProps } from "../use-widget-props";
import { useOpenAiGlobal } from "../use-openai-global";
import { useMaxHeight } from "../use-max-height";
import SlideCard from "./SlideCard";
import SlideInspector from "./SlideInspector";

function App() {
  const props = useWidgetProps({
    slides: [],
  });

  const { slides = [] } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const displayMode = useOpenAiGlobal("displayMode");
  const allowInspector = displayMode === "fullscreen";
  const maxHeight = useMaxHeight() ?? undefined;

  // Parse selected slide ID from URL
  const selectedSlideNum = React.useMemo(() => {
    const match = location?.pathname?.match(/(?:^|\/)slide\/(\d+)/);
    return match && match[1] ? parseInt(match[1], 10) : null;
  }, [location?.pathname]);

  const selectedSlide = slides.find((s) => s.slidenum === selectedSlideNum) || null;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    containScroll: "trimSnaps",
    slidesToScroll: "auto",
    dragFree: false,
  });
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  React.useEffect(() => {
    if (!emblaApi) return;
    const updateButtons = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi]);

  // Show loading state while slides are being generated
  if (!slides || slides.length === 0) {
    return (
      <div className="antialiased w-full min-h-[400px] flex items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-sm text-gray-400">Generating slides...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          height: displayMode === "fullscreen" ? maxHeight : "auto",
        }}
        className={
          "relative antialiased w-full overflow-hidden text-black bg-white " +
          (displayMode === "fullscreen"
            ? "rounded-none border-0"
            : "border-0")
        }
      >
        {/* Fullscreen Toggle Button */}
        {displayMode !== "fullscreen" && (
          <button
            aria-label="Enter fullscreen"
            className="absolute top-4 right-4 z-30 rounded-full bg-white text-black shadow-lg ring ring-black/5 p-2.5 pointer-events-auto hover:ring-black/10 hover:shadow-xl transition-all"
            onClick={() => {
              if (selectedSlideNum) {
                navigate("..", { replace: true });
              }
              if (typeof window !== "undefined" && window?.webplus?.requestDisplayMode) {
                window.webplus.requestDisplayMode({ mode: "fullscreen" });
              }
            }}
          >
            <Maximize2
              strokeWidth={1.5}
              className="h-4.5 w-4.5"
              aria-hidden="true"
            />
          </button>
        )}

        {/* Slide Inspector (right panel in fullscreen) */}
        <AnimatePresence>
          {allowInspector && selectedSlide && (
            <SlideInspector
              key={selectedSlide.slidenum}
              slide={selectedSlide}
              onClose={() => navigate("..")}
            />
          )}
        </AnimatePresence>

        {/* Carousel Container */}
        <div
          className={
            "relative w-full " +
            (displayMode === "fullscreen"
              ? "h-full flex items-center py-0"
              : "py-5") +
            " " +
            (displayMode === "fullscreen" && allowInspector
              ? "xl:mr-[380px]"
              : "")
          }
        >
          <div className="overflow-hidden w-full h-full" ref={emblaRef}>
            <div className={`flex items-center ${displayMode === "fullscreen" ? "gap-6 px-8" : "gap-4 px-5"}`}>
              {slides.map((slide, index) => (
                <div
                  key={slide.slidenum || index}
                  onClick={() => {
                    if (displayMode === "fullscreen") {
                      navigate(`/slide/${slide.slidenum}`);
                    }
                  }}
                  className={displayMode === "fullscreen" ? "cursor-pointer" : ""}
                >
                  <SlideCard slide={slide} fullscreen={displayMode === "fullscreen"} />
                </div>
              ))}
            </div>
          </div>

          {/* Edge gradients */}
          <div
            aria-hidden
            className={
              "pointer-events-none absolute inset-y-0 left-0 w-8 z-[5] transition-opacity duration-200 " +
              (canPrev ? "opacity-100" : "opacity-0")
            }
          >
            <div
              className="h-full w-full border-l border-black/15 bg-gradient-to-r from-black/10 to-transparent"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
              }}
            />
          </div>
          <div
            aria-hidden
            className={
              "pointer-events-none absolute inset-y-0 right-0 w-8 z-[5] transition-opacity duration-200 " +
              (canNext ? "opacity-100" : "opacity-0")
            }
          >
            <div
              className="h-full w-full border-r border-black/15 bg-gradient-to-l from-black/10 to-transparent"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, white 30%, white 70%, transparent 100%)",
              }}
            />
          </div>

          {/* Navigation Buttons */}
          {canPrev && (
            <button
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white text-black shadow-lg ring ring-black/5 hover:bg-white active:scale-95 transition-transform"
              onClick={() => emblaApi && emblaApi.scrollPrev()}
              type="button"
            >
              <ArrowLeft
                strokeWidth={1.5}
                className="h-4.5 w-4.5"
                aria-hidden="true"
              />
            </button>
          )}
          {canNext && (
            <button
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white text-black shadow-lg ring ring-black/5 hover:bg-white active:scale-95 transition-transform"
              onClick={() => emblaApi && emblaApi.scrollNext()}
              type="button"
            >
              <ArrowRight
                strokeWidth={1.5}
                className="h-4.5 w-4.5"
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function RouterRoot() {
  return (
    <Routes>
      <Route path="*" element={<App />} />
    </Routes>
  );
}

createRoot(document.getElementById("slides-carousel-root")).render(
  <BrowserRouter>
    <RouterRoot />
  </BrowserRouter>
);

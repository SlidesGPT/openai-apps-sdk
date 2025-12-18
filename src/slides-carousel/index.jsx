import { Button } from "@openai/apps-sdk-ui/components/Button";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Maximize2,
  Palette,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  generateCSSBackground,
  getAllThemes,
} from "../lib/themes/theme-library";
import { useMaxHeight } from "../use-max-height";
import { useOpenAiGlobal } from "../use-openai-global";
import { useWidgetProps } from "../use-widget-props";
import SlideCard from "./SlideCard";

// Compact theme preview for sidebar
function ThemePreview({ theme, isSelected, isApplying, onSelect }) {
  return (
    <button
      onClick={onSelect}
      disabled={isApplying}
      className={`
        relative w-full rounded-lg overflow-hidden border-2 transition-all duration-200
        ${
          isSelected
            ? "border-primary ring-2 ring-primary/30"
            : "border-gray-200 hover:border-primary/50"
        }
        ${isApplying ? "opacity-50 cursor-wait" : "cursor-pointer"}
      `}
      title={theme.name}
    >
      {/* Theme Preview */}
      <div
        className="aspect-[16/10] w-full flex items-center justify-center p-2"
        style={{
          background: generateCSSBackground(theme.background),
        }}
      >
        <div className="space-y-1 text-center">
          <div
            className="text-[10px] font-bold truncate"
            style={{
              color: theme.colors.heading,
              fontFamily: theme.fontFamily,
            }}
          >
            Heading
          </div>
          <div
            className="text-[8px]"
            style={{
              color: theme.colors.body,
              fontFamily: theme.fontFamily,
            }}
          >
            Body
          </div>
          <div
            className="mx-auto h-0.5 w-6 rounded-full"
            style={{ backgroundColor: theme.colors.accent }}
          />
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Theme name */}
      <div className="px-1.5 py-1.5 bg-white">
        <p className="text-[10px] font-medium text-gray-700 truncate text-center">
          {theme.name}
        </p>
      </div>
    </button>
  );
}

// Theme selector sidebar for fullscreen mode
function ThemeSidebar({
  deckId,
  currentThemeId,
  onThemeApplied,
  onClose,
  isDarkMode,
}) {
  const [selectedTheme, setSelectedTheme] = React.useState(currentThemeId);
  const [isApplying, setIsApplying] = React.useState(false);
  const [error, setError] = React.useState(null);

  const allThemes = React.useMemo(() => getAllThemes(), []);

  const handleThemeSelect = async (themeId) => {
    if (themeId === selectedTheme || isApplying || !deckId) return;

    setIsApplying(true);
    setError(null);

    // STEP 1: INSTANT VISUAL UPDATE
    setSelectedTheme(themeId);
    if (onThemeApplied) {
      onThemeApplied(themeId);
    }

    // STEP 2: OPTIMISTIC API CALL
    try {
      const response = await fetch(
        "https://local.ajinkyabodke.com/api/chat/apply-theme-for-gpt",
        {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deckId, themeId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to apply theme");
      }

      await response.json();
    } catch (err) {
      setError("Failed to apply theme. Please try again.");
      console.error("Theme apply error:", err);
      // Revert visual update on error
      setSelectedTheme(currentThemeId);
      if (onThemeApplied) {
        onThemeApplied(currentThemeId);
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 ${
        isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
      } border-l shadow-2xl z-50 overflow-y-auto`}
    >
      {/* Header */}
      <div
        className={`sticky top-0 ${
          isDarkMode ? "bg-gray-900" : "bg-white"
        } border-b ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        } p-4 flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          <Palette
            className={`w-5 h-5 ${
              isDarkMode ? "text-blue-400" : "text-primary"
            }`}
          />
          <h3
            className={`font-semibold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Choose Theme
          </h3>
          {isApplying && (
            <Loader2
              className={`w-4 h-4 animate-spin ${
                isDarkMode ? "text-blue-400" : "text-primary"
              }`}
            />
          )}
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg ${
            isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
          } transition-colors`}
          aria-label="Close theme selector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Theme grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {allThemes.map((theme) => (
            <ThemePreview
              key={theme.id}
              theme={theme}
              isSelected={selectedTheme === theme.id}
              isApplying={isApplying}
              onSelect={() => handleThemeSelect(theme.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className={`sticky bottom-0 ${
          isDarkMode ? "bg-gray-900" : "bg-white"
        } border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"} p-4`}
      >
        <p
          className={`text-xs ${
            isDarkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {allThemes.length} themes available
        </p>
      </div>
    </div>
  );
}

function App() {
  const props = useWidgetProps({
    slides: [],
    deck_id: null,
    theme_id: null,
    presentation_id: null,
  });

  const { slides = [], deck_id, theme_id, presentation_id } = props;

  const [currentThemeId, setCurrentThemeId] = React.useState(theme_id);
  const [showThemeSidebar, setShowThemeSidebar] = React.useState(false);
  const [updatedSlides, setUpdatedSlides] = React.useState(slides);

  // OpenAI SDK hooks
  const displayMode = useOpenAiGlobal("displayMode");
  const maxHeight = useMaxHeight() ?? undefined;
  const theme = useOpenAiGlobal("theme");
  const userAgent = useOpenAiGlobal("userAgent");
  const safeArea = useOpenAiGlobal("safeArea");

  // Detect device type
  const isMobile = userAgent?.device?.type === "mobile";
  const isDarkMode = theme === "dark";
  const isFullscreen = displayMode === "fullscreen";

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    containScroll: "trimSnaps",
    slidesToScroll: "auto",
    dragFree: false,
  });
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const updateButtons = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
      setCurrentSlideIndex(emblaApi.selectedScrollSnap());
    };
    updateButtons();
    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi]);

  // Update slides when theme changes
  React.useEffect(() => {
    if (theme_id) {
      setCurrentThemeId(theme_id);
    }
  }, [theme_id]);

  React.useEffect(() => {
    setUpdatedSlides(slides);
  }, [slides]);

  const handleThemeApplied = (themeId) => {
    setCurrentThemeId(themeId);
    // Update all slide URLs with new theme
    const updated = updatedSlides.map((slide) => {
      const url = new URL(slide.slide_url);
      url.searchParams.set("themeId", themeId);
      url.searchParams.set("t", Date.now().toString());
      return {
        ...slide,
        slide_url: url.toString(),
      };
    });
    setUpdatedSlides(updated);
  };

  const handleRequestFullscreen = () => {
    if (window.openai?.requestDisplayMode) {
      window.openai.requestDisplayMode({ mode: "fullscreen" });
    }
  };

  const handleExitFullscreen = () => {
    if (window.openai?.requestDisplayMode) {
      window.openai.requestDisplayMode({ mode: "inline" });
    }
  };

  const handleRegenerateSlide = async () => {
    if (
      !window.openai?.callTool ||
      !presentation_id ||
      !updatedSlides[currentSlideIndex]
    )
      return;

    try {
      const currentSlide = updatedSlides[currentSlideIndex];
      await window.openai.callTool("slide-viewer", {
        presentation_id: presentation_id,
        slide_data: {
          ...currentSlide,
          force_edit: true,
        },
      });
    } catch (error) {
      console.error("Failed to regenerate slide:", error);
    }
  };

  const handleGenerateNextSlide = async () => {
    if (!window.openai?.callTool || !presentation_id || !updatedSlides.length)
      return;

    try {
      const lastSlide = updatedSlides[updatedSlides.length - 1];
      await window.openai.callTool("slide-viewer", {
        presentation_id: presentation_id,
        slide_data: {
          ...lastSlide,
          slidenum: lastSlide.slidenum + 1,
          title: "",
          subtitle: "",
          body: [],
          talktrack: "",
          sources: [],
        },
      });
    } catch (error) {
      console.error("Failed to generate next slide:", error);
    }
  };

  // Show loading state while slides are being generated
  if (!updatedSlides || updatedSlides.length === 0) {
    return (
      <div
        className={`antialiased w-full min-h-[400px] flex items-center justify-center ${
          isDarkMode ? "bg-gray-900" : "bg-white"
        }`}
      >
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-400"
            }`}
          >
            Generating slides...
          </p>
        </div>
      </div>
    );
  }

  // Calculate safe area padding for fullscreen mode
  const safeAreaTop = safeArea?.insets?.top ?? 0;
  const safeAreaBottom = safeArea?.insets?.bottom ?? 0;
  const safeAreaLeft = safeArea?.insets?.left ?? 0;
  const safeAreaRight = safeArea?.insets?.right ?? 0;

  return (
    <>
      {/* Theme Sidebar */}
      {showThemeSidebar && isFullscreen && (
        <ThemeSidebar
          deckId={deck_id}
          currentThemeId={currentThemeId}
          onThemeApplied={handleThemeApplied}
          onClose={() => setShowThemeSidebar(false)}
          isDarkMode={isDarkMode}
        />
      )}

      <div
        style={{
          height: isFullscreen ? maxHeight : "auto",
          paddingTop: isFullscreen && isMobile ? `${safeAreaTop}px` : undefined,
          paddingBottom:
            isFullscreen && isMobile ? `${safeAreaBottom}px` : undefined,
        }}
        className={
          `relative antialiased w-full overflow-hidden ${
            isDarkMode ? "text-white bg-gray-900" : "text-black bg-white"
          } ` + (isFullscreen ? "rounded-none border-0" : "border-0")
        }
      >
        {/* Fullscreen Header Controls */}
        {isFullscreen && (
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                Slide {currentSlideIndex + 1} of {updatedSlides.length}
              </span>

              {/* Tool calling buttons in fullscreen */}
              {window.openai?.callTool && presentation_id && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRegenerateSlide}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateNextSlide}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Slide
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Button */}
              {deck_id && (
                <button
                  onClick={() => setShowThemeSidebar(!showThemeSidebar)}
                  className={`p-2 rounded-lg ${
                    isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                  } transition-colors`}
                  aria-label="Choose theme"
                >
                  <Palette className="w-5 h-5" />
                </button>
              )}

              {/* Exit Fullscreen Button */}
              <button
                onClick={handleExitFullscreen}
                className={`p-2 rounded-lg ${
                  isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                } transition-colors`}
                aria-label="Exit fullscreen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Fullscreen Toggle Button (inline mode only) */}
        {!isFullscreen && (
          <button
            aria-label="Enter fullscreen"
            className={`absolute top-4 right-4 z-30 rounded-full ${
              isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
            } shadow-lg ring ${
              isDarkMode ? "ring-white/10" : "ring-black/5"
            } p-2.5 pointer-events-auto hover:${
              isDarkMode ? "ring-white/20" : "ring-black/10"
            } hover:shadow-xl transition-all`}
            onClick={handleRequestFullscreen}
          >
            <Maximize2
              strokeWidth={1.5}
              className="h-4.5 w-4.5"
              aria-hidden="true"
            />
          </button>
        )}

        {/* Carousel Container */}
        <div
          className={
            "relative w-full " +
            (isFullscreen
              ? "h-full flex items-center justify-center py-0"
              : "py-5")
          }
        >
          <div
            className={`overflow-hidden w-full ${isFullscreen ? "" : "h-full"}`}
            ref={emblaRef}
          >
            <div
              className={`flex items-center ${
                isFullscreen ? (isMobile ? "gap-3" : "gap-6 sm:gap-6") : "gap-4"
              }`}
              style={{
                paddingLeft:
                  isFullscreen && isMobile
                    ? `${Math.max(16, safeAreaLeft)}px`
                    : isFullscreen
                    ? "2rem"
                    : "1.25rem",
                paddingRight:
                  isFullscreen && isMobile
                    ? `${Math.max(16, safeAreaRight)}px`
                    : isFullscreen
                    ? "2rem"
                    : "1.25rem",
              }}
            >
              {updatedSlides.map((slide, index) => (
                <div
                  key={slide.slidenum || index}
                  onClick={() => {
                    if (isFullscreen && slide.presentation_view_url) {
                      if (window.openai?.openExternal) {
                        window.openai.openExternal({
                          href: slide.presentation_view_url,
                        });
                      } else {
                        window.open(slide.presentation_view_url, "_blank");
                      }
                    }
                  }}
                  className={isFullscreen ? "cursor-pointer" : ""}
                >
                  <SlideCard
                    slide={slide}
                    fullscreen={isFullscreen}
                    isMobile={isMobile}
                  />
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
              className={`h-full w-full border-l ${
                isDarkMode
                  ? "border-white/15 bg-gradient-to-r from-white/10"
                  : "border-black/15 bg-gradient-to-r from-black/10"
              } to-transparent`}
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
              className={`h-full w-full border-r ${
                isDarkMode
                  ? "border-white/15 bg-gradient-to-l from-white/10"
                  : "border-black/15 bg-gradient-to-l from-black/10"
              } to-transparent`}
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
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full ${
                isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
              } shadow-lg ring ${
                isDarkMode ? "ring-white/10" : "ring-black/5"
              } hover:${
                isDarkMode ? "bg-gray-700" : "bg-white"
              } active:scale-95 transition-transform`}
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
              className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center h-8 w-8 rounded-full ${
                isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"
              } shadow-lg ring ${
                isDarkMode ? "ring-white/10" : "ring-black/5"
              } hover:${
                isDarkMode ? "bg-gray-700" : "bg-white"
              } active:scale-95 transition-transform`}
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

createRoot(document.getElementById("slides-carousel-root")).render(<App />);

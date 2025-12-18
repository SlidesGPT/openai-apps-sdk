import { Button } from "@openai/apps-sdk-ui/components/Button";
import {
  Check,
  ExternalLink,
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

// Compact theme preview for inline selector
function ThemePreview({ theme, isSelected, isApplying, onSelect }) {
  return (
    <button
      onClick={onSelect}
      disabled={isApplying}
      className={`
        relative flex-shrink-0 w-28 rounded-lg overflow-hidden border-2 transition-all duration-200
        ${
          isSelected
            ? "border-primary ring-2 ring-primary/30 scale-105"
            : "border-gray-200 hover:border-primary/50 hover:scale-102"
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

// Inline theme selector row
function ThemeSelector({ deckId, currentThemeId, onThemeApplied }) {
  const [selectedTheme, setSelectedTheme] = React.useState(currentThemeId);
  const [isApplying, setIsApplying] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const allThemes = React.useMemo(() => getAllThemes(), []);

  const handleThemeSelect = async (themeId) => {
    if (themeId === selectedTheme || isApplying || !deckId) return;

    setIsApplying(true);
    setError(null);

    // STEP 1: INSTANT VISUAL UPDATE - Update iframe URL immediately (no await!)
    setSelectedTheme(themeId);
    if (onThemeApplied) {
      onThemeApplied(themeId);
    }

    // STEP 2: OPTIMISTIC API CALL - Update database in background (user doesn't wait for this)
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

      await response.json(); // Confirm success
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

  if (!deckId) return null;

  return (
    <div className="mt-4 bg-gray-50 rounded-xl p-3">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left mb-2"
      >
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-gray-700">
            {isExpanded ? "Choose a theme" : "Customize theme"}
          </span>
          {isApplying && (
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
          )}
        </div>
        <span className="text-xs text-gray-500">
          {isExpanded ? "▲" : "▼"} {allThemes.length} themes
        </span>
      </button>

      {/* Error message */}
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {/* Theme grid - always show a preview row, expandable for full grid */}
      <div
        className={`overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 ${
          isExpanded ? "" : "max-h-24"
        }`}
      >
        <div
          className={`
          ${
            isExpanded
              ? "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2"
              : "flex gap-2 pb-2"
          }
        `}
        >
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
    </div>
  );
}

function App() {
  const [slideLoaded, setSlideLoaded] = React.useState(false);
  const [currentSlideUrl, setCurrentSlideUrl] = React.useState(null);
  const [currentThemeId, setCurrentThemeId] = React.useState(null);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [isGeneratingNext, setIsGeneratingNext] = React.useState(false);

  const props = useWidgetProps({
    slide: {
      title: "Sample Slide",
      subtitle: "Subtitle here",
      slidenum: 1,
      slide_url: "",
      presentation_view_url: "",
    },
    deck_id: null,
    theme_id: null,
    presentation_id: null,
  });

  const { slide, deck_id, theme_id, presentation_id } = props;

  // OpenAI SDK hooks
  const displayMode = useOpenAiGlobal("displayMode");
  const maxHeight = useMaxHeight() ?? undefined;
  const theme = useOpenAiGlobal("theme");
  const userAgent = useOpenAiGlobal("userAgent");
  const safeArea = useOpenAiGlobal("safeArea");

  // Detect device type
  const isMobile = userAgent?.device?.type === "mobile";
  const isDarkMode = theme === "dark";

  // Initialize current slide URL from props
  React.useEffect(() => {
    if (slide?.slide_url && !currentSlideUrl) {
      setCurrentSlideUrl(slide.slide_url);
    }
    if (theme_id && !currentThemeId) {
      setCurrentThemeId(theme_id);
    }
  }, [slide?.slide_url, theme_id, currentSlideUrl, currentThemeId]);

  const handleThemeApplied = (themeId) => {
    // Instant visual update: update iframe URL with new themeId parameter
    setCurrentThemeId(themeId);
    const url = new URL(currentSlideUrl || slide.slide_url);
    url.searchParams.set("themeId", themeId);
    url.searchParams.set("t", Date.now().toString()); // Cache bust
    setCurrentSlideUrl(url.toString());
  };

  const handleRegenerateSlide = async () => {
    if (!window.openai?.callTool || !presentation_id) return;

    setIsRegenerating(true);
    try {
      // Call the slide-viewer tool with force_edit: true to regenerate
      await window.openai.callTool("slide-viewer", {
        presentation_id: presentation_id,
        slide_data: {
          ...slide,
          force_edit: true,
        },
      });
    } catch (error) {
      console.error("Failed to regenerate slide:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleGenerateNextSlide = async () => {
    if (!window.openai?.callTool || !presentation_id) return;

    setIsGeneratingNext(true);
    try {
      // Call the slide-viewer tool with next slide number
      await window.openai.callTool("slide-viewer", {
        presentation_id: presentation_id,
        slide_data: {
          ...slide,
          slidenum: slide.slidenum + 1,
          title: "",
          subtitle: "",
          body: [],
          talktrack: "",
          sources: [],
        },
      });
    } catch (error) {
      console.error("Failed to generate next slide:", error);
    } finally {
      setIsGeneratingNext(false);
    }
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

  if (!slide) {
    return (
      <div className="antialiased w-full min-h-[200px] flex items-center justify-center bg-white text-black/60">
        <p>No slide data available</p>
      </div>
    );
  }

  const displaySlideUrl = currentSlideUrl || slide.slide_url;
  const hasSlide = displaySlideUrl && displaySlideUrl.trim() !== "";

  // Calculate safe area padding for fullscreen mode
  const safeAreaTop = safeArea?.insets?.top ?? 0;
  const safeAreaBottom = safeArea?.insets?.bottom ?? 0;
  const safeAreaLeft = safeArea?.insets?.left ?? 0;
  const safeAreaRight = safeArea?.insets?.right ?? 0;

  const isFullscreen = displayMode === "fullscreen";

  return (
    <div
      className={`antialiased w-full ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-white text-black"
      } ${isFullscreen ? "h-screen" : "p-6"}`}
      style={{
        height: isFullscreen ? maxHeight : "auto",
        paddingTop: isFullscreen && isMobile ? `${safeAreaTop}px` : undefined,
        paddingBottom:
          isFullscreen && isMobile ? `${safeAreaBottom}px` : undefined,
        paddingLeft:
          isFullscreen && isMobile
            ? `${Math.max(16, safeAreaLeft)}px`
            : undefined,
        paddingRight:
          isFullscreen && isMobile
            ? `${Math.max(16, safeAreaRight)}px`
            : undefined,
      }}
    >
      <div
        className={`${
          isFullscreen ? "h-full flex flex-col" : "max-w-4xl mx-auto"
        }`}
      >
        {/* Fullscreen Header Controls */}
        {isFullscreen && (
          <div className="flex items-center justify-between mb-4 px-4 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Slide {slide.slidenum}
              </span>
            </div>
            <button
              onClick={handleExitFullscreen}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Exit fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Live Slide Embed */}
        <div
          className={`relative w-full rounded-xl overflow-hidden ring-1 ${
            isDarkMode ? "ring-white/10" : "ring-black/10"
          } shadow-lg ${isDarkMode ? "bg-gray-800" : "bg-white"} ${
            isFullscreen ? "flex-1" : ""
          }`}
        >
          {/* Fullscreen Toggle Button (only in inline mode) */}
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

          {/* Loading State */}
          {!slideLoaded && hasSlide && (
            <div
              className={`absolute inset-0 z-10 bg-gradient-to-br ${
                isDarkMode
                  ? "from-gray-800 via-gray-900 to-gray-800"
                  : "from-gray-100 via-gray-50 to-gray-100"
              } flex items-center justify-center`}
            >
              <div className="text-center space-y-3">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-400"
                  }`}
                >
                  Loading slide...
                </p>
              </div>
            </div>
          )}

          {/* Live Slide iframe */}
          {hasSlide && (
            <iframe
              src={displaySlideUrl}
              className={`w-full border-0 ${
                isFullscreen ? "h-full" : "aspect-video"
              }`}
              style={{
                minHeight: isFullscreen ? "100%" : "240px",
                opacity: slideLoaded ? 1 : 0,
                transition: "opacity 0.3s",
              }}
              onLoad={() => setSlideLoaded(true)}
              title={slide.title}
              sandbox="allow-same-origin allow-scripts"
            />
          )}

          {/* No Slide State */}
          {!hasSlide && (
            <div
              className={`w-full min-h-[400px] flex items-center justify-center ${
                isDarkMode
                  ? "bg-gray-800 text-gray-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <p>No slide available</p>
            </div>
          )}
        </div>

        {/* Inline Theme Selector - Only show in inline mode */}
        {!isFullscreen && (
          <ThemeSelector
            deckId={deck_id}
            currentThemeId={currentThemeId}
            onThemeApplied={handleThemeApplied}
          />
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          {/* Regenerate Slide Button */}
          {window.openai?.callTool && presentation_id && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerateSlide}
              disabled={isRegenerating}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  isRegenerating ? "animate-spin" : ""
                }`}
              />
              {isRegenerating ? "Regenerating..." : "Regenerate Slide"}
            </Button>
          )}

          {/* Generate Next Slide Button */}
          {window.openai?.callTool && presentation_id && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateNextSlide}
              disabled={isGeneratingNext}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isGeneratingNext ? "Generating..." : "Generate Next Slide"}
            </Button>
          )}

          {/* View Presentation Button */}
          {slide.presentation_view_url && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (window.openai?.openExternal) {
                  window.openai.openExternal({
                    href: slide.presentation_view_url,
                  });
                } else {
                  window.open(slide.presentation_view_url, "_blank");
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
              View Presentation
            </Button>
          )}

          {/* Open in New Tab Button */}
          {displaySlideUrl && !isFullscreen && (
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => {
                if (window.openai?.openExternal) {
                  window.openai.openExternal({ href: displaySlideUrl });
                } else {
                  window.open(displaySlideUrl, "_blank");
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
              Open in New Tab
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("slides-viewer-root")).render(<App />);

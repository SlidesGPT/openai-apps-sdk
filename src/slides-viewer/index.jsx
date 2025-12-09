import { Check, ExternalLink, Loader2, Palette } from "lucide-react";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  generateCSSBackground,
  getAllThemes,
} from "../lib/themes/theme-library";
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

    try {
      const response = await fetch(
        "https://slidesgpt-next-git-feat-custom-themes-in-gpt-slidesgpt.vercel.app/api/chat/apply-theme-for-gpt",
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
      setSelectedTheme(themeId);

      // Notify parent about theme change
      if (onThemeApplied) {
        onThemeApplied(themeId);
      }
    } catch (err) {
      setError("Failed to apply theme. Please try again.");
      console.error("Theme apply error:", err);
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
  });

  const { slide, deck_id, theme_id } = props;

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
    // When theme changes, force iframe reload by appending timestamp
    setCurrentThemeId(themeId);
    setSlideLoaded(false);

    const url = new URL(currentSlideUrl || slide.slide_url);
    url.searchParams.set("t", Date.now().toString());
    setCurrentSlideUrl(url.toString());
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

  return (
    <div className="antialiased w-full bg-white text-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* Live Slide Embed */}
        <div className="relative w-full rounded-xl overflow-hidden ring-1 ring-black/10 shadow-lg bg-white">
          {/* Loading State */}
          {!slideLoaded && hasSlide && (
            <div className="absolute inset-0 z-10 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="text-sm text-gray-400">Loading slide...</p>
              </div>
            </div>
          )}

          {/* Live Slide iframe */}
          {hasSlide && (
            <iframe
              src={displaySlideUrl}
              className="w-full aspect-video border-0"
              style={{
                minHeight: "240px",
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
            <div className="w-full min-h-[400px] flex items-center justify-center bg-muted text-muted-foreground">
              <p>No slide available</p>
            </div>
          )}
        </div>

        {/* Inline Theme Selector */}
        <ThemeSelector
          deckId={deck_id}
          currentThemeId={currentThemeId}
          onThemeApplied={handleThemeApplied}
        />

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-3">
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
          {displaySlideUrl && (
            <a
              href={displaySlideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open in New Tab
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("slides-viewer-root")).render(<App />);

import { useState, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useWidgetProps } from "../use-widget-props";
import { useOpenAiGlobal } from "../use-openai-global";
import { useMaxHeight } from "../use-max-height";
import { ThemeCard } from "./ThemeCard";
import {
  THEME_LIBRARY,
  getAllThemes,
  type PresentationTheme,
  type ThemeCategory,
} from "../lib/themes/theme-library";
import { Palette, ChevronDown, ChevronUp } from "lucide-react";

// Props interface for the widget
interface ThemePickerProps {
  [key: string]: unknown;
  // Collage images to display at the top
  collage_images?: string[];
  // Currently selected theme ID (if any)
  current_theme_id?: string;
  // Deck ID to apply theme to
  deck_id?: string;
  // Message to show to the user
  message?: string;
  // Instructions text
  instructions?: string;
  // Optional: pre-filtered categories to show
  categories?: ThemeCategory[];
  // Optional: recommended theme ID based on content
  recommended_theme_id?: string;
}

function ThemePicker() {
  const props = useWidgetProps<ThemePickerProps>({
    collage_images: [],
    current_theme_id: undefined,
    deck_id: undefined,
    message: undefined,
    instructions: undefined,
    categories: undefined,
    recommended_theme_id: undefined,
  });

  const {
    collage_images = [],
    current_theme_id,
    deck_id,
    message,
    instructions,
    categories: filteredCategories,
    recommended_theme_id,
  } = props;

  const displayMode = useOpenAiGlobal("displayMode");
  const maxHeight = useMaxHeight() ?? undefined;
  const userAgent = useOpenAiGlobal("userAgent");
  const safeArea = useOpenAiGlobal("safeArea");

  // Local state
  const [selectedThemeId, setSelectedThemeId] = useState<string | undefined>(
    current_theme_id
  );
  const [expandedCollage, setExpandedCollage] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );

  // Detect device type
  const isMobile = userAgent?.device?.type === "mobile";

  // Filter themes by category if specified
  const groupedThemes = useMemo(() => {
    const groups: {
      category: ThemeCategory;
      name: string;
      description: string;
      themes: PresentationTheme[];
    }[] = [];

    // Handle different formats of categories prop:
    // 1. undefined -> use all categories
    // 2. Array like ["urban", "gradient"] -> filter to those
    // 3. Object like { urban: [...], gradient: [...] } -> extract keys
    let categoriesToShow: ThemeCategory[];

    if (!filteredCategories) {
      categoriesToShow = ["urban", "gradient"] as ThemeCategory[];
    } else if (Array.isArray(filteredCategories)) {
      categoriesToShow = filteredCategories;
    } else if (typeof filteredCategories === "object") {
      // It's an object with category keys - extract the keys
      categoriesToShow = Object.keys(filteredCategories) as ThemeCategory[];
    } else {
      categoriesToShow = ["urban", "gradient"] as ThemeCategory[];
    }

    categoriesToShow.forEach((key) => {
      const category = THEME_LIBRARY.categories[key];
      if (category) {
        groups.push({
          category: key,
          name: category.name,
          description: category.description,
          themes: category.themes,
        });
      }
    });

    return groups;
  }, [filteredCategories]);

  // Get recommended theme object
  const recommendedTheme = useMemo(() => {
    if (!recommended_theme_id) return null;
    return getAllThemes().find((t) => t.id === recommended_theme_id);
  }, [recommended_theme_id]);

  // Handle theme selection
  const handleThemeSelect = useCallback(
    async (theme: PresentationTheme) => {
      setSelectedThemeId(theme.id);

      // Call the API to apply the theme
      if (window?.openai?.callTool && deck_id) {
        try {
          await window.openai.callTool("applyTheme", {
            deckId: deck_id,
            themeId: theme.id,
          });
        } catch (error) {
          console.error("Failed to apply theme:", error);
        }
      }

      // Also send a follow-up message to confirm selection
      if (window?.openai?.sendFollowUpMessage) {
        await window.openai.sendFollowUpMessage({
          prompt: `Use ${theme.name} theme`,
        });
      }
    },
    [deck_id]
  );

  // Toggle category collapse
  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Safe area calculations
  const safeAreaTop = safeArea?.insets?.top ?? 0;
  const safeAreaBottom = safeArea?.insets?.bottom ?? 0;
  const safeAreaLeft = safeArea?.insets?.left ?? 0;
  const safeAreaRight = safeArea?.insets?.right ?? 0;

  return (
    <div
      style={{
        height: displayMode === "fullscreen" ? maxHeight : "auto",
        maxHeight: displayMode !== "fullscreen" ? maxHeight : undefined,
        paddingTop:
          displayMode === "fullscreen" && isMobile ? `${safeAreaTop}px` : undefined,
        paddingBottom:
          displayMode === "fullscreen" && isMobile ? `${safeAreaBottom}px` : undefined,
      }}
      className={
        "antialiased w-full overflow-hidden bg-white text-gray-900 " +
        (displayMode === "fullscreen" ? "rounded-none" : "rounded-xl border border-gray-200")
      }
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200"
        style={{
          paddingLeft: displayMode === "fullscreen" && isMobile ? `${Math.max(16, safeAreaLeft)}px` : undefined,
          paddingRight: displayMode === "fullscreen" && isMobile ? `${Math.max(16, safeAreaRight)}px` : undefined,
        }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Choose a Theme</h1>
            <p className="text-xs text-gray-500">18 themes across 2 categories</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        className="overflow-y-auto"
        style={{
          height: displayMode === "fullscreen" ? `calc(100% - 64px)` : "auto",
          maxHeight: displayMode !== "fullscreen" ? "600px" : undefined,
          paddingLeft: displayMode === "fullscreen" && isMobile ? `${Math.max(16, safeAreaLeft)}px` : undefined,
          paddingRight: displayMode === "fullscreen" && isMobile ? `${Math.max(16, safeAreaRight)}px` : undefined,
        }}
      >
        {/* Collage Images Preview */}
        {collage_images && collage_images.length > 0 && (
          <div className="px-4 pt-4">
            <button
              onClick={() => setExpandedCollage(!expandedCollage)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                {expandedCollage ? "Hide" : "View"} Theme Previews
              </span>
              {expandedCollage ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedCollage && (
              <div className="mt-3 space-y-3">
                {collage_images.map((imageUrl, idx) => (
                  <img
                    key={idx}
                    src={imageUrl}
                    alt={`Theme collage ${idx + 1}`}
                    className="w-full rounded-lg border border-gray-200 shadow-sm"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="px-4 pt-4">
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>
        )}

        {/* Recommended Theme */}
        {recommendedTheme && (
          <div className="px-4 pt-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-primary mb-2">
                Recommended for your content
              </p>
              <div className="max-w-[200px]">
                <ThemeCard
                  theme={recommendedTheme}
                  isSelected={selectedThemeId === recommendedTheme.id}
                  onSelect={() => handleThemeSelect(recommendedTheme)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Theme Categories */}
        <div className="p-4 space-y-6">
          {groupedThemes.map((group) => {
            const isCollapsed = collapsedCategories.has(group.category);

            return (
              <div key={group.category} className="space-y-3">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(group.category)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900">
                      {group.name}
                    </h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {group.themes.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 hidden sm:block">
                      {group.description}
                    </span>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                </button>

                {/* Theme Grid */}
                {!isCollapsed && (
                  <div
                    className={
                      "grid gap-3 " +
                      (isMobile ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")
                    }
                  >
                    {group.themes.map((theme) => (
                      <ThemeCard
                        key={theme.id}
                        theme={theme}
                        isSelected={selectedThemeId === theme.id}
                        onSelect={() => handleThemeSelect(theme)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Instructions Footer */}
        {instructions && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-600 leading-relaxed">{instructions}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mount the app
const rootElement = document.getElementById("theme-picker-root");
if (rootElement) {
  createRoot(rootElement).render(<ThemePicker />);
}

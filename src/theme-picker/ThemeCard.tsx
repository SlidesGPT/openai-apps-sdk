import { type PresentationTheme, generateCSSBackground } from "../lib/themes/theme-library";
import { Check } from "lucide-react";

interface ThemeCardProps {
  theme: PresentationTheme;
  isSelected: boolean;
  onSelect: () => void;
}

export function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="radio"
      aria-checked={isSelected}
      aria-label={theme.name}
      className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
    >
      <div
        className={
          "flex flex-col overflow-hidden rounded-xl border-2 transition-all duration-200 " +
          (isSelected
            ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
            : "border-gray-200 hover:border-primary/50 hover:shadow-md")
        }
      >
        {/* Theme Preview */}
        <div className="p-1.5">
          <div
            className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg p-3"
            style={{
              background: generateCSSBackground(theme.background),
              backgroundSize:
                theme.background.type === "image"
                  ? theme.background.imageSize
                  : undefined,
              backgroundPosition:
                theme.background.type === "image"
                  ? theme.background.imagePosition
                  : undefined,
            }}
          >
            {/* Sample Content */}
            <div className="space-y-1 text-center">
              <div
                className="text-xs font-bold"
                style={{
                  color: theme.colors.heading,
                  fontFamily: theme.fontFamily,
                }}
              >
                Heading
              </div>
              <div
                className="text-[10px]"
                style={{
                  color: theme.colors.body,
                  fontFamily: theme.fontFamily,
                }}
              >
                Body text
              </div>
              <div
                className="mx-auto h-0.5 w-8 rounded-full"
                style={{
                  backgroundColor: theme.colors.accent,
                }}
              />
            </div>

            {/* Selection Indicator */}
            {isSelected && (
              <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-md">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
        </div>

        {/* Theme Info */}
        <div className="flex min-h-[52px] items-center gap-2 px-2.5 pb-2.5">
          <div className="flex-1 space-y-0.5">
            <h4 className="text-sm font-semibold leading-tight text-gray-900">
              {theme.name}
            </h4>
            {theme.description && (
              <p className="line-clamp-1 text-[11px] text-gray-500">
                {theme.description.split(" - ")[0]}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

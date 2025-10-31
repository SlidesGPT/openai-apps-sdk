import React from "react";
import { ExternalLink } from "lucide-react";

export default function SlideCard({ slide }) {
  if (!slide) return null;

  return (
    <div className="min-w-[320px] max-w-[320px] w-[80vw] sm:w-[320px] select-none self-stretch flex flex-col">
      {/* Slide Image */}
      <div className="w-full rounded-xl overflow-hidden ring-1 ring-black/10 shadow-md">
        {slide.image_url ? (
          <img
            src={slide.image_url}
            alt={slide.title}
            className="w-full aspect-video object-cover bg-white"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="hidden w-full aspect-video items-center justify-center bg-muted text-muted-foreground text-sm"
          style={{ display: slide.image_url ? "none" : "flex" }}
        >
          <p>Slide image not available</p>
        </div>
      </div>

      {/* Slide Metadata */}
      <div className="mt-3 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            Slide {slide.slidenum}
          </span>
        </div>
        <div className="text-lg font-semibold text-black line-clamp-2 mb-1">
          {slide.title}
        </div>
        {slide.subtitle && (
          <div className="text-sm text-black/70 line-clamp-2">
            {slide.subtitle}
          </div>
        )}
        <div className="mt-auto pt-4">
          {slide.presentation_view_url && (
            <a
              href={slide.presentation_view_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

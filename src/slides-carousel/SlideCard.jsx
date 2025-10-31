import React from "react";
import { ExternalLink } from "lucide-react";

export default function SlideCard({ slide }) {
  if (!slide) return null;

  return (
    <div className="min-w-[600px] max-w-[600px] w-[85vw] sm:w-[600px] select-none self-stretch flex flex-col">
      {/* Slide Image - Large like single viewer */}
      <div className="relative w-full rounded-xl overflow-hidden ring-1 ring-black/10 shadow-lg">
        {slide.image_url ? (
          <img
            src={slide.image_url}
            alt={`Slide ${slide.slidenum}`}
            className="w-full h-auto object-contain bg-white"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="hidden w-full min-h-[400px] items-center justify-center bg-muted text-muted-foreground"
          style={{ display: slide.image_url ? "none" : "flex" }}
        >
          <p>Slide image not available</p>
        </div>
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

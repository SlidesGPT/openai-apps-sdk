/**
 * Theme Library - Preset themes for presentations
 * 22 themes across 3 categories: Urban, Minimal, Gradient
 */

// ============================================================================
// TYPES
// ============================================================================

export type ThemeCategory = "urban" | "minimal" | "gradient";

export type ThemeColorPalette = {
  primary: string; // Slide background color
  heading: string; // Heading text color
  body: string; // Body text color
  accent: string; // Subhead/subtitle color
  muted?: string; // Icons color
};

export type GradientConfig = {
  type: "linear" | "radial";
  direction?: string; // e.g., "to right", "45deg" for linear
  colors: Array<{
    color: string;
    stop: number; // percentage 0-100
  }>;
};

export type BackgroundConfig = {
  type: "solid" | "gradient" | "image";
  solidColor?: string;
  gradient?: GradientConfig;
  imageUrl?: string;
  imageSize: "cover" | "contain" | "stretch" | "repeat";
  imagePosition: string;
};

export type PresentationTheme = {
  id: string;
  name: string;
  category: ThemeCategory;
  description?: string;
  colors: ThemeColorPalette;
  fontFamily: string;
  background: BackgroundConfig;
  previewImage?: string;
  version: number;
  createdAt?: string;
  tags?: string[];
};

export type ThemeLibrary = {
  categories: {
    [K in ThemeCategory]: {
      name: string;
      description: string;
      themes: PresentationTheme[];
    };
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Generate CSS background string from BackgroundConfig
 */
export function generateCSSBackground(config: BackgroundConfig): string {
  switch (config.type) {
    case "solid":
      return config.solidColor ?? "#ffffff";

    case "gradient":
      if (!config.gradient) return "#ffffff";

      const { type, direction, colors } = config.gradient;
      const colorStops = colors.map((c) => `${c.color} ${c.stop}%`).join(", ");

      if (type === "linear") {
        return `linear-gradient(${direction ?? "to right"}, ${colorStops})`;
      } else {
        return `radial-gradient(circle, ${colorStops})`;
      }

    case "image":
      if (config.imageUrl) {
        return `url(${config.imageUrl})`;
      }
      return "#ffffff";

    default:
      return "#ffffff";
  }
}

// ============================================================================
// URBAN THEMES
// ============================================================================

const urbanThemes: PresentationTheme[] = [
  // Copenhagen - Soft Nordic Minimalism
  {
    id: "copenhagen-light",
    name: "Copenhagen",
    category: "urban",
    description: "Soft Nordic Minimalism - Scandinavian, neutral, calm",
    colors: {
      primary: rgbToHex(223, 215, 226),
      heading: rgbToHex(62, 67, 64),
      body: rgbToHex(62, 67, 64),
      accent: rgbToHex(255, 145, 129),
      muted: rgbToHex(255, 145, 129),
    },
    fontFamily: "Inter",
    background: {
      type: "solid",
      solidColor: rgbToHex(223, 215, 226),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "copenhagen-dark",
    name: "Copenhagen Dark",
    category: "urban",
    description: "Soft Nordic Minimalism - Scandinavian, neutral, calm",
    colors: {
      primary: rgbToHex(101, 80, 96),
      heading: rgbToHex(255, 255, 255),
      body: rgbToHex(255, 255, 255),
      accent: rgbToHex(255, 145, 129),
      muted: rgbToHex(255, 145, 129),
    },
    fontFamily: "Inter",
    background: {
      type: "solid",
      solidColor: rgbToHex(101, 80, 96),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Tokyo - Neon Brutalism
  {
    id: "tokyo-light",
    name: "Tokyo",
    category: "urban",
    description: "Neon Brutalism - Futuristic, high-contrast, digital",
    colors: {
      primary: rgbToHex(92, 201, 248),
      heading: rgbToHex(30, 18, 69),
      body: rgbToHex(30, 18, 69),
      accent: rgbToHex(30, 18, 155),
      muted: rgbToHex(30, 18, 155),
    },
    fontFamily: "Space Grotesk",
    background: {
      type: "solid",
      solidColor: rgbToHex(92, 201, 248),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "tokyo-dark",
    name: "Tokyo Dark",
    category: "urban",
    description: "Neon Brutalism - Futuristic, high-contrast, digital",
    colors: {
      primary: rgbToHex(30, 18, 69),
      heading: rgbToHex(255, 255, 255),
      body: rgbToHex(255, 255, 255),
      accent: rgbToHex(255, 64, 255),
      muted: rgbToHex(255, 64, 255),
    },
    fontFamily: "Space Grotesk",
    background: {
      type: "solid",
      solidColor: rgbToHex(30, 18, 69),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Paris - Modern Heritage
  {
    id: "paris-light",
    name: "Paris",
    category: "urban",
    description: "Modern Heritage - Luxury, cultural, editorial",
    colors: {
      primary: rgbToHex(233, 233, 233),
      heading: rgbToHex(0, 0, 0),
      body: rgbToHex(0, 0, 0),
      accent: rgbToHex(123, 116, 103),
      muted: rgbToHex(123, 116, 103),
    },
    fontFamily: "Cormorant Garamond",
    background: {
      type: "solid",
      solidColor: rgbToHex(233, 233, 233),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "paris-dark",
    name: "Paris Dark",
    category: "urban",
    description: "Modern Heritage - Luxury, cultural, editorial",
    colors: {
      primary: rgbToHex(123, 116, 103),
      heading: rgbToHex(0, 0, 0),
      body: rgbToHex(0, 0, 0),
      accent: rgbToHex(233, 233, 233),
      muted: rgbToHex(233, 233, 233),
    },
    fontFamily: "Cormorant Garamond",
    background: {
      type: "solid",
      solidColor: rgbToHex(123, 116, 103),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Berlin - Industrial Monochrome
  {
    id: "berlin-light",
    name: "Berlin",
    category: "urban",
    description: "Industrial Monochrome - Techno, monochrome, modern, raw",
    colors: {
      primary: rgbToHex(167, 167, 167),
      heading: rgbToHex(37, 37, 37),
      body: rgbToHex(37, 37, 37),
      accent: rgbToHex(235, 235, 235),
      muted: rgbToHex(235, 235, 235),
    },
    fontFamily: "Roboto",
    background: {
      type: "solid",
      solidColor: rgbToHex(167, 167, 167),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "berlin-dark",
    name: "Berlin Dark",
    category: "urban",
    description: "Industrial Monochrome - Techno, monochrome, modern, raw",
    colors: {
      primary: rgbToHex(37, 37, 37),
      heading: rgbToHex(167, 167, 167),
      body: rgbToHex(255, 255, 255),
      accent: rgbToHex(255, 255, 255),
      muted: rgbToHex(255, 255, 255),
    },
    fontFamily: "Roboto",
    background: {
      type: "solid",
      solidColor: rgbToHex(37, 37, 37),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // New York - Vintage Yellow Cab
  {
    id: "new-york-light",
    name: "New York",
    category: "urban",
    description: "Vintage Yellow Cab - Urban signage, Street, Bold, Transit",
    colors: {
      primary: rgbToHex(37, 37, 37),
      heading: rgbToHex(0, 0, 0),
      body: rgbToHex(0, 0, 0),
      accent: rgbToHex(255, 255, 255),
      muted: rgbToHex(255, 255, 255),
    },
    fontFamily: "Lora",
    background: {
      type: "solid",
      solidColor: rgbToHex(255, 213, 34),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "new-york-dark",
    name: "New York Dark",
    category: "urban",
    description: "Vintage Yellow Cab - Urban signage, Street, Bold, Transit",
    colors: {
      primary: rgbToHex(37, 37, 37),
      heading: rgbToHex(247, 183, 45),
      body: rgbToHex(255, 255, 255),
      accent: rgbToHex(255, 255, 255),
      muted: rgbToHex(247, 183, 45),
    },
    fontFamily: "Lora",
    background: {
      type: "solid",
      solidColor: rgbToHex(37, 37, 37),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Los Angeles - Sunset Pop
  {
    id: "la-light",
    name: "LA",
    category: "urban",
    description: "Sunset Pop - Vibrant, creative, warm, playful",
    colors: {
      primary: rgbToHex(255, 66, 161),
      heading: rgbToHex(255, 240, 86),
      body: rgbToHex(0, 0, 0),
      accent: rgbToHex(255, 240, 86),
      muted: rgbToHex(255, 240, 86),
    },
    fontFamily: "Roboto",
    background: {
      type: "solid",
      solidColor: rgbToHex(255, 66, 161),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "la-dark",
    name: "LA Dark",
    category: "urban",
    description: "Sunset Pop - Vibrant, creative, warm, playful",
    colors: {
      primary: rgbToHex(102, 219, 205),
      heading: rgbToHex(255, 240, 86),
      body: rgbToHex(0, 0, 0),
      accent: rgbToHex(255, 240, 86),
      muted: rgbToHex(255, 240, 86),
    },
    fontFamily: "Roboto",
    background: {
      type: "solid",
      solidColor: rgbToHex(102, 219, 205),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Zürich - Modern Swiss Utility
  {
    id: "zurich-light",
    name: "Zürich",
    category: "urban",
    description: "Modern Swiss Utility - Grid-driven, rational, institutional",
    colors: {
      primary: rgbToHex(229, 231, 234),
      heading: rgbToHex(0, 0, 0),
      body: rgbToHex(0, 0, 0),
      accent: rgbToHex(146, 146, 146),
      muted: rgbToHex(146, 146, 146),
    },
    fontFamily: "Inter",
    background: {
      type: "solid",
      solidColor: rgbToHex(229, 231, 234),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "zurich-dark",
    name: "Zürich Dark",
    category: "urban",
    description: "Modern Swiss Utility - Grid-driven, rational, institutional",
    colors: {
      primary: rgbToHex(218, 45, 45),
      heading: rgbToHex(255, 255, 255),
      body: rgbToHex(255, 255, 255),
      accent: rgbToHex(221, 221, 221),
      muted: rgbToHex(221, 221, 221),
    },
    fontFamily: "Inter",
    background: {
      type: "solid",
      solidColor: rgbToHex(218, 45, 45),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Shanghai - Techno-Global Commerce
  {
    id: "shanghai-light",
    name: "Shanghai",
    category: "urban",
    description: "Techno-Global Commerce - Corporate finance, digital, international",
    colors: {
      primary: rgbToHex(167, 180, 196),
      heading: rgbToHex(237, 239, 241),
      body: rgbToHex(237, 239, 241),
      accent: rgbToHex(42, 107, 255),
      muted: rgbToHex(42, 107, 255),
    },
    fontFamily: "Space Grotesk",
    background: {
      type: "solid",
      solidColor: rgbToHex(167, 180, 196),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "shanghai-dark",
    name: "Shanghai Dark",
    category: "urban",
    description: "Techno-Global Commerce - Corporate finance, digital, international",
    colors: {
      primary: rgbToHex(12, 15, 20),
      heading: rgbToHex(237, 239, 241),
      body: rgbToHex(237, 239, 241),
      accent: rgbToHex(42, 107, 255),
      muted: rgbToHex(42, 107, 255),
    },
    fontFamily: "Space Grotesk",
    background: {
      type: "solid",
      solidColor: rgbToHex(12, 15, 20),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
];

// ============================================================================
// MINIMAL THEMES
// ============================================================================

const minimalThemes: PresentationTheme[] = [
  // Pure Minimal - Ultra Clean
  {
    id: "minimal-pure-light",
    name: "Minimal Pure",
    category: "minimal",
    description: "Ultra Clean - Ultra-minimal, corporate, monochrome",
    colors: {
      primary: rgbToHex(255, 255, 255),
      heading: rgbToHex(0, 0, 0),
      body: rgbToHex(0, 0, 0),
      accent: rgbToHex(204, 204, 204),
      muted: rgbToHex(204, 204, 204),
    },
    fontFamily: "Inter",
    background: {
      type: "solid",
      solidColor: rgbToHex(255, 255, 255),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "minimal-pure-dark",
    name: "Minimal Pure Dark",
    category: "minimal",
    description: "Ultra Clean - Ultra-minimal, corporate, monochrome",
    colors: {
      primary: rgbToHex(0, 0, 0),
      heading: rgbToHex(255, 255, 255),
      body: rgbToHex(255, 255, 255),
      accent: rgbToHex(204, 204, 204),
      muted: rgbToHex(204, 204, 204),
    },
    fontFamily: "Inter",
    background: {
      type: "solid",
      solidColor: rgbToHex(0, 0, 0),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Zen Gray - Calm Neutral Tones
  {
    id: "zen-gray-light",
    name: "Zen Gray",
    category: "minimal",
    description: "Calm Neutral Tones - Soft neutral gray, calm, understated",
    colors: {
      primary: rgbToHex(255, 255, 255),
      heading: rgbToHex(42, 42, 42),
      body: rgbToHex(42, 42, 42),
      accent: rgbToHex(141, 141, 141),
      muted: rgbToHex(141, 141, 141),
    },
    fontFamily: "Inter",
    background: {
      type: "solid",
      solidColor: rgbToHex(255, 255, 255),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
  {
    id: "zen-gray-dark",
    name: "Zen Gray Dark",
    category: "minimal",
    description: "Calm Neutral Tones - Soft neutral gray, calm, understated",
    colors: {
      primary: rgbToHex(42, 42, 42),
      heading: rgbToHex(255, 255, 255),
      body: rgbToHex(255, 255, 255),
      accent: rgbToHex(141, 141, 141),
      muted: rgbToHex(141, 141, 141),
    },
    fontFamily: "Inter",
    background: {
      type: "solid",
      solidColor: rgbToHex(42, 42, 42),
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
];

// ============================================================================
// GRADIENT THEMES
// ============================================================================

const gradientThemes: PresentationTheme[] = [
  // Aurora Glow - Soft Pastel Gradient (Variant 1)
  {
    id: "aurora-glow-1",
    name: "Aurora Glow",
    category: "gradient",
    description: "Soft Pastel Gradient - Vibrant, Creative, Gradient-Friendly",
    colors: {
      primary: "#FFEACF",
      heading: rgbToHex(28, 28, 28),
      body: rgbToHex(28, 28, 28),
      accent: rgbToHex(28, 28, 28),
      muted: rgbToHex(28, 28, 28),
    },
    fontFamily: "Poppins",
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        direction: "297.4deg",
        colors: [
          { color: "#FFEACF", stop: 0 },
          { color: "#CAA9FF", stop: 100 },
        ],
      },
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Aurora Glow - Soft Pastel Gradient (Variant 2)
  {
    id: "aurora-glow-2",
    name: "Aurora Glow Pink",
    category: "gradient",
    description: "Soft Pastel Gradient - Vibrant, Creative, Gradient-Friendly",
    colors: {
      primary: "#DD5166",
      heading: rgbToHex(28, 28, 28),
      body: rgbToHex(28, 28, 28),
      accent: rgbToHex(255, 122, 194),
      muted: rgbToHex(255, 255, 255),
    },
    fontFamily: "Poppins",
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        direction: "307.2deg",
        colors: [
          { color: "#DD5166", stop: 0 },
          { color: "#926BF2", stop: 100 },
        ],
      },
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Aurora Glow - Soft Pastel Gradient (Variant 3)
  {
    id: "aurora-glow-3",
    name: "Aurora Glow Blue",
    category: "gradient",
    description: "Soft Pastel Gradient - Vibrant, Creative, Gradient-Friendly",
    colors: {
      primary: "#9DC4F1",
      heading: rgbToHex(28, 28, 28),
      body: rgbToHex(28, 28, 28),
      accent: rgbToHex(28, 28, 28),
      muted: rgbToHex(28, 28, 28),
    },
    fontFamily: "Poppins",
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        direction: "297.4deg",
        colors: [
          { color: "#9DC4F1", stop: 0 },
          { color: "#CAA9FF", stop: 100 },
        ],
      },
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Aurora Glow - Soft Pastel Gradient (Variant 4)
  {
    id: "aurora-glow-4",
    name: "Aurora Glow Teal",
    category: "gradient",
    description: "Soft Pastel Gradient - Vibrant, Creative, Gradient-Friendly",
    colors: {
      primary: "#7BDAE1",
      heading: rgbToHex(28, 28, 28),
      body: rgbToHex(28, 28, 28),
      accent: rgbToHex(28, 28, 28),
      muted: rgbToHex(28, 28, 28),
    },
    fontFamily: "Poppins",
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        direction: "297.4deg",
        colors: [
          { color: "#7BDAE1", stop: 0 },
          { color: "#D9FA9E", stop: 100 },
        ],
      },
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Cosmic Pulse - High-Energy Neon Gradient (Light)
  {
    id: "cosmic-pulse-light",
    name: "Cosmic Pulse",
    category: "gradient",
    description: "High-Energy Neon Gradient - Vibrant, Creative, Gradient-Friendly",
    colors: {
      primary: "#5420FF",
      heading: rgbToHex(255, 255, 255),
      body: rgbToHex(255, 255, 255),
      accent: rgbToHex(255, 255, 255),
      muted: rgbToHex(255, 255, 255),
    },
    fontFamily: "Inter",
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        direction: "to bottom right",
        colors: [
          { color: "#5420FF", stop: 0 },
          { color: "#FF2E8A", stop: 100 },
        ],
      },
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },

  // Cosmic Pulse - High-Energy Neon Gradient (Dark)
  {
    id: "cosmic-pulse-dark",
    name: "Cosmic Pulse Dark",
    category: "gradient",
    description: "High-Energy Neon Gradient - Vibrant, Creative, Gradient-Friendly",
    colors: {
      primary: "#0A0A12",
      heading: rgbToHex(255, 255, 255),
      body: rgbToHex(255, 255, 255),
      accent: rgbToHex(255, 255, 255),
      muted: rgbToHex(255, 255, 255),
    },
    fontFamily: "Inter",
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        direction: "to bottom right",
        colors: [
          { color: "#0A0A12", stop: 0 },
          { color: "#4420FF", stop: 100 },
        ],
      },
      imageSize: "cover",
      imagePosition: "center",
    },
    version: 1,
  },
];

// ============================================================================
// THEME LIBRARY - Complete collection
// ============================================================================

export const THEME_LIBRARY: ThemeLibrary = {
  categories: {
    urban: {
      name: "Urban",
      description: "City-inspired themes with bold, modern aesthetics",
      themes: urbanThemes,
    },
    minimal: {
      name: "Minimal",
      description: "Clean, simple themes with focus on content",
      themes: minimalThemes,
    },
    gradient: {
      name: "Gradient",
      description: "Vibrant gradient themes for creative presentations",
      themes: gradientThemes,
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getAllThemes = (): PresentationTheme[] => {
  return Object.values(THEME_LIBRARY.categories).flatMap((cat) => cat.themes);
};

export const getThemeById = (id: string): PresentationTheme | undefined => {
  return getAllThemes().find((theme) => theme.id === id);
};

export const getThemesByCategory = (category: ThemeCategory): PresentationTheme[] => {
  return THEME_LIBRARY.categories[category]?.themes ?? [];
};

export const searchThemes = (query: string): PresentationTheme[] => {
  const lowerQuery = query.toLowerCase();
  return getAllThemes().filter(
    (theme) =>
      theme.name.toLowerCase().includes(lowerQuery) ||
      (theme.description?.toLowerCase().includes(lowerQuery) ?? false) ||
      theme.category.toLowerCase().includes(lowerQuery) ||
      (theme.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ?? false)
  );
};

// Theme recommendations based on content type
export const THEME_RECOMMENDATIONS: Record<string, string[]> = {
  corporate: ["zurich-light", "zurich-dark", "berlin-light", "minimal-pure-light"],
  finance: ["zurich-light", "shanghai-dark", "berlin-dark", "minimal-pure-dark"],
  tech: ["tokyo-light", "tokyo-dark", "shanghai-dark", "cosmic-pulse-light"],
  startup: ["tokyo-dark", "la-light", "aurora-glow-1", "cosmic-pulse-light"],
  creative: ["la-light", "la-dark", "aurora-glow-2", "aurora-glow-1"],
  marketing: ["la-light", "new-york-light", "aurora-glow-1", "cosmic-pulse-light"],
  luxury: ["paris-light", "paris-dark", "copenhagen-light", "copenhagen-dark"],
  elegant: ["copenhagen-light", "paris-light", "minimal-pure-light", "zen-gray-light"],
  education: ["minimal-pure-light", "zen-gray-light", "zurich-light", "berlin-light"],
  academic: ["minimal-pure-light", "minimal-pure-dark", "zen-gray-light", "berlin-light"],
  bold: ["new-york-light", "new-york-dark", "la-light", "cosmic-pulse-light"],
  energetic: ["aurora-glow-2", "cosmic-pulse-light", "la-light", "tokyo-light"],
};

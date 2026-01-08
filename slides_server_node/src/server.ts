import * as crypto from "node:crypto";
import fs from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Import schemas from the shared lib
const BulletPointSchema = z.object({
  point: z.string().describe("The main point to be made"),
  description: z.string().describe("Expansion of the point"),
  icon: z.string().describe("Font Awesome 5.15 icon class name"),
});

const SourceSchema = z.object({
  title: z.string().describe("Title of the source"),
  link: z.string().describe("URL link to the source"),
});

const SlideSchema = z.object({
  title: z.string().describe("Title of the slide"),
  subtitle: z.string().describe("Subtitle of the slide"),
  slidenum: z.number().describe("Slide number in the presentation"),
  image_id: z
    .string()
    .optional()
    .default("")
    .describe(
      "Optional image ID - if omitted, system auto-selects the best matching image"
    ),
  body: z.array(BulletPointSchema).describe("Array of bullet points"),
  talktrack: z.string().describe("Detailed talktrack of the slide"),
  sources: z.array(SourceSchema).describe("Array of sources"),
  force_edit: z
    .boolean()
    .optional()
    .describe("If true, overwrite existing slide"),
});

const GenerateResponseSchema = z.object({
  data: z.object({
    image_url: z.string().describe("URL of the generated slide image"),
    presentation_view_url: z.string().describe("URL to view the presentation"),
  }),
});

type Slide = z.infer<typeof SlideSchema>;
type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

type SlideWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");

// Presentation store to track conversation continuity
type PresentationContext = {
  presentationId: string;
  conversationId: string;
  userId: string;
  slideCount: number;
  createdAt: Date;
  lastUsed: Date;
  themeId: string | null; // Current theme applied to the presentation
  themeOffered: boolean; // Whether theme options have been shown
  deckId: string | null; // Actual deck ID from the API (for apply_theme)
};

const presentations = new Map<string, PresentationContext>();

// Cleanup old presentations periodically (keep for 24 hours)
setInterval(() => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let cleaned = 0;
  for (const [id, context] of presentations.entries()) {
    if (context.lastUsed < twentyFourHoursAgo) {
      presentations.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🗑️  Cleaned ${cleaned} old presentations`);
  }
}, 60 * 60 * 1000); // Run every hour

// Helper function to generate a new presentation ID
function generatePresentationId(): string {
  return `pres_${crypto.randomBytes(16).toString("hex")}`;
}

// Helper function to get or create presentation context
function getOrCreatePresentation(presentationId?: string): PresentationContext {
  if (presentationId && presentations.has(presentationId)) {
    const context = presentations.get(presentationId)!;
    context.lastUsed = new Date();
    console.log(
      `   📂 Presentation: ${presentationId} (${
        context.slideCount
      } slides, deck: ${context.deckId || "pending"})`
    );
    return context;
  }

  // Create new presentation
  const newPresentationId = presentationId || generatePresentationId();
  const context: PresentationContext = {
    presentationId: newPresentationId,
    conversationId: crypto.randomBytes(16).toString("hex"),
    userId: `appSDK-user-${crypto.randomBytes(8).toString("hex")}`,
    slideCount: 0,
    createdAt: new Date(),
    lastUsed: new Date(),
    themeId: null,
    themeOffered: false,
    deckId: null,
  };

  presentations.set(newPresentationId, context);
  console.log(`   📂 New presentation: ${newPresentationId}`);

  return context;
}

// Helper function to extract deck ID from presentation view URL
// URL format: https://app.slidesgpt.com/view/{deckId}
function extractDeckIdFromUrl(url: string): string | null {
  const match = url.match(/\/view\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// Helper function to normalize URL (remove double slashes in path)
function normalizeUrl(url: string): string {
  return url.replace(/([^:]\/)\/+/g, "$1");
}

// Helper function to generate OpenAI-compatible headers
function generateOpenAIHeaders(presentationContext: PresentationContext) {
  return {
    "openai-ephemeral-user-id": presentationContext.userId,
    "openai-conversation-id": presentationContext.conversationId,
  };
}

// Helper function to read widget HTML from assets
function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "pnpm run build" before starting the server.`
    );
  }

  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  let htmlContents: string | null = null;

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
  } else {
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      htmlContents = fs.readFileSync(path.join(ASSETS_DIR, fallback), "utf8");
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "pnpm run build" to generate the assets.`
    );
  }

  return htmlContents;
}

function widgetMeta(widget: SlideWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
    // Required for app submission: Content Security Policy
    "openai/widgetCSP": {
      connect_domains: ["https://slidesgpt.com"],
      resource_domains: ["https://slidesgpt.com"],
    },
    // Required for app submission: Unique domain for the widget
    "openai/widgetDomain": "slidesgpt",
  } as const;
}

const widgets: SlideWidget[] = [
  {
    id: "create_slide",
    title: "Create Slide",
    templateUri: "ui://widget/create_slide.html",
    invoking: "Creating slide...",
    invoked: "Slide created",
    html: readWidgetHtml("slides-viewer"),
    responseText: "Slide created successfully!",
  },
  {
    id: "create_slide_carousel",
    title: "Create Slides Carousel",
    templateUri: "ui://widget/create_slide_carousel.html",
    invoking: "Creating slides...",
    invoked: "Slides created",
    html: readWidgetHtml("slides-carousel"),
    responseText: "Slides carousel created successfully!",
  },
  {
    id: "theme-picker",
    title: "Choose Theme",
    templateUri: "ui://widget/theme-picker.html",
    invoking: "Loading themes...",
    invoked: "Themes loaded",
    html: readWidgetHtml("theme-picker"),
    responseText: "Theme picker loaded!",
  },
];

// Theme library - 18 themes across 2 categories (Urban + Gradient)
const THEME_IDS = [
  // Urban themes (16)
  "copenhagen-light",
  "copenhagen-dark",
  "tokyo-light",
  "tokyo-dark",
  "paris-light",
  "paris-dark",
  "berlin-light",
  "berlin-dark",
  "new-york-light",
  "new-york-dark",
  "la-light",
  "la-dark",
  "zurich-light",
  "zurich-dark",
  "shanghai-light",
  "shanghai-dark",
  // Gradient themes (2)
  "cosmic-pulse-light",
  "cosmic-pulse-dark",
] as const;

type ThemeId = (typeof THEME_IDS)[number];

// Theme metadata for recommendations
const THEME_METADATA: Record<
  ThemeId,
  { name: string; category: string; description: string }
> = {
  "copenhagen-light": {
    name: "Copenhagen",
    category: "urban",
    description: "Soft Nordic Minimalism",
  },
  "copenhagen-dark": {
    name: "Copenhagen Dark",
    category: "urban",
    description: "Soft Nordic Minimalism",
  },
  "tokyo-light": {
    name: "Tokyo",
    category: "urban",
    description: "Neon Brutalism",
  },
  "tokyo-dark": {
    name: "Tokyo Dark",
    category: "urban",
    description: "Neon Brutalism",
  },
  "paris-light": {
    name: "Paris",
    category: "urban",
    description: "Modern Heritage",
  },
  "paris-dark": {
    name: "Paris Dark",
    category: "urban",
    description: "Modern Heritage",
  },
  "berlin-light": {
    name: "Berlin",
    category: "urban",
    description: "Industrial Monochrome",
  },
  "berlin-dark": {
    name: "Berlin Dark",
    category: "urban",
    description: "Industrial Monochrome",
  },
  "new-york-light": {
    name: "New York",
    category: "urban",
    description: "Vintage Yellow Cab",
  },
  "new-york-dark": {
    name: "New York Dark",
    category: "urban",
    description: "Vintage Yellow Cab",
  },
  "la-light": { name: "LA", category: "urban", description: "Sunset Pop" },
  "la-dark": { name: "LA Dark", category: "urban", description: "Sunset Pop" },
  "zurich-light": {
    name: "Zürich",
    category: "urban",
    description: "Modern Swiss Utility",
  },
  "zurich-dark": {
    name: "Zürich Dark",
    category: "urban",
    description: "Modern Swiss Utility",
  },
  "shanghai-light": {
    name: "Shanghai",
    category: "urban",
    description: "Techno-Global Commerce",
  },
  "shanghai-dark": {
    name: "Shanghai Dark",
    category: "urban",
    description: "Techno-Global Commerce",
  },
  "cosmic-pulse-light": {
    name: "Cosmic Pulse",
    category: "gradient",
    description: "High-Energy Neon Gradient",
  },
  "cosmic-pulse-dark": {
    name: "Cosmic Pulse Dark",
    category: "gradient",
    description: "High-Energy Neon Gradient",
  },
};

// Theme recommendations by content type (for future auto-recommendation feature)
const _THEME_RECOMMENDATIONS: Record<string, ThemeId[]> = {
  corporate: [
    "zurich-light",
    "berlin-light",
    "copenhagen-light",
    "shanghai-light",
  ],
  finance: ["zurich-light", "shanghai-dark", "berlin-dark", "zurich-dark"],
  tech: ["tokyo-light", "tokyo-dark", "shanghai-dark", "cosmic-pulse-light"],
  startup: [
    "tokyo-dark",
    "la-light",
    "cosmic-pulse-light",
    "cosmic-pulse-dark",
  ],
  creative: ["la-light", "la-dark", "cosmic-pulse-light", "tokyo-light"],
  marketing: ["la-light", "new-york-light", "cosmic-pulse-light", "tokyo-dark"],
  luxury: ["paris-light", "paris-dark", "copenhagen-light", "copenhagen-dark"],
  education: [
    "zurich-light",
    "berlin-light",
    "copenhagen-light",
    "paris-light",
  ],
};

const widgetsById = new Map<string, SlideWidget>();
const widgetsByUri = new Map<string, SlideWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

// Tool input schemas
const slideViewerInputSchema = {
  type: "object",
  properties: {
    presentation_id: {
      type: "string",
      default: "",
      description:
        "Presentation ID for continuity. Use '' for first slide, then ALWAYS pass the ID returned from previous calls.",
    },
    slide_data: {
      type: "object",
      description: "Slide content structure",
      properties: {
        title: { type: "string", description: "Title of the slide" },
        subtitle: { type: "string", description: "Subtitle of the slide" },
        slidenum: { type: "number", description: "Slide number" },
        image_id: {
          type: "string",
          default: "",
          description:
            "OPTIONAL - Image ID. If omitted or empty, system auto-selects the best image based on slide content. No need to call search_images first.",
        },
        body: {
          type: "array",
          description: "Array of 2-4 bullet points",
          items: {
            type: "object",
            properties: {
              point: { type: "string", description: "Main point (2-5 words)" },
              description: {
                type: "string",
                description: "Explanation (1-2 sentences)",
              },
              icon: {
                type: "string",
                description:
                  "FontAwesome 5.15 icon name (e.g., 'lightbulb', 'chart-line', 'rocket')",
              },
            },
            required: ["point", "description", "icon"],
          },
        },
        talktrack: {
          type: "string",
          description: "Speaker notes for this slide",
        },
        sources: {
          type: "array",
          description: "Reference sources",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              link: { type: "string" },
            },
            required: ["title", "link"],
          },
        },
        force_edit: {
          type: "boolean",
          description: "Overwrite if slide exists at this slidenum",
        },
      },
      required: [
        "title",
        "subtitle",
        "slidenum",
        "body",
        "talktrack",
        "sources",
      ],
    },
  },
  required: ["presentation_id", "slide_data"],
  additionalProperties: false,
} as const;

const slideCarouselInputSchema = {
  type: "object",
  properties: {
    presentation_id: {
      type: "string",
      default: "",
      description:
        "Presentation ID for continuity. Use '' for first batch, then ALWAYS pass the ID returned from previous calls.",
    },
    slides_data: {
      type: "array",
      description:
        "Array of slides to create. Use this for 2+ slides instead of calling create_slide multiple times.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Slide title" },
          subtitle: { type: "string", description: "Slide subtitle" },
          slidenum: { type: "number", description: "Slide number in sequence" },
          image_id: {
            type: "string",
            default: "",
            description:
              "OPTIONAL - If omitted, system auto-selects best image",
          },
          body: {
            type: "array",
            description: "2-4 bullet points",
            items: {
              type: "object",
              properties: {
                point: { type: "string", description: "Main point" },
                description: { type: "string", description: "Explanation" },
                icon: { type: "string", description: "FontAwesome icon name" },
              },
              required: ["point", "description", "icon"],
            },
          },
          talktrack: { type: "string", description: "Speaker notes" },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                link: { type: "string" },
              },
              required: ["title", "link"],
            },
          },
          force_edit: { type: "boolean" },
        },
        required: [
          "title",
          "subtitle",
          "slidenum",
          "body",
          "talktrack",
          "sources",
        ],
      },
    },
  },
  required: ["presentation_id", "slides_data"],
  additionalProperties: false,
} as const;

const searchInputSchema = {
  type: "object",
  properties: {
    caption: {
      type: "string",
      description: "Search terms for finding relevant images",
    },
  },
  required: ["caption"],
  additionalProperties: false,
} as const;

const applyThemeInputSchema = {
  type: "object",
  properties: {
    presentation_id: {
      type: "string",
      description:
        "The presentation ID to apply the theme to. This is required and should be the ID returned from slide creation.",
    },
    theme_id: {
      type: "string",
      enum: THEME_IDS as unknown as string[],
      description:
        "The theme ID to apply. Choose from: copenhagen-light/dark, tokyo-light/dark, paris-light/dark, berlin-light/dark, new-york-light/dark, la-light/dark, zurich-light/dark, shanghai-light/dark, cosmic-pulse-light/dark",
    },
  },
  required: ["presentation_id", "theme_id"],
  additionalProperties: false,
} as const;

const showThemePickerInputSchema = {
  type: "object",
  properties: {
    presentation_id: {
      type: "string",
      description: "The presentation ID to show themes for.",
    },
    recommended_theme_id: {
      type: "string",
      description:
        "Optional recommended theme ID based on the presentation content.",
    },
  },
  required: ["presentation_id"],
  additionalProperties: false,
} as const;

const slideViewerInputParser = z.object({
  presentation_id: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
  slide_data: SlideSchema,
});

const slideCarouselInputParser = z.object({
  presentation_id: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
  slides_data: z.array(SlideSchema),
});

const searchInputParser = z.object({
  caption: z.string(),
});

const applyThemeInputParser = z.object({
  presentation_id: z.string(),
  theme_id: z.enum(THEME_IDS),
});

const showThemePickerInputParser = z.object({
  presentation_id: z.string(),
  recommended_theme_id: z.string().optional(),
});

// API call to create slide
async function createSlide(
  slideData: Slide,
  presentationContext: PresentationContext
): Promise<GenerateResponse> {
  const headers = generateOpenAIHeaders(presentationContext);

  const response = await fetch("https://slidesgpt.com/chat/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      v: "2",
      slidecode: slideData,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`   ❌ API Error: ${errorText}`);
    throw new Error(`Failed to create slide: ${response.status}`);
  }

  const responseData = await response.json();
  const parsed = GenerateResponseSchema.parse(responseData);

  console.log(`   ✅ Slide ${slideData.slidenum}: "${slideData.title}"`);
  console.log(`      → ${normalizeUrl(parsed.data.presentation_view_url)}`);

  // Increment slide count
  presentationContext.slideCount++;

  return parsed;
}

// API call to search images
async function searchImages(caption: string): Promise<any[]> {
  const searchUrl = new URL("https://slidesgpt.com/chat/search");
  searchUrl.searchParams.append("caption", caption);

  const response = await fetch(searchUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

// API call to apply theme to presentation
type ApplyThemeResponse = {
  success: boolean;
  theme: { id: string; name: string };
  slides: Array<{ slideNum: number; image_url: string }>;
  presentation_view_url: string;
  message: string;
};

async function applyTheme(
  deckId: string,
  themeId: ThemeId,
  presentationContext: PresentationContext
): Promise<ApplyThemeResponse> {
  const headers = generateOpenAIHeaders(presentationContext);

  const response = await fetch("https://slidesgpt.com/api/chat/apply-theme", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      deckId,
      themeId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`   ❌ Apply theme error: ${errorText}`);
    throw new Error(`Failed to apply theme: ${response.status}`);
  }

  const responseData = (await response.json()) as ApplyThemeResponse;

  // Update presentation context with the new theme
  presentationContext.themeId = themeId;

  console.log(
    `   ✅ Theme "${themeId}" applied (${
      responseData.slides?.length || 0
    } slides)`
  );
  console.log(`      → ${normalizeUrl(responseData.presentation_view_url)}`);

  return responseData;
}

// Generate theme options object for first slide response
function generateThemeOptions(recommendedThemeId?: ThemeId) {
  const allThemes = THEME_IDS.map((id) => ({
    id,
    name: THEME_METADATA[id].name,
    category: THEME_METADATA[id].category,
    description: THEME_METADATA[id].description,
  }));

  const categories = {
    urban: allThemes.filter((t) => t.category === "urban"),
    gradient: allThemes.filter((t) => t.category === "gradient"),
  };

  return {
    message: `Your presentation has been created! Would you like to apply a custom theme? We have 18 themes across 2 categories.`,
    categories,
    all_themes: allThemes,
    total_themes: 18,
    recommended_theme_id: recommendedThemeId,
    instructions: `To apply a theme, say "Use [theme name]" (e.g., "Use Tokyo Dark") or use the apply_theme tool with the theme_id.`,
  };
}

const tools: Tool[] = [
  {
    name: "create_slide",
    description: `Create EXACTLY ONE presentation slide. Use this tool ONLY when creating a single slide.

CRITICAL RULES:
- For creating 2 or more slides at once, you MUST use "create_slide_carousel" instead - NEVER call this tool multiple times
- The image_id is OPTIONAL - if omitted or empty, the system automatically selects the best matching image
- You do NOT need to call search_images first - just provide slide content and let the system handle images
- When adding to an existing presentation, ALWAYS pass the presentation_id from the previous response

WORKFLOW:
1. User asks for a slide → Use this tool with slide content (image_id optional)
2. User asks for multiple slides → Use create_slide_carousel instead (NEVER call this multiple times)`,
    inputSchema: slideViewerInputSchema,
    title: "Create Slide",
    _meta: widgetMeta(widgetsById.get("create_slide")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: true,
      readOnlyHint: false,
    },
  },
  {
    name: "create_slide_carousel",
    description: `Create MULTIPLE presentation slides at once and display them in a carousel viewer.

WHEN TO USE THIS TOOL:
- User asks to "add 3 more slides" → Use this tool with 3 slides in the array
- User asks for "a presentation about X" → Use this tool with all slides
- User asks for "more slides" or "additional slides" → Use this tool
- ANY request involving 2 or more slides → Use this tool

CRITICAL RULES:
- ALWAYS use this for creating 2+ slides - NEVER call create_slide multiple times
- The image_id is OPTIONAL for each slide - the system automatically selects best matching images
- You do NOT need to call search_images first - just provide slide content
- When adding to an existing presentation, ALWAYS pass the presentation_id from the previous response

This displays all slides in a beautiful scrollable carousel view instead of individual slide widgets.`,
    inputSchema: slideCarouselInputSchema,
    title: "Create Slides Carousel",
    _meta: widgetMeta(widgetsById.get("create_slide_carousel")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: true,
      readOnlyHint: false,
    },
  },
  {
    name: "search_images",
    description: `Search for professional images and automatically select the best match.

WHEN TO USE:
- ONLY when a user explicitly asks to see image options or wants to choose a specific image
- OPTIONAL: You can skip this entirely - create_slide and create_slide_carousel will auto-select images

This tool searches for images matching the caption and returns the BEST MATCHING image_id ready to use.
The returned image_id can be passed to create_slide or create_slide_carousel.

For most cases, simply omit the image_id when creating slides - the system handles image selection automatically.`,
    inputSchema: searchInputSchema,
    title: "Search Images",
    annotations: {
      destructiveHint: false,
      openWorldHint: true,
      readOnlyHint: true,
    },
  },
  {
    name: "apply_theme",
    description: `Apply a visual theme to re-style the entire presentation.

WHEN TO USE:
- User says "apply Tokyo Dark theme", "change theme to Paris", etc.
- User wants to customize the presentation appearance

AVAILABLE THEMES (18 total):
• Urban: copenhagen, tokyo, paris, berlin, new-york, la, zurich, shanghai (each has -light and -dark variants)
• Gradient: cosmic-pulse-light/dark

REQUIRES: presentation_id from previous slide creation. This re-renders all slides with the new theme.`,
    inputSchema: applyThemeInputSchema,
    title: "Apply Theme",
    annotations: {
      destructiveHint: false,
      openWorldHint: true,
      readOnlyHint: false,
    },
  },
  {
    name: "show_theme_picker",
    description: `Display an interactive visual theme picker widget.

WHEN TO USE:
- User says "show themes", "what themes are available", "let me pick a theme"
- User wants to browse theme options visually

Shows a widget with 18 themes across 2 categories (Urban, Gradient) with color swatches and fonts.`,
    inputSchema: showThemePickerInputSchema,
    title: "Show Theme Picker",
    _meta: widgetMeta(widgetsById.get("theme-picker")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
];

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

function createSlidesServer(): Server {
  const server = new Server(
    {
      name: "SlidesGPT",
      version: "0.1.1",
      description:
        "Create professional presentation slides with AI-powered design and theming. Generate slides with rich content, apply beautiful themes, and download high-quality images.",
      privacyPolicyUrl: "https://slidesgpt.com/privacy",
      supportEmail: "support@slidesgpt.com",
      homepage: "https://slidesgpt.com",
      iconUrl: "https://slidesgpt.com/favicon.svg",
      author: {
        name: "SlidesGPT",
        url: "https://slidesgpt.com",
      },
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => {
      return { resources };
    }
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const widget = widgetsByUri.get(request.params.uri);

      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({
      resourceTemplates,
    })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => {
      return { tools };
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const toolName = request.params.name;

      console.log(`\n🔧 Tool: ${toolName}`);

      try {
        // Handle create_slide tool
        if (toolName === "create_slide") {
          const widget = widgetsById.get("create_slide")!;
          const args = slideViewerInputParser.parse(
            request.params.arguments ?? {}
          );

          // Get or create presentation context
          const presentation = getOrCreatePresentation(args.presentation_id);

          const result = await createSlide(args.slide_data, presentation);

          // Extract and store the actual deck ID from the API response
          if (!presentation.deckId && result.data.presentation_view_url) {
            const extractedDeckId = extractDeckIdFromUrl(
              result.data.presentation_view_url
            );
            if (extractedDeckId) {
              presentation.deckId = extractedDeckId;
              console.log(`      deck: ${extractedDeckId}`);
            }
          }

          // Check if this is the first slide and theme hasn't been offered yet
          const isFirstSlide =
            presentation.slideCount === 1 &&
            !presentation.themeOffered &&
            !presentation.themeId;
          let themeMessage = "";
          let themeOptions = {};

          if (isFirstSlide) {
            presentation.themeOffered = true;
            themeOptions = generateThemeOptions();
            themeMessage = `\n\n🎨 **Theme Options Available!**\nWould you like to customize your presentation's look? We have 18 themes across 2 categories (Urban, Gradient). Say "show themes" or "use [theme name]" to apply a theme.`;
          }

          return {
            content: [
              {
                type: "text",
                text: `✅ Slide ${args.slide_data.slidenum} created successfully!\n\nTitle: "${args.slide_data.title}"\nSubtitle: ${args.slide_data.subtitle}\n\n🔑 IMPORTANT - Save this Presentation ID:\n${presentation.presentationId}\n\nFor any additional slides in THIS conversation, you MUST include:\n"presentation_id": "${presentation.presentationId}"\nin the tool parameters.${themeMessage}`,
              },
            ],
            structuredContent: {
              presentation_id: presentation.presentationId,
              deck_id: presentation.deckId, // For inline theme selector
              theme_id: presentation.themeId, // Current theme if any
              slide: {
                title: args.slide_data.title,
                subtitle: args.slide_data.subtitle,
                slidenum: args.slide_data.slidenum,
                image_url: result.data.image_url,
                presentation_view_url: normalizeUrl(
                  result.data.presentation_view_url
                ),
              },
              ...(isFirstSlide ? { theme_options: themeOptions } : {}),
            },
            _meta: widgetMeta(widget),
          };
        }

        // Handle create_slide_carousel tool
        if (toolName === "create_slide_carousel") {
          const widget = widgetsById.get("create_slide_carousel")!;
          const args = slideCarouselInputParser.parse(
            request.params.arguments ?? {}
          );

          // Get or create presentation context
          const presentation = getOrCreatePresentation(args.presentation_id);

          console.log(`   Creating ${args.slides_data.length} slides...`);
          const results: GenerateResponse[] = [];
          for (const slideData of args.slides_data) {
            const result = await createSlide(slideData, presentation);
            results.push(result);

            // Extract and store the actual deck ID from the first API response
            if (!presentation.deckId && result.data.presentation_view_url) {
              const extractedDeckId = extractDeckIdFromUrl(
                result.data.presentation_view_url
              );
              if (extractedDeckId) {
                presentation.deckId = extractedDeckId;
                console.log(`      deck: ${extractedDeckId}`);
              }
            }
          }
          console.log(`   ✅ All ${results.length} slides created`);
          console.log(
            `      → ${normalizeUrl(
              results[results.length - 1]?.data.presentation_view_url || ""
            )}`
          );

          const slides = args.slides_data.map((slideData, index) => ({
            title: slideData.title,
            subtitle: slideData.subtitle,
            slidenum: slideData.slidenum,
            image_url: results[index].data.image_url,
            presentation_view_url: normalizeUrl(
              results[index].data.presentation_view_url
            ),
          }));

          // Check if these are the first slides and theme hasn't been offered yet
          const isFirstBatch =
            !presentation.themeOffered && !presentation.themeId;
          let themeMessage = "";
          let themeOptions = {};

          if (isFirstBatch) {
            presentation.themeOffered = true;
            themeOptions = generateThemeOptions();
            themeMessage = `\n\n🎨 **Theme Options Available!**\nWould you like to customize your presentation's look? We have 18 themes across 2 categories (Urban, Gradient). Say "show themes" or "use [theme name]" to apply a theme.`;
          }

          return {
            content: [
              {
                type: "text",
                text: `✅ Created ${
                  slides.length
                } slides successfully!\n\n${slides
                  .map((s) => `Slide ${s.slidenum}: "${s.title}"`)
                  .join("\n")}\n\n🔑 IMPORTANT - Save this Presentation ID:\n${
                  presentation.presentationId
                }\n\nFor any additional slides in THIS conversation, you MUST include:\n"presentation_id": "${
                  presentation.presentationId
                }"\nin the tool parameters.${themeMessage}`,
              },
            ],
            structuredContent: {
              presentation_id: presentation.presentationId,
              slides,
              ...(isFirstBatch ? { theme_options: themeOptions } : {}),
            },
            _meta: widgetMeta(widget),
          };
        }

        // Handle search_images tool
        if (toolName === "search_images") {
          const args = searchInputParser.parse(request.params.arguments ?? {});

          console.log(`🔍 Searching images for: "${args.caption}"`);

          const images = await searchImages(args.caption);

          if (images.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No images found for "${args.caption}". You can proceed without an image (the system will handle it), or try different search terms.`,
                },
              ],
            };
          }

          // Auto-select the best (first) image
          const bestImage = images[0];
          console.log(`   ✅ Auto-selected: ${bestImage.image_id}`);

          return {
            content: [
              {
                type: "text",
                text: `✅ Found and auto-selected the best matching image:\n\nImage ID: ${bestImage.image_id}\nCaption: "${bestImage.caption}"\n\nUse this image_id when creating your slide, or omit it entirely to let the system choose automatically.`,
              },
            ],
            structuredContent: {
              selected_image_id: bestImage.image_id,
              caption: bestImage.caption,
              preview_url: bestImage.url,
              total_found: images.length,
            },
          };
        }

        // Handle apply_theme tool
        if (toolName === "apply_theme") {
          const args = applyThemeInputParser.parse(
            request.params.arguments ?? {}
          );

          // Get presentation context
          const presentation = presentations.get(args.presentation_id);
          if (!presentation) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Presentation not found: ${args.presentation_id}. Make sure you're using the correct presentation_id from slide creation.`,
                },
              ],
              isError: true,
            };
          }

          // Use the stored deck ID from the API response
          if (!presentation.deckId) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ No deck ID available for presentation: ${args.presentation_id}. Please create at least one slide first.`,
                },
              ],
              isError: true,
            };
          }

          const result = await applyTheme(
            presentation.deckId,
            args.theme_id,
            presentation
          );
          const themeMeta = THEME_METADATA[args.theme_id];

          return {
            content: [
              {
                type: "text",
                text: `✅ Theme "${themeMeta.name}" (${
                  themeMeta.description
                }) has been applied to your presentation!\n\n${
                  result.slides?.length || 0
                } slide(s) have been re-rendered with the new theme.\n\nView your presentation: ${normalizeUrl(
                  result.presentation_view_url
                )}`,
              },
            ],
            structuredContent: {
              success: true,
              theme: {
                id: args.theme_id,
                name: themeMeta.name,
                category: themeMeta.category,
                description: themeMeta.description,
              },
              slides: result.slides,
              presentation_view_url: normalizeUrl(result.presentation_view_url),
            },
          };
        }

        // Handle show_theme_picker tool
        if (toolName === "show_theme_picker") {
          const widget = widgetsById.get("theme-picker")!;
          const args = showThemePickerInputParser.parse(
            request.params.arguments ?? {}
          );

          // Get presentation context to access the actual deck ID
          const presentation = presentations.get(args.presentation_id);
          const deckId = presentation?.deckId || null;

          const themeOptions = generateThemeOptions(
            args.recommended_theme_id as ThemeId | undefined
          );

          return {
            content: [
              {
                type: "text",
                text: `🎨 Choose a theme for your presentation!\n\nWe have ${themeOptions.total_themes} themes across 2 categories:\n• Urban (16 themes): City-inspired, bold, modern\n• Gradient (2 themes): Vibrant, creative, eye-catching\n\n${themeOptions.instructions}`,
              },
            ],
            structuredContent: {
              deck_id: deckId,
              ...themeOptions,
            },
            _meta: widgetMeta(widget),
          };
        }

        throw new Error(`Unknown tool: ${toolName}`);
      } catch (error) {
        console.error(`Error in tool ${toolName}:`, error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";
const wellKnownPath = "/.well-known/openai-apps-challenge";

// OpenAI Apps SDK domain verification token
const OPENAI_VERIFICATION_TOKEN =
  process.env.OPENAI_VERIFICATION_TOKEN ??
  "DPxuPbiplL5KtNt0UNg-JhFGzhgTMaFjUkhCgoILaQg";

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createSlidesServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  console.log(`\n📡 New session: ${sessionId}`);

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8001);
const port = Number.isFinite(portEnv) ? portEnv : 8001;

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    // OpenAI domain verification endpoint
    if (req.method === "GET" && url.pathname === wellKnownPath) {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(OPENAI_VERIFICATION_TOKEN);
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, () => {
  console.log(`SlidesGPT MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
  console.log(
    `  Domain verification: GET http://localhost:${port}${wellKnownPath}`
  );
});

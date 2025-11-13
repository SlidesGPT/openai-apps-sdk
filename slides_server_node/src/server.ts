import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import * as crypto from "node:crypto";

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
  image_id: z.string().describe("Unique identifier for the slide image"),
  body: z.array(BulletPointSchema).describe("Array of bullet points"),
  talktrack: z.string().describe("Detailed talktrack of the slide"),
  sources: z.array(SourceSchema).describe("Array of sources"),
  force_edit: z.boolean().optional().describe("If true, overwrite existing slide"),
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
};

const presentations = new Map<string, PresentationContext>();

// Cleanup old presentations periodically (keep for 24 hours)
setInterval(() => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  for (const [id, context] of presentations.entries()) {
    if (context.lastUsed < twentyFourHoursAgo) {
      console.log(`🗑️  Cleaning up old presentation: ${id} (last used: ${context.lastUsed.toISOString()})`);
      presentations.delete(id);
    }
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
    console.log(`\n📂 Using existing presentation: ${presentationId}`);
    console.log(`   Slide count: ${context.slideCount}`);
    return context;
  }

  // Create new presentation
  const newPresentationId = presentationId || generatePresentationId();
  const context: PresentationContext = {
    presentationId: newPresentationId,
    conversationId: crypto.randomBytes(16).toString("hex"),
    userId: `mcp-user-${crypto.randomBytes(8).toString("hex")}`,
    slideCount: 0,
    createdAt: new Date(),
    lastUsed: new Date(),
  };

  presentations.set(newPresentationId, context);
  console.log(`\n📂 Created new presentation: ${newPresentationId}`);

  return context;
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
  } as const;
}

const widgets: SlideWidget[] = [
  {
    id: "slide-viewer",
    title: "Create Slide",
    templateUri: "ui://widget/slide-viewer.html",
    invoking: "Creating slide...",
    invoked: "Slide created",
    html: readWidgetHtml("slides-viewer"),
    responseText: "Slide created successfully!",
  },
  {
    id: "slide-carousel",
    title: "Create Slides Carousel",
    templateUri: "ui://widget/slide-carousel.html",
    invoking: "Creating slides...",
    invoked: "Slides created",
    html: readWidgetHtml("slides-carousel"),
    responseText: "Slides carousel created successfully!",
  },
];

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
      description: "Presentation ID to maintain continuity across slides in the same conversation. Use empty string '' for the first slide, then ALWAYS pass back the ID returned in the response for subsequent slides. If you pass an empty string for slide 2+, a NEW separate presentation will be created.",
    },
    slide_data: {
      type: "object",
      description: "Complete slide structure with title, subtitle, slidenum, body, talktrack, and sources",
      properties: {
        title: { type: "string", description: "Title of the slide" },
        subtitle: { type: "string", description: "Subtitle of the slide" },
        slidenum: { type: "number", description: "Slide number" },
        image_id: { type: "string", description: "Image ID from search" },
        body: {
          type: "array",
          description: "Array of bullet points",
          items: {
            type: "object",
            properties: {
              point: { type: "string" },
              description: { type: "string" },
              icon: { type: "string" },
            },
            required: ["point", "description", "icon"],
          },
        },
        talktrack: { type: "string", description: "Speaker notes" },
        sources: {
          type: "array",
          description: "Array of sources",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              link: { type: "string" },
            },
            required: ["title", "link"],
          },
        },
        force_edit: { type: "boolean", description: "Overwrite if exists" },
      },
      required: ["title", "subtitle", "slidenum", "image_id", "body", "talktrack", "sources"],
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
      description: "Presentation ID to maintain continuity across slides in the same conversation. Use empty string '' for the first batch of slides, then ALWAYS pass back the ID returned in the response for subsequent batches. If you pass an empty string when adding more slides, a NEW separate presentation will be created.",
    },
    slides_data: {
      type: "array",
      description: "Array of slide structures",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          slidenum: { type: "number" },
          image_id: { type: "string" },
          body: { type: "array" },
          talktrack: { type: "string" },
          sources: { type: "array" },
          force_edit: { type: "boolean" },
        },
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

// API call to create slide
async function createSlide(
  slideData: Slide,
  presentationContext: PresentationContext
): Promise<GenerateResponse> {
  const headers = generateOpenAIHeaders(presentationContext);

  const response = await fetch("https://staging.slidesgpt.com/chat/generate", {
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
    console.error("API Error:", errorText);
    throw new Error(`Failed to create slide: ${response.status}`);
  }

  // Increment slide count
  presentationContext.slideCount++;

  return GenerateResponseSchema.parse(await response.json());
}

// API call to search images
async function searchImages(caption: string): Promise<any[]> {
  const searchUrl = new URL("https://staging.slidesgpt.com/chat/search");
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

const tools: Tool[] = [
  {
    name: "slide-viewer",
    description: "Creates a professional presentation slide from structured data. Generates a slide with title, subtitle, bullet points, and talk track. The slide will be displayed in an interactive viewer. IMPORTANT: When creating multiple slides in the same conversation, always pass the presentation_id returned from the previous slide creation to maintain presentation continuity.",
    inputSchema: slideViewerInputSchema,
    title: "Create Slide",
    _meta: widgetMeta(widgetsById.get("slide-viewer")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
  {
    name: "slide-carousel",
    description: "Creates multiple presentation slides at once and displays them in a scrollable carousel. Each slide includes title, subtitle, bullet points, and talk track. IMPORTANT: When adding more slides to an existing presentation, always pass the presentation_id from the previous tool call to maintain presentation continuity.",
    inputSchema: slideCarouselInputSchema,
    title: "Create Slides Carousel",
    _meta: widgetMeta(widgetsById.get("slide-carousel")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
  {
    name: "search-images",
    description: "Search for professional images to use in slides. Returns image IDs that can be used in the slide_data's image_id field.",
    inputSchema: searchInputSchema,
    title: "Search Images",
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
      name: "slides-node",
      version: "0.1.0",
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
      console.log("\n=== LIST RESOURCES REQUEST ===");
      console.log("Timestamp:", new Date().toISOString());
      return { resources };
    }
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      console.log("\n=== READ RESOURCE REQUEST ===");
      console.log("URI:", request.params.uri);
      console.log("Timestamp:", new Date().toISOString());

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
      console.log("\n=== LIST TOOLS REQUEST ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Returning", tools.length, "tools");
      return { tools };
    }
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const toolName = request.params.name;

      console.log("\n=== TOOL CALL RECEIVED ===");
      console.log("Tool Name:", toolName);
      console.log("Timestamp:", new Date().toISOString());
      console.log("\n--- Request Metadata (_meta) ---");
      console.log(JSON.stringify(request.params._meta, null, 2));
      console.log("\n--- Arguments ---");
      console.log(JSON.stringify(request.params.arguments, null, 2));

      try {
        // Handle slide-viewer tool
        if (toolName === "slide-viewer") {
          const widget = widgetsById.get("slide-viewer")!;
          const args = slideViewerInputParser.parse(request.params.arguments ?? {});

          console.log("\n--- Presentation ID from request ---");
          console.log(
            `Raw: "${request.params.arguments?.presentation_id}"`,
            `Parsed: "${args.presentation_id || "undefined"}"`
          );

          // Get or create presentation context
          const presentation = getOrCreatePresentation(args.presentation_id);

          console.log("\n--- Parsed slide_data ---");
          console.log(JSON.stringify(args.slide_data, null, 2));

          const result = await createSlide(args.slide_data, presentation);

          return {
            content: [
              {
                type: "text",
                text: `✅ Slide ${args.slide_data.slidenum} created successfully!\n\nTitle: "${args.slide_data.title}"\nSubtitle: ${args.slide_data.subtitle}\n\n🔑 IMPORTANT - Save this Presentation ID:\n${presentation.presentationId}\n\nFor any additional slides in THIS conversation, you MUST include:\n"presentation_id": "${presentation.presentationId}"\nin the tool parameters.`,
              },
            ],
            structuredContent: {
              presentation_id: presentation.presentationId,
              slide: {
                title: args.slide_data.title,
                subtitle: args.slide_data.subtitle,
                slidenum: args.slide_data.slidenum,
                image_url: result.data.image_url,
                presentation_view_url: result.data.presentation_view_url,
              },
            },
            _meta: widgetMeta(widget),
          };
        }

        // Handle slide-carousel tool
        if (toolName === "slide-carousel") {
          const widget = widgetsById.get("slide-carousel")!;
          const args = slideCarouselInputParser.parse(request.params.arguments ?? {});

          console.log("\n--- Presentation ID from request ---");
          console.log(
            `Raw: "${request.params.arguments?.presentation_id}"`,
            `Parsed: "${args.presentation_id || "undefined"}"`
          );

          // Get or create presentation context
          const presentation = getOrCreatePresentation(args.presentation_id);

          console.log(`\n--- Creating ${args.slides_data.length} slides ---`);
          console.log(JSON.stringify(args.slides_data, null, 2));

          const results = await Promise.all(
            args.slides_data.map((slideData) => createSlide(slideData, presentation))
          );

          const slides = args.slides_data.map((slideData, index) => ({
            title: slideData.title,
            subtitle: slideData.subtitle,
            slidenum: slideData.slidenum,
            image_url: results[index].data.image_url,
            presentation_view_url: results[index].data.presentation_view_url,
          }));

          return {
            content: [
              {
                type: "text",
                text: `✅ Created ${slides.length} slides successfully!\n\n${slides.map((s) => `Slide ${s.slidenum}: "${s.title}"`).join("\n")}\n\n🔑 IMPORTANT - Save this Presentation ID:\n${presentation.presentationId}\n\nFor any additional slides in THIS conversation, you MUST include:\n"presentation_id": "${presentation.presentationId}"\nin the tool parameters.`,
              },
            ],
            structuredContent: {
              presentation_id: presentation.presentationId,
              slides,
            },
            _meta: widgetMeta(widget),
          };
        }

        // Handle search-images tool
        if (toolName === "search-images") {
          const args = searchInputParser.parse(request.params.arguments ?? {});

          console.log("\n--- Searching images ---");
          console.log("Caption:", args.caption);

          const images = await searchImages(args.caption);

          if (images.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `No images found for "${args.caption}". Try different search terms or proceed without an image.`,
                },
              ],
            };
          }

          const topImages = images.slice(0, 3);
          const imageList = topImages
            .map(
              (img: any, index: number) =>
                `${index + 1}. ${img.image_id}\n   Caption: "${img.caption}"\n   Preview: ${img.url}`
            )
            .join("\n\n");

          return {
            content: [
              {
                type: "text",
                text: `Found ${images.length} images for "${args.caption}":\n\n${imageList}\n\nUse the image_id in your slide creation.`,
              },
            ],
          };
        }

        throw new Error(`Unknown tool: ${toolName}`);
      } catch (error) {
        console.error(`Error in tool ${toolName}:`, error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
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

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createSlidesServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  console.log("\n=== NEW SSE SESSION ===");
  console.log("Session ID:", sessionId);
  console.log("Timestamp:", new Date().toISOString());

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

  console.log("\n=== INCOMING POST MESSAGE ===");
  console.log("Session ID:", sessionId);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

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
});

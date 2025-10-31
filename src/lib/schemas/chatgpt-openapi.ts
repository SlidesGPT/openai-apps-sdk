import { z } from "zod";

// Derived from OpenAPI specification for ChatGPT endpoints
// This ensures exact compatibility between ChatGPT and MCP implementations

/**
 * BulletPoint schema - represents individual bullet points in slide body
 */
export const BulletPointSchema = z.object({
  point: z
    .string()
    .describe(
      "The main point to be made in this section of the slide, e.g. 'Increased efficiency'",
    ),
  description: z
    .string()
    .describe(
      "Interpreting and expanding on the concepts of the main point, e.g. 'Transactions are processed quickly and without the need for a middleman'. Highly condensed, short and concise expansion of the point. Avoid wordy descriptions.",
    ),
  icon: z
    .string()
    .describe(
      "Class name of Font Awesome Free 5.15 icon representing the subsection. Example: fa-cogs. Strictly needs to be a Font Awesome Free 5.15 icon class name that does indeed exist in the library. Do not hallucinate an icon class name.",
    ),
});

/**
 * Source schema - represents academic/reference sources
 */
export const SourceSchema = z.object({
  title: z
    .string()
    .describe(
      "Title of the source, e.g. 'The State of AI in 2023: Generative AIs Breakout Year, McKinsey & Company, August 2023.'",
    ),
  link: z
    .string()
    .describe(
      "URL link to the source if provided, e.g.: 'https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai'. Leave empty if the source does not have a link such as a pdf being uploaded.",
    ),
});

/**
 * Slide schema - main slide structure expected by /chat/generate endpoint
 */
export const SlideSchema = z.object({
  title: z.string().describe("Title of the slide."),
  subtitle: z.string().describe("Subtitle of the slide."),
  slidenum: z.number().describe("Slide number in the presentation."),
  image_id: z
    .string()
    .describe(
      "Unique identifier for the slide image as returned from search endpoint. Leave as empty string if no relevant image is found. Do not add a caption here.",
    ),
  body: z
    .array(BulletPointSchema)
    .describe("Array of bullet points for the slide content"),
  talktrack: z
    .string()
    .describe(
      "The detailed talktrack of the slide. Avoid repeating the content but rather add value added narrative for the presenter as a talk track. Don't start with 'this slide', but rather start with a meaningful statement e.g. 'We need to consider ...' or continuation of story line 'Next, in addition to ...'",
    ),
  sources: z
    .array(SourceSchema)
    .describe(
      "Array of sources. Can be an empty array if no sources are used within the context of the slide.",
    ),
  force_edit: z
    .boolean()
    .optional()
    .describe("If true, the slide will be overwritten if it already exists."),
});

/**
 * Generate request schema - full request body for /chat/generate
 */
export const GenerateRequestSchema = z.object({
  v: z.string().default("2").describe("Specifies the API version being used."),
  slidecode: SlideSchema,
});

/**
 * ImageDocument schema - represents image search results from /chat/search
 */
export const ImageDocumentSchema = z.object({
  author_handle: z
    .string()
    .describe("Social media handle of the image author."),
  author_name: z.string().describe("Name of the image author."),
  caption: z.string().describe("Caption associated with the image."),
  image_id: z.string().describe("Unique identifier for the image."),
  url: z.string().describe("URL of the image for embedding."),
  orientation: z
    .enum(["portrait", "landscape"])
    .describe("Orientation of the image."),
  retrieval: z.string().describe("Method used for retrieving the image."),
});

/**
 * Search response schema - response from /chat/search endpoint
 */
export const SearchResponseSchema = z.object({
  doc_time: z.number().describe("Time taken to document the search."),
  documents: z.array(ImageDocumentSchema),
});

/**
 * Generate response schema - response from /chat/generate endpoint
 */
export const GenerateResponseSchema = z.object({
  data: z.object({
    image_url: z.string().describe("URL of the generated slide image."),
    presentation_view_url: z.string().describe("URL to view the presentation."),
  }),
});

// Type exports for use in other files
export type BulletPoint = z.infer<typeof BulletPointSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Slide = z.infer<typeof SlideSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type ImageDocument = z.infer<typeof ImageDocumentSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

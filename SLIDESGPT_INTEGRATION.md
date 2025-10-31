# SlidesGPT MCP Integration

This document describes the SlidesGPT slide creation integration with the OpenAI Apps SDK examples repository.

## Overview

This integration adds the ability to create professional presentation slides directly within ChatGPT using the SlidesGPT API. Slides are displayed in rich, interactive widgets with two viewing modes:

1. **Single Slide Viewer** - Display one slide at a time with metadata and download options
2. **Slide Carousel** - Browse multiple slides in an interactive, scrollable carousel

## Architecture

### Components

```
openai-apps-sdk-examples/
├── src/
│   ├── slides-viewer/           # Single slide viewer component
│   │   └── index.jsx
│   ├── slides-carousel/          # Multi-slide carousel component
│   │   ├── index.jsx
│   │   └── SlideCard.jsx
│   └── lib/
│       ├── schemas/
│       │   └── chatgpt-openapi.ts    # Shared slide schemas
│       └── utils.ts                   # Utility functions
├── slides_server_node/           # MCP server implementation
│   ├── src/
│   │   └── server.ts
│   ├── package.json
│   └── README.md
└── assets/                       # Generated HTML/JS/CSS bundles
    ├── slides-viewer-{hash}.html
    ├── slides-viewer-{hash}.js
    ├── slides-viewer-{hash}.css
    ├── slides-carousel-{hash}.html
    └── ...
```

### Technology Stack

- **Frontend**: React 19, Tailwind CSS 4, Embla Carousel
- **Backend**: Node.js, MCP SDK, TypeScript
- **Build**: Vite, pnpm workspaces
- **API**: SlidesGPT staging API (staging.slidesgpt.com)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Build UI components:**
   ```bash
   pnpm run build
   ```

3. **Start asset server:**
   ```bash
   pnpm run serve
   ```
   This serves the built components on `http://localhost:4444`

4. **Start MCP server (in a new terminal):**
   ```bash
   cd slides_server_node
   pnpm start
   ```
   Server runs on `http://localhost:8001`

## Usage

### Available Tools

#### 1. `slide-viewer` - Create Single Slide

Creates one professional slide and displays it in an interactive viewer.

**Example ChatGPT prompt:**
```
Create a slide about "The Benefits of AI in Healthcare" with 3 bullet points
```

**Tool Input Schema:**
```typescript
{
  slide_data: {
    title: string;
    subtitle: string;
    slidenum: number;
    image_id: string;          // From search-images tool or ""
    body: Array<{
      point: string;
      description: string;
      icon: string;            // Font Awesome 5.15 class
    }>;
    talktrack: string;         // Speaker notes
    sources: Array<{
      title: string;
      link: string;
    }>;
    force_edit?: boolean;
  }
}
```

#### 2. `slide-carousel` - Create Multiple Slides

Creates multiple slides at once and displays them in a carousel.

**Example ChatGPT prompt:**
```
Create 5 slides about machine learning fundamentals
```

**Tool Input Schema:**
```typescript
{
  slides_data: Array<SlideData>  // Array of slide_data objects
}
```

#### 3. `search-images` - Find Images

Search for professional images to use in slides.

**Example ChatGPT prompt:**
```
Search for images about "artificial intelligence"
```

**Tool Input Schema:**
```typescript
{
  caption: string;  // Search query
}
```

## Development

### Building Components

Build all components including slides widgets:
```bash
pnpm run build
```

Build specific components:
```bash
# Edit build-all.mts and modify the targets array
const targets = ["slides-viewer", "slides-carousel"];
```

### Development Server

Run Vite dev server for rapid UI development:
```bash
pnpm run dev
```

### Server Development

Run MCP server with auto-reload:
```bash
cd slides_server_node
pnpm run dev
```

## Integration with ChatGPT

### Local Testing

1. Start both servers (asset server on :4444 and MCP server on :8001)
2. Use ngrok to expose the MCP server:
   ```bash
   ngrok http 8001
   ```
3. In ChatGPT Settings → Connectors, add a new connector:
   - **Name**: SlidesGPT
   - **URL**: `https://{your-ngrok-id}.ngrok-free.app/mcp`
   - **Type**: SSE

### Production Deployment

1. **Build components:**
   ```bash
   BASE_URL=https://your-cdn.com pnpm run build
   ```

2. **Deploy assets** to CDN or static hosting

3. **Deploy MCP server** to your hosting platform:
   ```bash
   # Set environment variables
   export PORT=8001
   export BASE_URL=https://your-cdn.com

   # Start server
   cd slides_server_node
   pnpm start
   ```

4. **Update ChatGPT connector** with production MCP server URL

## API Integration

The MCP server integrates with SlidesGPT's API:

### Slide Generation

**Endpoint:** `POST https://staging.slidesgpt.com/chat/generate`

**Request:**
```json
{
  "v": "2",
  "slidecode": {
    "title": "...",
    "subtitle": "...",
    "slidenum": 1,
    "image_id": "...",
    "body": [...],
    "talktrack": "...",
    "sources": [...]
  }
}
```

**Response:**
```json
{
  "data": {
    "image_url": "https://...",
    "presentation_view_url": "https://..."
  }
}
```

### Image Search

**Endpoint:** `GET https://staging.slidesgpt.com/chat/search?caption={query}`

**Response:**
```json
[
  {
    "image_id": "...",
    "caption": "...",
    "url": "...",
    "author_name": "...",
    "author_handle": "...",
    "orientation": "landscape" | "portrait",
    "retrieval": "..."
  }
]
```

## Widget Data Flow

1. **User prompt** → ChatGPT
2. **ChatGPT** → MCP Server (tool call with slide data)
3. **MCP Server** → SlidesGPT API (generate slide)
4. **SlidesGPT API** → MCP Server (slide image URL)
5. **MCP Server** → ChatGPT (widget response with _meta)
6. **ChatGPT** → Widget HTML (loads from asset server)
7. **Widget** receives `toolOutput` via `useWidgetProps()`
8. **Widget** displays slide image and metadata

## Customization

### Styling

Colors are defined in [src/index.css](src/index.css) using CSS variables:

```css
:root {
  --primary: 263 100% 50%;        /* Purple */
  --accent: 101 93% 78%;          /* Green */
  --background: 0 0% 100%;        /* White */
  /* ... more colors */
}
```

To customize, edit these values to match your brand.

### Slide Layout

Modify the React components:
- **Single slide**: [src/slides-viewer/index.jsx](src/slides-viewer/index.jsx)
- **Carousel**: [src/slides-carousel/index.jsx](src/slides-carousel/index.jsx)
- **Card**: [src/slides-carousel/SlideCard.jsx](src/slides-carousel/SlideCard.jsx)

After editing, rebuild:
```bash
pnpm run build
```

### Tool Behavior

Edit [slides_server_node/src/server.ts](slides_server_node/src/server.ts) to:
- Change tool descriptions
- Modify input schemas
- Adjust API calls
- Add new tools

## Troubleshooting

### Assets not loading

Ensure the asset server is running:
```bash
pnpm run serve
```

And that `BASE_URL` points to the correct location.

### MCP server errors

Check server logs:
```bash
cd slides_server_node
pnpm start
```

Common issues:
- **Widget HTML not found**: Run `pnpm run build` first
- **API errors**: Check staging.slidesgpt.com is accessible
- **Port in use**: Change `PORT` environment variable

### Widget not displaying

1. Check browser console for errors
2. Verify `toolOutput` structure matches expected schema
3. Ensure `_meta` fields are correctly set in server response

## Schema Reference

### Slide Schema

```typescript
{
  title: string;              // Slide title
  subtitle: string;           // Slide subtitle
  slidenum: number;           // Slide number (1-indexed)
  image_id: string;           // Image ID from search or ""
  body: Array<{
    point: string;            // Main bullet point
    description: string;      // Point description
    icon: string;             // Font Awesome icon class
  }>;
  talktrack: string;          // Speaker notes
  sources: Array<{
    title: string;            // Source title
    link: string;             // Source URL
  }>;
  force_edit?: boolean;       // Overwrite existing slide
}
```

## Contributing

When adding new features:

1. **UI Components**: Add to `src/`
2. **Update build**: Add to `targets` in `build-all.mts`
3. **MCP Tools**: Add to `slides_server_node/src/server.ts`
4. **Rebuild**: Run `pnpm run build`
5. **Test**: Start servers and test in ChatGPT

## License

Same as parent repository.

## Support

For issues specific to the SlidesGPT integration, check:
- Server logs in `slides_server_node`
- Browser console for widget errors
- Network tab for API call failures

For SlidesGPT API issues, contact the SlidesGPT team.

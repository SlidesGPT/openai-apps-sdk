# SlidesGPT MCP Server

An MCP (Model Context Protocol) server for creating professional presentation slides using the SlidesGPT API.

## Features

- **Create Single Slide**: Generate a professional slide with title, subtitle, bullet points, and speaker notes
- **Create Slide Carousel**: Generate multiple slides at once and display them in an interactive carousel
- **Search Images**: Find relevant images to use in your slides

## Tools

### 1. `slide-viewer`
Creates a single presentation slide and displays it in an interactive viewer.

**Input:**
```json
{
  "slide_data": {
    "title": "Slide Title",
    "subtitle": "Slide Subtitle",
    "slidenum": 1,
    "image_id": "",
    "body": [
      {
        "point": "Main Point",
        "description": "Description of the point",
        "icon": "fa-lightbulb"
      }
    ],
    "talktrack": "Speaker notes...",
    "sources": [
      {
        "title": "Source Title",
        "link": "https://example.com"
      }
    ]
  }
}
```

### 2. `slide-carousel`
Creates multiple slides at once and displays them in a scrollable carousel.

**Input:**
```json
{
  "slides_data": [
    {
      "title": "Slide 1",
      "subtitle": "First slide",
      "slidenum": 1,
      ...
    },
    {
      "title": "Slide 2",
      "subtitle": "Second slide",
      "slidenum": 2,
      ...
    }
  ]
}
```

### 3. `search-images`
Search for professional images to use in slides.

**Input:**
```json
{
  "caption": "artificial intelligence technology"
}
```

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Build the UI components (from project root):**
   ```bash
   cd ..
   pnpm run build
   ```

3. **Start the server:**
   ```bash
   pnpm start
   ```

The server will start on `http://localhost:8001` by default.

## Development

Run the server with auto-reload:
```bash
pnpm run dev
```

## Environment Variables

- `PORT` - Server port (default: 8001)

## Integration with ChatGPT

1. Start the asset server (from project root):
   ```bash
   pnpm run serve
   ```

2. Start the MCP server:
   ```bash
   cd slides_server_node
   pnpm start
   ```

3. Expose the server using ngrok:
   ```bash
   ngrok http 8001
   ```

4. In ChatGPT settings, add a new connector with the ngrok URL

## API Endpoints

- `GET /mcp` - SSE stream endpoint
- `POST /mcp/messages?sessionId=<id>` - Message posting endpoint

## Architecture

The server uses:
- **MCP SDK** for protocol implementation
- **SSE (Server-Sent Events)** for real-time communication
- **SlidesGPT API** (staging.slidesgpt.com) for slide generation
- **React widgets** for displaying slides in ChatGPT

## Widget Components

The server references two pre-built React components:
- `slides-viewer` - Single slide display
- `slides-carousel` - Multiple slides carousel

These are built from the `src/` directory and served as static HTML/JS/CSS bundles from the `assets/` directory.

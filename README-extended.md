# Earth View

Earth View is an interactive satellite-imagery exploration app built with React, Vite, Three.js, Tailwind CSS, and Zustand. It has two main working surfaces:

- A full-screen 3D globe for broad exploration with NASA GIBS global imagery, overlays, labels, activity markers, and cursor-anchored camera zoom.
- A regional modal workspace for closer inspection with pan/zoom, date and layer controls, Copernicus Sentinel imagery, scene metadata, time lapses, Google Maps handoff, and AI-assisted view analysis.

The usual flow is: explore on the globe, zoom into the detailed globe pass, then shift-click or right-click a point to open the regional modal.

## Current Feature Set

- Interactive Three.js Earth with NASA GIBS WMS imagery wrapped onto a sphere and cursor-anchored wheel zoom.
- Daily MODIS and VIIRS true-color and false-color base layers.
- Stacked NASA GIBS analytic overlays for aerosols, cloud-top temperature, precipitable water, sea surface temperature, chlorophyll, snow, sea ice, and active fires.
- Toggleable country borders, admin-1 boundaries, graticule lines, and tiered city labels.
- Optional activity overlays for recent USGS earthquakes and open NASA EONET volcano and severe-storm events.
- Max-zoom detailed globe pass with a regional 2D raster, aligned GIBS overlay images, boundary overlay, cursor-anchored in-pass zoom, and globe-backdrop visual sync.
- Regional modal view with drag pan, cursor zoom, date controls, layer switching, imagery info, Sentinel scene metadata, and a Google Maps link for the selected coordinate.
- Modal Ask AI chat that sends the current image and structured view context to OpenAI or Anthropic, preserves follow-up context with a hidden briefing, and surfaces web citations when providers return them.
- GIBS 7-day and 30-day regional time lapses.
- Sentinel-2 and Sentinel-1 regional imagery, scene searches, 7-mosaic and 30-mosaic time lapses, five-year sampled comparisons, and GIF export for Sentinel sequences.
- Provider-agnostic server/API support for streaming OpenAI and Anthropic view-analysis responses.

## Main Views

### Globe View

The globe is the default surface. It uses NASA GIBS global WMS frames as sphere textures and reports the visible center, spans, distance, and max-zoom state back to the shared Zustand store.

Users can:

- Drag to orbit Earth.
- Scroll or pinch to zoom around the cursor, with Shift+scroll applying a stronger zoom step.
- Switch globe-capable base imagery from the floating imagery panel or number keys.
- Hide or show base imagery, boundary context, and the selected overlay stack.
- Add, reorder, remove, clear, or temporarily hide GIBS analytic overlays.
- Hover overlay choices to read their summary, best-use notes, caveats, and nominal resolution.
- Toggle earthquake, volcano, and storm activity overlays.
- Hover activity markers to inspect feed metadata.
- Enter a max-zoom detailed imagery pass when the camera gets close enough.
- Shift-click or right-click the globe or detailed pass to open the modal.

At max zoom, `MaxZoomImagery.tsx` overlays a regional 2D image for the current visible globe viewport. The initial zoomed-out detailed state preserves the globe drag behavior that feels like panning across the wrapped Earth. Once the user scrolls into the detailed pass, the component owns a local center/span zoom state similar to the modal: wheel ticks apply cursor-anchored preview transforms, commits are debounced, and the sharper regional image crossfades in.

The globe backdrop follows this detailed view through a detail-only store request, `globeDetailViewRequest`. `Globe.tsx` handles that request by moving the camera to the requested detail center and matching the requested lat/lon span as closely as the sphere camera allows. This keeps exposed globe edges visually lined up without letting the globe feed state back into the detailed overlay. The detailed image is fully opaque during in-pass zoom so unavoidable flat-map-vs-sphere projection differences do not bleed through the image.

The detailed pass is currently capped at `DETAILED_VIEW_MIN_LON_SPAN = 5.59263`. A small banner reminds users that Shift-click opens higher-resolution regional imagery in the modal. Zooming back out to the entry span hands the wheel back to normal globe zoom. The detailed pass also renders selected GIBS overlays as aligned regional WMS images and draws NASA GIBS `Reference_Features` boundaries when boundary lines are enabled.

Sentinel layers are regional-only providers. They can be selected for the modal and detailed regional workflow, but they are not wrapped as true globe textures. When a Sentinel provider is selected outside the regional renderer, the globe keeps a default global VIIRS true-color base while the modal renders the Sentinel layer through the server/API flow.

### Modal View

The modal is the detailed inspection workspace. It opens from a selected coordinate and focuses on a bounded regional image rather than the whole planet.

Users can:

- Drag the regional image to pan.
- Scroll to cursor-zoom the regional image.
- Shift-click inside the image to recenter the selected point.
- Change the active date.
- Switch between Sentinel, MODIS, VIIRS, and night-lights base imagery.
- Open the imagery info dialog for layer purpose, resolution, caveats, and best-use notes.
- Open Google Maps to the precise selected latitude and longitude.
- Ask AI about the current modal image with provider selection, image/context-aware follow-up chat, and source links when web search produces citations.
- Build GIBS daily time lapses and Sentinel mosaic time lapses.
- Export Sentinel time-lapse sequences as animated GIFs.

The modal image size is shaped by the modal pane. Live modal imagery intentionally uses a bbox that matches the current pane aspect ratio, so the visible image fills the available viewing area. While the user pans or zooms, preview movement is immediate and a centered top status badge reports whether the app is updating positioning or resolution.

When the modal opens, the app stores the previous globe date, layer, manual-selection flags, and overlay stack. Closing the modal restores that prior globe state so regional inspection does not permanently disturb the broader globe context.

For Sentinel layers, the modal searches contributing scenes near the selected date. The sidebar lists acquisition times and Sentinel-2 cloud-cover values where available. Hovering or focusing a listed Sentinel scene can highlight that scene's footprint over the rendered mosaic when geometry is available.

### Time Lapses

Time-lapse imagery is intentionally separated from live modal imagery sizing. Live modal imagery follows the modal pane aspect ratio; time-lapse frames request square imagery so playback does not look stretched or squeezed.

For GIBS layers, the time-lapse hook builds a square bbox centered on the current modal view and requests 1024x1024 WMS frames for recent dates.

For Sentinel layers, the same square bbox is used for scene search, rendering, and cache keys. Sentinel time lapses render 1024x1024 Process API frames. This keeps 7-mosaic, 30-mosaic, and five-year sampled comparisons visually consistent while leaving the live Sentinel modal view free to remain responsive to the window size.

## Data Sources

### NASA GIBS

Most base imagery and analytic overlays come from NASA GIBS WMS.

Base-capable GIBS providers:

- MODIS Terra true color
- MODIS Aqua true color
- VIIRS SNPP true color
- VIIRS NOAA-20 true color
- VIIRS SNPP SWIR false color
- VIIRS SNPP cloud/snow false color
- VIIRS NOAA-20 SWIR false color
- VIIRS Black Marble night lights

Overlay-only GIBS providers:

- MODIS aerosol optical depth
- MODIS cloud top temperature
- AMSR2 precipitable water
- GHRSST sea surface temperature
- MODIS chlorophyll-a
- MODIS snow cover
- AMSR2 sea ice concentration
- VIIRS active fires
- MODIS active fires

The app defaults to the latest likely complete VIIRS NOAA-20 true-color day. `src/lib/dates.ts` applies a small UTC lag so the app avoids requesting incomplete current-day true-color imagery.

The globe first requests a 4096-pixel-wide global base texture, then upgrades to an 8192-pixel-wide texture when that larger frame loads. Analytic overlays on the 3D globe use transparent global GIBS textures; the max-zoom detailed pass requests separate regional overlay images for the current detail view.

Some products are pinned with `fixedDate` in `src/providers/registry.ts` when the public GIBS archive does not currently extend to today.

### Copernicus Sentinel

Regional Sentinel layers use Copernicus Data Space / Sentinel Hub APIs through server-side handlers:

- Sentinel-2 True Color
- Sentinel-2 False Color IR
- Sentinel-2 SWIR
- Sentinel-1 Radar

Sentinel requests require credentials. Without credentials, NASA GIBS globe and regional views still work, but Sentinel image rendering and scene searches return a configuration error.

Sentinel variants live in `src/lib/sentinelVariants.ts`. Each variant defines its collection, nominal resolution, request window, metadata, and evalscript. The server layer handles access tokens, Process API image requests, Catalog API scene searches, Sentinel-2 cloud filtering, and scene de-duplication by minute.

### Event And Boundary Context

The browser fetches supporting context directly:

- Natural Earth country and admin-1 boundary GeoJSON, with fallback URLs.
- USGS all-day earthquake GeoJSON, filtered to magnitude 2.5 and above.
- NASA EONET open volcano events.
- NASA EONET open severe-storm events, rendered as tracks when point history is available.

If a feed fails, the corresponding overlay simply renders no markers. Earthquake markers retain magnitude, depth, place, event time, update time, status, alert, and USGS links where available. EONET markers retain titles, geometry dates, source links, open/closed status, and storm intensity or track metadata where available.

### AI View Analysis

The modal includes an Ask AI action for the current view. It opens a chat workspace with the currently loaded modal image preview, view metadata, a provider selector, the transcript, and a message input. OpenAI is the default provider, and Anthropic is available when its API key is configured.

The first chat turn sends:

- the currently displayed image
- selected coordinates and date
- capture-time label
- active satellite/provider/layer metadata
- current bbox, zoom degrees, and rendered image dimensions
- provider summary, best-use notes, and caveats
- contributing Sentinel scene acquisition times and cloud-cover values when available

The image payload is built from the actual loaded regional modal image. Images under 18 MB are sent directly as data URLs; larger or inaccessible images fall back to a controlled canvas capture capped at a 2400-pixel maximum edge.

Follow-up requests keep chat history, the same structured view context, and a compact hidden `VIEW_BRIEFING` returned by the server, so the image does not need to be resent each turn. The Ask modal detects when the underlying modal view changes while a chat is open and offers to start a fresh chat for the current view.

Responses stream through `/api/ask-view-stream`. The prompt asks the model to treat the image as primary evidence, use coordinates/bbox/date/provider metadata for context, search online for the initial view analysis when tools are available, cite sourced online context inline, and separate confident identifications from hypotheses. Source URLs returned by provider web-search events are displayed as links under the assistant message.

Current model constants in `src/server/askView.ts`:

- OpenAI: `gpt-5.2` through the Responses API
- Anthropic: `claude-opus-4-1-20250805` through the Messages API

Both provider requests include web-search tools where supported. `/api/ask-view` remains available as a non-streaming endpoint, but the UI uses the streaming endpoint.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

For Sentinel support, fill in:

```bash
COPERNICUS_CLIENT_ID=
COPERNICUS_CLIENT_SECRET=
```

For Ask AI, fill in one or both provider keys:

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Older Sentinel Hub variable names are also supported by the server code:

```bash
SENTINELHUB_CLIENT_ID=
SENTINELHUB_CLIENT_SECRET=
```

Run the app:

```bash
npm run dev
```

Vite serves the app on `127.0.0.1` by default.

## Scripts

```bash
npm run dev      # Start the Vite dev server with local API middleware
npm run build    # Type-check and build the production bundle
npm run preview  # Preview the production build locally
npm run lint     # Run ESLint
```

## Project Structure

```text
.
|-- api/
|   |-- ask-view.ts            # Vercel-style JSON endpoint for AI view analysis
|   |-- ask-view-stream.ts     # Vercel-style SSE endpoint for streaming AI view analysis
|   |-- sentinel-image.ts      # Vercel-style endpoint for Sentinel Process API image renders
|   `-- sentinel-scenes.ts     # Vercel-style endpoint for Sentinel Catalog scene searches
|-- src/
|   |-- App.tsx                # Top-level app shell and globe/modal composition
|   |-- main.tsx               # React entry point
|   |-- components/
|   |   |-- Globe/             # Three.js globe, overlays, labels, controls, max-zoom imagery
|   |   |-- Modal/             # Imagery modal, Ask AI chat UI, hooks, time-lapse UI
|   |   `-- ui/                # Small Radix/Tailwind UI primitives
|   |-- lib/
|   |   |-- captureTime.ts     # Estimated and exact capture-time formatting
|   |   |-- cities.ts          # City label data
|   |   |-- dates.ts           # Date helpers and latest-default imagery logic
|   |   |-- geo.ts             # Coordinate, bbox, distance, and zoom math
|   |   |-- gif.ts             # Browser-side animated GIF encoder
|   |   |-- sentinelVariants.ts # Sentinel layer definitions and evalscripts
|   |   `-- utils.ts           # Shared class-name utility
|   |-- providers/
|   |   |-- GibsProvider.ts    # NASA GIBS WMS URL builder/provider implementation
|   |   |-- SentinelProvider.ts # Copernicus Sentinel regional provider implementation
|   |   `-- registry.ts        # Registered imagery providers
|   |-- server/
|   |   |-- askView.ts         # AI prompts, provider calls, and streaming relay
|   |   `-- sentinel.ts        # Sentinel auth, image requests, catalog searches, validation
|   |-- store/
|   |   `-- useAppStore.ts     # Zustand app state for globe, modal, layers, dates, requests
|   |-- styles/
|   |   `-- globals.css        # Tailwind imports, theme tokens, global styling
|   `-- types/
|       `-- imagery.ts         # Shared imagery provider and bbox types
|-- vite.config.ts             # Vite config, path alias, and local API middleware
|-- tailwind.config.ts         # Tailwind theme configuration
|-- eslint.config.js           # ESLint flat config
`-- package.json               # Scripts and dependencies
```

## Architecture Notes

### Rendering Flow

`src/components/Globe/Globe.tsx` owns the Three.js canvas. It builds global NASA GIBS texture URLs for globe-capable providers, renders the Earth sphere, applies optional transparent GIBS overlay textures, mounts boundary/city/event overlays, and reports camera-derived viewport information back to the Zustand store. Regional-only Sentinel providers keep the globe on a default global true-color texture while the modal renders the selected Sentinel layer.

Globe camera controls adapt interaction speed by camera distance. Scroll zoom and drag/pan slow down near the globe surface so close exploration is less sensitive, while wider globe navigation remains responsive.

`src/components/Globe/MaxZoomImagery.tsx` owns the max-zoom 2D overlay. It requests the regional image, handles cursor-anchored in-pass zoom, debounced image commits, detail overlay images, boundary overlay images, city labels, the Shift-click hint banner, and handoff back to globe zoom at the entry floor. While zoom mode is active, it ignores `globeView` updates to avoid a feedback loop.

`src/store/useAppStore.ts` keeps normal globe focus/zoom requests separate from `globeDetailViewRequest`. That detail request is only for visually syncing the globe backdrop to the detailed overlay. It does not replace `focusGlobeAt` or `requestGlobeZoom`.

`src/components/Globe/CameraHotkeys.tsx` owns the floating imagery panel, number-key layer switching, base imagery visibility, boundary visibility, GIBS overlay stack visibility, GIBS overlay stack controls, and activity overlay toggles.

`src/components/Globe/EventOverlays/` owns activity feed fetching and marker behavior.

### Modal State

`src/components/Modal/ImageryModal.tsx` is the main inspection workspace. It owns the dialog layout, sidebar controls, Google Maps link, Ask AI entry point, status badge placement, scene list, and modal-level state wiring.

`src/components/Modal/hooks/useRegionalImagery.ts` owns pane-shaped regional image loading, object URL lifecycle, cursor zoom, drag pan, pending-view commits, and update reason reporting.

`src/components/Modal/hooks/useTimeLapse.ts` owns GIBS and Sentinel time-lapse orchestration. It keeps square time-lapse request bboxes separate from the live modal bbox so time-lapse playback remains geometrically consistent.

`src/components/Modal/TimeLapseModal.tsx` owns playback, frame stepping, keyboard stepping while paused, date labels, loading progress, and Sentinel GIF export.

`src/components/Modal/AskViewModal.tsx` owns the modal-only AI chat flow. It converts the current loaded image into the first-turn AI image payload, sends provider-agnostic streaming requests, stores the hidden follow-up briefing, renders provider source links, and prompts for a new chat when the modal view changes.

### Imagery Providers

Regional imagery follows the interface in `src/types/imagery.ts`. `GibsProvider` produces WMS `GetMap` URLs and can be marked `overlayOnly` for analytic products. `SentinelProvider` implements the same interface by calling `/api/sentinel-image`.

`src/providers/registry.ts` is the main place to add, remove, or reorder imagery. `modalImageryProviders` lists Sentinel providers first and then includes only non-overlay GIBS base imagery. Overlay-only products stay in the globe overlay selector.

### Server Layer

`vite.config.ts` mounts local development middleware for:

- `POST /api/sentinel-image`
- `POST /api/sentinel-scenes`
- `POST /api/ask-view`
- `POST /api/ask-view-stream`

The `api/` directory exposes Vercel-style handlers for the same server logic.

NASA GIBS imagery, boundary GeoJSON, USGS earthquakes, and NASA EONET feeds are fetched directly by the browser. Sentinel and AI credentials are read only by the server/API layer and are never sent to the browser. Ask AI requests use the same frontend payload shape for OpenAI and Anthropic; provider-specific model calls, web-search tool configuration, streaming parsing, citation extraction, and hidden briefing extraction live in `src/server/askView.ts`.

## Adding A New Imagery Layer

For a NASA GIBS WMS base layer:

1. Add a `GibsProvider` entry in `src/providers/registry.ts`.
2. Set `layerId`, display metadata, satellite, category, nominal resolution, summary, best-use note, and caveat.
3. Leave `overlayOnly` unset so the layer can appear as base imagery.

For a NASA GIBS overlay:

1. Add a `GibsProvider` entry in `src/providers/registry.ts`.
2. Set `overlayOnly: true`.
3. Use `fixedDate` if the product has a known archive end date that should override the selected app date.

For a Sentinel layer:

1. Add a variant in `src/lib/sentinelVariants.ts`.
2. Provide the collection, nominal resolution, request window, metadata, and evalscript.
3. Confirm `src/server/sentinel.ts` supports the required collection-specific `dataFilter` and processing options.
4. Register a `SentinelProvider` in `src/providers/registry.ts`.

## Deployment Notes

The app is a Vite SPA with serverless-style Sentinel and AI endpoints. Deployment environments must provide Copernicus credentials if Sentinel rendering should work, and OpenAI or Anthropic keys if Ask AI should be available in the modal.

`NOTES.md` contains short working notes and possible follow-up tasks. It is not required for running the app, but it is useful project context.

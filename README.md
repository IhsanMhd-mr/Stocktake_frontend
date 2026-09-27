# Stockroom frontend

React 19 + Vite frontend for the supermarket stock-take workflow.

## Run locally

1. Copy `.env.example` to `.env` and set the backend locations if they differ from the defaults.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.

The production checks are `npm run lint` and `npm run build`. Use `npm run preview` to serve the production build locally.

## Environment

- `VITE_API_BASE_URL`: REST API base URL, including `/api`.
- `VITE_SOCKET_URL`: optional Socket.IO server URL. When omitted, the API base URL's origin is used.

Authentication tokens are persisted in local storage, but the active user and role are always restored from `GET /api/auth/me`. Socket.IO is connected only for authenticated Admin and Super Admin sessions. USER views refresh only through explicit REST requests.

The item editor treats SKU as optional. An empty SKU is sent as `null`; the frontend never generates one.

## Management workflows

Admin and Super Admin navigation includes Preparation and Assigned Units management:

- `/preparation` manages Zones and physical Rack/Basket Units.
- `/preparation/zones/:zoneId` shows the Units in one Zone.
- `/preparation/units/:unitId` configures Rack Sides, Bays, Shelves, Shelf/Bin mappings, or direct Basket Bins and provides irreversible finalization.
- `/assigned-units/new` creates a server-persisted Draft.
- `/assigned-units/:assignedUnitId/edit` saves exact numeric Bin ranges, activates the assignment, and manages its leader.

All generated Bin IDs/codes and Assigned Unit codes come from the backend. Finalized physical structures and activated Assigned Unit membership are presented as read-only.

## Dashboard and visual layouts

The Admin dashboard defaults to the compact Simple Blocks view and can switch to an optional structural Visual Layout without refetching data. Global metrics and combinable filters cover physical Zones/Units, Bin stock status, Assigned Unit coverage, lifecycle state, and leaders. Selecting a Bin opens a read-only detail panel linked to the existing Preparation and Assigned Unit workflows.

Rack layouts render configured Sides with local tabs, Bays in ascending order, Shelves with the lowest shelf at the bottom, shelf positions from left to right, plus standalone Shelves and unmapped Bins. Basket layouts render their direct Bins in numeric order. The Unit Preparation page uses the same normalized visual model while preserving in-progress Simple mode edits when users switch views.

## Bin label printing

Admin and Super Admin users can open `/print/bin-labels`, select an existing Zone, physical Rack/Basket Unit, and exact Bin range, then preview A4 labels in Portrait or Landscape. Labels use permanent server-provided Zone, Unit, and Bin codes; optional Rack location text is derived from Preparation structure. START, END, and Both modes create presentation variants only and never create or mutate Bins.

Label width, height, page margin, and optional Unit header height use centimetres. Oversized configurations are rejected instead of being unpredictably scaled. Browser printing and native “Save as PDF” are used; print CSS hides application controls and navigation.

Same-origin `/api` and Socket.IO are the defaults in production, while Vite proxies them to the local backend during development. Override the URLs only when deploying the frontend separately. API requests time out safely after `VITE_API_TIMEOUT_MS` without automatic mutation retries, and rendering failures show a reload screen rather than a blank page.

## Guided Preparation and accounts

Unit Preparation includes a visible workflow map. Rack guidance follows Side setup, Bin setup, optional Bay and/or standalone Shelf structure, Bin mapping, review, and explicit finalization. Basket guidance shows only Bin setup, review, and explicit finalization. “Continue Preparation” and “View Structure” never finalize a Unit; only the confirmed Finalize Unit action changes its lifecycle.

`/users` is visible and accessible only to a signed-in Super Admin. It can create `USER` and `ADMIN` accounts with a 4–12 digit PIN, and activate or deactivate those accounts with confirmation. Normal UI/API account creation cannot create another `SUPER_ADMIN`; bootstrap remains the supported Super Admin creation path. Active `USER` accounts remain the only eligible Assigned Unit leaders.

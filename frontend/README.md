# React + Vite

## Authentication

`useAuth()` exposes the authenticated user, loading state, `isAuthenticated`,
`login`, `logout`, and `checkAuth` to components under `AuthProvider`. The
provider restores the user through `GET /api/auth/session` on startup and
logout calls `POST /api/auth/logout`. Authentication cookies are HTTP-only and
are sent by Axios with credentials; no tokens are stored in browser storage.

The session endpoint checks the existing access token, which expires after 15
minutes. The backend does not currently refresh access tokens, so users must
sign in again after expiry. Logout clears the browser cookies and revokes the
stored refresh token; an already issued access JWT remains valid until expiry.
The development server proxies `/api` to the backend. A cross-origin API
deployment must separately configure the backend to allow credentialed CORS.

## Services

The public landing page at `/` loads services from `GET /api/services` and
service categories from `GET /api/categories?type=service`. Visitors can search,
filter, and paginate the service list without signing in. The active service
category marked as default is selected on a fresh page load; no default or an
inactive default selects All Categories instead. All Categories is represented
by having no default service category, not by a database category. A visitor's
manual selection is preserved during retries. If categories cannot be loaded
initially, the page shows all services and offers a retry. Other category-list
requests remain protected. The admin Services page uses the same service list;
admins can create and edit services using `POST /api/services` and
`PATCH /api/services/:id`.

The public navbar shows Login when signed out and a dashboard link with the
user's profile picture when signed in. It falls back to a profile icon if the
picture is unavailable, and hides the action while the session is restored.
The admin sidebar also provides a Return to Homepage link without signing out.
These two links use a shared full-screen transition before navigating; visitors
who prefer reduced motion navigate immediately. Direct URLs and browser history
retain their normal routing behavior.
The landing page also fades in when it loads, unless reduced motion is enabled.

The public navbar's Christmas lights are configured in
`src/features/seasonal/configs/christmas.js`. Set `enabled` to `false` to remove
the decoration and its reserved header space. Bulb size and spacing are in
pixels, animation speed is in seconds, wire curvature is the sag in pixels,
and glow intensity is a multiplier from 0 to 1. The reusable component also
accepts a color array and `top` or `bottom` placement inside a positioned
container. It follows the container's width and keeps a steady glow when
reduced motion is requested. These settings are local; no admin or backend
configuration is connected yet.

Christmas ornaments are configured in the same seasonal configuration file.
`publicHeroChristmasOrnaments` controls the landing hero, while
`adminChristmasOrnaments` controls the small band below the shared admin header.
Each can be disabled independently; colors, sizes and hanging lengths are arrays
cycled across the configured count. Sizes and lengths are in pixels;
`animationSpeed` is the swing duration in seconds, `swingAmplitude` is in
degrees, and `animationIntensity` multiplies that amplitude. Set `interactive`
to `false` to disable hover and touch responses independently for either area.
Only the baubles receive pointer input; the bands reserve their own space and
the motion is disabled for reduced motion. A push settles naturally even if
the pointer leaves the bauble. Clicking a bauble pushes it again with a random
direction and a duration between 75% and 125% of its configured swing duration.

The landing page's identity card uses a spring-based cursor tilt and glare,
with a periodic glass reflection. These effects are disabled when the visitor
prefers reduced motion, and the tilt does not capture touch gestures.

The shared theme toggle uses a diagonal View Transition across the viewport.
The saved theme is applied on subsequent visits; browsers without View
Transitions and visitors who prefer reduced motion switch themes immediately.
Repeated toggles are ignored until an active transition finishes.

The backend accepts an image string but has no file-upload mechanism, so the
admin modal accepts an image URL instead. Delete remains a visual placeholder
and does not send requests.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

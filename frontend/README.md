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

### Christmas snowfall

One `ApplicationSnowfall` instance lives outside the routed layouts and animated
outlets, under `PageTransition` in `App`. Every public route (including About,
Policies, Login and Unauthorized) and every admin route receives snowfall.
It uses the existing public route definitions to select a preset, so future
routes do not need individual snowfall components. Particle/layer nodes persist
through navigation, browser history and public/admin preset switches.
The centralized `publicChristmasSnowfall` and
`adminChristmasSnowfall` presets in `src/features/seasonal/configs/christmas.js`
control it independently, without changing lights, garlands or ornaments.
Set a preset's `enabled` to `false` to remove its overlay.

Each of the three `layers` configures `count`, `size` (min/max pixels),
`opacity` (0-1), `duration` (min/max seconds per viewport fall), `drift`
(min/max signed pixels), `intensity` (0-1 count/opacity multiplier), and
`flakeRatio` (0-1 fraction of simple six-armed shapes instead of soft dots).
`depth` selects `behind-content` or `foreground`; `area` selects `viewport`
or `gutters`. Background and middle layers cover the viewport behind content.
The foreground layer spans content surfaces, using mixed small, medium and
occasional larger flakes at moderate opacity. `foreground.clearTop` excludes
the header region; the desktop admin sidebar is also excluded. The optional
`gutters` area still supports edge-only presets via `foreground.gutterWidth`.
The denser public preset uses 116 desktop particles (including 28 larger
foreground flakes); admin uses 72. Foreground drift varies up to 45px.
Counts are capped at 48 per layer. `density.mobile` and `density.tablet`
multiply counts at widths up to 640px and 1024px, respectively.
`animation.speed` is a positive speed multiplier; `driftDuration` is a min/max
seconds range. `animation.enabled: false` freezes particles in place, while
`pauseWhenHidden` pauses both CSS animations when the document is hidden.

Stable particle samples, independent negative delays and alternating drift
avoid synchronized resets. CSS transforms/opacity animate without JavaScript
frames. Each layer is independently fixed and clipped; the wrapper uses
`display: contents` so it does not flatten their stacking order. The shared
`seasonal-scene` owns isolation: page backdrops paint below background/middle
snow, while opaque cards, panels, navigation and forms cover it naturally.
Transparent areas and open gaps still reveal snow. Foreground snow passes above
cards and content, but below navigation and critical overlays. The admin header
has its own stacking priority above snow while main content remains below it.
Foreground snow is hidden while dialogs are open. All snow is non-interactive.
During public fades the animated outlet stays above background snow.
Overlays do not receive pointer events or affect scrolling. Snow colors use
the light/dark `--app-snow-color` token. Reduced motion hides snow entirely.
These local presets are not yet connected to admin settings or a database.

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

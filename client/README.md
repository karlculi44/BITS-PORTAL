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

The Services page loads the list from `GET /api/services`. Admins can create
and edit services in a modal using `GET /api/categories`, `POST /api/services`,
and `PATCH /api/services/:id`. The backend accepts an image string but has no
file-upload mechanism, so the modal accepts an image URL instead. Delete remains
a visual placeholder and does not send requests.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

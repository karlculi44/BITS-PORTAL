# Backend audit logging

The application records authentication and administrative changes in the existing
`logs` table. Database changes and their audit records are committed together;
an audit insertion failure rolls back the database change. Logins and refresh
token revocations use the same transaction for their audit record. Failed
credential checks are recorded separately and an audit database error is returned
through the normal error handler. Invalid requests rejected before authentication
are not recorded as failed logins.

Audit IPs come from Express `req.ip`. The default Express proxy trust setting is
disabled, so forwarded headers are not trusted and the recorded address is the
direct peer. Behind a reverse proxy this may be the proxy's address rather than
the originating client. Configure trusted proxies only after the actual proxy
topology is known; never trust arbitrary forwarded headers.

`GET /api/audit-logs` is read-only and requires an active administrator. Date
filters use client-supplied UTC bounds corresponding to the browser's local day.

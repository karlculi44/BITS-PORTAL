# Backend audit logging

The application records authentication and administrative changes in the existing
`logs` table. Database changes and their audit records are committed together;
an audit insertion failure rolls back the database change. Logins and refresh
token revocations use the same transaction for their audit record. Failed
login attempts, including input validation failures, are recorded separately;
an audit database error is returned through the normal error handler. The log
stores the attempted username and available IP address, never the password.
Failed-login entries resolve profile images against the current user with the
exact attempted username; unmatched usernames retain the initial icon.

Apply `db/migrations/003_audit_log_username_length.sql` to existing databases
before deploying this version. It allows audit logs to retain the full attempted
username, including usernames longer than 50 characters.

Audit IPs come from Express `req.ip`. The default Express proxy trust setting is
disabled, so forwarded headers are not trusted and the recorded address is the
direct peer. Behind a reverse proxy this may be the proxy's address rather than
the originating client. Configure trusted proxies only after the actual proxy
topology is known; never trust arbitrary forwarded headers.

`GET /api/audit-logs` is read-only and requires an active administrator. Date
filters use client-supplied UTC bounds corresponding to the browser's local day.

Policy categories (`GET /api/categories?type=policy`), the policy list
(`GET /api/policies`), and managed PDFs (`GET /api/policies/:id/document`) are
public. All existing and future policies are therefore publicly accessible.
Policy creation, modification, and deletion remain restricted to authorized
users. Documents are served only through the controlled PDF endpoint; the list
does not expose filesystem paths.

New services without a logo store the shared `bits-default` image marker.
The portal resolves this marker and legacy empty image values to its bundled
BITS logo; custom image URLs and managed uploads retain their existing format.
No default logo file is copied into service uploads.

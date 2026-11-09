import { useState } from "react";
import { FolderTree, KeyRound, ScrollText, Server, Users } from "lucide-react";
import { getServiceImageUrl } from "../services/serviceService";

const actionStyles = {
  Login: "bg-emerald-100 text-emerald-700",
  Logout: "bg-slate-100 text-slate-600",
  Add: "bg-blue-100 text-blue-700",
  Edit: "bg-amber-100 text-amber-700",
  Delete: "bg-red-100 text-red-700",
  "Login Failed": "bg-red-100 text-red-700",
};

const moduleIcons = {
  Auth: KeyRound,
  Users,
  Services: Server,
  Policies: ScrollText,
  Categories: FolderTree,
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function AuditUser({ user }) {
  const [failedImage, setFailedImage] = useState("");
  const image = user.profile_image
    ? getServiceImageUrl(user.profile_image)
    : "";

  return (
    <div className="flex items-center gap-3">
      {image && image !== failedImage ? (
        <img
          src={image}
          alt=""
          onError={() => setFailedImage(image)}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white"
        >
          {(user.first_name || user.username).charAt(0).toUpperCase()}
        </span>
      )}
      <span className="break-all font-semibold text-slate-800">
        {user.username}
      </span>
    </div>
  );
}

function AuditLogsTable({ logs, emptyMessage = "No audit logs available." }) {
  return (
    <div
      role="region"
      aria-label="Audit logs table"
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-slate-200 bg-white"
    >
      <table
        className="w-full table-fixed text-left text-sm"
        style={{ minWidth: "64rem" }}
      >
        <colgroup>
          <col className="w-14" />
          <col className="w-36" />
          <col className="w-48" />
          <col className="w-32" />
          <col className="w-36" />
          <col />
          <col className="w-36" />
        </colgroup>
        <thead className="border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-500">
          <tr>
            {[
              "#",
              "Timestamp",
              "User",
              "Action",
              "Module",
              "Details",
              "IP Address",
            ].map((column) => (
              <th key={column} scope="col" className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-5 text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            logs.map((log, index) => {
              const timestamp = new Date(log.timestamp);
              const ModuleIcon = moduleIcons[log.module];
              return (
                <tr key={log.id}>
                  <td className="px-4 py-4 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-4">
                    <time
                      dateTime={log.timestamp}
                      className="whitespace-nowrap"
                    >
                      <span className="block font-medium text-slate-800">
                        {dateFormatter.format(timestamp)}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {timeFormatter.format(timestamp)}
                      </span>
                    </time>
                  </td>
                  <td className="px-4 py-4">
                    <AuditUser user={log.user} />
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${actionStyles[log.action] || "bg-slate-100 text-slate-600"}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-2 text-slate-600">
                      {ModuleIcon && (
                        <ModuleIcon
                          size={16}
                          aria-hidden="true"
                          className="shrink-0 text-slate-400"
                        />
                      )}
                      {log.module}
                    </span>
                  </td>
                  <td className="wrap-break-word px-4 py-4 leading-relaxed text-slate-600">
                    {log.details}
                  </td>
                  <td className="break-all px-4 py-4 font-mono text-xs text-slate-500">
                    {log.ipAddress || "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AuditLogsTable;

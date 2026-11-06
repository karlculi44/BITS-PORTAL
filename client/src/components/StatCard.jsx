function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="rounded-md bg-blue-50 p-3 text-blue-700">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default StatCard;

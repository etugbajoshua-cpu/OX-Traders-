import React, { useEffect, useState } from 'react';
import { AdminAuditLog } from '../../types/index.ts';
import { RefreshCw, Search } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase()) ||
      l.admin_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Immutable Administrative Audit Log
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Complete cryptographic audit trail of all administrative interventions, balance modifications, and compliance actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#848E9C] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit actions..."
              className="pl-9 pr-4 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs text-white focus:outline-none focus:border-[#F0B90B] w-56 sm:w-64"
            />
          </div>

          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white cursor-pointer"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Operator Email</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Target ID</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    Loading audit trail records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    No audit records matching search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1E2329]/50">
                    <td className="py-3.5 px-4 text-[#848E9C] font-bold">
                      #{log.id}
                    </td>

                    <td className="py-3.5 px-4 font-sans text-white">
                      {log.admin_email}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white uppercase text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[#1E2329] text-[#F0B90B] border border-[#2B313A]">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#848E9C] capitalize font-sans">
                      {log.target_type}
                    </td>

                    <td className="py-3.5 px-4 text-[#848E9C]">
                      {log.target_id ? `#${log.target_id}` : '-'}
                    </td>

                    <td className="py-3.5 px-4 font-sans text-[#EAECEF] max-w-sm truncate">
                      {log.details}
                    </td>

                    <td className="py-3.5 px-4 text-[#5E6673] text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

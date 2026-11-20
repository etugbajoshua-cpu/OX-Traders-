import React, { useEffect, useState } from 'react';
import { SupportTicket, SupportMessage } from '../../types/index.ts';
import { Send, User, Shield, ChevronLeft, RefreshCw } from 'lucide-react';

export const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [ticketStatus, setTicketStatus] = useState<string>('in_progress');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const openThread = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTicketStatus(ticket.status);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          status: ticketStatus
        })
      });

      if (res.ok) {
        setReplyText('');
        await openThread(selectedTicket);
        await fetchTickets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Support Desk & Investor Communications
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Resolve investor compliance inquiries, review deposit discrepancies, and respond to strategy questions.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="p-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white cursor-pointer"
          title="Refresh Support Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {selectedTicket ? (
        <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#2B313A]">
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-xs text-[#848E9C] hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Tickets Queue</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[#848E9C]">#{selectedTicket.ticket_code}</span>
              <span className="text-xs text-[#F0B90B] font-bold uppercase">{selectedTicket.status}</span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-1">{selectedTicket.subject}</h3>
            <div className="text-xs text-[#848E9C] font-mono">
              From: {selectedTicket.user_name} ({selectedTicket.user_email}) • Category: {selectedTicket.category.toUpperCase()} • Priority: {selectedTicket.priority}
            </div>
          </div>

          {/* Conversation Messages */}
          <div className="space-y-4 max-h-[440px] overflow-y-auto p-4 rounded-xl bg-[#0B0E11] border border-[#2B313A]">
            {messages.map((m) => {
              const isAdmin = m.sender_role === 'admin';
              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl max-w-xl text-xs space-y-1.5 ${
                    isAdmin
                      ? 'bg-[#181A20] border border-[#F0B90B]/30 ml-auto'
                      : 'bg-[#1E2329]/60 border border-[#2B313A] mr-auto'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[10px] text-[#848E9C]">
                    <span className="font-bold flex items-center gap-1">
                      {isAdmin ? <Shield className="w-3 h-3 text-[#F0B90B]" /> : <User className="w-3 h-3 text-[#EAECEF]" />}
                      <span className={isAdmin ? 'text-[#F0B90B]' : 'text-white'}>{m.sender_name}</span>
                    </span>
                    <span className="font-mono">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[#EAECEF] whitespace-pre-wrap leading-relaxed">{m.message}</p>
                </div>
              );
            })}
          </div>

          {/* Admin Reply & Status Control */}
          <form onSubmit={handleSendAdminReply} className="space-y-4 p-4 rounded-xl bg-[#0B0E11] border border-[#2B313A]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-white">Reply as OX TRADERS Support Team</span>
              <div className="flex items-center gap-2">
                <span className="text-[#848E9C]">Set Ticket Status:</span>
                <select
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#1E2329] border border-[#2B313A] text-xs text-white focus:outline-none focus:border-[#F0B90B]"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <textarea
              rows={3}
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write official response to the investor..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B] resize-none"
            />

            <button
              type="submit"
              disabled={submittingReply || !replyText.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submittingReply ? 'Sending...' : 'Transmit Official Response'}</span>
            </button>
          </form>
        </div>
      ) : (
        /* Table of All Tickets */
        <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Investor</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B313A] font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#848E9C] font-sans">
                      Loading tickets queue...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#848E9C] font-sans">
                      No customer tickets found.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => openThread(t)}
                      className="hover:bg-[#1E2329]/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-[#F0B90B]">
                        {t.ticket_code}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        {t.user_name}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-[#EAECEF] max-w-xs truncate">
                        {t.subject}
                      </td>
                      <td className="py-3.5 px-4 uppercase text-[10px] text-[#848E9C]">
                        {t.category}
                      </td>
                      <td className="py-3.5 px-4 font-sans capitalize text-[#EAECEF]">
                        {t.priority}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'open'
                            ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                            : t.status === 'in_progress'
                            ? 'bg-[#F0B90B]/15 text-[#F0B90B]'
                            : 'bg-[#1E2329] text-[#848E9C]'
                        }`}>
                          {t.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#5E6673] text-[11px]">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openThread(t);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#1E2329] hover:bg-[#2B313A] text-white border border-[#2B313A] text-xs font-semibold cursor-pointer"
                        >
                          Reply
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

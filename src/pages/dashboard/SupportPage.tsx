import React, { useEffect, useState } from 'react';
import { SupportTicket, SupportMessage } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  createSupportTicket,
  getTicketMessages,
  getUserTickets,
  replyToSupportTicket,
} from '../../lib/firestoreService.ts';
import { Plus, Send, User, Shield, ChevronLeft } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const { user, firebaseUser } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // New Ticket State
  const [showNewModal, setShowNewModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'deposit' | 'withdrawal' | 'investment' | 'kyc' | 'security' | 'general'>('deposit');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [initialMessage, setInitialMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Reply State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      const list = await getUserTickets(firebaseUser.uid);
      setTickets(list);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const openTicketThread = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    try {
      const msgs = await getTicketMessages(String(ticket.id));
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load ticket thread:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [firebaseUser]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !initialMessage || !firebaseUser || !user) return;

    setSubmittingTicket(true);
    try {
      await createSupportTicket({
        uid: firebaseUser.uid,
        userEmail: user.email,
        userName: user.full_name,
        subject: subject.trim(),
        category,
        priority,
        message: initialMessage.trim(),
      });
      setShowNewModal(false);
      setSubject('');
      setInitialMessage('');
      await fetchTickets();
    } catch (err) {
      console.error('Failed to open ticket:', err);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText || !selectedTicket || !user) return;

    setSendingReply(true);
    try {
      await replyToSupportTicket({
        ticketId: String(selectedTicket.id),
        senderName: user.full_name,
        message: replyText.trim(),
        currentMessageCount: messages.length || selectedTicket.message_count || 1,
      });
      setReplyText('');
      await openTicketThread(selectedTicket);
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Support Desk
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Direct communication channel with OX TRADERS compliance and operations desks.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider shrink-0 shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {selectedTicket ? (
        /* Conversation Thread View */
        <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#2B313A]">
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-xs text-[#848E9C] hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Tickets</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[#5E6673]">#{selectedTicket.ticket_code}</span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                selectedTicket.status === 'open'
                  ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                  : selectedTicket.status === 'in_progress'
                  ? 'bg-[#F0B90B]/15 text-[#F0B90B]'
                  : 'bg-[#2B313A] text-[#848E9C]'
              }`}>
                {selectedTicket.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-1">{selectedTicket.subject}</h3>
            <div className="text-xs text-[#848E9C] font-mono">Category: {selectedTicket.category.toUpperCase()} • Priority: {selectedTicket.priority.toUpperCase()}</div>
          </div>

          {/* Messages Thread */}
          <div className="space-y-4 max-h-[420px] overflow-y-auto p-4 rounded-xl bg-[#1E2329] border border-[#2B313A]">
            {messages.map((m) => {
              const isAdmin = m.sender_role === 'admin';
              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl max-w-xl text-xs space-y-1.5 ${
                    isAdmin
                      ? 'bg-[#181A20] border border-[#F0B90B]/30 ml-auto'
                      : 'bg-[#181A20] border border-[#2B313A] mr-auto'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[10px] text-[#848E9C]">
                    <span className="font-bold flex items-center gap-1">
                      {isAdmin ? <Shield className="w-3 h-3 text-[#F0B90B]" /> : <User className="w-3 h-3 text-[#848E9C]" />}
                      <span className={isAdmin ? 'text-[#F0B90B]' : 'text-white'}>{m.sender_name}</span>
                    </span>
                    <span className="font-mono">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[#EAECEF] whitespace-pre-wrap leading-relaxed">{m.message}</p>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendReply} className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your response..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
            />
            <button
              type="submit"
              disabled={sendingReply || !replyText.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      ) : (
        /* Tickets Table */
        <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
                <tr>
                  <th className="py-3 px-4">Ticket Code</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Messages</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B313A] font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                      Loading support tickets...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                      No support tickets opened. Click "New Ticket" above if you need assistance.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => openTicketThread(t)}
                      className="hover:bg-[#1E2329]/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-white">
                        {t.ticket_code}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold text-white max-w-xs truncate">
                        {t.subject}
                      </td>
                      <td className="py-3.5 px-4 font-sans uppercase text-[10px] text-[#848E9C]">
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
                            : 'bg-[#2B313A] text-[#848E9C]'
                        }`}>
                          {t.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#848E9C]">
                        {t.message_count || 1} msg(s)
                      </td>
                      <td className="py-3.5 px-4 text-[#5E6673] text-[11px]">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-1">Open Support Ticket</h3>
            <p className="text-xs text-[#848E9C] mb-6">Our desk will review and reply promptly.</p>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Deposit confirmation / Strategy question"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                  >
                    <option value="deposit">Deposit & Blockchain</option>
                    <option value="withdrawal">Withdrawal Status</option>
                    <option value="investment">Strategy & Yields</option>
                    <option value="kyc">KYC Verification</option>
                    <option value="security">Account Security</option>
                    <option value="general">General Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Message *</label>
                <textarea
                  rows={4}
                  required
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="State your inquiry..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#2B313A] hover:bg-[#363D47] text-[#848E9C] font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="flex-1 py-3 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  {submittingTicket ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

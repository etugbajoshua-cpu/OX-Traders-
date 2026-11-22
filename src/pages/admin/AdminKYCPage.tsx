import React, { useEffect, useState } from 'react';
import { KYCRecord } from '../../types/index.ts';
import { getAdminKycList, reviewKyc } from '../../lib/firestoreService.ts';
import {
  FileText,
  RefreshCw,
  X
} from 'lucide-react';

export const AdminKYCPage: React.FC = () => {
  const [kycList, setKycList] = useState<KYCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedKyc, setSelectedKyc] = useState<KYCRecord | null>(null);

  // Review action modal state
  const [reviewAction, setReviewAction] = useState<'verified' | 'rejected' | 'additional_info_required' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchKycList = async () => {
    try {
      setLoading(true);
      const list = await getAdminKycList(statusFilter || undefined);
      setKycList(list);
    } catch (err) {
      console.error('Failed to load KYC applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycList();
  }, [statusFilter]);

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKyc || !reviewAction) return;

    setSubmittingReview(true);
    try {
      await reviewKyc({
        uid: String(selectedKyc.user_id),
        status: reviewAction,
        adminNote: adminNote.trim(),
      });
      setReviewAction(null);
      setSelectedKyc(null);
      setAdminNote('');
      await fetchKycList();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            KYC Identity Verification Queue
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Review investor government identification credentials, address verifications, and compliance records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs text-white focus:outline-none focus:border-[#F0B90B]"
          >
            <option value="">All Verification Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="additional_info_required">Additional Info Required</option>
          </select>

          <button
            onClick={fetchKycList}
            className="p-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white cursor-pointer"
            title="Refresh KYC Queue"
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
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">Document Number</th>
                <th className="py-3 px-4">Country & Address</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    Loading applications...
                  </td>
                </tr>
              ) : kycList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    No KYC applications in this queue.
                  </td>
                </tr>
              ) : (
                kycList.map((k) => (
                  <tr key={k.id} className="hover:bg-[#1E2329]/50">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-white">{k.full_legal_name}</div>
                      <div className="text-[11px] text-[#848E9C] font-mono">{k.user_email}</div>
                    </td>

                    <td className="py-3.5 px-4 font-sans uppercase font-bold text-[#EAECEF]">
                      {k.id_type?.replace(/_/g, ' ')}
                    </td>

                    <td className="py-3.5 px-4 text-white font-bold">
                      {k.id_number}
                    </td>

                    <td className="py-3.5 px-4 font-sans text-[#848E9C] max-w-xs truncate">
                      {k.country} • {k.residential_address}
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        k.status === 'verified'
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                          : k.status === 'rejected'
                          ? 'bg-[#F6465D]/15 text-[#F6465D]'
                          : 'bg-[#F0B90B]/15 text-[#F0B90B]'
                      }`}>
                        {k.status?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#5E6673] text-[11px]">
                      {new Date(k.created_at || '').toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedKyc(k)}
                        className="px-3 py-1.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-black text-xs font-bold cursor-pointer"
                      >
                        Inspect & Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KYC Inspection & Review Modal */}
      {selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setSelectedKyc(null);
                setReviewAction(null);
              }}
              className="absolute top-5 right-5 p-1 text-[#848E9C] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F0B90B] bg-[#F0B90B]/10 px-2 py-0.5 rounded">
                KYC Dossier Review
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                {selectedKyc.full_legal_name}
              </h3>
              <p className="text-xs text-[#848E9C] mt-0.5">
                Investor Account ID: #{selectedKyc.user_id} • Current Status: {selectedKyc.status.toUpperCase()}
              </p>
            </div>

            {/* Dossier Details */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-xs mb-6">
              <div>
                <span className="text-[#848E9C] block text-[10px] uppercase">Date of Birth</span>
                <span className="text-white font-mono font-bold">{selectedKyc.date_of_birth}</span>
              </div>
              <div>
                <span className="text-[#848E9C] block text-[10px] uppercase">ID Document Type</span>
                <span className="text-white font-bold capitalize">{selectedKyc.id_type?.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-[#848E9C] block text-[10px] uppercase">ID Number</span>
                <span className="text-[#F0B90B] font-mono font-bold">{selectedKyc.id_number}</span>
              </div>
              <div>
                <span className="text-[#848E9C] block text-[10px] uppercase">Expiry Date</span>
                <span className="text-white font-mono">{selectedKyc.id_expiry || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[#848E9C] block text-[10px] uppercase">Residential Address</span>
                <span className="text-white font-sans">{selectedKyc.residential_address}, {selectedKyc.city}, {selectedKyc.country} ({selectedKyc.postal_code})</span>
              </div>
            </div>

            {/* Encrypted Document Inspection Previews */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-center">
                <FileText className="w-6 h-6 text-[#F0B90B] mx-auto mb-1" />
                <div className="text-[11px] font-bold text-white">ID Front</div>
                <div className="text-[9px] text-[#848E9C] font-mono truncate">{selectedKyc.id_front_path || 'Uploaded'}</div>
                <div className="text-[9px] text-[#0ECB81] mt-1">Verified Format</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-center">
                <FileText className="w-6 h-6 text-[#F0B90B] mx-auto mb-1" />
                <div className="text-[11px] font-bold text-white">Proof of Address</div>
                <div className="text-[9px] text-[#848E9C] font-mono truncate">{selectedKyc.address_proof_path || 'Uploaded'}</div>
                <div className="text-[9px] text-[#0ECB81] mt-1">Verified Utility</div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-center">
                <FileText className="w-6 h-6 text-[#F0B90B] mx-auto mb-1" />
                <div className="text-[11px] font-bold text-white">Biometric Selfie</div>
                <div className="text-[9px] text-[#848E9C] font-mono truncate">{selectedKyc.selfie_path || 'Uploaded'}</div>
                <div className="text-[9px] text-[#0ECB81] mt-1">Face Match Valid</div>
              </div>
            </div>

            {/* Action Selection */}
            {reviewAction ? (
              <form onSubmit={handleExecuteReview} className="space-y-4 p-4 rounded-xl bg-[#0B0E11] border border-[#2B313A]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Confirm Decision: <span className="text-[#F0B90B]">{reviewAction.toUpperCase()}</span>
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                    Compliance Internal Notes / User Feedback
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Enter compliance rationale or required documents..."
                    className="w-full px-3 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B] resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction(null)}
                    className="px-4 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs font-semibold text-[#848E9C] hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="flex-1 py-2 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {submittingReview ? 'Submitting...' : 'Confirm Decision & Update User'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setReviewAction('verified');
                    setAdminNote('Official identification verified under standard AML/CTF rules.');
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Approve Verification
                </button>

                <button
                  onClick={() => {
                    setReviewAction('additional_info_required');
                    setAdminNote('Please upload a more recent utility bill dated within the last 90 days.');
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 text-xs font-semibold cursor-pointer"
                >
                  Request More Info
                </button>

                <button
                  onClick={() => {
                    setReviewAction('rejected');
                    setAdminNote('Document clarity insufficient or name mismatch with account profile.');
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/30 text-xs font-semibold cursor-pointer"
                >
                  Reject Application
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

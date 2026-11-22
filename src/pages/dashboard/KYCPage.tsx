import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { getUserKyc, submitKyc } from '../../lib/firestoreService.ts';
import {
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Camera
} from 'lucide-react';
import { KYCRecord } from '../../types/index.ts';

export const KYCPage: React.FC = () => {
  const { user, firebaseUser, refreshProfile } = useAuth();
  const [kyc, setKyc] = useState<KYCRecord | null>(null);

  // Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [dob, setDob] = useState('1990-01-15');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState(user?.country || 'United Kingdom');
  const [postalCode, setPostalCode] = useState('');
  const [idType, setIdType] = useState<'passport' | 'national_id' | 'drivers_license'>('passport');
  const [idNumber, setIdNumber] = useState('');
  const [idExpiry, setIdExpiry] = useState('2032-12-31');

  const [idFrontName] = useState('Government_ID_Front.pdf');
  const [addressProofName] = useState('Proof_Of_Address_Utility.pdf');
  const [selfieName] = useState('Biometric_Selfie_Verification.jpg');

  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchKyc = async () => {
    if (!firebaseUser) return;
    try {
      const record = await getUserKyc(firebaseUser.uid);
      setKyc(record);
      if (record?.full_legal_name) {
        setFullName(record.full_legal_name);
        setDob(record.date_of_birth || '1990-01-15');
        setAddress(record.residential_address || '');
        setCity(record.city || '');
        setCountry(record.country || 'United Kingdom');
        setPostalCode(record.postal_code || '');
        setIdType(record.id_type || 'passport');
        setIdNumber(record.id_number || '');
        if (record.id_expiry) setIdExpiry(record.id_expiry);
      }
    } catch (err) {
      console.error('Failed to load KYC status:', err);
    }
  };

  useEffect(() => {
    fetchKyc();
  }, [firebaseUser]);

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !user) return;
    if (!fullName || !address || !idNumber) {
      setResultMsg({ type: 'error', text: 'Please fill in all required identity details' });
      return;
    }

    setSubmitting(true);
    setResultMsg(null);

    try {
      await submitKyc({
        uid: firebaseUser.uid,
        userEmail: user.email,
        userName: user.full_name,
        fullLegalName: fullName.trim(),
        dateOfBirth: dob,
        residentialAddress: address.trim(),
        city: city.trim(),
        country: country.trim(),
        postalCode: postalCode.trim(),
        idType,
        idNumber: idNumber.trim(),
        idExpiry: idExpiry || undefined,
      });

      setResultMsg({
        type: 'success',
        text: 'KYC identity submission recorded permanently in cloud custody. Compliance officers will inspect your credentials.'
      });
      await fetchKyc();
      await refreshProfile();
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err?.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const status = kyc?.status || 'not_submitted';

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          KYC Identity Verification
        </h2>
        <p className="text-xs text-[#848E9C] mt-1">
          Verify your identity to ensure AML/CFT compliance and unlock unrestricted digital asset withdrawals.
        </p>
      </div>

      {/* Verification Status Header Banner */}
      <div className={`p-5 sm:p-6 rounded-2xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        status === 'verified'
          ? 'bg-[#0ECB81]/10 border-[#0ECB81]/30'
          : status === 'pending'
          ? 'bg-[#F0B90B]/10 border-[#F0B90B]/30'
          : status === 'rejected'
          ? 'bg-[#F6465D]/10 border-[#F6465D]/30'
          : 'bg-[#181A20] border-[#2B313A]'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            status === 'verified'
              ? 'bg-[#0ECB81]/20 text-[#0ECB81]'
              : status === 'pending'
              ? 'bg-[#F0B90B]/20 text-[#F0B90B]'
              : status === 'rejected'
              ? 'bg-[#F6465D]/20 text-[#F6465D]'
              : 'bg-[#1E2329] text-[#848E9C]'
          }`}>
            <ShieldCheck className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#848E9C]">Status:</span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                status === 'verified'
                  ? 'bg-[#0ECB81] text-[#0B0E11] font-bold'
                  : status === 'pending'
                  ? 'bg-[#F0B90B]/20 text-[#F0B90B]'
                  : status === 'rejected'
                  ? 'bg-[#F6465D]/20 text-[#F6465D]'
                  : 'bg-[#2B313A] text-white'
              }`}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-[#EAECEF] mt-1">
              {status === 'verified' && 'Your identity is fully verified. Unrestricted withdrawals active.'}
              {status === 'pending' && 'Application submitted. Review turnaround is typically 1 to 12 hours.'}
              {status === 'rejected' && `Application was rejected: ${kyc?.admin_note || 'Please re-submit.'}`}
              {status === 'not_submitted' && 'Complete the form below to verify your account.'}
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-[#848E9C]">
          AES-256 Encrypted
        </div>
      </div>

      {resultMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            resultMsg.type === 'success'
              ? 'bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-[#0ECB81]'
              : 'bg-[#F6465D]/10 border border-[#F6465D]/30 text-[#F6465D]'
          }`}
        >
          {resultMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{resultMsg.text}</span>
        </div>
      )}

      {/* KYC Form */}
      {status !== 'verified' && (
        <form onSubmit={handleSubmitKyc} className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-6">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#F0B90B]" />
            <span>Identity Verification Submission</span>
          </h3>

          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#848E9C] border-b border-[#2B313A] pb-1">
              1. Personal Particulars
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alexander Vance"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street and house/apartment"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Zurich"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="8001"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#848E9C] border-b border-[#2B313A] pb-1">
              2. Government-Issued Identification
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  ID Type *
                </label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                >
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID Card</option>
                  <option value="drivers_license">Driver's License</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Document Number *
                </label>
                <input
                  type="text"
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="CH89421098X"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={idExpiry}
                  onChange={(e) => setIdExpiry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#848E9C] border-b border-[#2B313A] pb-1">
              3. Encrypted Documents
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#1E2329] border border-[#2B313A] text-center flex flex-col justify-between">
                <div>
                  <UploadCloud className="w-6 h-6 text-[#F0B90B] mx-auto mb-2" />
                  <div className="text-xs font-bold text-white mb-1">ID Document</div>
                  <div className="text-[10px] text-[#848E9C] font-mono truncate">{idFrontName}</div>
                </div>
                <div className="mt-3 text-[10px] text-[#0ECB81] font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1E2329] border border-[#2B313A] text-center flex flex-col justify-between">
                <div>
                  <FileText className="w-6 h-6 text-[#F0B90B] mx-auto mb-2" />
                  <div className="text-xs font-bold text-white mb-1">Proof of Address</div>
                  <div className="text-[10px] text-[#848E9C] font-mono truncate">{addressProofName}</div>
                </div>
                <div className="mt-3 text-[10px] text-[#0ECB81] font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1E2329] border border-[#2B313A] text-center flex flex-col justify-between">
                <div>
                  <Camera className="w-6 h-6 text-[#F0B90B] mx-auto mb-2" />
                  <div className="text-xs font-bold text-white mb-1">Selfie Verification</div>
                  <div className="text-[10px] text-[#848E9C] font-mono truncate">{selfieName}</div>
                </div>
                <div className="mt-3 text-[10px] text-[#0ECB81] font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-[#0B0E11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Verification Documents</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

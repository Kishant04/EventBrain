import React, { useMemo, useState } from 'react';

const TONE_OPTIONS = [
  { value: 'more polite', label: 'More polite' },
  { value: 'formal tone', label: 'Formal tone' },
  { value: 'warmer tone', label: 'Warmer tone' },
  { value: 'more concise', label: 'More concise' },
];

const EmailDraftSummary = ({ messageId, summary, drafts, onRefineEmailDraft }) => {
  const [openVendorId, setOpenVendorId] = useState(null);
  const [selectedTone, setSelectedTone] = useState(TONE_OPTIONS[0].value);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState('');

  const openDraft = useMemo(
    () => drafts.find((draft) => draft.vendorId === openVendorId) || null,
    [drafts, openVendorId],
  );

  const handleRefine = async () => {
    if (!openDraft) return;

    setIsRefining(true);
    setError('');

    try {
      const updatedDraft = await onRefineEmailDraft(messageId, openDraft, selectedTone);
      setOpenVendorId(updatedDraft.vendorId);
    } catch (refineError) {
      setError(String(refineError));
    } finally {
      setIsRefining(false);
    }
  };

  const handleSend = () => {
    if (!openDraft?.contactEmail || openDraft.contactEmail === 'N/A') return;

    const mailtoUrl = `mailto:${encodeURIComponent(openDraft.contactEmail)}?subject=${encodeURIComponent(openDraft.subject)}&body=${encodeURIComponent(openDraft.body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <>
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-md animate-slide-up-fade space-y-3">
        <div>
          <p className="text-[11px] font-bold text-outline uppercase tracking-wide">Email Drafter Agent</p>
          <p className="text-sm font-semibold text-[#111827] mt-1">{summary}</p>
        </div>

        <div className="space-y-2">
          {drafts.map((draft) => (
            <button
              key={draft.vendorId}
              onClick={() => {
                setError('');
                setOpenVendorId(draft.vendorId);
              }}
              className="w-full text-left rounded-lg border border-[#D1D5DB] px-4 py-3 bg-[#F9FAFB] hover:bg-white hover:border-[#3B82F6] transition-colors"
            >
              <span className="block text-sm font-semibold text-[#111827]">{draft.vendorName}</span>
              <span className="block text-xs text-[#6B7280] mt-1">Open draft email</span>
            </button>
          ))}
        </div>
      </div>

      {openDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{openDraft.vendorName}</p>
                <p className="text-xs text-[#6B7280] mt-1">Send email to {openDraft.contactEmail}</p>
              </div>
              <button onClick={() => setOpenVendorId(null)} className="text-[#6B7280] hover:text-[#111827]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-outline">Subject</p>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#111827] leading-6">
                  {openDraft.subject}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-outline">Email body</p>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm text-[#111827] leading-7 whitespace-pre-wrap">
                  {openDraft.body}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-outline mb-2">Modify email</span>
                  <select
                    value={selectedTone}
                    onChange={(event) => setSelectedTone(event.target.value)}
                    className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-3 text-sm text-[#111827]"
                  >
                    {TONE_OPTIONS.map((tone) => (
                      <option key={tone.value} value={tone.value}>
                        {tone.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={handleRefine}
                  disabled={isRefining}
                  className="rounded-lg bg-[#2563EB] text-white px-4 py-3 text-sm font-semibold hover:bg-[#1D4ED8] disabled:opacity-60"
                >
                  {isRefining ? 'Modifying...' : 'Modify email'}
                </button>

                <button
                  onClick={handleSend}
                  disabled={!openDraft.contactEmail || openDraft.contactEmail === 'N/A'}
                  className="rounded-lg bg-[#111827] text-white px-4 py-3 text-sm font-semibold hover:bg-black disabled:opacity-60"
                >
                  Send email
                </button>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default EmailDraftSummary;
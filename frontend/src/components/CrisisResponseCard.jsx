import React from 'react';

const formatCurrency = (value) => {
  if (value == null) return '-';
  return Number(value).toLocaleString();
};

const CrisisResponseCard = ({ agentName, situationSummary, replacementVendors = [], urgentEmails = [], revisedPlan }) => {
  return (
    <div className="animate-slide-up-fade space-y-2" style={{ animationFillMode: 'both' }}>
      <span className="text-[11px] font-bold text-outline ml-md">{agentName || 'Crisis Agent'}</span>

      <div className="bg-white border border-[#E5E7EB] rounded-xl p-md space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">Situation Summary</p>
          <p className="text-sm text-red-900 mt-1 leading-6">{situationSummary}</p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563] mb-2">Replacement Vendors</p>
          <div className="space-y-2">
            {replacementVendors.length === 0 ? (
              <div className="border border-[#E5E7EB] rounded-lg p-3 text-sm text-[#6B7280]">No replacement vendors returned.</div>
            ) : (
              replacementVendors.map((vendor, index) => (
                <div key={`${vendor.vendorId}-${index}`} className="border border-[#E5E7EB] rounded-lg p-3 bg-[#F9FAFB]">
                  <p className="text-sm font-semibold text-[#111827]">
                    {index + 1}. {vendor.vendorName} (ID {vendor.vendorId ?? '-'})
                  </p>
                  <p className="text-xs text-[#374151] mt-1">Price per pax: RM {formatCurrency(vendor.pricePerPax)}</p>
                  <p className="text-xs text-[#374151] mt-1 leading-5">Why viable: {vendor.whyViable || 'Not provided.'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#4B5563] mb-2">Urgent Outreach Drafts</p>
          <div className="space-y-2">
            {urgentEmails.length === 0 ? (
              <div className="border border-[#E5E7EB] rounded-lg p-3 text-sm text-[#6B7280]">No urgent emails returned.</div>
            ) : (
              urgentEmails.map((email, index) => (
                <div key={`${email.vendorId}-${index}`} className="border border-[#E5E7EB] rounded-lg p-3 bg-white">
                  <p className="text-xs font-semibold text-[#111827]">{index + 1}. Vendor ID {email.vendorId ?? '-'}</p>
                  <p className="text-xs text-[#4B5563] mt-1">To: {email.toEmail || 'Unknown'}</p>
                  <p className="text-xs text-[#4B5563] mt-1">Subject: {email.subject || '-'}</p>
                  <p className="text-xs text-[#374151] mt-2 leading-5 whitespace-pre-wrap">{email.body || '-'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Revised Plan</p>
          <p className="text-sm text-blue-900 mt-1 leading-6">{revisedPlan}</p>
        </div>
      </div>
    </div>
  );
};

export default CrisisResponseCard;

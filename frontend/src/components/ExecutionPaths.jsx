import React from 'react';

const ExecutionPaths = ({ paths, summary, recommendedPath }) => {
  return (
    <div className="space-y-sm animate-slide-up-fade" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
      <span className="font-label-caps text-[10px] text-outline">PROPOSED EXECUTION PATHS</span>
      {summary ? (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-md text-xs leading-6 text-[#374151]">
          <p><span className="font-semibold text-[#111827]">Recommended path:</span> {recommendedPath || '-'}</p>
          <p className="mt-1"><span className="font-semibold text-[#111827]">Summary:</span> {summary}</p>
        </div>
      ) : null}
      
      {paths.map((path, index) => {
        const isRecommended = path.isRecommended;
        
        if (isRecommended) {
          return (
            <div key={index} className="border-2 border-green-500 bg-green-50 p-md rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-green-800">{path.title}</p>
                <p className="text-xs text-green-700">{path.description}</p>
                <div className="mt-2 text-[11px] text-green-900 space-y-1">
                  <p>Type: {path.type || '-'}</p>
                  <p>Vendor: {path.vendorName || '-'} (ID: {path.vendorId ?? '-'})</p>
                  <p>Pax: {path.pax ?? '-'} | Total: RM {path.totalCostRm ?? '-'} | Risk: {path.riskLevel || '-'}</p>
                  <p>Tradeoff: {path.tradeoff || '-'}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-green-600">check_circle</span>
            </div>
          );
        }

        return (
          <div key={index} className="border border-[#E5E7EB] bg-white p-md rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer">
            <div>
              <p className="font-bold text-on-surface">{path.title}</p>
              <p className="text-xs text-on-surface-variant">{path.description}</p>
              <div className="mt-2 text-[11px] text-[#374151] space-y-1">
                <p>Type: {path.type || '-'}</p>
                <p>Vendor: {path.vendorName || '-'} (ID: {path.vendorId ?? '-'})</p>
                <p>Pax: {path.pax ?? '-'} | Total: RM {path.totalCostRm ?? '-'} | Risk: {path.riskLevel || '-'}</p>
                <p>Tradeoff: {path.tradeoff || '-'}</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline">chevron_right</span>
          </div>
        );
      })}
    </div>
  );
};

export default ExecutionPaths;

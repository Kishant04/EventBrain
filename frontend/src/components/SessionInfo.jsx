import React from 'react';

const SessionInfo = ({ status, overview }) => {
  const isComplete = String(status || '').toLowerCase().includes('complete');
  const isFailed = String(status || '').toLowerCase().includes('failed');
  const isCancelled = String(status || '').toLowerCase().includes('cancelled');
  const statusColor = isComplete ? 'text-green-600' : isFailed || isCancelled ? 'text-red-600' : 'text-[#3B82F6]';
  const eventLine = `${overview?.eventType || '-'} · ${overview?.pax || '-'} pax`;
  const metaLine = `${overview?.location || '-'} · ${overview?.budget || 'RM -'}`;

  return (
    <div className="bg-white border-2 border-gray-500/45 rounded-xl p-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 p-lg opacity-10">
        <span className="material-symbols-outlined text-[64px]">hub</span>
      </div>
      
      <h3 className="font-label-caps text-label-caps text-outline mb-md uppercase">Session</h3>
      
      <div className="space-y-md">
        <div>
          <p className="font-bold text-body-main">{eventLine}</p>
          <p className="text-body-sm text-outline mt-1">{metaLine}</p>
        </div>
        
        <div className="pt-md border-t border-[#E5E7EB]">
          <p className={`font-bold text-sm ${statusColor}`}>
            {status}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionInfo;

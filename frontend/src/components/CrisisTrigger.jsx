import React, { useEffect, useState } from 'react';

const CrisisTrigger = ({ onTriggerCrisis, resetSignal, isBusy }) => {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    setTriggered(false);
  }, [resetSignal]);

  useEffect(() => {
    if (!isBusy) {
      setTriggered(false);
    }
  }, [isBusy]);

  const handleClick = async () => {
    if (triggered || isBusy) return;
    setTriggered(true);
    await onTriggerCrisis();
  };

  return (
    <div className="bg-white border-2 border-gray-500/45 rounded-xl p-lg">
      <h3 className="font-label-caps text-label-caps text-outline mb-md uppercase">Crisis simulation</h3>
      <p className="text-body-sm text-on-surface-variant mb-lg">Simulate a vendor cancellation to trigger Agent 5</p>
      
      <button 
        onClick={handleClick}
        disabled={triggered || isBusy}
        className={`w-full border py-md rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors ${
          triggered || isBusy
            ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed' 
            : 'border-red-700 bg-red-700 text-white hover:bg-red-800'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">running_with_errors</span>
        {triggered || isBusy ? 'Crisis in progress' : 'Vendor cancellation received'}
      </button>
    </div>
  );
};

export default CrisisTrigger;

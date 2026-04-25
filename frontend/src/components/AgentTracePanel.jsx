import React from 'react';

const AgentTracePanel = ({ agentStates }) => {
  return (
    <div className="bg-white border-2 border-gray-500/45 rounded-xl p-lg">
      <h3 className="font-label-caps text-label-caps text-outline mb-md uppercase">Agent trace</h3>
      <div className="space-y-md">
        {agentStates.map((agent) => {
          const isDone = agent.status === 'done';
          const isRunning = agent.status === 'running';
          const isWaiting = agent.status === 'waiting';
          const isCancelled = agent.status === 'cancelled';
          
          return (
            <div key={agent.id} className={`flex items-center justify-between ${isWaiting ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                {isDone && <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>}
                {isRunning && (
                  <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3B82F6] animate-pulse-opacity"></span>
                  </div>
                )}
                {isCancelled && <span className="material-symbols-outlined text-red-500 text-[20px]">cancel</span>}
                {isWaiting && <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>}
                
                <span className={`text-body-sm ${isRunning ? 'font-bold text-primary' : 'font-medium'}`}>
                  {agent.name}
                </span>
              </div>
              <span className={`text-[10px] font-bold uppercase ${
                isDone ? 'text-green-600' : isRunning ? 'text-primary' : isCancelled ? 'text-red-600' : 'text-outline'
              }`}>
                {isDone ? 'DONE' : isRunning ? 'ACTIVE' : isCancelled ? 'STOPPED' : 'WAITING'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentTracePanel;

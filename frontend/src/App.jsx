import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import ChatInput from './components/ChatInput';
import ChatFeed from './components/ChatFeed';
import AgentTracePanel from './components/AgentTracePanel';
import CrisisTrigger from './components/CrisisTrigger';
import SessionInfo from './components/SessionInfo';
import SessionHistory from './components/SessionHistory';

function App() {
  // Pulls real-time orchestration state/actions from the socket-driven hook.
  const { agentStates, agentData, startPipeline, triggerCrisis, stopPipeline, refineEmailDraft, pipelineStatus, resetPipeline, sessionHistory, sessionOverview, isCrisisTriggering } = useSocket();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [resetSignal, setResetSignal] = useState(0);

  const handleRestart = () => {
    // Resets local/remote pipeline UI state and returns to dashboard view.
    resetPipeline();
    setCurrentPage('dashboard');
    setResetSignal((prev) => prev + 1);
  };

  return (
    <div className="bg-[#F9FAFB] text-on-surface font-body-main antialiased min-h-screen">
      {/* TopAppBar */}
      <header className="flex justify-between items-center h-14 px-6 w-full sticky top-0 bg-white border-b border-[#E5E7EB] z-40 font-['Inter'] antialiased text-sm">
        <div className="flex items-center gap-8">
          <span className="text-lg font-bold tracking-tight text-[#111827]">EventBrainAI</span>
          <div className="hidden md:flex items-center gap-4 text-xs">
            <span className="text-[#4B5563] font-medium">Plan smarter events, stress less</span>
            <span className="text-[#2563EB] font-semibold">Powered by Gemini-2.5-Flash</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <span className="material-symbols-outlined text-[#6B7280]">notifications</span>
            <span className="material-symbols-outlined text-[#6B7280]">history</span>
            <span className="material-symbols-outlined text-[#6B7280]">help</span>
          </div>
          <span className="material-symbols-outlined text-[#6B7280] text-[30px]">account_circle</span>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)]">
        {/* SideNavBar */}
        <aside className="fixed left-0 top-0 h-full flex flex-col pt-14 pb-6 w-64 bg-white border-r border-[#E5E7EB] font-['Inter'] text-sm font-medium z-30">
          
          <nav className="flex-1 px-4 space-y-1">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${
                currentPage === 'dashboard'
                  ? 'text-[#2563EB] border-r-2 border-[#2563EB] font-semibold'
                  : 'text-[#1F2937] hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined">dashboard</span> Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('sessions')}
              className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${
                currentPage === 'sessions'
                  ? 'text-[#2563EB] border-r-2 border-[#2563EB] font-semibold'
                  : 'text-[#1F2937] hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined">history</span> Past Sessions History
            </button>
          </nav>
          
          <div className="px-4 pt-4 border-t border-outline-variant/30 space-y-1">
            <a className="flex items-center gap-3 px-3 py-2 text-[#1F2937] hover:bg-gray-100 transition-colors" href="#">
              <span className="material-symbols-outlined">settings</span> Settings
            </a>
            <a className="flex items-center gap-3 px-3 py-2 text-[#1F2937] hover:bg-gray-100 transition-colors" href="#">
              <span className="material-symbols-outlined">contact_support</span> Support
            </a>
            {currentPage === 'dashboard' && (
              <>
                <button
                  onClick={handleRestart}
                  className="w-full mt-3 bg-sky-500 text-white h-12 rounded-md font-bold text-xs uppercase tracking-wider hover:bg-sky-600 transition-colors"
                >
                    Restart
                </button>
                <button onClick={stopPipeline} className="w-full mt-3 bg-tertiary text-white h-12 rounded-md font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-colors">
                    Stop
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Main Content */}
        {currentPage === 'dashboard' ? (
          // Dashboard mode shows live chat, agent trace, crisis controls, and session summary.
          <main className="ml-64 w-full p-lg grid grid-cols-1 md:grid-cols-10 gap-lg">
            {/* Left Column (65%) */}
            <div className="md:col-span-6 flex flex-col h-[calc(100vh-68px)]">
              <div className="bg-white border-2 border-gray-500/45 rounded-xl flex flex-col flex-1 overflow-hidden">
                <div className="px-lg py-md border-b border-[#E5E7EB] flex justify-between items-center">
                  <span className="font-label-caps text-label-caps text-outline uppercase">EVENT REQUEST</span>
                  <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-[10px] text-outline font-medium">LIVE CONNECT</span>
                  </div>
                </div>

                {/* Modular Chat Feed */}
                <ChatFeed agentData={agentData} onRefineEmailDraft={refineEmailDraft} />

                {/* Modular Input Footer */}
                <ChatInput onSend={startPipeline} />
              </div>
            </div>

            {/* Right Column (35%) */}
            <div className="md:col-span-4 space-y-lg">
              {/* Modular Card 1: Agent trace */}
              <AgentTracePanel agentStates={agentStates} />

              {/* Modular Card 2: Crisis simulation */}
              <CrisisTrigger onTriggerCrisis={triggerCrisis} resetSignal={resetSignal} isBusy={isCrisisTriggering} />

              {/* Modular Card 3: Session info */}
              <SessionInfo status={pipelineStatus} overview={sessionOverview} />
            </div>
          </main>
        ) : (
          // History mode renders completed sessions with drill-down details.
          <div className="ml-64 w-full">
            <SessionHistory sessions={sessionHistory} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

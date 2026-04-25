import React, { useState } from 'react';

const STATUS_META = {
  completed: { label: 'Completed', badge: 'bg-green-100 text-green-700', iconColor: 'text-green-600', icon: 'check_circle' },
  failed: { label: 'Failed', badge: 'bg-amber-100 text-amber-700', iconColor: 'text-amber-600', icon: 'warning' },
  cancelled: { label: 'Cancelled', badge: 'bg-red-100 text-red-700', iconColor: 'text-red-600', icon: 'cancel' },
  processing: { label: 'Processing', badge: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-600', icon: 'sync' },
};

const LOG_STATUS_META = {
  done: { label: 'Done', badge: 'bg-green-100 text-green-700', iconColor: 'text-green-600', icon: 'check_circle' },
  running: { label: 'Running', badge: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-600', icon: 'sync' },
  failed: { label: 'Failed', badge: 'bg-amber-100 text-amber-700', iconColor: 'text-amber-600', icon: 'warning' },
  timeout: { label: 'Timeout', badge: 'bg-amber-100 text-amber-700', iconColor: 'text-amber-600', icon: 'schedule' },
  cancelled: { label: 'Cancelled', badge: 'bg-red-100 text-red-700', iconColor: 'text-red-600', icon: 'cancel' },
};

const getStatusMeta = (status) => STATUS_META[String(status || '').toLowerCase()] || STATUS_META.processing;
const getLogStatusMeta = (status) => LOG_STATUS_META[String(status || '').toLowerCase()] || STATUS_META.processing;

const SessionHistory = ({ sessions = [] }) => {
  const [selectedSession, setSelectedSession] = useState(null);

  if (selectedSession) {
    const selectedStatus = getStatusMeta(selectedSession.status);

    return (
      <div className="bg-[#F9FAFB] text-on-surface font-body-main antialiased min-h-[calc(100vh-56px)] p-lg">
        <div className="max-w-7xl">
          {/* Back button */}
          <button
            onClick={() => setSelectedSession(null)}
            className="mb-lg flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Sessions
          </button>

          {/* Session Header */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-lg mb-lg">
            <div className="grid grid-cols-4 gap-lg">
              <div>
                <p className="text-outline text-xs font-medium uppercase">Event Type</p>
                <p className="text-lg font-bold text-[#111827] mt-1">{selectedSession.eventType}</p>
              </div>
              <div>
                <p className="text-outline text-xs font-medium uppercase">Attendees</p>
                <p className="text-lg font-bold text-[#111827] mt-1">{selectedSession.pax} pax</p>
              </div>
              <div>
                <p className="text-outline text-xs font-medium uppercase">Budget</p>
                <p className="text-lg font-bold text-[#111827] mt-1">{selectedSession.budget}</p>
              </div>
              <div>
                <p className="text-outline text-xs font-medium uppercase">Status</p>
                <span className={`inline-block mt-1 px-3 py-1 text-xs font-bold rounded-full uppercase ${
                  selectedStatus.badge
                }`}>
                  {selectedStatus.label}
                </span>
              </div>
            </div>
          </div>

          {/* Agent Logs */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-lg py-md border-b border-[#E5E7EB] flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">timeline</span>
              <span className="font-label-caps text-label-caps text-outline uppercase">Execution Log</span>
            </div>

            <div className="divide-y divide-[#E5E7EB]">
              {selectedSession.agentLogs.map((log, index) => {
                const logStatus = getLogStatusMeta(log.status);

                return (
                  <div key={index} className="p-lg hover:bg-gray-50 transition-colors border-l-4 border-l-blue-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-blue-600">smart_toy</span>
                        <p className="font-bold text-sm text-[#111827]">{log.agentName || `Agent ${log.agentNumber || '-'}`}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${logStatus.badge}`}>
                          {logStatus.label}
                        </span>
                      </div>
                      <span className={`material-symbols-outlined ${logStatus.iconColor}`}>
                        {logStatus.icon}
                      </span>
                    </div>
                    <p className="text-sm text-[#4B5563] ml-8 whitespace-pre-wrap break-words">{log.message || 'No details available.'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9FAFB] text-on-surface font-body-main antialiased min-h-[calc(100vh-56px)] p-lg">
      <div className="max-w-7xl">
        {/* Header */}
        <div className="mb-lg">
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Session History</h1>
          <p className="text-outline">View all your past event orchestration sessions and their execution details</p>
        </div>

        {sessions.length === 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-lg text-[#6B7280]">
            No completed sessions yet. Run a pipeline from Dashboard and logs will appear here.
          </div>
        )}

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          {sessions.map((session) => {
              const statusMeta = getStatusMeta(session.status);
              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="bg-white border border-[#E5E7EB] rounded-xl p-lg hover:shadow-lg hover:border-blue-600 transition-all cursor-pointer group"
                >
                  {/* Session Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs text-outline font-medium mb-1">{session.date}</p>
                      <h3 className="text-lg font-bold text-[#111827] group-hover:text-blue-600 transition-colors">
                        {session.eventType}
                      </h3>
                    </div>
                    <span className={`material-symbols-outlined text-2xl ${statusMeta.iconColor}`}>
                      {statusMeta.icon}
                    </span>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-[#4B5563]">
                        <span className="material-symbols-outlined text-sm">group</span>
                        <span>{session.pax} attendees</span>
                      </div>
                      <p className="font-bold text-sm text-[#111827]">{session.budget}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-full font-semibold ${statusMeta.badge}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Agent Summary */}
                  <div className="border-t border-[#E5E7EB] pt-4">
                    <p className="text-xs text-outline font-medium mb-2 uppercase">Agents Executed</p>
                    <div className="flex flex-wrap gap-2">
                      {session.agentLogs.map((log, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">done</span>
                          {log.agentName || `Agent ${log.agentNumber || '-'}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* View Details Link */}
                  <button className="mt-4 w-full py-2 text-blue-600 font-semibold text-sm hover:bg-blue-50 rounded-lg transition-colors">
                    View Details →
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;

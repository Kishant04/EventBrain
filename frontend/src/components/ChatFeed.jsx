import React, { useEffect, useRef, useState } from 'react';
import VendorCards from './VendorCards';
import ExecutionPaths from './ExecutionPaths';
import BudgetFlagCard from './BudgetFlagCard';
import EmailDraftSummary from './EmailDraftSummary';
import CrisisResponseCard from './CrisisResponseCard';

const BOTTOM_THRESHOLD_PX = 100;

const ChatFeed = ({ agentData, onRefineEmailDraft }) => {
  const feedRef = useRef(null);
  const wasNearBottomRef = useRef(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Detects whether the reader is close enough to the bottom for auto-follow.
  const isNearBottom = (element) => {
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceFromBottom <= BOTTOM_THRESHOLD_PX;
  };

  const scrollToBottom = (behavior = 'auto') => {
    const container = feedRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  const handleScroll = () => {
    // Tracks manual scroll position so new messages do not force-jump unexpectedly.
    const container = feedRef.current;
    if (!container) return;

    const nearBottom = isNearBottom(container);
    wasNearBottomRef.current = nearBottom;

    if (nearBottom) {
      setHasUnreadMessages(false);
    }
  };

  // Only auto-scroll when the reader is already near the bottom.
  useEffect(() => {
    const container = feedRef.current;
    if (!container) return;

    if (wasNearBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
      setHasUnreadMessages(false);
    } else {
      setHasUnreadMessages(true);
    }
  }, [agentData]);

  return (
    <div className="relative flex-1 min-h-0 bg-surface-container-lowest">
      <div ref={feedRef} onScroll={handleScroll} className="h-full min-h-0 overflow-y-auto p-lg space-y-md">
        {agentData.length === 0 && (
          <div className="h-full flex items-center justify-center text-outline">
            Pipeline idle. Waiting for request...
          </div>
        )}

        {agentData.map((data) => {
          // Renders message cards by discriminating on each feed item's type.
          if (data.type === 'user') {
            return (
              <div key={data.id} className="flex justify-end animate-slide-up-fade" style={{ animationFillMode: 'both' }}>
                <div className="max-w-[80%] bg-[#3B82F6] text-white p-md rounded-xl rounded-tr-none text-body-sm shadow-sm">
                  {data.text}
                </div>
              </div>
            );
          }

          if (data.type === 'agent_text') {
            return (
              <div key={data.id} className="flex flex-col gap-xs animate-slide-up-fade" style={{ animationFillMode: 'both' }}>
                <span className="text-[11px] font-bold text-outline ml-md">{data.agentName}</span>
                <div className="flex justify-start">
                  <div className={`max-w-[92%] bg-white border border-[#E5E7EB] text-on-surface p-md rounded-xl rounded-tl-none text-[13px] leading-6 whitespace-pre-wrap ${data.agentName === 'System Alert' ? 'border-error bg-error-container/10' : ''}`}>
                    {data.text}
                  </div>
                </div>
              </div>
            );
          }

          if (data.type === 'status_line') {
            return (
              <div key={data.id} className="bg-white border border-[#E5E7EB] rounded-lg p-sm animate-slide-up-fade">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#3B82F6]">task_alt</span>
                  <span className="text-[11px] font-bold text-[#1F2937] uppercase tracking-wide">{data.title}</span>
                </div>
                {data.detail ? <p className="text-xs text-[#4B5563] mt-1">{data.detail}</p> : null}
              </div>
            );
          }

          if (data.type === 'loading') {
            return (
              <div key={data.id} className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-800 p-sm rounded-lg animate-slide-up-fade">
                <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B82F6] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3B82F6] animate-pulse-opacity"></span>
                </div>
                <span className="text-xs font-medium">{data.text}</span>
              </div>
            );
          }

          if (data.type === 'budget_flag') {
            return <BudgetFlagCard key={data.id} message={data.message} explanation={data.explanation} />;
          }

          if (data.type === 'vendor_cards') {
            return <VendorCards key={data.id} vendors={data.vendors} />;
          }

          if (data.type === 'email_drafts') {
            return <EmailDraftSummary key={data.id} messageId={data.id} summary={data.summary} drafts={data.drafts} onRefineEmailDraft={onRefineEmailDraft} />;
          }

          if (data.type === 'execution_paths') {
            return <ExecutionPaths key={data.id} paths={data.paths} summary={data.summary} recommendedPath={data.recommendedPath} />;
          }

          if (data.type === 'crisis_response') {
            return (
              <CrisisResponseCard
                key={data.id}
                agentName={data.agentName}
                situationSummary={data.situationSummary}
                replacementVendors={data.replacementVendors}
                urgentEmails={data.urgentEmails}
                revisedPlan={data.revisedPlan}
              />
            );
          }

          return null;
        })}
      </div>

      {hasUnreadMessages && agentData.length > 0 ? (
        <button
          // Jumps to latest content and clears unread state when user opts in.
          onClick={() => {
            scrollToBottom('smooth');
            wasNearBottomRef.current = true;
            setHasUnreadMessages(false);
          }}
          className="absolute bottom-4 right-4 bg-[#2563EB] text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg hover:bg-[#1D4ED8] transition-colors"
        >
          New messages
        </button>
      ) : null}
    </div>
  );
};

export default ChatFeed;

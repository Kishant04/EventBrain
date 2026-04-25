import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const SOCKET_TRANSPORT = import.meta.env.VITE_SOCKET_TRANSPORT || 'polling';

const INITIAL_AGENT_STATES = [
  { id: 1, name: 'Intake', status: 'waiting' },
  { id: 2, name: 'Vendor + Risk', status: 'waiting' },
  { id: 3, name: 'Email Drafter', status: 'waiting' },
  { id: 4, name: 'Decision', status: 'waiting' },
  { id: 5, name: 'Crisis', status: 'waiting' },
];

const SESSION_STATUS_LABELS = {
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  processing: 'Processing',
};

const AGENT_DISPLAY_NAMES = {
  1: 'Intake Agent',
  2: 'Vendor & Risk Agent',
  3: 'Email Drafter Agent',
  4: 'Decision Agent',
  5: 'Crisis Agent',
};

const AGENT_LOADING_TEXT = {
  1: 'Loading... parsing intake and extracting event requirements.',
  3: 'Generating... drafting concise vendor inquiry emails.',
  4: 'Generating... evaluating conservative, balanced, and aggressive paths.',
  5: 'Loading... handling crisis recovery and proposing urgent replacements.',
};

// Converts raw intake output into a readable summary block for chat.
const addRuntimeId = (item) => ({ ...item, id: Date.now() + Math.random() });

const safeJoin = (arr) => (Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : 'None noted');

const humanizeEventType = (value) => {
  if (!value) return 'Unknown';
  return String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatCurrency = (value) => (value == null ? '-' : Number(value).toLocaleString());

const formatIntakeNarrative = (data) => {
  const missing = Array.isArray(data.missing_fields) && data.missing_fields.length > 0 ? data.missing_fields.join(', ') : 'None';
  return [
    'Request summary',
    `- Pax: ${data.pax || '-'}`,
    `- Location: ${data.location || 'Unknown'}`,
    `- Event type: ${humanizeEventType(data.event_type)}`,
    `- Requested date: ${data.date_requested || 'Unknown'}`,
    `- Lead time: ${data.lead_time_days ?? '-'} day(s)`,
    `- Budget total: RM ${formatCurrency(data.budget_rm)}`,
    `- Budget per pax: RM ${formatCurrency(data.budget_per_pax)}`,
    `- Budget risk: ${data.budget_risk || 'Unknown'}`,
    `- Missing fields: ${missing}`,
  ].join('\n');
};

const formatVendorNarrative = (data) => {
  const vendors = (data.ranked_vendors || []).map((v) =>
    [
      `${v.rank}. ${v.vendor_name} (ID ${v.vendor_id})`,
      `   Total: RM ${formatCurrency(v.estimated_total)} | RM ${formatCurrency(v.price_per_pax)}/pax`,
      `   Rating: ${v.rating ?? 'N/A'} | Speciality: ${v.speciality || 'N/A'}`,
      `   Contact: ${v.contact_email || 'Not provided'}`,
      `   Why: ${v.why_recommended || 'No rationale returned.'}`,
    ].join('\n'),
  );
  return [
  'Top vendor recommendations',
  ...(vendors.length ? vendors : ['- No vendors returned.'])
].join('\n\n');
};

const formatRiskNarrative = (data) => {
  const factors = (data.risk_factors || []).map((f, i) => `${i + 1}. ${f}`);
  const mitigations = (data.mitigations || []).map((m, i) => `${i + 1}. ${m}`);
  return [
    'Crisis recovery',
    `- Risk level: ${data.risk_level || 'unknown'}`,
    `- Risk score: ${data.risk_score ?? '-'} / 10`,
    '',
    'Key risk factors:',
    ...(factors.length ? factors : ['1. No explicit risk factors returned.']),
    '',
    'Suggested mitigations:',
    ...(mitigations.length ? mitigations : ['1. No mitigations returned.']),
  ].join('\n');
};

const toReadableDoneMessage = (agentNumber, data) => {
  if (!data || typeof data !== 'object') {
    return `${AGENT_DISPLAY_NAMES[agentNumber] || 'Agent'} completed.`;
  }

  if (agentNumber === 1) {
    return `Captured event request: ${data.pax || '-'} pax, budget RM ${data.budget_rm || '-'}, type ${data.event_type || 'unknown'}, location ${data.location || 'unknown'}.`;
  }

  if (agentNumber === 2 && data.ranked_vendors) {
    const top3 = data.ranked_vendors
      .slice(0, 3)
      .map((v) => `${v.vendor_name} (RM ${Number(v.estimated_total || v.price_per_pax || 0).toLocaleString()})`)
      .join(', ');
    return `Vendor ranking complete. Top recommendations: ${top3 || 'No vendors found'}.`;
  }

  if (agentNumber === 2 && Object.prototype.hasOwnProperty.call(data, 'risk_score')) {
    return `Risk assessment complete: ${data.risk_level || 'unknown'} risk (score ${data.risk_score ?? '-'} / 10). Key risks: ${safeJoin(data.risk_factors)}.`;
  }

  if (agentNumber === 3 && data.draft_emails) {
    return `Email drafting complete. Prepared ${data.draft_emails.length} vendor inquiry email(s) with review buttons.`;
  }

  if (agentNumber === 4 && data.paths) {
    return `Decision complete. Recommended strategy: ${data.recommended_path || 'balanced'}.`;
  }

  if (agentNumber === 5) {
    return `Crisis recovery complete. ${data.situation_summary || 'Backup plan generated with replacement vendors and urgent outreach.'}`;
  }

  return `${AGENT_DISPLAY_NAMES[agentNumber] || 'Agent'} completed successfully.`;
};

const getSessionCardFromLogs = (sessionId, agentLogs, status) => {
  // Builds a compact session card model from accumulated live agent logs.
  const intakeDone = agentLogs.find((log) => log.agentNumber === 1 && log.status === 'done');
  const intake = intakeDone?.payload || {};
  const budget = intake.budget_rm ? `RM ${Number(intake.budget_rm).toLocaleString()}` : 'RM -';
  const pax = intake.pax || '-';
  const eventType = intake.event_type ? humanizeEventType(intake.event_type) : 'Event Request';
  return {
    id: sessionId,
    date: new Date().toLocaleString('en-MY', { hour12: false }),
    eventType,
    location: intake.location || '-',
    budget,
    pax,
    status,
    statusLabel: SESSION_STATUS_LABELS[status] || status,
    agentLogs,
  };
};

export const useSocket = () => {
  // Central real-time state manager for pipeline events, UI messages, and session history.
  const socketRef = useRef(null);
  const currentSessionIdRef = useRef(null);
  const activeSessionLogsRef = useRef([]);
  const latestVendorOutputRef = useRef(null);
  const agent2RunCountRef = useRef(0);
  const agent2DoneCountRef = useRef(0);

  const [pipelineStatus, setPipelineStatus] = useState('Waiting for input...');
  const [socketReady, setSocketReady] = useState(false);
  const [agentStates, setAgentStates] = useState(INITIAL_AGENT_STATES);
  const [agentData, setAgentData] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionOverview, setSessionOverview] = useState({
    eventType: '-',
    pax: '-',
    location: '-',
    budget: 'RM -',
  });
  const [isCrisisTriggering, setIsCrisisTriggering] = useState(false);

  const appendData = (dataItem) => {
    // Appends chat feed items with runtime IDs to keep list rendering stable.
    setAgentData((prev) => [...prev, addRuntimeId(dataItem)]);
  };

  const appendStatusLine = (title, detail) => {
    appendData({ type: 'status_line', title, detail });
  };

  const appendLoading = (agentNumber, text, loadingKey = 'default') => {
    setAgentData((prev) => {
      const withoutSame = prev.filter(
        (item) => !(item.type === 'loading' && item.agentNumber === agentNumber && item.loadingKey === loadingKey),
      );
      return [...withoutSame, addRuntimeId({ type: 'loading', agentNumber, loadingKey, text })];
    });
  };

  const clearLoading = (agentNumber, loadingKey = null) => {
    setAgentData((prev) =>
      prev.filter((item) => {
        if (item.type !== 'loading') return true;
        if (item.agentNumber !== agentNumber) return true;
        if (loadingKey && item.loadingKey !== loadingKey) return true;
        return false;
      }),
    );
  };

  const clearAllLoading = () => {
    setAgentData((prev) => prev.filter((item) => item.type !== 'loading'));
  };

  const updateAgentStatus = (id, newStatus) => {
    setAgentStates((prev) => prev.map((agent) => (agent.id === id ? { ...agent, status: newStatus } : agent)));
  };

  const resetLocalState = () => {
    setAgentStates(INITIAL_AGENT_STATES);
    setAgentData([]);
    setPipelineStatus('Waiting for input...');
    currentSessionIdRef.current = null;
    setCurrentSessionId(null);
    activeSessionLogsRef.current = [];
    latestVendorOutputRef.current = null;
    agent2RunCountRef.current = 0;
    agent2DoneCountRef.current = 0;
    setSessionOverview({
      eventType: '-',
      pax: '-',
      location: '-',
      budget: 'RM -',
    });
    setIsCrisisTriggering(false);
  };

  useEffect(() => {
    // Wires socket lifecycle handlers and translates backend events into frontend state.
    const socket = io(API_BASE_URL, {
      transports: [SOCKET_TRANSPORT],
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketReady(true);
      setPipelineStatus((prev) => (prev === 'Waiting for input...' ? 'Connected. Waiting for input...' : prev));
    });

    socket.on('disconnect', () => {
      setSocketReady(false);
      setPipelineStatus((prev) => (prev.includes('Processing') ? prev : 'Disconnected. Reconnecting...'));
    });

    socket.on('connect_error', () => {
      setSocketReady(false);
      setPipelineStatus('Connection issue. Retrying...');
    });

    socket.on('session_started', (payload) => {
      const sessionId = payload?.session_id;
      currentSessionIdRef.current = sessionId;
      setCurrentSessionId(sessionId);
      activeSessionLogsRef.current = [];
      agent2RunCountRef.current = 0;
      agent2DoneCountRef.current = 0;
      setPipelineStatus('Processing...');
      setSessionOverview({
        eventType: 'Parsing request...',
        pax: '-',
        location: '-',
        budget: 'RM -',
      });
      appendData({ type: 'agent_text', agentName: 'System', text: 'Session started.' });
    });

    socket.on('agent_update', (payload) => {
      // Maps each agent status transition into feed entries, cards, and status chips.
      const agentNumber = Number(payload?.agent);
      const status = payload?.status || 'unknown';
      const data = payload?.data || null;
      const agentName = AGENT_DISPLAY_NAMES[agentNumber] || `Agent ${agentNumber}`;

      if (status === 'running') {
        updateAgentStatus(agentNumber, 'running');
        appendStatusLine(`${agentName} running`, '');

        if (agentNumber === 2) {
          const isVendorTrack = agent2RunCountRef.current === 0;
          const whichTwo = isVendorTrack
            ? 'Querying the database for suitable vendors...'
            : 'Generating risk analysis from date and context...';
          const loadingKey = isVendorTrack ? 'vendor' : 'risk';
          agent2RunCountRef.current += 1;
          appendLoading(2, whichTwo, loadingKey);
        } else {
          appendLoading(agentNumber, AGENT_LOADING_TEXT[agentNumber] || 'Loading... processing agent step.');
        }

        const runningLog = {
          timestamp: new Date().toISOString(),
          agentNumber,
          agentName,
          status,
          message: `${agentName} is running.`,
          payload: null,
        };
        activeSessionLogsRef.current = [...activeSessionLogsRef.current, runningLog];
        return;
      }

      if (status === 'done' || status === 'failed' || status === 'timeout') {
        if (agentNumber === 2) {
          if (data?.ranked_vendors) clearLoading(2, 'vendor');
          else if (Object.prototype.hasOwnProperty.call(data || {}, 'risk_score')) clearLoading(2, 'risk');
          else clearLoading(2);
        } else {
          clearLoading(agentNumber);
        }

        if (agentNumber === 2 && status === 'done') {
          agent2DoneCountRef.current += 1;
          if (agent2DoneCountRef.current >= 2) updateAgentStatus(2, 'done');
          else updateAgentStatus(2, 'running');
        } else {
          updateAgentStatus(agentNumber, status === 'done' ? 'done' : 'waiting');
        }

        const readableMessage =
          status === 'done'
            ? toReadableDoneMessage(agentNumber, data)
            : `${agentName} ended with status ${status}.`;

        appendStatusLine(`${agentName} ${status}`, readableMessage);

        const finalLog = {
          timestamp: new Date().toISOString(),
          agentNumber,
          agentName,
          status,
          message: readableMessage,
          payload: data,
        };
        activeSessionLogsRef.current = [...activeSessionLogsRef.current, finalLog];

        if (agentNumber === 1 && status === 'done' && data) {
          setSessionOverview({
            eventType: humanizeEventType(data.event_type),
            pax: data.pax || '-',
            location: data.location || '-',
            budget: `RM ${formatCurrency(data.budget_rm)}`,
          });
          appendData({ type: 'agent_text', agentName: 'Intake Agent', text: formatIntakeNarrative(data) });
          if (data.budget_flag_message) {
            appendData({ type: 'budget_flag', message: 'Budget risk detected', explanation: data.budget_flag_message });
          }
        }

        if (agentNumber === 2 && status === 'done' && data?.ranked_vendors) {
          latestVendorOutputRef.current = data;
          appendData({ type: 'agent_text', agentName: 'Vendor Agent', text: formatVendorNarrative(data) });
          appendData({
            type: 'vendor_cards',
            vendors: data.ranked_vendors.map((v) => ({
              vendorId: v.vendor_id,
              name: v.vendor_name,
              totalPrice: `RM ${formatCurrency(v.estimated_total || v.price_per_pax)}`,
              pricePerPax: `RM ${formatCurrency(v.price_per_pax)}/pax`,
              rating: v.rating ?? 'N/A',
              speciality: v.speciality || 'N/A',
              contactEmail: v.contact_email || 'N/A',
              reason: v.why_recommended || 'No rationale returned.',
              status: 'Available',
            })),
          });
        }

        if (agentNumber === 2 && status === 'done' && data?.risk_score) {
          appendData({
            type: 'agent_text',
            agentName: 'Risk Agent',
            text: formatRiskNarrative(data),
          });
        }

        if (agentNumber === 3 && status === 'done' && data?.draft_emails) {
          appendData({
            type: 'email_drafts',
            agentName: 'Email Drafter Agent',
            summary: `Emails drafted for ${data.draft_emails.length} vendor${data.draft_emails.length === 1 ? '' : 's'}.`,
            drafts: data.draft_emails.map((email) => ({
              vendorId: email.vendor_id,
              vendorName: email.vendor_name,
              contactEmail: email.contact_email || email.to_email || 'N/A',
              subject: email.subject,
              body: email.body,
            })),
          });
        }

        if (agentNumber === 4 && status === 'done' && data?.paths) {
          appendData({
            type: 'execution_paths',
            paths: data.paths.map((p) => ({
              title: p.label || p.type,
              description: p.tradeoff || `Cost RM ${p.total_cost_rm || '-'} - risk ${p.risk_level || '-'}.`,
              isRecommended: p.type === data.recommended_path,
              type: p.type,
              vendorName: p.vendor_name,
              vendorId: p.vendor_id,
              pax: p.pax,
              totalCostRm: p.total_cost_rm,
              riskLevel: p.risk_level,
              tradeoff: p.tradeoff,
            })),
            summary: data.summary,
            recommendedPath: data.recommended_path,
          });
          appendData({
            type: 'agent_text',
            agentName: 'Decision Agent',
            text: data.summary || `Recommended path: ${data.recommended_path || 'balanced'}. Review all options below.`,
          });
        }

        if (agentNumber === 5 && status === 'done') {
          setIsCrisisTriggering(false);
          appendData({
            type: 'crisis_response',
            agentName: 'Crisis Agent',
            situationSummary: data?.situation_summary || 'Crisis event received.',
            replacementVendors: (data?.replacement_vendors || []).map((vendor) => ({
              vendorId: vendor.vendor_id,
              vendorName: vendor.vendor_name,
              pricePerPax: vendor.price_per_pax,
              whyViable: vendor.why_viable,
            })),
            urgentEmails: (data?.urgent_emails || []).map((email) => ({
              vendorId: email.vendor_id,
              toEmail: email.to_email,
              subject: email.subject,
              body: email.body,
            })),
            revisedPlan: data?.revised_plan || 'No revised plan returned.',
          });
        }

        if (agentNumber === 5 && (status === 'failed' || status === 'timeout')) {
          setIsCrisisTriggering(false);
        }

        if (status !== 'done') {
          const errorMessage = data?.error ? `Reason: ${data.error}` : 'Please retry or check backend logs.';
          appendData({
            type: 'agent_text',
            agentName,
            text: `${agentName} ended with status ${status}.\n${errorMessage}`,
          });
        }
      }
    });

    socket.on('pipeline_complete', (payload) => {
      const sessionId = payload?.session_id || currentSessionIdRef.current;
      const finalStatus = payload?.status || 'completed';
      const friendlyStatus = finalStatus === 'completed' ? 'Pipeline complete' : finalStatus === 'cancelled' ? 'Pipeline cancelled' : `Pipeline ${finalStatus}`;
      setPipelineStatus(friendlyStatus);
      clearAllLoading();
      setIsCrisisTriggering(false);

      if (sessionId) {
        const sessionCard = getSessionCardFromLogs(sessionId, activeSessionLogsRef.current, finalStatus);
        setSessionHistory((prev) => [sessionCard, ...prev.filter((item) => item.id !== sessionId)]);
      }

      setAgentStates((prev) =>
        prev.map((agent) => {
          if (finalStatus === 'completed') {
            return { ...agent, status: agent.status === 'running' ? 'done' : agent.status };
          }
          if (finalStatus === 'cancelled' && agent.status === 'running') {
            return { ...agent, status: 'cancelled' };
          }
          return agent;
        }),
      );
      appendData({
        type: 'agent_text',
        agentName: 'System',
        text: `Pipeline finished with status: ${finalStatus}.${payload?.reason ? `\nReason: ${payload.reason}` : ''}`,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const startPipeline = async (requestText) => {
    // Kicks off a fresh orchestration run for the submitted user request.
    setAgentStates(INITIAL_AGENT_STATES);
    setAgentData([]);
    activeSessionLogsRef.current = [];
    latestVendorOutputRef.current = null;
    agent2RunCountRef.current = 0;
    agent2DoneCountRef.current = 0;

    appendData({ type: 'user', text: requestText });
    setPipelineStatus('Processing...');

    const socketId = socketRef.current?.id;
    if (!socketId) {
      appendData({ type: 'agent_text', agentName: 'System', text: 'Socket not connected yet. Please wait a second and retry.' });
      setPipelineStatus('Socket not connected');
      return;
    }

    try {
      fetch(`${API_BASE_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_input: requestText, socket_id: socketId }),
      }).catch(() => {
        appendData({ type: 'agent_text', agentName: 'System', text: 'Failed to start pipeline request. Check backend server.' });
      });
    } catch (error) {
      appendData({ type: 'agent_text', agentName: 'System', text: `Error sending request: ${String(error)}` });
      setPipelineStatus('Failed to start pipeline');
    }
  };

  const triggerCrisis = async () => {
    // Injects a cancellation crisis using the top currently ranked vendor.
    const socketId = socketRef.current?.id;
    const sessionId = currentSessionIdRef.current;

    if (!socketId || !sessionId) {
      appendData({ type: 'agent_text', agentName: 'System', text: 'No active session for crisis trigger yet.' });
      return;
    }

    const recommendedVendorId = latestVendorOutputRef.current?.ranked_vendors?.[0]?.vendor_id;
    if (!recommendedVendorId) {
      appendData({
        type: 'agent_text',
        agentName: 'System',
        text: 'Crisis trigger requires ranked vendors from Agent 2. Run or complete the pipeline first.',
      });
      return;
    }

    setPipelineStatus('Processing crisis...');
    appendLoading(5, 'Loading... injecting crisis and recalculating backup plan.', 'crisis');
    setIsCrisisTriggering(true);

    try {
      fetch(`${API_BASE_URL}/api/crisis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          cancelled_vendor_id: recommendedVendorId,
          socket_id: socketId,
        }),
      }).catch(() => {
        appendData({ type: 'agent_text', agentName: 'System', text: 'Failed to trigger crisis call.' });
        setIsCrisisTriggering(false);
      });
    } catch (error) {
      appendData({ type: 'agent_text', agentName: 'System', text: `Crisis trigger error: ${String(error)}` });
      setIsCrisisTriggering(false);
    }
  };

  const stopPipeline = async () => {
    // Requests backend-side cancellation for the currently active session.
    const sessionId = currentSessionIdRef.current;

    if (!sessionId) {
      appendData({ type: 'agent_text', agentName: 'System', text: 'No active session is running right now.' });
      return;
    }

    setPipelineStatus('Stopping...');
    clearAllLoading();
    appendStatusLine('Stop requested', 'Attempting to cancel the active pipeline immediately.');

    try {
      const response = await fetch(`${API_BASE_URL}/api/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || 'Stop request failed.');
      }
    } catch (error) {
      appendData({ type: 'agent_text', agentName: 'System', text: `Stop failed. ${String(error)}` });
      setPipelineStatus('Stop request failed');
    }
  };

  const refineEmailDraft = async (messageId, draft, tone) => {
    // Refines one draft email and patches the matching entry in local chat state.
    const response = await fetch(`${API_BASE_URL}/api/email/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_name: draft.vendorName,
        contact_email: draft.contactEmail,
        subject: draft.subject,
        body: draft.body,
        tone,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || 'Unable to refine email draft.');
    }

    const refined = await response.json();
    const updatedDraft = {
      ...draft,
      subject: refined.subject || draft.subject,
      body: refined.body || draft.body,
    };

    setAgentData((prev) =>
      prev.map((item) => {
        if (item.id !== messageId || item.type !== 'email_drafts') {
          return item;
        }

        return {
          ...item,
          drafts: item.drafts.map((entry) => (entry.vendorId === draft.vendorId ? updatedDraft : entry)),
        };
      }),
    );

    return updatedDraft;
  };

  const resetPipeline = () => {
    resetLocalState();
  };

  return {
    agentStates,
    agentData,
    startPipeline,
    triggerCrisis,
    stopPipeline,
    refineEmailDraft,
    pipelineStatus,
    resetPipeline,
    sessionHistory,
    currentSessionId,
    socketReady,
    sessionOverview,
    isCrisisTriggering,
  };
};

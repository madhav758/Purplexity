
import { createClient } from '@/lib/supabase/client';
import { BACKEND_URL } from 'config';
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios';

const Supabase = createClient();

// ─── UI-only helpers ──────────────────────────────────────────────────────────

function SparkLogo({ size = 36 }: { size?: number }) {
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <div
                className="absolute inset-0 rounded-full opacity-40 blur-md"
                style={{ background: "radial-gradient(circle, hsl(270 80% 60%), transparent 70%)" }}
            />
            <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-label="Purplexity logo">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                    <rect
                        key={i}
                        x="24" y="6" width="4" height="18" rx="2"
                        fill={"url(#convRayGrad-" + i + ")"}
                        transform={"rotate(" + angle + " 26 26)"}
                        opacity={i % 2 === 0 ? 1 : 0.55}
                    />
                ))}
                <defs>
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((_, i) => (
                        <linearGradient key={i} id={"convRayGrad-" + i} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(270 80% 75%)" />
                            <stop offset="100%" stopColor="hsl(250 70% 55%)" stopOpacity="0.4" />
                        </linearGradient>
                    ))}
                </defs>
            </svg>
        </div>
    );
}

function ChatIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            style={{ color: "hsl(240 5% 50%)", flexShrink: 0 }}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function PurplexityAvatar() {
    return (
        <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
                width: 30,
                height: 30,
                background: "linear-gradient(135deg, hsl(270 80% 55%), hsl(240 70% 50%))",
                boxShadow: "0 0 12px rgba(139,92,246,0.4)",
            }}
        >
            <svg width="14" height="14" viewBox="0 0 52 52" fill="none">
                {[0, 90, 180, 270].map((angle, i) => (
                    <rect key={i} x="24" y="6" width="4" height="14" rx="2"
                        fill="white" opacity={i % 2 === 0 ? 1 : 0.6}
                        transform={`rotate(${angle} 26 26)`} />
                ))}
            </svg>
        </div>
    );
}

function StreamingCursor() {
    return (
        <span style={{
            display: "inline-block", width: 2, height: "1em",
            background: "hsl(270 80% 70%)", borderRadius: 1,
            marginLeft: 2, verticalAlign: "text-bottom",
            animation: "blink 0.9s step-end infinite",
        }} />
    );
}

// Three pulsing dots shown while waiting for the first streamed token
function TypingDots() {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 0" }}>
            {[0, 1, 2].map(i => (
                <span key={i} style={{
                    display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                    background: "hsl(270 60% 65%)",
                    animation: `blink 1.2s step-end infinite`,
                    animationDelay: `${i * 0.2}s`,
                    opacity: 0.7,
                }} />
            ))}
        </span>
    );
}

function getHostname(url: string) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
}
//extract answers and follwup from XML 
function extractAnswer(content: string): string {
    const match = content.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/i);
    return match ? (match[1] ?? "").trim() : content.replace(/<\/?ANSWER>/gi, '').trim();
}

function extractFollowUps(content: string): string[] {
    const matches = [...content.matchAll(/<question>([\s\S]*?)<\/question>/g)];
    return matches.map(m => (m[1] ?? "").trim());
}
// ─── UI-only types ────────────────────────────────────────────────────────────
type FollowUpTurn = {
    role: "User" | "Assistant";
    content: string;
    sources: { url: string }[];
    followUps: string[];
    streaming?: boolean;
};
type SidebarConversation = { id: string; title?: string; };

// ─── Main Component ───────────────────────────────────────────────────────────
function Conversations() {

    const navigate = useNavigate();


    //1. get the conversatonId ,query from the params 
    const { conversationId } = useParams();
    const [searchParams] = useSearchParams();
    const query = searchParams.get("query");

    // Capture the query at mount time so it stays visible after navigate() strips ?query= from the URL
    const [capturedQuery] = useState<string | null>(query);


    const [streamText, setStreamText] = useState<String>("");
    const [answer, setAnswer] = useState<string>("");
    const [sources, setSources] = useState<{ url: string }[]>([]);// Array of source objects
    const [followUps, setFollowUps] = useState<string[]>([]);       // Array of follow-up question strings

    const [messages, setMessages] = useState<{                       // For Mode B history loading
        id: number;
        content: string;
        role: "User" | "Assistant";
        createdAt: string;
    }[]>([]);

    const [isStreaming, setIsStreaming] = useState<boolean>(false);  // To show a loading spinner


    //2. send the query to to the start stream to strean the response
    useEffect(() => {
        if (query) {
            startStream(query)
        }
        else {
            loadHistory();
        }
    }, [conversationId])
    // 3. write the logoc for the startStream function 
    async function startStream(query: String) {
        //3.1 get the access token and do a fetch to teh /purplexity_ask endpoint send the token as header
        // and the query and conversationId as the body to the backend
        const { data: { session }, error } = await Supabase.auth.getSession()
        const jwt = session?.access_token;
        if (!jwt) {
            console.error("No active session found");
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/purplexity_ask`, {
                method: "POST",
                headers: {
                    'Authorization': jwt,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    conversationId: conversationId,
                }),
            })
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            //stream the response form the backend 
            const reader = response.body?.getReader();
            console.log(reader);
            if (!reader) return;
            // textDecoder logic 
            const decoder = new TextDecoder();
            let accumulatedResponse = "";
            setIsStreaming(true);
            while (true) {
                const { value, done } = await reader?.read();
                if (done) break;
                if (value) {
                    const chunk = decoder.decode(value, { stream: !done });
                    accumulatedResponse += chunk;
                    // const liveText = accumulatedResponse.match(/<ANSWER>([\.\s\S]*?)(<\/ANSWER>|$)/)?.[1]?.trim() ?? accumulatedResponse;
                    // setStreamText(accumulatedResponse);// slow 
                    // Cancel the previously scheduled frame (if the chunk arrived before
                    // the browser had a chance to paint) then schedule a new one.
                    // This means setStreamText fires at most once per screen refresh (~60fps)
                    // instead of once per chunk (potentially 100+/sec).
                    cancelAnimationFrame(rafId.current);
                    rafId.current = requestAnimationFrame(() => {
                        setStreamText(accumulatedResponse);
                    });
                }
            }
            const answer = accumulatedResponse.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/i)?.[1]?.trim() ?? accumulatedResponse;
            const sourcesRaw = accumulatedResponse.match(/<SOURCES>([\s\S]*?)<\/SOURCES>/i)?.[1]?.trim();
            const sources = sourcesRaw ? JSON.parse(sourcesRaw) : [];
            const followUps = [...accumulatedResponse.matchAll(/<question>([\s\S]*?)<\/question>/g)].map(m => m[1] ?? "");
            setAnswer(answer);
            setSources(sources);
            setFollowUps(followUps);
            setIsStreaming(false);
            navigate(`/conversation/${conversationId}`, { replace: true })


        } catch (error: any) {
            console.error(error.message);
        }
    }
    async function loadHistory() {
        const { data: { session }, error } = await Supabase.auth.getSession()
        const jwt = session?.access_token;
        if (!jwt) {
            console.error("No active session found");
            return;
        }
        axios.get(`${BACKEND_URL}/conversation/${conversationId}`, {
            headers: {
                'Authorization': jwt,
            }
        }).then((response) => {
            console.log(response.data.conversation.messages)
            setMessages(response.data.conversation.messages)
        })
            .catch((error) => {
                console.log("AXIOS ERROR: ", error);
            })
    }

    // ── UI-only state (does not touch original logic above) ───────────────────
    const [followUpInput, setFollowUpInput] = useState("");
    const [inputFocused, setInputFocused] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [sidebarConversations, setSidebarConversations] = useState<SidebarConversation[]>([]);
    const [followUpTurns, setFollowUpTurns] = useState<FollowUpTurn[]>([]);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const rafId = useRef<number>(0); // holds the pending rAF id so we can cancel it before scheduling a new one

    // Load user email + sidebar conversation list for the sidebar
    useEffect(() => {
        async function loadSidebar() {
            const { data: { user } } = await Supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
            const { data: { session } } = await Supabase.auth.getSession();
            const jwt = session?.access_token;
            if (!jwt) return;
            try {
                const res = await axios.get(`${BACKEND_URL}/conversations`, { headers: { Authorization: jwt } });
                if (res.data.conversations) setSidebarConversations(res.data.conversations);
            } catch { /* silent */ }
        }
        loadSidebar();
    }, [conversationId]);

    // Auto-scroll to bottom when new content arrives
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [streamText, answer, followUpTurns, messages]);

    // Follow-up stream handler — hits /purplexity_ask/follow_up
    async function startFollowUpStream(q: string) {
        if (!q.trim()) return;
        setFollowUpInput("");
        const { data: { session } } = await Supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) return;

        setFollowUpTurns(prev => [
            ...prev,
            { role: "User", content: q, sources: [], followUps: [] },
            { role: "Assistant", content: "", sources: [], followUps: [], streaming: true },
        ]);

        try {
            const response = await fetch(`${BACKEND_URL}/purplexity_ask/follow_up`, {
                method: "POST",
                headers: { 'Authorization': jwt, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q, conversationId }),
            });
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            const reader = response.body?.getReader();
            if (!reader) return;
            const decoder = new TextDecoder();
            let accumulated = "";
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    accumulated += decoder.decode(value, { stream: true });
                    const liveText = accumulated.match(/<ANSWER>([\.\s\S]*?)(<\/ANSWER>|$)/i)?.[1]?.trim() ?? accumulated;
                    // Same rAF throttle — cancel the pending frame and reschedule.
                    cancelAnimationFrame(rafId.current);
                    rafId.current = requestAnimationFrame(() => {
                        setFollowUpTurns(prev => {
                            const next = [...prev];
                            next[next.length - 1] = { ...next[next.length - 1], content: liveText } as FollowUpTurn;
                            return next;
                        });
                    });
                }
            }
            const parsedAnswer = accumulated.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/i)?.[1]?.trim() ?? accumulated;
            const sourcesRaw = accumulated.match(/<SOURCES>([\s\S]*?)<\/SOURCES>/i)?.[1]?.trim();
            const parsedSources = sourcesRaw ? JSON.parse(sourcesRaw) : [];
            const parsedFollowUps = [...accumulated.matchAll(/<question>([\s\S]*?)<\/question>/g)].map(m => (m[1] ?? "").trim());
            setFollowUpTurns(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "Assistant", content: parsedAnswer, sources: parsedSources, followUps: parsedFollowUps, streaming: false };
                return next;
            });
        } catch (err: any) {
            console.error("followUp error:", err.message);
        }
    }

    async function handleLogout() {
        await Supabase.auth.signOut();
        navigate("/auth");
    }

    const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "U";
    const anyFollowUpStreaming = followUpTurns.some(t => t.streaming);
    const isAnythingStreaming = isStreaming || anyFollowUpStreaming;
    const lastFollowUpAssistantIdx = followUpTurns.map(t => t.role).lastIndexOf("Assistant");


    // During streaming: extract whatever has arrived inside <ANSWER> tags for live display.
    // After streaming: use the already-parsed `answer` state (which has no XML tags).
    const liveAnswer = isStreaming
        ? (String(streamText).match(/<ANSWER>([\s\S]*?)(<\/ANSWER>|$)/i)?.[1]?.trim() ?? String(streamText))
        : answer;

    // Simple markdown → JSX renderer (bold, italic, inline code, headings, bullets)
    function renderMarkdown(text: string): React.ReactNode {
        const lines = text.split("\n");
        return lines.map((line, li) => {
            // Heading
            const h3 = line.match(/^### (.+)/);
            const h2 = line.match(/^## (.+)/);
            const h1 = line.match(/^# (.+)/);
            // Bullet
            const bullet = line.match(/^[-*] (.+)/);
            // Numbered list
            const numbered = line.match(/^(\d+)\. (.+)/);

            const raw = h3?.[1] ?? h2?.[1] ?? h1?.[1] ?? bullet?.[1] ?? numbered?.[2] ?? line;

            // Inline styles: bold, italic, inline code
            const parts: React.ReactNode[] = [];
            const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
            let last = 0;
            let match;
            while ((match = inlineRegex.exec(raw)) !== null) {
                if (match.index > last) parts.push(raw.slice(last, match.index));
                const m = match[0];
                if (m.startsWith("`"))
                    parts.push(<code key={match.index} style={{ background: "rgba(139,92,246,0.15)", borderRadius: 4, padding: "1px 5px", fontFamily: "monospace", fontSize: "0.88em", color: "hsl(270 70% 80%)" }}>{m.slice(1, -1)}</code>);
                else if (m.startsWith("**"))
                    parts.push(<strong key={match.index} style={{ color: "hsl(0 0% 96%)", fontWeight: 600 }}>{m.slice(2, -2)}</strong>);
                else
                    parts.push(<em key={match.index}>{m.slice(1, -1)}</em>);
                last = match.index + m.length;
            }
            if (last < raw.length) parts.push(raw.slice(last));

            const content = parts.length ? parts : raw;

            if (h1) return <p key={li} style={{ fontWeight: 700, fontSize: "1.1em", color: "hsl(0 0% 96%)", margin: "8px 0 4px" }}>{content}</p>;
            if (h2) return <p key={li} style={{ fontWeight: 700, fontSize: "1.05em", color: "hsl(0 0% 94%)", margin: "8px 0 4px" }}>{content}</p>;
            if (h3) return <p key={li} style={{ fontWeight: 600, color: "hsl(0 0% 92%)", margin: "6px 0 2px" }}>{content}</p>;
            if (bullet) return <p key={li} style={{ margin: "2px 0", paddingLeft: 14 }}>• {content}</p>;
            if (numbered) return <p key={li} style={{ margin: "2px 0", paddingLeft: 14 }}>{numbered[1]}. {content}</p>;
            if (!line.trim()) return <br key={li} />;
            return <p key={li} style={{ margin: "3px 0" }}>{content}</p>;
        });
    }

    return (
        <div
            className="flex w-screen h-screen overflow-hidden"
            style={{ background: "hsl(240 10% 3.9%)", fontFamily: "'Inter', system-ui, sans-serif" }}
        >
            {/* Blink keyframe */}
            <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

            {/* Ambient background orbs */}
            <div aria-hidden="true" className="pointer-events-none fixed -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-35 blur-[110px]"
                style={{ background: "radial-gradient(circle, hsl(270 80% 50%), transparent 70%)" }} />
            <div aria-hidden="true" className="pointer-events-none fixed -bottom-32 right-1/3 w-[420px] h-[420px] rounded-full opacity-25 blur-[110px]"
                style={{ background: "radial-gradient(circle, hsl(240 70% 55%), transparent 70%)" }} />
            <div aria-hidden="true" className="pointer-events-none fixed top-1/2 -right-40 w-[400px] h-[400px] rounded-full opacity-20 blur-[120px]"
                style={{ background: "radial-gradient(circle, hsl(270 80% 45%), transparent 70%)" }} />

            {/* ── Sidebar ── */}
            <aside
                className="relative z-10 flex flex-col h-full shrink-0"
                style={{
                    width: "260px",
                    background: "rgba(255,255,255,0.025)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div className="flex items-center px-5 pt-5 pb-4">
                    <SparkLogo size={36} />
                </div>

                <div className="px-3 mb-3">
                    <button
                        id="btn-new-thread"
                        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ color: "hsl(0 0% 85%)", background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.20)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.18)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.35)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.10)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.20)"; e.currentTarget.style.transform = "translateY(0)"; }}
                        onClick={() => navigate('/')}
                    >
                        <PlusIcon />
                        <span>New Thread</span>
                    </button>
                </div>

                <p className="px-5 mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(240 5% 40%)" }}>History</p>

                <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth: "none" }}>
                    {sidebarConversations.length === 0 ? (
                        <p className="px-2 py-3 text-xs" style={{ color: "hsl(240 5% 38%)" }}>No conversations yet.</p>
                    ) : (
                        sidebarConversations.map(conv => {
                            const isActive = conv.id === conversationId;
                            return (
                                <button
                                    key={conv.id}
                                    id={"conv-" + conv.id}
                                    className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 cursor-pointer"
                                    style={{
                                        color: isActive ? "hsl(270 80% 80%)" : "hsl(240 5% 65%)",
                                        background: isActive ? "rgba(139,92,246,0.12)" : "transparent",
                                        border: isActive ? "1px solid rgba(139,92,246,0.20)" : "1px solid transparent",
                                    }}
                                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "hsl(0 0% 90%)"; } }}
                                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "hsl(240 5% 65%)"; } }}
                                    onClick={() => navigate(`/conversation/${conv.id}`)}
                                >
                                    <ChatIcon />
                                    <span className="text-sm truncate flex-1">{conv.title || "Conversation " + conv.id.slice(0, 8)}</span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="px-3 py-4 mt-auto" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-3 px-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
                            style={{ background: "linear-gradient(135deg, hsl(270 80% 55%), hsl(240 70% 50%))", color: "white" }}>
                            {initials}
                        </div>
                        <span className="text-xs truncate flex-1" style={{ color: "hsl(240 5% 60%)" }}>{userEmail || "Guest"}</span>
                        <button id="btn-logout" onClick={handleLogout} title="Sign out"
                            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 cursor-pointer"
                            style={{ color: "hsl(240 5% 45%)" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "hsl(0 80% 65%)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "hsl(240 5% 45%)"; }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-label="Sign out">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main chat area ── */}
            <main className="relative z-10 flex flex-1 flex-col h-full overflow-hidden">

                {/* Scrollable thread */}
                <div className="flex-1 overflow-y-auto px-6 py-8" style={{ scrollbarWidth: "none" }}>
                    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: "720px" }}>

                        {/* ── Mode A: initial query + streaming answer ── */}
                        {capturedQuery && (
                            <>
                                {/* User bubble */}
                                <div className="flex justify-end">
                                    <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                                        style={{
                                            maxWidth: "70%",
                                            background: "linear-gradient(135deg, hsl(270 60% 30%), hsl(250 55% 28%))",
                                            border: "1px solid rgba(139,92,246,0.25)",
                                            color: "hsl(0 0% 92%)",
                                            boxShadow: "0 4px 20px rgba(139,92,246,0.15)",
                                        }}>
                                        {capturedQuery}
                                    </div>
                                </div>

                                {/* Assistant answer bubble */}
                                {(isStreaming || streamText || answer) && (
                                    <div className="flex items-start gap-3">
                                        <PurplexityAvatar />
                                        <div className="flex flex-col gap-3" style={{ maxWidth: "calc(100% - 42px)" }}>
                                            <div className="px-5 py-4 rounded-2xl text-sm leading-relaxed"
                                                style={{
                                                    background: "rgba(255,255,255,0.04)",
                                                    backdropFilter: "blur(12px)",
                                                    WebkitBackdropFilter: "blur(12px)",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                    color: "hsl(0 0% 88%)",
                                                    boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
                                                }}>
                                                <p style={{ margin: 0 }}>
                                                    {isStreaming && !liveAnswer
                                                        ? <TypingDots />
                                                        : <>{renderMarkdown(liveAnswer)}{isStreaming && <StreamingCursor />}</>}
                                                </p>

                                                {/* Sources after answer */}
                                                {!isStreaming && sources.length > 0 && (
                                                    <>
                                                        <hr style={{ margin: "12px 0 10px", border: "none", borderTop: "1px solid rgba(255,255,255,0.07)" }} />
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(240 5% 40%)" }}>Sources</span>
                                                            {sources.map((src, si) => (
                                                                <a key={si} href={src.url} target="_blank" rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all duration-150"
                                                                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.16)", color: "hsl(270 60% 72%)", textDecoration: "none" }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.16)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.30)"; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.08)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.16)"; }}
                                                                >
                                                                    <span style={{ opacity: 0.55 }}>[{si + 1}]</span>
                                                                    {getHostname(src.url)}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Follow-up spark list — shown only when no follow-up turns yet */}
                                            {!isStreaming && followUps.length > 0 && followUpTurns.length === 0 && (
                                                <div className="flex flex-col" style={{ gap: "2px" }}>
                                                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "hsl(240 5% 38%)" }}>Suggested</p>
                                                    {followUps.map((q, qi) => (
                                                        <button key={qi} id={`followup-init-${qi}`}
                                                            onClick={() => startFollowUpStream(q)}
                                                            disabled={isAnythingStreaming}
                                                            className="flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                            style={{ color: "hsl(240 5% 68%)", background: "transparent", border: "1px solid transparent" }}
                                                            onMouseEnter={e => { if (!isAnythingStreaming) { e.currentTarget.style.background = "rgba(139,92,246,0.07)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)"; e.currentTarget.style.color = "hsl(270 70% 80%)"; } }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "hsl(240 5% 68%)"; }}
                                                        >
                                                            <span style={{ color: "hsl(270 80% 65%)", fontSize: 13, flexShrink: 0 }}>✦</span>
                                                            <span>{q}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── Mode B: history messages ── */}
                        {/* ── Mode B: history messages ── */}
                        {!capturedQuery && messages.map((msg, idx) => {
                            const isAssistant = msg.role === "Assistant";
                            const isLastMessage = idx === messages.length - 1;
                            const cleanContent = isAssistant ? extractAnswer(msg.content) : msg.content;
                            const msgFollowUps = (isAssistant && isLastMessage) ? extractFollowUps(msg.content) : [];

                            return msg.role === "User" ? (
                                <div key={idx} className="flex justify-end">
                                    <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                                        style={{
                                            maxWidth: "70%",
                                            background: "linear-gradient(135deg, hsl(270 60% 30%), hsl(250 55% 28%))",
                                            border: "1px solid rgba(139,92,246,0.25)",
                                            color: "hsl(0 0% 92%)",
                                            boxShadow: "0 4px 20px rgba(139,92,246,0.15)",
                                        }}>
                                        {msg.content}
                                    </div>
                                </div>
                            ) : (
                                <div key={idx} className="flex items-start gap-3">
                                    <PurplexityAvatar />
                                    <div className="flex flex-col gap-3" style={{ maxWidth: "calc(100% - 42px)" }}>
                                        <div className="px-5 py-4 rounded-2xl text-sm leading-relaxed"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                backdropFilter: "blur(12px)",
                                                WebkitBackdropFilter: "blur(12px)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                                color: "hsl(0 0% 88%)",
                                                boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
                                            }}>
                                            <p style={{ margin: 0 }}>{renderMarkdown(cleanContent)}</p>
                                        </div>
                                        {msgFollowUps.length > 0 && (
                                            <div className="flex flex-col" style={{ gap: "2px" }}>
                                                <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                                                    style={{ color: "hsl(240 5% 38%)" }}>Suggested</p>
                                                {msgFollowUps.map((q, qi) => (
                                                    <button key={qi} id={`followup-hist-${qi}`}
                                                        onClick={() => startFollowUpStream(q)}
                                                        disabled={isAnythingStreaming}
                                                        className="flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                        style={{ color: "hsl(240 5% 68%)", background: "transparent", border: "1px solid transparent" }}
                                                        onMouseEnter={e => { if (!isAnythingStreaming) { e.currentTarget.style.background = "rgba(139,92,246,0.07)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)"; e.currentTarget.style.color = "hsl(270 70% 80%)"; } }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "hsl(240 5% 68%)"; }}
                                                    >
                                                        <span style={{ color: "hsl(270 80% 65%)", fontSize: 13, flexShrink: 0 }}>✦</span>
                                                        <span>{q}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* ── Follow-up turns (both modes) ── */}
                        {followUpTurns.map((turn, idx) => {
                            const isLastAssistant = idx === lastFollowUpAssistantIdx;
                            return turn.role === "User" ? (
                                <div key={`fu-${idx}`} className="flex justify-end">
                                    <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                                        style={{
                                            maxWidth: "70%",
                                            background: "linear-gradient(135deg, hsl(270 60% 30%), hsl(250 55% 28%))",
                                            border: "1px solid rgba(139,92,246,0.25)",
                                            color: "hsl(0 0% 92%)",
                                            boxShadow: "0 4px 20px rgba(139,92,246,0.15)",
                                        }}>
                                        {turn.content}
                                    </div>
                                </div>
                            ) : (
                                <div key={`fu-${idx}`} className="flex items-start gap-3">
                                    <PurplexityAvatar />
                                    <div className="flex flex-col gap-3" style={{ maxWidth: "calc(100% - 42px)" }}>
                                        <div className="px-5 py-4 rounded-2xl text-sm leading-relaxed"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                backdropFilter: "blur(12px)",
                                                WebkitBackdropFilter: "blur(12px)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                                color: "hsl(0 0% 88%)",
                                                boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
                                            }}>
                                            <p style={{ margin: 0 }}>
                                                {turn.streaming && !turn.content
                                                    ? <TypingDots />
                                                    : <>{renderMarkdown(turn.content)}{turn.streaming && <StreamingCursor />}</>}
                                            </p>
                                            {!turn.streaming && turn.sources.length > 0 && (
                                                <>
                                                    <hr style={{ margin: "12px 0 10px", border: "none", borderTop: "1px solid rgba(255,255,255,0.07)" }} />
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(240 5% 40%)" }}>Sources</span>
                                                        {turn.sources.map((src, si) => (
                                                            <a key={si} href={src.url} target="_blank" rel="noreferrer"
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all duration-150"
                                                                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.16)", color: "hsl(270 60% 72%)", textDecoration: "none" }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.16)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.30)"; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.08)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.16)"; }}
                                                            >
                                                                <span style={{ opacity: 0.55 }}>[{si + 1}]</span>
                                                                {getHostname(src.url)}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Spark list only on last assistant follow-up */}
                                        {!turn.streaming && isLastAssistant && turn.followUps.length > 0 && (
                                            <div className="flex flex-col" style={{ gap: "2px" }}>
                                                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "hsl(240 5% 38%)" }}>Suggested</p>
                                                {turn.followUps.map((q, qi) => (
                                                    <button key={qi} id={`followup-${idx}-${qi}`}
                                                        onClick={() => startFollowUpStream(q)}
                                                        disabled={isAnythingStreaming}
                                                        className="flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                        style={{ color: "hsl(240 5% 68%)", background: "transparent", border: "1px solid transparent" }}
                                                        onMouseEnter={e => { if (!isAnythingStreaming) { e.currentTarget.style.background = "rgba(139,92,246,0.07)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)"; e.currentTarget.style.color = "hsl(270 70% 80%)"; } }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "hsl(240 5% 68%)"; }}
                                                    >
                                                        <span style={{ color: "hsl(270 80% 65%)", fontSize: 13, flexShrink: 0 }}>✦</span>
                                                        <span>{q}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* ── Sticky follow-up input bar ── */}
                <div className="shrink-0 px-6 pb-6 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="mx-auto" style={{ maxWidth: "720px" }}>
                        <div
                            className="relative rounded-2xl transition-all duration-300"
                            style={{
                                background: "rgba(255,255,255,0.04)",
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                border: inputFocused ? "1px solid rgba(139,92,246,0.55)" : "1px solid rgba(255,255,255,0.10)",
                                boxShadow: inputFocused
                                    ? "0 0 0 3px rgba(139,92,246,0.12), 0 8px 40px rgba(139,92,246,0.20)"
                                    : "0 4px 24px rgba(0,0,0,0.30)",
                            }}
                        >
                            <textarea
                                ref={inputRef}
                                id="followup-input"
                                rows={1}
                                value={followUpInput}
                                onChange={e => setFollowUpInput(e.target.value)}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                placeholder="Ask a follow-up..."
                                disabled={isAnythingStreaming}
                                className="w-full resize-none bg-transparent outline-none px-5 pt-4 pb-4 pr-16 text-sm leading-relaxed disabled:opacity-50"
                                style={{ color: "hsl(0 0% 90%)", caretColor: "hsl(270 80% 70%)" }}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        startFollowUpStream(followUpInput);
                                    }
                                }}
                            />
                            <button
                                id="btn-followup-submit"
                                disabled={!followUpInput.trim() || isAnythingStreaming}
                                onClick={() => startFollowUpStream(followUpInput)}
                                className="absolute right-3 flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "linear-gradient(135deg, hsl(270 80% 55%), hsl(240 70% 50%))",
                                    color: "white",
                                    boxShadow: followUpInput.trim() ? "0 0 16px rgba(139,92,246,0.4)" : "none",
                                }}
                                onMouseEnter={e => {
                                    if (followUpInput.trim()) {
                                        e.currentTarget.style.transform = "translateY(-50%) scale(1.08)";
                                        e.currentTarget.style.boxShadow = "0 0 24px rgba(139,92,246,0.6)";
                                    }
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = "translateY(-50%)";
                                    e.currentTarget.style.boxShadow = followUpInput.trim() ? "0 0 16px rgba(139,92,246,0.4)" : "none";
                                }}
                            >
                                <ArrowIcon />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}


export default Conversations
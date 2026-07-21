// Original imports (unchanged):
// import React, { useEffect, useState } from 'react'
// import { createClient } from '@/lib/supabase/client'
// import type { User } from '@supabase/supabase-js';
// import { useNavigate } from 'react-router-dom';
// import axios from "axios";
// import { BACKEND_URL } from 'config';
// Added: useRef for the search textarea focus
import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "config";
import { Session } from "inspector";

const supabase = createClient();

// ─── draft ──────────────
// function Dashboard() {
//     const navigate = useNavigate();
//     const [user, setUser] = useState<User | null>(null);
//     useEffect(() => {
//         async function getInfo() {
//             const { data: { user }, error } = await supabase.auth.getUser()
//             if (user) {
//                 setUser(user)
//             }
//         }
//         getInfo()
//     }, [])
//     useEffect(() => {
//     async function getExistingConversations() {
//         if (user) {
//             const { data: { session } } = await supabase.auth.getSession()
//             const jwt = session?.access_token
//             axios.get(`${BACKEND_URL}/conversations`, { 'headers': { 'Authorization': jwt } })
//                 .then((response) => {
//                     console.log(response.data);
//                 })
//                 .catch((error) => {
//                     console.log(error);
//                 })
//         }
//     }
//     getExistingConversations()
// }, [user])
//
//     return (
//         <div>
//             {!user && <button onClick={() => { navigate("/auth"); }}>Sign in</button>}
//             {user &&
//                 <div>{user?.email} <button onClick={() => {
//                     supabase.auth.signOut();
//                     setUser(null);
//                 }
//                 }>logout</button>
//                 </div>}
//         </div >
//     )
// }
// ─────────────────────────────────────────────────────────────────────────────

// ─── Spark Logo  ─────────────────────────
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
                        fill={"url(#dashRayGrad-" + i + ")"}
                        transform={"rotate(" + angle + " 26 26)"}
                        opacity={i % 2 === 0 ? 1 : 0.55}
                    />
                ))}
                <defs>
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((_, i) => (
                        <linearGradient key={i} id={"dashRayGrad-" + i} x1="0" y1="0" x2="0" y2="1">
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

type Conversation = {
    id: string;
    title?: string;
    created_at?: string;
};

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [query, setQuery] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [authLoaded, setAuthLoaded] = useState(false);
    useEffect(() => {
        async function getSessionStatus() {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
            }
            setAuthLoaded(true);
        }
        getSessionStatus();
    }, [])

    // Original: fetch user
    // the get info is now redundant because we setUser in the getSessionStatus.
    //  (to remember getSession() is instant (reads local storage) vs getUser() which makes a network call 
    // but in our case out backend aready validates the jwt for every api call so its safe here ).


    // useEffect(() => {
    //     async function getInfo() {
    //         const { data: { user }, error } = await supabase.auth.getUser();
    //         if (user) {
    //             setUser(user);
    //         }
    //     }
    //     getInfo();
    // }, []);

    // Original: fetch existing conversations
    useEffect(() => {
        async function getExistingConversations() {
            if (user) {
                const { data: { session } } = await supabase.auth.getSession();
                const jwt = session?.access_token;
                axios
                    .get(`${BACKEND_URL}/conversations`, { headers: { Authorization: jwt } })
                    .then((response) => {
                        console.log(response.data);
                        if (response.data.conversations) {
                            setConversations(response.data.conversations);
                        }
                    })
                    .catch((error) => {
                        console.log(error);
                    });
            }
        }
        getExistingConversations();
    }, [user]);


    function handleSubmit() {
        if (!query.trim()) return;
        const conversationId = crypto.randomUUID();
        navigate(`/conversation/${conversationId}?query=${encodeURIComponent(query.trim())}`)

    }

    async function handleLogout() {
        await supabase.auth.signOut();
        setUser(null);
        navigate("/auth");
    }

    function handleSuggestion(text: string) {
        setQuery(text);
        inputRef.current?.focus();
    }

    const suggestions = [
        "Summarize recent tech news",
        "Explain neural networks",
        "Find local events",
        "Compare cloud providers",
    ];

    const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "U";

    // Original return (replaced with full glassmorphic layout below):
    // return (
    //     <div>
    //         {!user && <button onClick={() => { navigate("/auth"); }}>Sign in</button>}
    //         {user &&
    //             <div>{user?.email} <button onClick={() => {
    //                 supabase.auth.signOut();
    //                 setUser(null);
    //             }}>logout</button>
    //             </div>}
    //     </div>
    // )

    return (
        <div
            className="flex w-screen h-screen overflow-hidden"
            style={{ background: "hsl(240 10% 3.9%)", fontFamily: "'Inter', system-ui, sans-serif" }}
        >
            {/* Background ambient orbs */}
            <div aria-hidden="true" className="pointer-events-none fixed -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-35 blur-[110px]"
                style={{ background: "radial-gradient(circle, hsl(270 80% 50%), transparent 70%)" }} />
            <div aria-hidden="true" className="pointer-events-none fixed -bottom-32 right-1/3 w-[420px] h-[420px] rounded-full opacity-25 blur-[110px]"
                style={{ background: "radial-gradient(circle, hsl(240 70% 55%), transparent 70%)" }} />
            <div aria-hidden="true" className="pointer-events-none fixed top-1/2 -right-40 w-[400px] h-[400px] rounded-full opacity-20 blur-[120px]"
                style={{ background: "radial-gradient(circle, hsl(270 80% 45%), transparent 70%)" }} />

            {/* Left Sidebar */}
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
                {/* Logo only - no name */}
                <div className="flex items-center px-5 pt-5 pb-4">
                    <SparkLogo size={36} />
                </div>

                {/* New Thread button */}
                <div className="px-3 mb-3">
                    <button
                        id="btn-new-thread"
                        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{
                            color: "hsl(0 0% 85%)",
                            background: "rgba(139,92,246,0.10)",
                            border: "1px solid rgba(139,92,246,0.20)",
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.18)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.35)";
                            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.10)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.20)";
                            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                        }}
                        onClick={() => navigate('/')}
                    >
                        <PlusIcon />
                        <span>New Thread</span>
                    </button>
                </div>

                {/* History label */}
                <p className="px-5 mb-2 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "hsl(240 5% 40%)" }}>
                    History
                </p>

                {/* Scrollable Conversation List */}
                <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth: "none" }}>
                    {conversations.length === 0 ? (
                        <p className="px-2 py-3 text-xs" style={{ color: "hsl(240 5% 38%)" }}>
                            No conversations yet.
                        </p>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.id}
                                id={"conv-" + conv.id}
                                className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 cursor-pointer"
                                style={{ color: "hsl(240 5% 65%)", background: "transparent" }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                                    (e.currentTarget as HTMLButtonElement).style.color = "hsl(0 0% 90%)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                    (e.currentTarget as HTMLButtonElement).style.color = "hsl(240 5% 65%)";
                                }}
                                onClick={() => navigate(`/conversation/${conv.id}`)}
                            >
                                <ChatIcon />
                                <span className="text-sm truncate flex-1">
                                    {conv.title || "Conversation " + conv.id.slice(0, 8)}
                                </span>
                            </button>
                        ))
                    )}
                </div>

                {/* User Profile + Logout */}
                <div
                    className="px-3 py-4 mt-auto"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                    <div className="flex items-center gap-3 px-2">
                        <div
                            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
                            style={{
                                background: "linear-gradient(135deg, hsl(270 80% 55%), hsl(240 70% 50%))",
                                color: "white",
                            }}
                        >
                            {initials}
                        </div>
                        <span className="text-xs truncate flex-1" style={{ color: "hsl(240 5% 60%)" }}>
                            {user?.email ?? "Guest"}
                        </span>
                        <button
                            id="btn-logout"
                            onClick={handleLogout}
                            title="Sign out"
                            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 cursor-pointer"
                            style={{ color: "hsl(240 5% 45%)" }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
                                (e.currentTarget as HTMLButtonElement).style.color = "hsl(0 80% 65%)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                (e.currentTarget as HTMLButtonElement).style.color = "hsl(240 5% 45%)";
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-label="Sign out">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <polyline points="16 17 21 12 16 7" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Workspace */}
            <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pb-16">

                {/* Purplexity heading */}
                <h1
                    className="text-5xl font-bold mb-8 text-center select-none"
                    style={{
                        color: "hsl(0 0% 96%)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1.1,
                    }}
                >
                    Purplexity
                </h1>

                {/* Search bar */}
                <div className="w-full transition-all duration-300" style={{ maxWidth: "660px" }}>
                    <div
                        className="relative rounded-2xl transition-all duration-300"
                        style={{
                            background: "rgba(255,255,255,0.04)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            border: searchFocused
                                ? "1px solid rgba(139,92,246,0.55)"
                                : "1px solid rgba(255,255,255,0.10)",
                            boxShadow: searchFocused
                                ? "0 0 0 3px rgba(139,92,246,0.12), 0 8px 40px rgba(139,92,246,0.20)"
                                : "0 4px 24px rgba(0,0,0,0.30)",
                        }}
                    >
                        <textarea
                            ref={inputRef}
                            id="search-input"
                            rows={1}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => {
                                if (!authLoaded) return;
                                if (!user) {
                                    navigate("/auth");
                                    return
                                }
                                setSearchFocused(true)
                            }
                            }
                            onBlur={() => setSearchFocused(false)}
                            placeholder="Ask Purplexity anything..."
                            className="w-full resize-none bg-transparent outline-none px-5 pt-4 pb-14 text-base leading-relaxed"
                            style={{
                                color: "hsl(0 0% 90%)",
                                caretColor: "hsl(270 80% 70%)",
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />

                        {/* Bottom toolbar inside search bar */}
                        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-3">
                            <div className="flex items-center gap-2">
                                {["Web", "Writing", "Code"].map((label) => (
                                    <button
                                        key={label}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer"
                                        style={{
                                            color: "hsl(240 5% 55%)",
                                            background: "rgba(255,255,255,0.05)",
                                            border: "1px solid rgba(255,255,255,0.07)",
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.color = "hsl(270 80% 75%)";
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.35)";
                                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.08)";
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.color = "hsl(240 5% 55%)";
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <button
                                id="btn-search-submit"
                                disabled={!query.trim()}
                                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                    background: "linear-gradient(135deg, hsl(270 80% 55%), hsl(240 70% 50%))",
                                    color: "white",
                                    boxShadow: query.trim() ? "0 0 16px rgba(139,92,246,0.4)" : "none",
                                }}
                                onMouseEnter={(e) => {
                                    if (query.trim()) {
                                        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(139,92,246,0.6)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = query.trim()
                                        ? "0 0 16px rgba(139,92,246,0.4)" : "none";
                                }}
                                onClick={handleSubmit}
                            >
                                <ArrowIcon />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick-start suggestion pills */}
                <div className="flex flex-wrap justify-center gap-2 mt-5" style={{ maxWidth: "660px" }}>
                    {suggestions.map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                if (!authLoaded) return;
                                if (!user) {
                                    navigate("/auth");
                                    return
                                }
                                handleSuggestion(s)
                            }
                            }
                            className="px-4 py-2 rounded-full text-sm transition-all duration-150 cursor-pointer"
                            style={{
                                color: "hsl(240 5% 58%)",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color = "hsl(0 0% 85%)";
                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
                                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.30)";
                                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color = "hsl(240 5% 58%)";
                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                            }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// Google "G" icon SVG
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// GitHub icon SVG
function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

// Purplexity spark logo
function PurplexityLogo() {
  return (
    <div className="relative flex items-center justify-center w-16 h-16 mb-2">
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full opacity-30 blur-md"
        style={{ background: "radial-gradient(circle, hsl(270 80% 60%), transparent 70%)" }}
      />
      <svg
        width="52"
        height="52"
        viewBox="0 0 52 52"
        fill="none"
        aria-label="Purplexity logo"
      >
        {/* 8-ray asterisk / spark */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect
            key={i}
            x="24"
            y="6"
            width="4"
            height="18"
            rx="2"
            fill={`url(#rayGrad-${i})`}
            transform={`rotate(${angle} 26 26)`}
            opacity={i % 2 === 0 ? 1 : 0.55}
          />
        ))}
        <defs>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((_, i) => (
            <linearGradient key={i} id={`rayGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(270 80% 75%)" />
              <stop offset="100%" stopColor="hsl(250 70% 55%)" stopOpacity="0.4" />
            </linearGradient>
          ))}
        </defs>
      </svg>
    </div>
  );
}

export default function Auth() {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);

  async function login(provider: "google" | "github") {
    // Original implementation:
    // const { data, error } = await supabase.auth.signInWithOAuth({
    //     provider: provider
    // })

    setLoadingProvider(provider);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
    });
    // If there's an error, reset loading state (on success the page redirects)
    if (error) {
      setLoadingProvider(null);
    }
  }

  // Original implementation:
  // return (
  //     <div>
  //         <button onClick={() => login("google")}>Sign in with google</button>
  //         <button onClick={() => login("github")}>̵Sign in with github</button>
  //     </div>
  // );

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "hsl(240 10% 3.9%)" }}
    >
      {/* Background orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-40 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(270 80% 50%), transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-full opacity-35 blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(240 70% 55%), transparent 70%)" }}
      />
      {/* Subtle center radial shimmer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(270 80% 50%), transparent)",
        }}
      />

      {/* Auth Card */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl p-8 flex flex-col items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            "0 0 0 1px rgba(139,92,246,0.08), 0 8px 40px rgba(139,92,246,0.18), 0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <PurplexityLogo />

        {/* Brand name */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              color: "hsl(0 0% 97%)",
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Purplexity
          </h1>
          <p
            className="text-sm"
            style={{ color: "hsl(240 5% 64.9%)" }}
          >
            Search smarter. Think deeper.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center w-full gap-3 my-1">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-xs font-medium" style={{ color: "hsl(240 5% 50%)" }}>
            Continue with
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-3 w-full">
          {/* Google */}
          <button
            id="btn-google-signin"
            onClick={() => login("google")}
            disabled={loadingProvider !== null}
            className="group relative flex items-center justify-center gap-3 w-full h-12 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "hsl(0 0% 97%)",
              color: "hsl(240 10% 10%)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 16px rgba(0,0,0,0.25), 0 0 0 2px rgba(139,92,246,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 1px 3px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)";
            }}
          >
            {loadingProvider === "google" ? (
              <span className="w-5 h-5 rounded-full border-2 border-zinc-400 border-t-zinc-800 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span>Sign in with Google</span>
          </button>

          {/* GitHub */}
          <button
            id="btn-github-signin"
            onClick={() => login("github")}
            disabled={loadingProvider !== null}
            className="group relative flex items-center justify-center gap-3 w-full h-12 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "hsl(240 5% 10%)",
              color: "hsl(0 0% 90%)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 16px rgba(0,0,0,0.35), 0 0 0 2px rgba(139,92,246,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 1px 3px rgba(0,0,0,0.3)";
            }}
          >
            {loadingProvider === "github" ? (
              <span className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-zinc-200 animate-spin" />
            ) : (
              <GitHubIcon />
            )}
            <span>Sign in with GitHub</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-center mt-1" style={{ color: "hsl(240 5% 45%)" }}>
          By continuing, you agree to our{" "}
          <a
            href="#"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            style={{ color: "hsl(240 5% 55%)" }}
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="#"
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            style={{ color: "hsl(240 5% 55%)" }}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

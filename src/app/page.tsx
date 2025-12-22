"use client";

import { useState, useEffect } from "react";
import WrappedContainer from "@/components/wrapped/WrappedContainer";
import { SLIDES } from "@/lib/slides";
import { WrappedData } from "@/types/wrapped";

export default function Home() {
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [authState, setAuthState] = useState<{
    authenticated: boolean;
    slackUserId?: string;
    hasSlackToken: boolean;
  } | null>(null);

  const [cliSecret, setCliSecret] = useState<string | null>(null);

  const handleGenerateSecret = async () => {
    try {
      const res = await fetch("/api/secret", { method: "POST" });
      const data = await res.json();
      if (data.secret) {
        setCliSecret(data.secret);
      } else {
        setError("Failed to generate secret");
      }
    } catch (e) {
      setError("Failed to generate secret");
    }
  };

  useEffect(() => {
    async function checkStatus() {
      try {
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();
        setAuthState(authData);

        if (!authData.authenticated) {
          setLoading(false);
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const customHackatime = params.get("customHackatime");
        const url = customHackatime
          ? `/api/wrapped?customHackatime=${customHackatime}`
          : "/api/wrapped";

        const res = await fetch(url);

        if (res.status === 401) {
          setLoading(false);
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setData(data);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to check status.");
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  const handleHCALogin = () => {
    window.location.href = "/api/auth/hca/login";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wrapped-black text-wrapped-cream">
        <div className="animate-pulse text-2xl font-bold">
          Loading your 2025 Wrapped...
        </div>
      </div>
    );
  }

  if (data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between">
        <WrappedContainer data={data} slides={SLIDES} />
      </main>
    );
  }

  if (!authState?.authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-wrapped-black text-wrapped-cream p-4">
        <div className="bg-wrapped-red text-wrapped-cream px-6 py-4 rounded-xl mb-8 max-w-2xl w-full shadow-lg border-4 border-wrapped-cream">
          <div className="flex flex-col gap-2 text-center">
            <p className="text-2xl font-black uppercase tracking-tight">
              ⚡ Local Scraper Fork ⚡
            </p>
            <p className="text-sm opacity-90">
              This is a fork that lets you run the scraper locally and upload your data yourself.
            </p>
            <a
              href="https://wrapped.isitzoe.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs opacity-75 hover:opacity-100 transition-opacity underline mt-1"
            >
              View the original version at wrapped.isitzoe.dev
            </a>
          </div>
        </div>
        <h1 className="text-6xl font-black mb-8 tracking-tighter">
          HC Wrapped
        </h1>
        <p className="text-xl mb-8 opacity-80 text-center max-w-md">
          Ready to see your year in review?
        </p>
        <div className="flex flex-col gap-4">
          <button
            onClick={handleHCALogin}
            className="bg-wrapped-red text-wrapped-cream px-8 py-4 rounded-full text-xl font-bold hover:scale-105 transition-transform flex items-center gap-3"
          >
            Get your Wrapped
          </button>
          <p className="text-sm opacity-50 text-center">
            Log in with Hack Club Account
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-wrapped-black text-wrapped-cream p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-black mb-4 tracking-tighter text-center">
          Configure your Wrapped
        </h1>
        <p className="text-center opacity-70 mb-8">
          To generate your Wrapped, you&apos;ll need to run a safe, local
          scraper that uploads your stats.
        </p>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            {!cliSecret ? (
              <button
                onClick={handleGenerateSecret}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-xl transition-colors w-full font-bold text-lg"
              >
                Generate CLI Upload Secret
              </button>
            ) : (
              <div className="bg-black/50 p-6 rounded-xl border border-white/20">
                <p className="text-xs opacity-50 mb-2 uppercase tracking-widest font-mono">
                  Your Upload Secret
                </p>
                <div className="bg-white/5 p-4 rounded-lg mb-4 font-mono text-green-400 select-all break-all text-lg">
                  {cliSecret}
                </div>
                <div className="flex flex-col gap-2 text-sm opacity-70">
                  <p>1. Copy the secret above</p>
                  <p>
                    2. Run{" "}
                    <code className="bg-white/10 px-1 py-0.5 rounded font-mono text-wrapped-red">
                      bunx wrapped-cli
                    </code>{" "}
                    (or{" "}
                    <code className="bg-white/10 px-1 py-0.5 rounded font-mono">
                      npx
                    </code>{" "}
                    if you&apos;re boring)
                  </p>
                  <p>3. Paste the secret when prompted</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-white/40">
                  <p className="mb-2">
                    Note: You&apos;ll need your App Configuration Token from{" "}
                    <a
                      href="https://api.slack.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white/60 transition-colors"
                    >
                      api.slack.com/apps
                    </a>
                  </p>
                  <p>
                    Look for the <strong>App Configuration Token</strong>{" "}
                    section at the bottom (use the Access Token, not the Refresh
                    Token).
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center font-bold">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

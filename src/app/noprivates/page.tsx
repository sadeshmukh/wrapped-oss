'use client';

import { useState, useEffect } from 'react';
import WrappedContainer, { SlideConfig } from '@/components/wrapped/WrappedContainer';
import { PUBLIC_SLIDES } from '@/lib/slides';
import { WrappedData } from '@/types/wrapped';

export default function NoPrivatesHome() {
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/wrapped');
        
        if (res.status === 401) {
          setLoading(false);
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.requiresGithub) {
            setShowGithubInput(true);
          } else {
            setData(data);
          }
        } else if (res.status === 404) {
            const errorData = await res.json();
            if (errorData.waitlist) {
                setOnWaitlist(true);
                if (errorData.waitlist.status === 'processing') {
                    setIsProcessing(true);
                } else {
                    setWaitlistPosition(errorData.waitlist.position);
                }
            } else {
                const waitlistRes = await fetch('/api/waitlist', { method: 'POST' });
                if (waitlistRes.ok) {
                    setOnWaitlist(true);
                    window.location.reload();
                } else {
                    setError('Failed to load data');
                }
            }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to check status.');
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/auth/github', {
        method: 'POST',
        body: JSON.stringify({ username: githubUsername }),
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError('Failed to save GitHub username');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wrapped-black text-wrapped-cream">
        <div className="animate-pulse text-2xl font-bold">Loading your 2025 Wrapped (Privacy Mode)...</div>
      </div>
    );
  }

  if (showGithubInput) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-wrapped-black text-wrapped-cream p-4">
        <h1 className="text-4xl font-black mb-8 tracking-tighter text-center">
          One last thing...
        </h1>
        <p className="text-xl mb-8 opacity-80 text-center max-w-md">
          To find your shipped projects, we need your GitHub username.
        </p>
        <form onSubmit={handleGithubSubmit} className="flex flex-col gap-4 w-full max-w-xs">
          <input
            type="text"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="GitHub Username"
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-wrapped-red transition-colors"
            required
          />
          <button
            type="submit"
            className="bg-wrapped-red text-wrapped-cream px-8 py-3 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  if (onWaitlist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-wrapped-black text-wrapped-cream p-4">
        <div className="text-center max-w-md">
          <h1 className="text-5xl font-black mb-6 tracking-tighter">
            {isProcessing ? '⚙️' : '⏳'}
          </h1>
          <h2 className="text-4xl font-black mb-4 tracking-tighter">
            {isProcessing ? 'Crunching the numbers...' : "You're on the list!"}
          </h2>
          
          {!isProcessing && waitlistPosition !== null && (
             <div className="bg-white/10 rounded-xl p-4 mb-6">
                <p className="text-sm uppercase tracking-widest opacity-70 mb-1">Your Position</p>
                <p className="text-4xl font-black">{waitlistPosition}</p>
             </div>
          )}

          <p className="text-xl opacity-80 mb-8">
            {isProcessing 
                ? "We're generating your wrapped right now! This shouldn't take long."
                : "We'll get your wrapped ready (Privacy Mode) and try to let you know in Slack once it's done! Please check back later :3"
            }
          </p>
          <p className="text-sm opacity-60">
            This might take a few minutes to a few hours depending on demand.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-wrapped-black text-wrapped-cream p-4">
        <h1 className="text-6xl font-black mb-8 tracking-tighter">
          HC Wrapped
        </h1>
        <div className="bg-wrapped-red/20 text-wrapped-red px-4 py-2 rounded-full mb-4 font-bold text-sm uppercase tracking-widest">
            Privacy Mode
        </div>
        <p className="text-xl mb-8 opacity-80 text-center max-w-md">
          Ready to see your year in review? Sign in with Slack to generate your Hack Club Wrapped.
          <br/><br/>
          <span className="text-sm opacity-70">
            This mode will NOT access your DMs, private channels, or messages to specific people. Only public channel activity will be analyzed.
          </span>
        </p>
        <div className="flex flex-col gap-4">
          <a
            href="/api/auth/login-noprivates"
            className="bg-wrapped-red text-wrapped-cream px-8 py-4 rounded-full text-xl font-bold hover:scale-105 transition-transform flex items-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.52v-6.315zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.522-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.522 2.521A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.52h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.522 2.527 2.527 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
            </svg>
            Sign in with Slack
          </a>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <WrappedContainer data={data} slides={PUBLIC_SLIDES} />
    </main>
  );
}

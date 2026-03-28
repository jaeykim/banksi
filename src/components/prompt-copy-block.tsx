'use client';

import { useState } from 'react';

interface Props {
  t: {
    quickstart: {
      terminal: {
        promptLine1: string;
        promptLine2: string;
        step1: string;
        step2: string;
        step3: string;
        step4: string;
        done: string;
      };
      copyHint: string;
      copied: string;
    };
  };
}

export function PromptCopyBlock({ t }: Props) {
  const [copied, setCopied] = useState(false);

  const promptText = `${t.quickstart.terminal.promptLine1} ${t.quickstart.terminal.promptLine2}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* The prompt to copy */}
      <div className="rounded-2xl bg-[#0f172a] shadow-2xl overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e293b] border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#ef4444]/80" />
              <span className="h-3 w-3 rounded-full bg-[#f59e0b]/80" />
              <span className="h-3 w-3 rounded-full bg-[#10b981]/80" />
            </div>
            <span className="text-[11px] text-white/30 font-mono ml-2">Claude Code / Cursor / Windsurf</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {t.quickstart.copied}
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                {t.quickstart.copyHint}
              </>
            )}
          </button>
        </div>

        {/* Prompt content */}
        <div className="p-5 sm:p-7 space-y-5">
          {/* User prompt — the copyable part */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-indigo-400 font-bold">you</span>
            </div>
            <p
              className="text-sm sm:text-base text-white font-medium leading-relaxed cursor-pointer select-all"
              onClick={handleCopy}
              title="Click to copy"
            >
              {t.quickstart.terminal.promptLine1}<br />
              {t.quickstart.terminal.promptLine2}
            </p>
          </div>

          {/* AI response preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 font-bold">claude</span>
            </div>
            <div className="space-y-1.5 text-sm text-white/70">
              <p><span className="text-emerald-400">{'>'}</span> {t.quickstart.terminal.step1}</p>
              <p><span className="text-emerald-400">{'>'}</span> {t.quickstart.terminal.step2}</p>
              <p><span className="text-emerald-400">{'>'}</span> {t.quickstart.terminal.step3}</p>
              <p><span className="text-emerald-400">{'>'}</span> {t.quickstart.terminal.step4}</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </span>
              <span className="text-sm text-emerald-400 font-medium">{t.quickstart.terminal.done}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

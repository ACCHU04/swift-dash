"use client";

import { Lightbulb } from "lucide-react";

interface InsightCardProps {
  insight: string;
}

export function InsightCard({ insight }: InsightCardProps) {
  if (!insight) return null;

  return (
    <div className="flex gap-3 bg-gradient-to-br from-violet-500/18 to-cyan-500/12 border border-violet-400/35 rounded-lg p-3.5">
      <div className="flex-shrink-0 p-1.5 bg-violet-500/20 rounded-md h-fit">
        <Lightbulb className="w-4 h-4 text-violet-200" />
      </div>
      <div>
        <p className="text-xs font-semibold font-head text-violet-200 uppercase tracking-wide mb-1">
          AI Insight
        </p>
        <p className="text-sm text-slate-100 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}

"use client";

interface LoadingStateProps {
  variant?: "default" | "large" | "dashboard";
}

export function LoadingState({ variant = "default" }: LoadingStateProps) {
  if (variant === "dashboard") {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800/70 border border-slate-700 rounded-lg p-3">
              <div className="h-3 w-20 bg-slate-700 rounded mb-2" />
              <div className="h-6 w-28 bg-slate-600 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="h-4 w-44 bg-slate-700 rounded mb-3" />
              <div className="h-64 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "large") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-2 h-8 bg-blue-500 rounded-full animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
        />
      ))}
    </div>
  );
}

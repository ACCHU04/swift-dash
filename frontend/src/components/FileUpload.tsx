"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileText, CheckCircle } from "lucide-react";

interface FileUploadProps {
  onUpload: (file: File) => void;
  onFetchAmazon: (category: string) => void;
  isLoading: boolean;
}

const AMAZON_CATEGORIES = [
  "all",
  "electronics",
  "books",
  "fashion",
  "home",
  "beauty",
  "sports",
];

export function FileUpload({ onUpload, onFetchAmazon, isLoading }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [amazonCategory, setAmazonCategory] = useState("electronics");

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && /\.(csv|json|xlsx|xls)$/i.test(file.name)) {
        setSelectedFile(file);
      }
    },
    []
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleUploadClick = useCallback(() => {
    if (selectedFile && !isLoading) {
      onUpload(selectedFile);
    }
  }, [selectedFile, isLoading, onUpload]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const handleAmazonFetch = useCallback(() => {
    if (isLoading) return;
    onFetchAmazon(amazonCategory);
  }, [amazonCategory, isLoading, onFetchAmazon]);

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-4 h-4 text-violet-300" />
        <span className="text-sm font-head font-semibold text-slate-100">Upload Dataset</span>
        <span className="text-xs text-slate-400 ml-auto">optional</span>
      </div>

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-violet-400/60 bg-violet-500/10"
              : "border-white/15 hover:border-white/30 bg-slate-900/50"
          }`}
          onClick={() => document.getElementById("csv-input")?.click()}
        >
          <Upload className="w-6 h-6 text-violet-300/80 mx-auto mb-2" />
          <p className="text-xs text-slate-300">Drop CSV/JSON/XLSX here or click to browse</p>
          <p className="text-[11px] text-slate-500 mt-1">Auto profiles your schema and enables smart query chips.</p>
          <input
            id="csv-input"
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            className="hidden"
            aria-label="Select dataset file"
            title="Select dataset file"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-slate-900/75 border border-white/10 rounded-lg px-3 py-2">
          <FileText className="w-4 h-4 text-cyan-300 flex-shrink-0" />
          <span className="text-xs text-slate-100 flex-1 truncate">{selectedFile.name}</span>
          <button
            onClick={handleClear}
            disabled={isLoading}
            aria-label="Clear selected file"
            title="Clear selected file"
            className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selectedFile && (
        <button
          onClick={handleUploadClick}
          disabled={isLoading}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {isLoading ? (
            <>
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
              Uploading...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Load Dataset
            </>
          )}
        </button>
      )}

      <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
        <p className="text-xs text-slate-300">Or fetch live Amazon best-seller data</p>
        <div className="flex items-center gap-2">
          <select
            value={amazonCategory}
            onChange={(e) => setAmazonCategory(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-white/10 rounded-md px-2 py-1.5 text-xs text-slate-200"
            aria-label="Amazon category"
            title="Amazon category"
          >
            {AMAZON_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category[0].toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={handleAmazonFetch}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white transition-colors"
          >
            {isLoading ? "Fetching..." : "Fetch Amazon"}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">Uses RapidAPI key if configured; otherwise safe mock fallback is used.</p>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";

interface LiveRecorderProps {
  onFile: (file: File) => void;
}

export function LiveRecorder({ onFile }: LiveRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    setError("");
    setBlobUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const name = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
        const file = new File([blob], name, { type: "audio/webm" });
        setBlobUrl(URL.createObjectURL(blob));
        setFileName(name);
        onFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access denied. Allow mic permission and try again.");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="border border-zinc-200 rounded-lg p-3 flex flex-col gap-2">
      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Record live</p>

      {!recording && !blobUrl && (
        <button
          onClick={start}
          className="text-[12px] font-medium px-4 py-1.5 bg-zinc-900 text-white rounded-md hover:opacity-80 transition-opacity"
        >
          ⏺ Start recording
        </button>
      )}

      {recording && (
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-[12px] font-mono text-zinc-700">{fmt(seconds)}</span>
          <button
            onClick={stop}
            className="text-[12px] font-medium px-3 py-1 bg-red-600 text-white rounded-md hover:opacity-80 transition-opacity ml-auto"
          >
            ■ Stop
          </button>
        </div>
      )}

      {blobUrl && !recording && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-zinc-600 truncate flex-1 min-w-0">{fileName}</span>
          <a
            href={blobUrl}
            download={fileName}
            className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-500 shrink-0"
          >
            ↓ Download
          </a>
          <button
            onClick={start}
            className="text-[11px] px-2.5 py-1 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-500 shrink-0"
          >
            Re-record
          </button>
        </div>
      )}

      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

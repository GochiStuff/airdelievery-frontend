"use client";

import React from "react";
import { useParams } from "next/navigation";
import { File, Send } from "lucide-react";
import { useSocket } from "@/hooks/socketContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useFileTransfer } from "@/hooks/useFileTransfer";

export default function RoomPage() {
  const { code } = useParams();
  const flight = typeof code === "string" ? code : "";

  const [logs, setLogs] = React.useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString()} - ${msg}`]);

  // track incoming file state on dataChannel
  const incomingRef = React.useRef<Record<string, { buffers: ArrayBuffer[]; fileName: string; fileSize: number; received: number }>>({});

  // handle both metadata and binary
  const handleMessage = (event: MessageEvent) => {
    if (typeof event.data === 'string') {
      // metadata
      const { transferId, fileName, fileSize } = JSON.parse(event.data);
      incomingRef.current[transferId] = { buffers: [], fileName, fileSize, received: 0 };
      addLog(`Receiving ${fileName}`);
    } else {
      // binary chunk
      const buf = event.data as ArrayBuffer;
      // find active transfer (only one per id)
      for (const id in incomingRef.current) {
        const cur = incomingRef.current[id];
        cur.buffers.push(buf);
        cur.received += buf.byteLength;
        if (cur.received >= cur.fileSize) {
          // assemble and download
          const blob = new Blob(cur.buffers);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = cur.fileName;
          document.body.appendChild(a);
          a.click();
          if (navigator.userAgent.toLowerCase().includes("firefox")) {
                console.log("FIREFOX")
                window.open(url);
            }

            // Clean up
        setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addLog(`Downloaded ${cur.fileName}`);
          delete incomingRef.current[id];
        }
        break; 
      }
    }
  };

  const { dataChannel, status, members } = useWebRTC(flight, handleMessage, addLog);
  const { transfers, handleFileSelect, sendFiles } = useFileTransfer(dataChannel, addLog);

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-white rounded-2xl shadow p-6">
          <div>
            <h1 className="text-2xl font-bold">File Transfer Room</h1>
            <p className="text-sm">Code: <span className="font-mono bg-zinc-100 px-2 py-1 rounded">{code}</span></p>
          </div>
          <div className="flex gap-2">
            <Badge color={status.includes("Connected") ? "green" : "yellow"}>{status}</Badge>
            <Badge color="gray">{members.length} Members</Badge>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div className="flex gap-4">
            <label htmlFor="fileInput" className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2 cursor-pointer">
              <File /> Choose Files
              <input id="fileInput" type="file" multiple className="hidden" onChange={handleFileSelect} />
            </label>
            <button onClick={sendFiles} className="bg-green-500 hover:bg-green-600 text-white rounded-xl px-4 py-2 flex items-center gap-2">
              <Send /> Send
            </button>
          </div>
          {transfers.map(t => (
            <div key={t.transferId} className="bg-zinc-100 rounded-xl p-4">
              <div className="flex justify-between">
                <span>{t.file.name}</span>
                <span>{t.progress}%</span>
              </div>
              <progress value={t.progress} max={100} className="w-full h-2 mt-2" />
            </div>
          ))}
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold mb-2">Logs</h2>
          <div className="font-mono text-sm h-40 overflow-y-auto bg-zinc-50 p-4 rounded">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "yellow" | "gray" }) {
  const base = "rounded-full font-semibold text-sm px-3 py-1";
  const colors = { green: "bg-green-100 text-green-800", yellow: "bg-yellow-100 text-yellow-800", gray: "bg-zinc-100 text-zinc-800" };
  return <span className={`${base} ${colors[color]}`}>{children}</span>;
}

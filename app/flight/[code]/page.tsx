"use client"
import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
  File,
  Folder,
  Share2,
  Users,
  User,
  Heart,
  X,
  Play,
  Pause,
  RefreshCwIcon,
  DownloadIcon,
  Download,
  LucideFolderOpen,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useFileTransfer } from "@/hooks/useFileTransfer";
import { Switch } from "@/components/ui/switch";

export default function RoomPage() {
  const { code } = useParams();
  const flight = typeof code === "string" ? code : "";
  const [showQR, setShowQR] = useState(false);

  const [email, setEmail] = useState("");
  const [type, setType] = useState("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

    const handleFeedbackSent = () => {
      setEmail("");
      setType("feedback");
      setSubject("");
      setMessage("");
      setShowFeedback(false);
      setFeedbackSent(true);

      setTimeout(() => {
        setFeedbackSent(false);
      }, 5000);
    };



  const [isSpinning, setIsSpinning] = useState(false);

  // WebRTC and file transfer hooks
  const { dataChannel, status, members, refreshNearby, inviteToFlight, nearByUsers , sendFeedback } = useWebRTC(flight, e => fileTrans.handleMessage(e));
  const fileTrans = useFileTransfer(dataChannel);

  const handleRefresh = () => {
    setIsSpinning(true);
    refreshNearby();
    setTimeout(() => setIsSpinning(false), 500);
  };

  return (
    <main className="min-h-screen bg-gray-200 text-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white rounded-2xl shadow-xl p-8 mb-6 ">
          {/* Left: Flight Info */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-wider flex items-center gap-2">
          FLIGHT <span className="bg-zinc-100 font-mono text-zinc-700 px-2 py-1 rounded-lg border border-zinc-200">{flight}</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 mt-1 line-clamp-1">
              <Badge color={typeof status === "string" && status.includes("Connection") ? "green" : "yellow"}>{status}</Badge>
              <Badge color="gray">{members.length} Member{members.length !== 1 ? "s" : ""}</Badge>
            </div>
          
          </div>

          {/* Right: Owner, Members, Share */}
          <div className="flex flex-col md:flex-row items-center gap-8 mt-6 md:mt-0">
            
            
            {/* Share Button */}
            <div className="flex flex-col items-center">
              <button
          onClick={() => setShowQR(prev => !prev)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:from-orange-600 hover:to-orange-500 text-white font-semibold shadow-lg transition"
              >
          <Share2 className="w-5 h-5" />
          <span>Invite</span>
              </button>
              <span className="text-xs text-zinc-500 mt-1">Show QR / Code</span>
            </div>
          </div>
        </header>

        {/* Share QR Popup */}
        {showQR && (
          <div className="fixed inset-0 bg-zinc-900/60 h-screen flex items-center justify-center z-50">
            <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-xs flex flex-col items-center border-2 border-orange-400">
     
              <button
                onClick={() => setShowQR(false)}
                className="absolute top-3 right-3 text-zinc-400 hover:text-orange-600 text-2xl font-bold"
                aria-label="Close"
              >
                ×
              </button>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-lg bg-orange-100 text-orange-700 px-3 py-1 rounded-lg border border-orange-200">
                  {flight}
                </span>
              </div>
      
              <h2 className="text-xl font-bold text-zinc-900 mb-3 text-center">Share this Flight</h2>
     
              <div className="flex justify-center mb-4">
                <QRCodeSVG value={typeof window !== "undefined" ? window.location.href : ""} size={180} />
              </div>

              <div className="w-full flex flex-col items-center mb-2">
                <div className="flex items-center gap-2 w-full">
                  <input
                    className="flex-1 bg-zinc-100 rounded-lg px-2 py-1 text-sm font-mono border border-zinc-200 text-zinc-700"
                    value={typeof window !== "undefined" ? window.location.href : ""}
                    readOnly
                    onFocus={e => e.target.select()}
                  />
                  
                  <button
                    onClick={async () => {
                      if (typeof window !== "undefined" && navigator.share) {
                        await navigator.share({
                          title: "Join my Flight",
                          text: "Join my Flight on AirDelivery!",
                          url: window.location.href,
                        });
                      }
                    }}
                    className="p-1 rounded hover:bg-orange-100 text-orange-600"
                    title="Share via OS"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-xs text-zinc-500 mt-1">Ask the reciver to join.</span>
              </div>
              {/* Scan to join */}
              <p className="mt-2 text-sm text-zinc-600 text-center">Scan QR or share the link to join this flight.</p>
            </div>
          </div>
        )}


        {/* feedback */}
        {showFeedback && (
  <div className="fixed inset-0 bg-zinc-900/60 h-screen flex items-center justify-center z-50">
    <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm border-2 border-orange-400">
      {/* Close button */}
      <button
        onClick={() => setShowFeedback(false)}
        className="absolute top-3 right-3 text-zinc-400 hover:text-orange-600 text-2xl font-bold"
        aria-label="Close"
      >
        ×
      </button>

      {/* Title */}
      <h2 className="text-xl font-bold text-zinc-900 mb-4 text-center">
        Send Feedback
      </h2>

      {/* Feedback Form */}
      <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();

              const formData = {
                email,
                type,
                subject,
                message,
              };
              sendFeedback(formData);
              handleFeedbackSent();
            }}
          >
            {/* Email (optional) */}
            <input
              type="email"
              placeholder="Your email (optional)"
              className="bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Type selector */}
            <select
              className="bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="feedback">Feedback</option>
              <option value="report">Bug Report</option>
            </select>

            {/* Subject */}
            <input
              type="text"
              required
              placeholder="Subject"
              className="bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            {/* Message */}
            <textarea
              required
              rows={4}
              placeholder="Your message"
              className="bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {/* Submit */}
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    )}

    {feedbackSent && (
        <div className="fixed bottom-5 right-5 animte-fadeIn border-green-600 bg-green-400 text-white px-4 py-2 rounded-xl shadow-lg z-50 text-sm animate-fade-in">
         Thank you for your feedback!
        </div>
      )}




        {/* Main Content: Upload + Users + Queue */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Area */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center justify-center">
            <div
              className="w-full  h-56 flex flex-col items-center justify-center border-2 border-dashed border-orange-400 rounded-2xl bg-white hover:bg-orange-50 transition cursor-pointer p-6 text-center"
              onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                const files = Array.from(e.dataTransfer.files);
                fileTrans.handleFileSelect({ target: { files } } as any);
              }}
            >
              <Folder className="w-12 h-12 text-orange-500 mb-3" />
              <p className="text-lg font-semibold text-zinc-800">Drag & Drop files or folders</p>
              <span className="mt-1 text-sm text-zinc-500">or select manually</span>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <label className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5 py-2 cursor-pointer flex items-center gap-2 text-sm font-medium transition">
                  <File className="w-4 h-4" />
                  <span>Select Files</span>
                  <input type="file" multiple hidden onChange={fileTrans.handleFileSelect} />
                </label>
                <label className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5 py-2 cursor-pointer flex items-center gap-2 text-sm font-medium transition">
                  <Folder className="w-4 h-4" />
                  <span>Select Folder</span>
                  <input
                    type="file"
                    multiple
                    hidden
                    //@ts-ignore
                    webkitdirectory="true"
                    onChange={fileTrans.handleFileSelect}
                  />
                </label>
              </div>
            </div>
           
          </div>

          {/* Users Panel */}
          <div className="bg-white rounded-3xl shadow-sm p-5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-zinc-800">
                  {members.length <= 1 ? "Nearby Users" : "In Flight"}
                </h2>
              </div>{ members.length <= 1 && 
              <button onClick={handleRefresh} className="p-2 rounded-full hover:bg-zinc-100 transition" title="Refresh">
                <RefreshCwIcon className={`w-5 h-5 ${isSpinning ? "animate-spin" : "transition-transform"}`} />
              </button>}
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto">
              {(members.length <= 1 ? nearByUsers : members).length === 0 ? (
                <div className="text-zinc-400 text-sm text-center py-6">{members.length <= 1 ? "No nearby users" : "No members"}</div>
              ) : (
                (members.length <= 1 ? nearByUsers : members).map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => members.length <= 1 && inviteToFlight(m, flight)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 border border-zinc-200 hover:border-orange-400 hover:bg-orange-50 transition bg-white text-left"
                    title={members.length <= 1 ? `Connect to ${m.name}` : m.name}
                  >
                    <User className="w-6 h-6 text-orange-500 bg-orange-100 rounded-full p-1" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-zinc-900 truncate">{m.name}</span>
                      <span className="text-xs text-zinc-500 font-mono truncate">ID: {m.id}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

         {/* Queue Preview under Upload */}
            <div className="mt-6 w-full space-y-6">
              <QueueTray title="Sending Queue" items={fileTrans.queue} pauseTransfer={fileTrans.pauseTransfer} resumeTransfer={fileTrans.resumeTransfer} cancelTransfer={fileTrans.cancelTransfer} reciver={false} />
              <QueueTray title="Receiver Queue"  setAutoDownload={fileTrans.setAutoDownload} autoDownload={fileTrans.autoDownload} openfile={fileTrans.openFile} fileDownload={fileTrans.downloadFile} items={fileTrans.recvQueue} cancelTransfer={fileTrans.cancelTransfer} reciver={true} />
            </div>

        {/* Metrics and Info */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Overall Metrics</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Metric label="Sent" value={`${(fileTrans.meta.totalSent / 1e9).toFixed(2)} GB`} />
              <Metric label="Received" value={`${(fileTrans.meta.totalReceived / 1e9).toFixed(2)} GB`} />
              <Metric
                label="Sending speed"
                value={
                  fileTrans.meta.speedBps >= 1048576
                    ? `${(fileTrans.meta.speedBps / 1048576).toFixed(2)} MB/s`
                    : `${(fileTrans.meta.speedBps / 1024).toFixed(2)} KB/s`
                }
              />
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-md p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Heart className="w-8 h-8 text-zinc-400" />
                <h3 className="text-2xl font-bold">Love AirDelivery?</h3>
              </div>
              <p className="text-zinc-700 mb-4">
                If you enjoy using this app, <span className="font-semibold text-orange-500">share it</span> or install
              </p>
              <ul className="list-disc list-inside text-zinc-500 text-sm space-y-1 mb-4">
                <li>
                  <strong>Tip:</strong> Connect both devices on the same network for optimal speed.
                </li>
                <li>
                  <strong>Note:</strong> Avoid refreshing after connection is established.
                </li>
                <li>
                  <strong className="text-red-400">IMP:</strong> Use Opera (suggested) or different browser if site not working.
                </li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-medium shadow transition"
                onClick={async () => {
                  if (typeof window !== "undefined" && navigator.share) {
                    try {
                      await navigator.share({
                        title: "Try AirDelivery!",
                        text: "Send files instantly with AirDelivery",
                        url: window.location.origin,
                      });
                    } catch {}
                  } else if (typeof window !== "undefined") {
                    await navigator.clipboard.writeText(window.location.origin);
                    alert("Link copied! Share it with friends.");
                  }
                }}
              >
                <Share2 className="w-5 h-5" />
                Share App
              </button>
              <button
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-2xl font-medium shadow transition"
                onClick={() => {
                  if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
                    alert("Already installed!");
                  } else {
                    alert("Tip: Install this app from browser menu for quick access.");
                  }
                }}
              >
                Install
              </button>
             
            </div>
             {/* <button
                className="flex-1 mt-2 gap-2  text-zinc-900 font-medium"
                onClick={ () => setShowFeedback(true)}
                  
              >
              report / feedback
              </button> */}
          </div>
        </section>
      </div>
    </main>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "yellow" | "gray" }) {
  const base = "inline-flex items-center rounded-full font-semibold text-xs px-3 py-1 border";
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    gray: "bg-zinc-100 text-zinc-800 border-zinc-200",
  };
  return <span className={`${base} ${colors[color]} transition`}>{children}</span>;
}

interface QueueTrayProp {
  title: string;
  items: any[];
  reciver?: boolean;
  pauseTransfer?: (id: string) => void;
  fileDownload?: (file: { transferId: string ; blobUrl: string; directoryPath: string }  ) => void;
  openfile ?: (url : string ) => void;
  allfileDownload?: () => void;
  autoDownload ?: boolean;
  setAutoDownload?: ( b : boolean) => void ;
  resumeTransfer?: (id: string) => void;
  cancelTransfer?: (id: string) => void;
}

function QueueTray({ title, items, reciver = false, pauseTransfer,fileDownload , autoDownload , setAutoDownload, openfile , resumeTransfer, cancelTransfer }: QueueTrayProp) {
  const statusLabels: Record<string, string> = {
    queued: "Queued",
    sending: "Sending",
    paused: "Paused",
    done: "Done",
    error: "Error",
    canceled: "Canceled",
  };

  const [show, setShow] = useState(false);


  return (
    <div className="bg-[#f8f9fa] relative rounded-2xl shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
    { reciver && 
    <div className="absolute top-3 align-text-top right-5 flex gap-2">
  {/*  DOWNLOAD ALL TODO  */}
    <button className=" text-xs font-bold text-zinc-500 text-mono " onClick={() => setShow(true)}>Auto Download / not working ?</button>
    </div>
    }
       {show && (
        <div className="absolute top-8 animate-fadeIn right-2 z-50 max-w-102 rounded-xl border bg-white p-4 shadow-xl dark:bg-zinc-900 dark:text-white">
          <div className="flex absolute top-3 right-3 items-center justify-between mb-3">
            <button onClick={() => setShow(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
             <Switch
              checked={autoDownload}
              onCheckedChange={setAutoDownload}
              id="auto-download-toggle"
            />
            <label htmlFor="auto-download-toggle" className="text-sm">
              Auto-download
            </label>
          </div>

          {!autoDownload && (
            <p className="text-sm mb-2 text-orange-500">
              Auto-download is off. Please use the Download buttons shown next to files.
            </p>
          )}

          <p className="text-sm leading-snug">
            Some browsers block multiple automatic downloads for security reasons.
            If that happens:
          </p>
          <ul className="list-disc list-inside text-sm pl-2 mt-2">
            <li>Use the manual download buttons below each file.</li>
            <li className="text-orange-600">Use Opera (suggested) or different browser if site not working.</li>
            <li>For small multiple files, upload them as a ZIP archive.</li>
            <li>Try new session.</li>
            <li>Large files (~500MB+) are streamed directly to disk.</li>
          </ul>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 pb-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full text-zinc-400 py-8">
            <File className="w-8 h-8 mb-2" />
            <span className="text-sm">No items yet</span>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.transferId}
              className="w-56 flex-shrink-0 rounded-2xl border border-zinc-200 bg-white shadow hover:shadow-md transition p-4 flex flex-col"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                  <File className="w-5 h-5 text-zinc-600" />
                </div>
                <span
                  className="text-sm font-medium text-zinc-900 text-center truncate w-full"
                >
                  {item.file?.name || item.name || item.directoryPath}
                </span>
                <div className="w-full bg-zinc-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-width duration-300"
                    style={{ width: `${item.progress || 0}%` }}
                  />
                </div>
                <div className="w-full flex justify-between text-xs text-zinc-500 mt-1">
                  <span>{item.progress}%</span>
                  <span>{statusLabels[item.status] || item.status}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-center gap-3">
                {reciver ? (
                  <>
                  {item.status !== "done" && item.status !== "canceled" && (
                    <button
                      className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition"
                      onClick={() => cancelTransfer && cancelTransfer(item.transferId)}
                      title="Cancel"
                      >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  { item.status === "done" && item.status !== "canceled"  && item.downloaded ? 
                  
                  <p className="text-xs font-bold text-zinc-500 text-mono">
                     Already downloaded or is in disk.
                  </p>
                  
                  
                  : <>
                  {item.status === "done" && item.status !== "canceled" && !autoDownload && item.blobUrl  &&  (
                    <button
                      className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-500 border border-blue-200 transition"
                      //@ts-ignore
                      onClick={() => fileDownload(item) }
                      title="Download"
                      >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  {item.status === "done" && item.status !== "canceled" && !autoDownload && item.blobUrl  &&  (
                    <button
                    className="p-2 rounded-full bg-yellow-50 hover:bg-yellow-100 text-yellow-500 border border-yellow-200 transition"
                    //@ts-ignore
                    onClick={() => openfile(item.blobUrl) }
                    title="open"
                    >
                      {/* TODO */}
                      {/* <Play className="w-4 h-4" /> */}
                    </button>
                  )}
                  </>}
                      </>
                ) : (
                  <>
                    {item.status === "paused" && (
                      <button
                        className="p-2 rounded-full bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 transition"
                        onClick={() => resumeTransfer && resumeTransfer(item.transferId)}
                        title="Resume"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {item.status === "sending" && (
                      <button
                        className="p-2 rounded-full bg-yellow-50 hover:bg-yellow-100 text-yellow-600 border border-yellow-200 transition"
                        onClick={() => pauseTransfer && pauseTransfer(item.transferId)}
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {item.status !== "done" && item.status !== "canceled" && (
                      <button
                        className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition"
                        onClick={() => cancelTransfer && cancelTransfer(item.transferId)}
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-zinc-100 rounded-2xl p-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="font-mono text-lg text-orange-600">{value}</span>
    </div>
  );
}

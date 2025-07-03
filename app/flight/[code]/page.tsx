"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Download,
  LogOut,
  ArrowUp,
  ArrowDown,
  Gauge,
  AlertTriangle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/badge";
import { useWebRTCContext } from "@/context/WebRTCContext";
import Image from "next/image";
import { MetricsSection } from "@/components/room/MetricSection";
import { QueueTray } from "@/components/room/QueueTray";

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

  const router = useRouter();

  const [isSpinning, setIsSpinning] = useState(false);
  const [isLeft, setIsLeft] = useState(false);

  const {
    handleFileSelect,
    meta,
    leaveFlight,
    connectToFlight,
    cancelTransfer,
    recvQueue,
    queue,
    autoDownload,
    setAutoDownload,
    downloadFile,
    resumeTransfer,
    pauseTransfer,
    status,
    members,
    openFile,
    refreshNearby,
    inviteToFlight,
    nearByUsers,
    sendFeedback,
    flightId,
  } = useWebRTCContext();

  const handleLeave = () => {
    setIsLeft(true);
    leaveFlight();
    router.push("/");
  };
  useEffect(() => {
    if (!flight) return;

    if (flightId === flight) return;

    if (isLeft) return;

    const handleSwitch = () => {
      if (flightId && flightId !== flight) {
        const leave = confirm(
          `You are already in flight "${flightId}". Leave it and join "${flight}"?`
        );
        if (leave) {
          leaveFlight();
          connectToFlight(flight);
        } else {
          router.push(`/flight/${flightId}`);
        }
      } else {
        connectToFlight(flight);
      }
    };

    handleSwitch();
  }, [flight, flightId, connectToFlight, leaveFlight, router]);

  const handleRefresh = () => {
    setIsSpinning(true);
    refreshNearby();
    setTimeout(() => setIsSpinning(false), 500);
  };

  return (
    <main className="min-h-screen bg-gray-200 text-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white rounded-2xl shadow-xl p-6 sm:p-8 gap-6 mb-6 transition-all">
          {/* Left: Flight Info */}
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-wide flex items-center gap-2">
                FLIGHT
                <span className="bg-zinc-100  text-1xl  sm:text-3xl font-mono text-zinc-700 px-2 py-1 rounded-lg border border-zinc-200 ">
                  {flight}
                </span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
              <Badge
                color={
                  typeof status === "string" && status.includes("Connection")
                    ? "green"
                    : status.includes("Failed")
                    ? "red"
                    : "yellow"
                }
              >
                {status}
              </Badge>
              <Badge color="gray">
                {members.length} Member{members.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          {/* Right: Buttons */}
          <div className="flex flex-wrap md:flex-nowrap items-start sm:items-center justify-start md:justify-end gap-3 md:gap-6 w-full md:w-auto">
            {/* Share Button */}
            <div className="flex flex-col items-start sm:items-center">
              <button
                onClick={() => setShowQR((prev) => !prev)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md transition duration-200"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm">Invite</span>
              </button>
              <span className="text-xs hidden md:inline text-zinc-500 mt-1 sm:text-center">
                Show QR / Code
              </span>
            </div>

            {/* Leave Button */}
            <div className="flex flex-col items-start sm:items-center">
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold shadow-md transition duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden text-sm md:inline">Leave</span>
              </button>
              <span className="text-xs hidden md:inline text-zinc-500 mt-1 sm:text-center">
                Leave the flight
              </span>
            </div>
          </div>
        </header>

        {/* Share QR Popup */}
        {showQR && (
          <div className="fixed animate-fadeIn inset-0 bg-zinc-900/60 h-screen flex items-center justify-center z-50">
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

              <h2 className="text-xl font-bold text-zinc-900 mb-3 text-center">
                Share this Flight
              </h2>

              <div className="flex justify-center mb-4">
                <QRCodeSVG
                  value={
                    typeof window !== "undefined" ? window.location.href : ""
                  }
                  size={180}
                />
              </div>

              <div className="w-full flex flex-col items-center mb-2">
                <div className="flex items-center gap-2 w-full">
                  <input
                    className="flex-1 bg-zinc-100 rounded-lg px-2 py-1 text-sm font-mono border border-zinc-200 text-zinc-700"
                    value={
                      typeof window !== "undefined" ? window.location.href : ""
                    }
                    readOnly
                    onFocus={(e) => e.target.select()}
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
                <span className="text-xs text-zinc-500 mt-1">
                  Ask the reciver to join.
                </span>
              </div>
              {/* Scan to join */}
              <p className="mt-2 text-sm text-zinc-600 text-center">
                Scan QR or share the link to join this flight.
              </p>
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
          <div className="col-span-1  lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center justify-center">
            <div
              className="w-full h-52  flex flex-col items-center justify-center border-2 border-dashed border-orange-400 rounded-2xl bg-white hover:bg-orange-50 transition cursor-pointer p-6 text-center"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = Array.from(e.dataTransfer.files);
                handleFileSelect({ target: { files } } as any);
              }}
            >
              <Folder className="w-12 h-12 text-orange-500 mb-3" />
              <p className="text-lg font-semibold text-zinc-800">
                Drag & Drop files or folders
              </p>
              <span className="mt-1 text-sm text-zinc-500">
                or select manually
              </span>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <label className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5 py-2 cursor-pointer flex items-center gap-2 text-sm font-medium transition">
                  <File className="w-4 h-4" />
                  <span>Select Files</span>
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={handleFileSelect}
                  />
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
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Users Panel */}
          <div className="bg-white rounded-3xl shadow-sm p-5 max-h-76 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-zinc-800">
                  {members.length <= 1 ? "Nearby Users" : "In Flight"}
                </h2>
              </div>
              {members.length <= 1 && (
                <button
                  onClick={handleRefresh}
                  className="p-2 rounded-full hover:bg-zinc-100 transition"
                  title="Refresh"
                >
                  <RefreshCwIcon
                    className={`w-5 h-5 ${
                      isSpinning ? "animate-spin" : "transition-transform"
                    }`}
                  />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3  overflow-y-auto">
              {(members.length <= 1 ? nearByUsers : members).length === 0 ? (
                <div className="text-zinc-400 text-sm text-center py-6">
                  {members.length <= 1 ? "No nearby users" : "No members"}
                </div>
              ) : (
                (members.length <= 1 ? nearByUsers : members).map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      members.length <= 1 && inviteToFlight(m, flight)
                    }
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 border border-zinc-200 hover:border-orange-400 hover:bg-orange-50 transition bg-white text-left"
                    title={
                      members.length <= 1 ? `Connect to ${m.name}` : m.name
                    }
                  >
                    <User className="w-6 h-6 text-orange-500 bg-orange-100 rounded-full p-1" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium text-zinc-900 truncate">
                        {m.name}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono truncate">
                        ID: {m.id}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Queue Preview under Upload */}
        <div className="mt-6 w-full space-y-6">
          <QueueTray
            title="Sending Queue"
            items={queue}
            pauseTransfer={pauseTransfer}
            resumeTransfer={resumeTransfer}
            cancelTransfer={cancelTransfer}
            reciver={false}
          />
          <QueueTray
            title="Receiver Queue"
            setAutoDownload={setAutoDownload}
            autoDownload={autoDownload}
            openfile={openFile}
            fileDownload={downloadFile}
            items={recvQueue}
            cancelTransfer={cancelTransfer}
            reciver={true}
          />
        </div>

        {/* Metrics and Info */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MetricsSection meta={meta} />
          <div className="relative bg-white rounded-3xl shadow-md p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Heart className="w-8 h-8 text-zinc-400" />
                <h3 className="text-2xl font-bold">Love AirDelivery?</h3>
              </div>
              <p className="text-zinc-700 mb-4">
                If you enjoy using this app,{" "}
                <span className="font-semibold text-orange-500">share it</span>{" "}
                or install
              </p>
              <ul className="list-disc list-inside text-zinc-500 text-sm space-y-1 mb-4">
                <li>
                  <strong>Tip:</strong> Connect both devices on the same network
                  for optimal speed.
                </li>
                <li>
                  <strong>Note:</strong> Avoid refreshing after connection is
                  established.
                </li>
                <li>
                  <strong className="text-red-400">IMP:</strong> Use Opera
                  (suggested) or different browser if site not working.
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
                  if (
                    typeof window !== "undefined" &&
                    window.matchMedia("(display-mode: standalone)").matches
                  ) {
                    alert("Already installed!");
                  } else {
                    alert(
                      "Tip: Install this app from browser menu for quick access."
                    );
                  }
                }}
              >
                Install
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}




"use client";

import { ExternalLink, InfoIcon } from "lucide-react";
import React, { useState } from "react";
import FeedbackPopup from "./Feedback";
import { useRouter } from "next/navigation";

const aboutInfo = [
  {
    title: "What is Air Delivery?",
    content:
      "Air Delivery is a free, streamlined web app for fast, private file sharing. It uses peer-to-peer (P2P) technology to transfer files directly between devices — no uploads, no intermediaries, just speed and privacy.",
  },
  {
    title: "How do I use it?",
    content: (
      <>
        <p><strong>Same network:</strong> Open Air Delivery on both devices connected to the same Wi-Fi. They’ll auto-detect each other. Drop files and send.</p>
        <p className="mt-2"><strong>Different networks:</strong> Use a <b>Flight Code</b>, <b>QR</b>, or <b>link</b> to connect. (Note: Some connections may be slower due to TURN server limitations.)</p>
      </>
    ),
  },
  {
    title: "Security & Privacy",
    content:
      "Files are end-to-end encrypted using WebRTC. Nothing is stored or routed through any server — transfers happen directly between devices.",
  },
  {
    title: "Development Status",
    content:
      "This is the initial release. Expect some bugs. New features and improvements are in progress — your feedback matters!",
  },
  {
    title: "Is it Open Source?",
    content:
      "Not yet. Air Delivery is a handcrafted experience, optimized for privacy and speed.",
  },
  {
    title: "Feedback & Support",
    content:
      "Found a bug? Got an idea? Reach out! Every bit of feedback helps shape the future of Air Delivery.",
  },
];

export default function AboutCard() {
  const [open, setOpen] = useState(false);

  const router = useRouter();
  return (
    <div>
      <button
        aria-label="About Air Delivery"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-zinc-300 hover:text-orange-500 transition-colors"
      >
        How it works?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 m-4 mt-20 shadow-2xl text-zinc-800 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-2xl text-zinc-400 hover:text-zinc-700 transition"
            >
              &times;
            </button>

            

            <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">
              Air Delivery
            </h2>
            <p className="text-sm text-zinc-500 mb-4">
            A fast, private way to share files .
            </p>
              <button
            onClick={() => router.push('/guide/p2p-file-sharing')}
            aria-label="Close"
            className="  text-orange-500 flex gap-1 mb-2 hover:text-orange-700"
          >
            <ExternalLink className="w-4" />
           Go to detailed guide
          </button>

            <div className="space-y-5 text-sm md:text-base leading-relaxed">
              {aboutInfo.map(({ title, content }) => (
                <div key={title}>
                  <h3 className="font-semibold text-zinc-800 mb-1">{title}</h3>
                  <div className="text-zinc-600">{content}</div>
                </div>
              ))}

            <FeedbackPopup/>
            </div>
            
          </div>

        </div>
      )}
    </div>
  );
}

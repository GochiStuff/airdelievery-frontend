import { InfoIcon } from "lucide-react";
import React, { useState } from "react";

const aboutInfo = [
    {
        title: "What is Air Delivery?",
        content:
            "Air Delivery is a free, streamlined web app for fast, private file sharing. It leverages peer-to-peer (P2P) technology to transfer files directly between devices—no uploads to external servers, no intermediaries, just speed and privacy.",
    },
    {
        title: "How do I use it?",
        content: (
            <>
                <strong>On the same Wi-Fi or local network</strong>
                <br />
                Open Air Delivery on both devices connected to the same network. Devices will automatically detect each other. Simply drag and drop your files to start a direct, high-speed transfer.
                <br /><br />
                <strong>Across different networks</strong>
                <br />
                Please note: Due to current TURN server limitations, transfers across different networks may be unreliable or slow.
                <br />
                Connect with someone outside your network using a <b>Flight Code</b>, <b>QR code</b>, or <b>link</b>. Click the <b>+</b> button at the top right and follow the prompts to establish a secure connection, then send files as usual.
            </>
        ),
    },
    {
        title: "Security & Privacy",
        content:
            "Air Delivery uses end-to-end encrypted P2P connections powered by WebRTC. No file data or metadata is stored or routed through any server. Your files are transferred directly between devices—ensuring complete privacy and security.",
    },
    {
        title: "Development Status",
        content:
            "This is the initial release of Air Delivery. You may encounter minor bugs, and new features are actively being developed. Your feedback is welcome and helps improve the platform.",
    },
    {
        title: "Is it Open Source?",
        content:
            "Air Delivery is currently not open source. It’s a custom-built platform designed to provide the best P2P file-sharing experience on the web.",
    },
    {
        title: "Feedback & Support",
        content:
            "Have a suggestion or found a bug? Reach out to the developer—your input helps shape the future of Air Delivery.",
    },
];

export default function AboutCard() {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <button
                aria-label="About Air Delivery"
                onClick={() => setOpen(true)}
                className="hover:text-orange-500 text-zinc-100 rounded-full transition-colors"
            >
                <InfoIcon />
            </button>

            {/* Modal Card */}
            {open && (
                <div
                    className="fixed inset-0 z-100 flex items-start justify-center bg-black/30 overflow-auto"
                    style={{ paddingTop: "env(safe-area-inset-top, 24px)" }}
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-white rounded-xl max-w-2xl w-full p-8 shadow-lg relative mt-6 mx-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            aria-label="Close"
                            onClick={() => setOpen(false)}
                            className="absolute top-3 right-3 bg-transparent border-none text-2xl cursor-pointer text-zinc-400 hover:text-zinc-600"
                        >
                            &times;
                        </button>
                        <h2 className="mt-0 mb-4 text-2xl font-semibold tracking-tighter text-zinc-900">
                            Air Delivery
                        </h2>
                        <p className="mb-4 text-zinc-700">
                            Share it with friends and use it whenever you want!
                        </p>
                        <p className="text-sm text-zinc-600 mb-6">
                            ⚠️ This is an early release. You might run into minor bugs — many awesome features are on the way! 
                        </p>
                        <div className="text-base text-zinc-800">
                            {aboutInfo.map((section) => (
                                <div key={section.title} className="mb-5">
                                    <strong className="block">{section.title}</strong>
                                    <div className="mt-1">{section.content}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

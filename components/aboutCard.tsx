import { InfoIcon } from "lucide-react";
import React, { useState } from "react";

const aboutInfo = [
    {
        title: "What is Air Delivery?",
        content:
            "Air Delivery is a free, powerful, clutter-free web app for super fast and private file sharing. It uses peer-to-peer (P2P) technology to send files directly between devices — no uploads to any server, no middlemen, just raw speed and privacy.",
    },
    {
        title: "How to use it?",
        content: (
            <>
                <strong>📡 On the same Wi-Fi / local network</strong>
                <br />
                Open Air Delivery on both devices. Drag and drop your files directly onto the recipient’s avatar or click their avatar and pick the files you want to send. The recipient will be prompted to accept before the transfer starts.
                <br /><br />
                <strong>Across different networks</strong>
                <br />
                Click the <b>+</b> button on the top right and follow the instructions to connect. This will establish a secure WebRTC connection even across the internet.
            </>
        ),
    },
    {
        title: "Security & Privacy",
        content:
            "Air Delivery uses end-to-end encrypted peer-to-peer (P2P) connections powered by WebRTC. No file data or metadata is stored or sent through any server. Your files go **only** from your device to the recipient’s — completely private and secure.",
    },
    {
        title: "Development Status",
        content:
            "This is the **initial release** of Air Delivery — you may encounter minor bugs, and many powerful features are coming soon. It’s actively being developed by Yash Jangid.",
    },
    {
        title: "Open Source?",
        content:
            "Air Delivery is **not open source** at the moment. It’s a custom-built platform created with care to give you the best P2P file-sharing experience on the web.",
    },
    {
        title: "Feedback & Support",
        content:
            "Found a bug or have a suggestion? Feel free to contact the developer — your feedback helps shape the future of Air Delivery.",
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
                            ⚠️ This is an early release by <strong>Yash Jangid</strong>. You might run into minor bugs — many awesome features are on the way! 
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

import { InfoIcon } from "lucide-react";
import React, { useState } from "react";

const aboutInfo = [
    {
        title: "What is it?",
        content:
            "Airway is a free, open-source web app that allows you to easily and securely share files directly between devices without uploading them to any server first.",
    },
    {
        title: "How to use it?",
        content: (
            <>
                <strong>Sharing files between devices in a local network</strong>
                <br />
                To send a file to another device in the same local network, open this page on both devices. Drag and drop a file directly on another person's avatar or click the avatar and select the file you want to send. The file transfer will start once the recipient accepts the file.
                <br />
                <br />
                <strong>Sharing files between devices in different networks</strong>
                <br />
                To send a file to another device in a different network, click the <b>+</b> button in the upper right corner of the page and follow further instructions.
            </>
        ),
    },
    {
        title: "Security",
        content:
            "Airway uses a secure and encrypted peer-to-peer connection to transfer information about the file (its name and size) and file data itself. This means that this data is never transferred through any intermediate server but directly between the sender and recipient devices. To achieve this, Airway uses a technology called WebRTC (Web Real-Time Communication), which is provided natively by browsers.",
    },
    {
        title: "Feedback",
        content:
            "Got a problem with using Airway or a suggestion how to improve it? Report an issue on GitHub.",
    },
];

export default function AboutCard() {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <button
                aria-label="About Airway"
                onClick={() => setOpen(true)}
                className=" hover:text-orange-500 text-zinc-100 rounded-full "
            >
               <InfoIcon/>
            </button>

            {/* Modal Card */}
            {open && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(0,0,0,0.3)",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-white rounded-xl max-w-2xl p-8 shadow-lg relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            aria-label="Close"
                            onClick={() => setOpen(false)}
                            className="absolute top-3 right-3 bg-transparent border-none text-2xl cursor-pointer text-zinc-400 hover:text-zinc-600"
                        >
                            &times;
                        </button>
                        <h2 className="mt-0 mb-4 text-2xl font-semibold tracking-tighter text-zinc-900">Air Delivery</h2>
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
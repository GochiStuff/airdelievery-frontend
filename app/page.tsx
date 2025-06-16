"use client";

import { useState } from "react";
import { useSocket } from "@/hooks/socketContext";
import { useRouter } from "next/navigation";
import AboutCard from "@/components/aboutCard";

export default function MainPage() {
    const router = useRouter();
    const { socket } = useSocket();

    const [flightCode, setFlightCode] = useState<string>("");
    const [showJoinInput, setShowJoinInput] = useState(false);

    const handleCreate = () => {
        if (!socket) return;
        socket.emit("createFlight", (response: { code: string }) => {
            router.push(`/flight/${response.code}`);
        });
    };

    const handleJoin = () => {
        if (flightCode.trim()) {
            router.push(`/flight/${flightCode.trim()}`);
        }
    };

    return(
        <div
            className="relative flex  mb-10 flex-col md:flex-row items-center max-w-9xl mx-auto  justify-around min-h-screen overflow-hidden"
        >

            {/* Tagline background */}
                <div className="relative w-full md:w-auto">
                    <h1 className="text-6xl mt-15 md:mt-0 md:text-8xl font-extrabold drop-shadow-2xl select-none text-center md:text-left mb-8 md:mb-0 relative">
                        FAST. <br className="block" />PRIVATE. <br className="block" /> NO LIMIT.
                
                    </h1>
                </div>

{/* section 2 */}
            <div className=" flex flex-col gap-10 max-w-84">

         
        <div className="relative flex flex-col items-center  pt-24 rounded-3xl shadow-2xl text-zinc-900 bg-orange-600 min-h-[480px] w-full max-w-md transition-all overflow-hidden ticket-border">
     

            {/* Ticket Header */}
            <div className="flex flex-col items-center mb-6">
                <span className="uppercase tracking-widest text-xs font-bold text-zinc-100 opacity-70">Airdelivery.io</span>
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-100 mt-2 mb-1">Boarding Pass</h2>
                <span className="text-sm text-zinc-100 opacity-70">Your file transfer ticket</span>
            </div>

            {/* File and Folder Section */}
            <div className="flex flex-row space-x-4 w-full mb-2 px-8">
                <label 
                    className="flex flex-col flex-1 items-center text-zinc-700 px-8 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-100 font-semibold shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer ">
                    <span>File</span>
                    <input
                        type="file"
                        className="hidden"
                        multiple
                        onChange={handleCreate}
                    />
                </label>

                <label 
                    className="flex flex-col flex-1 items-center px-8 py-3 text-zinc-700 rounded-xl bg-zinc-100 hover:bg-zinc-100 font-semibold shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer ">
                    <span>Folder</span>
                    <input
                        type="file"
                        className="hidden"
                        // webkitdirectory="true"
                        // directory="true"
                        onChange={handleCreate}
                    />
                </label>
            </div>

            <p className="text-xs text-zinc-50 mb-0 tracking-tight uppercase font-mono">
                Select files or folder to send
            </p>

            {/* Divider - Ticket Perforation */}
   
            <div className=" w-full flex justify-between items-center h-8">
                <div className="w-8 h-8 bg-zinc-300 rounded-full -ml-4"></div>
                 <div className="flex-grow border-t-2 border-dashed border-zinc-200" />
                <span className="mx-4 text-zinc-50 font-semibold px-2 bg-orange-600 tracking-widest uppercase text-xs">
                    or
                </span>
                <div className="flex-grow border-t-2 border-dashed border-zinc-200" />
                <div className="w-8 h-8 bg-zinc-300 rounded-full -mr-4"></div>
            </div>

            {/* Receive Section with permanent input */}
            <div className="flex items-center w-full px-8 gap-2 mb-2">
                <input
                    type="text"
                    value={flightCode}
                    onChange={(e) => setFlightCode(e.target.value)}
                    placeholder="Flight Id"
                    className="px-6 py-3 rounded-2xl w-54 bg-zinc-100 outline-0 font-mono text-zinc-800 border border-zinc-300"
                />
                <button
                    onClick={handleJoin}
                    aria-label="Launch or Send"
                    className="p-3 rounded-2xl shadow-lg bg-zinc-900 hover:bg-zinc-800 transition">
                    {/* Paperplane SVG icon */}
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" >
                        <path
                            d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                            fill="#ffffff"
                        />
                    </svg>
                </button>
            </div>

            <p className="text-xs text-zinc-50 tracking-tight uppercase font-mono mb-4">
                Enter your flight code to receive
            </p>

        </div>

            <div className="   bg-zinc-900 bg-opacity-90 rounded-2xl shadow-2xl flex flex-col p-6 text-zinc-50">
                {/* Info button */}
                <div className="flex justify-end">
                    <AboutCard/>
                </div>
                <h2 className="text-3xl font-bold mb-2">Awesome</h2>
                <div className="text-lg text-zinc-100 mb-8 mr-20">
                    <p className="text-xl">P2P file sharing—no hassle, just send or receive.</p>
                </div>
                {/* Social icons */}
                <div className="flex justify-end space-x-4 mt-auto">
                    {/* GitHub */}
                    <a
                        href=""
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-100 hover:text-orange-400 transition"
                        title="GitHub"
                    >
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.49 2.87 8.3 6.84 9.64.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .26.18.57.69.47C19.13 20.55 22 16.75 22 12.26 22 6.58 17.52 2 12 2Z"/>
                        </svg>
                    </a>
                    {/* X (Twitter) */}
                    <a
                        href="https://x.com/gochistuff"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-100 hover:text-orange-400 transition"
                        title="X"
                    >
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.53 3H21l-7.19 8.21L22 21h-6.56l-5.18-6.44L4.47 21H1l7.64-8.73L2 3h6.68l4.74 5.91L17.53 3ZM16.3 19h2.13l-5.82-7.23-1.71 1.98L16.3 19ZM5.09 5l5.38 6.69 1.7-1.97L7.36 5H5.09Z"/>
                        </svg>
                    </a>
                </div>
            </div>
               </div>
        </div>
    );
}
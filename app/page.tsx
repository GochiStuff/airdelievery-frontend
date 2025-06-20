"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/socketContext";
import { useRouter } from "next/navigation";
import AboutCard from "@/components/aboutCard";
import { useInvitationToJoin } from "@/hooks/invitationToJoin";
import { getLocalIp } from "@/hooks/useWebRTCforIP";

export default function MainPage() {
    const router = useRouter();
    const { socket , user } = useSocket();

    const [flightCode, setFlightCode] = useState<string>("");

    const handleCreate = () => {
        if (!socket) return;
        socket.emit("createFlight", (response: { code: string }) => {
            router.push(`/flight/${response.code}`);
        });
    };

     const [ username , setUsername ] = useState<string>("");

     useEffect(()=> setUsername(user.name ?? ""), [user]);

    const handleJoin = () => {
        if (flightCode.trim()) {
            router.push(`/flight/${flightCode.trim()}`);
        }

    };


    useEffect( () => {
        getLocalIp( ip => {
            socket?.emit("registerLocalIp", { localIP : ip});
            console.log("SENDING IP ADDRESS");
        })
    }, [socket]);

    const invitationPop = useInvitationToJoin();

    return(
        <div
            className="relative flex  mb-10 flex-col md:flex-row items-center max-w-9xl mx-auto  justify-around min-h-screen overflow-hidden"
        >
            {invitationPop}

            {/* Tagline background */}
                <div className="relative w-full mt-10 md:w-auto flex md:block flex-col items-center md:items-start text-center md:text-left justify-center">
                <h1 className="text-6xl md:text-8xl font-extrabold drop-shadow-2xl select-none mb-2">
                    FAST.<br className="block" />
                    PRIVATE.<br className="block" />
                    NO LIMIT.
                </h1>

                <h2 className="text-lg md:text-xl text-zinc-600 font-medium mt-1 max-w-md">
                    Send files directly between devices. Instantly.
                </h2>

                <p className="mt-1 text-sm mb-4 text-zinc-400 max-w-md">
                    No cloud. No storage. Just you and the receiver—peer to peer.
                </p>
                </div>


{/* section 2 */}
            <div className=" flex flex-col gap-10 max-w-84">

         
        <div className="relative flex flex-col items-center  pt-24 rounded-3xl shadow-2xl text-zinc-900 bg-orange-600 min-h-[480px] w-full max-w-md transition-all overflow-hidden ticket-border">
     

            {/* Ticket Header */}
            <div className="flex flex-col items-center mb-6">
                <span className="uppercase tracking-widest text-xs font-bold text-zinc-100 opacity-70">airdelivery.site</span>
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-100 mt-2 mb-1">Boarding Pass</h2>
                <span className="text-sm text-zinc-100 opacity-70">Your file transfer ticket</span>
             
            </div>

            {/* File and Folder Section */}
            <div className="flex flex-row space-x-4 w-full mb-2 px-8">
                <label 
                    className="flex flex-col flex-1 items-center text-zinc-700 px-8 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-100 font-semibold shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer ">
                    <span>Start sending</span>
                    <button className="hidden" onClick={handleCreate}/>
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

               <h3 className="text-lg  absolute bottom-5 right-8 font-extrabold tracking-tight text-zinc-100 mt-2 -mb-3">- {username}</h3>

        </div>

            <div className="bg-zinc-900 rounded-xl shadow-xl p-4 md:p-5 text-zinc-200 text-sm md:text-base max-w-md w-full space-y-3">
  <h2 className="text-2xl font-bold text-white tracking-tight">About</h2>

  <p className="leading-relaxed text-zinc-400">
    <span className="text-white font-medium">Airdelivery</span> is a free, encrypted peer-to-peer file sharing tool.
    Files are sent directly between devices — no uploads, no cloud, just speed and privacy.
  </p>

  <div className="flex justify-between items-center mt-2">
    <AboutCard />

    <a
      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
        "Check out Airdelivery.io for fast, private, unlimited P2P file sharing! No hassle, just send or receive. #FileSharing #P2P #Airdelivery"
      )}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-zinc-50 hover:text-orange-400 transition"
      title="Share on Twitter"
    >
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.53 3H21l-7.19 8.21L22 21h-6.56l-5.18-6.44L4.47 21H1l7.64-8.73L2 3h6.68l4.74 5.91L17.53 3ZM16.3 19h2.13l-5.82-7.23-1.71 1.98L16.3 19ZM5.09 5l5.38 6.69 1.7-1.97L7.36 5H5.09Z"/>
      </svg>
    </a>
  </div>
</div>

               </div>
        </div>
    );
}
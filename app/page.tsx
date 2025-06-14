"use client"

import { useState } from "react";
import { useSocket } from "@/hooks/socketContext";
import { useRouter } from "next/navigation";

export default function MainPage() {
    const router = useRouter();
    const { socket } = useSocket();

    const [flightCode, setFlightCode] = useState<string>("");

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
        <div className="flex flex-col items-center p-6 space-y-6">
            <h1 className="text-4xl font-semibold">Flights</h1>

            <div className="flex space-x-4">
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 font-semibold text-gray-100 bg-blue-600 rounded hover:bg-blue-500">
                    Create flight
                </button>

                <input
                    type="text"
                    value={flightCode}
                    onChange={(e) => setFlightCode(e.target.value)}
                    placeholder="Enter flight code"
                    className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                    onClick={handleJoin}
                    className="px-4 py-2 font-semibold text-gray-100 bg-green-600 rounded hover:bg-green-500">
                    Join flight
                </button>
            </div>
        </div>
    )
}

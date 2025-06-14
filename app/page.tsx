"use client"

import { useState } from "react";
import { useSocket } from "@/hooks/socketContext";
import { useRouter } from "next/navigation";

export default function MainPage() {
    const router = useRouter()
    const {socket} = useSocket();

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

    return (
        <div style={{ padding: "20px" }}>
            <h1>Flights</h1>
            <button onClick={handleCreate}>
                Create flight
            </button>

            <div style={{ marginTop: "20px" }}>
                <input
                    type="text"
                    value={flightCode}
                    onChange={(e) => setFlightCode(e.target.value)}
                    placeholder="Enter flight code"
                />
                <button onClick={handleJoin}>
                    Join flight
                </button>
            </div>
        </div>
    )
}

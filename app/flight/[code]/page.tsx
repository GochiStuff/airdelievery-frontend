"use client"

import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/hooks/socketContext";
import { useParams } from "next/navigation";

// STUN servers configuration
const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }]};

export default function RoomPage() {
    const { socket } = useSocket();
    const { code } = useParams();

    const [flightCode] = useState<string>(typeof code === "string" ? code : "");
    const [status, setStatus] = useState<string>("Connecting...");
    const [members, setMembers] = useState<string[]>([]);
    const [ownerId, setOwnerId] = useState<string>("");

    // WebRTC related
    const peer = useRef<RTCPeerConnection | null>(null);
    const dataChannel = useRef<RTCDataChannel | null>(null);
    const [isOwner, setIsOwner] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        if (!socket) return;

        if (!flightCode) {
            setStatus("Invalid room.");
            return;
        }
        
        socket.emit("joinFlight", flightCode, (response: { success: boolean; message?: string }) => {
            if (response.success) {
                setStatus("Connected to room.");
            } else {
                setStatus(`Failed to connect: ${response?.message || "Unknown error"}`);
            }
        });

        socket.on("flightUsers", (payload: { ownerId: string; members: string[]; ownerConnected: boolean }) => {
            setOwnerId(payload.ownerId);
            setMembers(payload.members);
            setStatus("Connected to room.");
            setIsOwner(socket?.id === payload.ownerId);
        });

        socket.on("roomClosed", () => {
            setStatus("Room closed by owner.");
        });

        // Handle WebRTC signals
        socket.on("offer", async ({ from, sdp }) => {
            if (isOwner) return; // owner's not supposed to respond
            peer.current = new RTCPeerConnection(configuration);
            peer.current.ondatachannel = (event) => {
                dataChannel.current = event.channel;
                dataChannel.current.onmessage = (msgEvent) => {
                    console.log("Received file:", msgEvent.data);
                    // Handle downloaded file here
                };
            };
            peer.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket?.emit("ice-candidate", { to: from, candidate: event.candidate });
                }
            };
            await peer.current.setRemoteDescription(sdp);
            const answer = await peer.current.createAnswer();
            await peer.current.setLocalDescription(answer);
            socket?.emit("answer", { to: from, sdp: answer });
        });

        socket.on("answer", async ({ sdp }) => {
            if (!isOwner) return;
            await peer.current?.setRemoteDescription(sdp);
        });

        socket.on("ice-candidate", async ({ candidate }) => {
            if (peer.current && candidate) {
                await peer.current.addIceCandidate(new RTCIceCandidate(candidate));  
            }
        });

        return () => {
            socket?.off("flightUsers");
            socket?.off("roomClosed");

            socket?.off("offer");
            socket?.off("answer");
            socket?.off("ice-candidate");

            peer.current?.close();
        };
    }, [socket, flightCode]);

    // Handle file select
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] || null);
    };

    // Handle sending file
    const sendFile = async () => {
        if (!isOwner) return;

        peer.current = new RTCPeerConnection(configuration);
        dataChannel.current = peer.current.createDataChannel("file");

        peer.current.onicecandidate = (event) => {
            if (event.candidate) {
                // Send ICE candidate to recipient
                // Here we need first a recipient; for simplicity we take first non-owner
                const recipient = members.find(id => id !== ownerId);
                if (recipient) {
                    socket?.emit("ice-candidate", { to: recipient, candidate: event.candidate });
                }
            }
        };
        
        await peer.current.setLocalDescription(await peer.current.createOffer());

        // Send the offer to the first recipient
        const recipient = members.find(id => id !== ownerId);
        if (recipient && peer.current?.localDescription) {
            socket?.emit("offer", { to: recipient, sdp: peer.current?.localDescription });
        }
        
        dataChannel.current.onopen = () => {
            console.log("DataChannel opened.");
            if (file) {
                file.arrayBuffer()
                    .then((arrayBuffer) => {
                        dataChannel.current?.send(arrayBuffer);
                        console.log("File sent.");
                    })
                    .catch(err => console.error(err));  
            }
        };
    };

    return (
        <div style={{ padding: "20px" }}>
            <h1>Room</h1>
            <p>{status}</p>
            {status === "Connected to room." && (
                <>
                    <p>Flight Code: {flightCode}</p>
                    <ul>
                        {members?.map((u, i) => (
                            <li key={i}>
                                {u} {u === ownerId && <strong>(Owner)</strong>}
                            </li>
                        ))}
                    </ul>

                    {isOwner && (
                        <>
                            <input type="file" onChange={handleFile} />
                            <button disabled={!file} onClick={sendFile}>
                                Send File
                            </button>
                        </>
                    )}

                    {!isOwner && <p>Waiting for the sender...</p>}
                </>
            )}

        </div>
    )
}

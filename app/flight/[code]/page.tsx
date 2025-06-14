"use client"

import { useEffect, useState, useRef, ChangeEvent } from "react";
import { useSocket } from "@/hooks/socketContext";
import { useParams } from "next/navigation";

// Types
type FileTransfer = { file: File; progress: number; transferId: string;};

export default function RoomPage() {
    const { socket } = useSocket();
    const { code } = useParams();

    const [flightCode] = useState<string>(typeof code === "string" ? code : "");
    const [status, setStatus] = useState<string>("Connecting...");
    const [members, setMembers] = useState<string[]>([]);
    const [ownerId, setOwnerId] = useState<string>("");

    // WebRTC
    const peer = useRef<RTCPeerConnection | null>(null);
    const dataChannel = useRef<RTCDataChannel | null>(null);
    const filesToSend = useRef<FileList | undefined>(undefined);
    const [transfers, setTransfers] = useState<FileTransfer[]>([]); // files progress
    
    // Logs
    const [logs, setLogs] = useState<string[]>([]);

    function addLog(log: string) {
        setLogs((prev) => [...prev, `${new Date().toISOString()} - ${log}`]);
    }
    

    // Handle file select
    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        filesToSend.current = e.target.files || undefined;
    }
    

    // Send files
    const sendFiles = () => {
        if (dataChannel.current?.readyState !== "open") {
            addLog("DataChannel not opened.");
            return;
        }
        if (!filesToSend.current) {
            addLog("No files to send.");
            return;
        }
        for (const file of filesToSend.current) {
            sendFile(file);
        }
    }
    

    // Send a single file
    const sendFile = (file: File) => {
        addLog(`Starting transfer of ${file.name}`);

        const CHUNK_SIZE = 16 * 1024;
        let offset = 0;

        setTransfers((prev) => [...prev, { file, progress: 0, transferId: Math.random().toString(36) }]);
        const transferId = Math.random().toString(36);
        setTransfers((prev) => [...prev, { file, progress: 0, transferId }]);

        const fileReader = new FileReader();

        fileReader.onload = (e) => {
            if (e.target?.result) {
                // Send metadata first
                dataChannel.current?.send(JSON.stringify({ transferId, fileName: file.name, fileSize: file.size }));

                const arrayBuffer = e.target.result as ArrayBuffer;

                let bytesSent = 0;

                while (offset < arrayBuffer.byteLength) {
                    const chunk = arrayBuffer.slice(offset, offset + CHUNK_SIZE);
                    dataChannel.current?.send(chunk);
                    offset += CHUNK_SIZE;
                    bytesSent += chunk.byteLength;

                    setTransfers((prev) =>
                        prev.map((t) =>
                            t.transferId === transferId
                                ? { ...t, progress: Math.round((bytesSent / file.size) * 100) }
                                : t
                        )
                    );
                }
                
                addLog(`${file.name} successfully sent.`);
            }
        };
        fileReader.onerror = (err) => {
            addLog(`Error reading file ${file.name}: ${err}`);
        };
        fileReader.readAsArrayBuffer(file);
    }
    

    // Handle messages
    const handleMessage = (event: MessageEvent) => {
        addLog("Received message.");

        if (typeof event.data === "string") {
            try {
                const metadata = JSON.parse(event.data);
                if (metadata?.fileName && metadata?.fileSize) {
                    addLog(`Initiating reception of ${metadata.fileName}`);

                    (dataChannel as any).currentFile = {
                        fileName: metadata.fileName,
                        fileSize: metadata.fileSize,
                        buffers: [],
                        received: 0,
                    };
                }
            } catch (err) {
                addLog("Non-JSON message.");
            }
        }
        else if (event.data instanceof ArrayBuffer) {
            const current = (dataChannel as any).currentFile;
            if (current) {
                current.buffers.push(event.data);
                current.received += event.data.byteLength;

                if (current.received >= current.fileSize) {
                    // Combine into Blob
                    const blob = new Blob(current.buffers);
                    addLog(`Received complete file ${current.fileName}`);

                    // Download
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = current.fileName;
                    a.click();

                    (dataChannel as any).currentFile = undefined;
                }
            }
        }
    }
    

    // Handle signaling
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

        socket.on("flightUsers", (payload: { ownerId: string; members: string[] }) => {
            setOwnerId(payload.ownerId);
            setMembers(payload.members);
        });

        // Handle signaling messages
        socket.on("offer", async ({  ownerId , sdp }) => {
            addLog("Received offer.");

            peer.current = new RTCPeerConnection({
                iceServers: [{urls:'stun:stun.l.google.com:19302'}] 
            });
            console.log(sdp)

            peer.current.ondatachannel = (event) => {
                dataChannel.current = event.channel;
                dataChannel.current?.addEventListener("message", handleMessage);
            };
            peer.current.onicecandidate = (e) => {
                if (e.candidate) {
                    socket.emit("ice-candidate", {  code ,candidate: e.candidate });
                }
            };

            // set remote 
            await peer.current.setRemoteDescription(sdp.sdp);

            //create answer 
            const answer = await peer.current.createAnswer();

            // set local 
            await peer.current.setLocalDescription(answer);
            console.log("sending answer")
            // send back 
            socket.emit("answer",  code , { sdp: answer });
        });

        socket.on("answer", async ({ from , sdp }) => {
            console.log( sdp)
            addLog("Received answer.");
            await peer.current?.setRemoteDescription(sdp);
            console.log("local description set . ")
        });

        socket.on("ice-candidate", async ({ candidate }) => {
            addLog("Received ICE.");
            if (peer.current) {
                await peer.current.addIceCandidate(new RTCIceCandidate(candidate));  
            }
        });

        return () => {
            socket.off("flightUsers");
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");

            peer.current?.close();
        };
    }, [socket]);

    // If you are owner, create peer immediately
    useEffect(() => {
        if (socket && flightCode && socket.id && socket.id === ownerId) {
            addLog("Creating peer as sender.");

            peer.current = new RTCPeerConnection({
                iceServers: [{urls:'stun:stun.l.google.com:19302'}] 
            });

            dataChannel.current = peer.current.createDataChannel("fileTransfer");
            
            console.log("Sender peer")

            dataChannel.current?.addEventListener("open", () => console.log("DataChannel opened."));

            dataChannel.current?.addEventListener("message", handleMessage);
            dataChannel.current?.addEventListener("error", (e) => addLog(`DataChannel Error: ${e}`));

            peer.current.onicecandidate = (e) => {
                if (e.candidate) {
                    socket.emit("ice-candidate", {  code , candidate: e.candidate });
                }
            };
            (async () => {
                const offer = await peer.current?.createOffer();
                await peer.current?.setLocalDescription(offer);
                socket.emit("offer", code ,  { sdp: offer });
            })();

        }
    }, [socket, ownerId]);

    return (
        <div style={{ padding: "20px" }}>
            <h1>Room</h1>
            <p>{status}</p>
            {status === "Connected to room." && (
                <>
                    <p>Flight Code: {flightCode}</p>

                    <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                    />
                    <br />
                    <button onClick={sendFiles}>
                        Send files
                    </button>

                    <ul>
                        {transfers?.map((t, i) => (
                            <li key={i}>
                                {t.file.name} - {t.progress}%
                            </li>
                        ))}
                    </ul>

                    <h3>Logs</h3>
                    <ul>
                        {logs?.map((msg, i) => (<li key={i}>{msg}</li>))}
                    </ul>
                </>
            )}

        </div>
    )
}


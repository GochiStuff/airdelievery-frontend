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
    const candidateBuffer = useRef<any[]>([]);
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
        if (!peer.current) return;

        const ice = new RTCIceCandidate(candidate);
        if (peer.current.remoteDescription) {
            try {
            await peer.current.addIceCandidate(ice);
            addLog("Added ICE candidate immediately.");
            } catch (e) {
            console.error("Error adding ICE candidate:", e);
            }
        } else {
            candidateBuffer.current.push(candidate);
            addLog("Buffered ICE candidate because remoteDescription not set.");
        }
        });

        // After setting remoteDescription (in offer/answer handlers):
        if (peer.current) {
            // You need to provide the correct argument to setRemoteDescription here.
            // Example: await peer.current.setRemoteDescription(remoteDescription);
            // For now, this is a placeholder and should be replaced with actual logic.
            // await peer.current.setRemoteDescription(remoteDescription);
            addLog("Remote description set, flushing buffered ICE...");
        }

        // flush buffer
        (async () => {
            for (const cand of candidateBuffer.current) {
                try {
                    if (peer.current) {
                        await peer.current.addIceCandidate(new RTCIceCandidate(cand));
                        addLog("Flushed ICE candidate.");
                    } else {
                        addLog("Cannot flush ICE candidate: peer connection is null.");
                    }
                } catch (e) {
                    console.error("Error flushing ICE candidate:", e);
                }
            }
            candidateBuffer.current = [];
        })();


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

            function resetPeer() {
                if (peer.current) {
                    peer.current.onicecandidate = null;
                    peer.current.ondatachannel = null;
                    peer.current.close();
                    peer.current = null;
                }
                candidateBuffer.current = [];
                

            }
        


            dataChannel.current?.addEventListener("open", () => console.log("DataChannel opened."));

            dataChannel.current?.addEventListener("message", handleMessage);
            dataChannel.current?.addEventListener("error", (e) => addLog(`DataChannel Error: ${e}`));
            peer.current?.addEventListener('connectionstatechange', () => {
            if (peer.current?.connectionState === 'disconnected') {
                console.log('Peer disconnected. Resetting…');
                resetPeer();
            }

          });

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
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">File Transfer Room</h1>
          <p className="mt-1 ">Code: <span className="font-mono bg-gray-100 p-1 rounded">{flightCode}</span></p>
        </div>
        <div>
          <span className={
            `px-3 py-1 rounded-full text-sm font-semibold \${
              status.includes("Connected") ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`
          }>{status}</span>
        </div>
      </header>

      <section className=" shadow rounded p-4 space-y-4">
        <div className="flex items-center space-x-4">
          <input
            type="file"
            id="fileInput"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="fileInput" className="cursor-pointer bg-blue-600  px-4 py-2 rounded hover:bg-blue-700">
            Choose Files
          </label>
          <button
            onClick={sendFiles}
            className="bg-green-600  px-4 py-2 rounded hover:bg-green-700"
          >
            Send
          </button>
        </div>
        <div className="space-y-2">
          {transfers.map((t) => (
            <div key={t.transferId} className="p-2  rounded">
              <div className="flex justify-between">
                <span className="font-medium">{t.file.name}</span>
                <span className="text-sm ">{t.progress}%</span>
              </div>
              <progress value={t.progress} max={100} className="w-full h-2 mt-1" />
            </div>
          ))}
        </div>
      </section>

      <section className=" shadow rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Logs</h2>
        <div className="h-48 overflow-y-auto  p-2 rounded font-mono text-sm">
          {logs.map((msg, i) => <div key={i} className="mb-1">{msg}</div>)}
        </div>
      </section>
    </div>
  );
}

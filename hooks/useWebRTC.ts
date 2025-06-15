
import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/socketContext";

type Candidate = RTCIceCandidateInit;

export function useWebRTC(
  code: string,
  onMessage: (e: MessageEvent) => void,
  addLog: (msg: string) => void
) {
  const { socket } = useSocket();
  const peer = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const [status, setStatus] = useState("Connecting...");
  const [members, setMembers] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");

  function log(msg: string) {
    addLog(msg);
    setStatus(prev => prev);
  }

  useEffect(() => {
    if (!socket) return;
    if (!code) {
      log("Invalid room code.");
      return;
    }

    socket.emit("joinFlight", code, (resp: { success: boolean; message?: string }) => {
      log(resp.success ? "Joined signaling server." : `Join failed: ${resp.message}`);
    });

    socket.on("flightUsers", ({ ownerId: oid, members: m }) => {
      setOwnerId(oid);
      setMembers(m);
      log(`Members: ${m.length}`);
    });

    // Receiver side
    socket.on("offer", async (ownerId , {  sdp }) => {
      log("Received offer.");
      peer.current = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peer.current.ondatachannel = e => {
        console.log("DATA CANNEL")
        dataChannel.current = e.channel;
        dataChannel.current.addEventListener("message", onMessage);
      };
      peer.current.onicecandidate = e => {
        console.log("SENDTOOWNSER"  , ownerId);
        if (e.candidate) socket.emit("ice-candidate", { id : ownerId, candidate: e.candidate });
      };
      await peer.current.setRemoteDescription(sdp.sdp);
      const answer = await peer.current.createAnswer();
      await peer.current.setLocalDescription(answer);
      socket.emit("answer", code, { sdp: answer });
      log("Answer sent.");
    });

    // Sender side answer
    socket.on("answer", async ({ sdp }) => {
      log("Received answer.");
      await peer.current?.setRemoteDescription(sdp);
    });

    // ICE candidates
    socket.on("ice-candidate", async ({ candidate }: { candidate: Candidate }) => {
      log("Incoming ICE.");
      if (peer.current?.remoteDescription) {
        await peer.current.addIceCandidate(new RTCIceCandidate(candidate));
      }

      log("CONNECTION COMPLETE");
    });





    return () => {
      socket.off("flightUsers");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      peer.current?.close();
    };
  }, [socket, code]);

  // Sender initialization
  useEffect(() => {
    if (!socket || socket.id !== ownerId) return;
    log("Initializing sender.");
    peer.current = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    dataChannel.current = peer.current.createDataChannel("fileTransfer");
    dataChannel.current.addEventListener("open", () => log("DataChannel open."));
    dataChannel.current.addEventListener("message", onMessage);
    peer.current.onicecandidate = e => {
    if (e.candidate && members.length > 0) {
        members.forEach(memberId => {
            if (memberId !== socket.id) {
                console.log("SEND TO CLIENT", memberId);
                socket.emit("ice-candidate", { id: memberId, candidate: e.candidate });
            }
        });
    }
    };
    (async () => {
      const offer = await peer.current!.createOffer();
      await peer.current!.setLocalDescription(offer);
      socket.emit("offer", code, { sdp: offer });
      log("Offer sent.");
    })();
  }, [socket, ownerId]);

  return { dataChannel: dataChannel.current, status, members };
}

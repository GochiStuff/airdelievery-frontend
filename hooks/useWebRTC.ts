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

  // Buffer ICE until we have a remoteDescription
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([]);

  function log(msg: string) {
    addLog(msg);
    setStatus(msg);
  }

  function createPeer(id: string) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

    pc.ondatachannel = e => {
      dataChannel.current = e.channel;
      e.channel.onmessage = onMessage;
      e.channel.onopen = () => log("DataChannel opened.");
    };

    pc.onicecandidate = e => {
      if (e.candidate && socket?.id) {
        socket?.emit("ice-candidate", { id, candidate: e.candidate });
      }
    };
    return pc;
  }

  function restartPeer(id: string) {
    if (peer.current) {
      peer.current.close();
    }
    peer.current = createPeer(id);
    dataChannel.current = null;
    queuedCandidates.current = [];

    if (socket?.id === ownerId) {
      // If sender, restart by creating a new offer
      initiateSender(id);
    }
  }

  async function initiateSender(id: string) {
    if (!peer.current) return;

    dataChannel.current = peer.current.createDataChannel("fileTransfer");

    dataChannel.current.onopen = () => log("DataChannel opened.");
    dataChannel.current.onmessage = onMessage;

    const offer = await peer.current.createOffer();
    await peer.current.setLocalDescription(offer);
    socket?.emit("offer", code, { sdp: offer });

    log("Offer sent.");
  }

  // Handle when we get an offer (receiver side).
  async function handleOffer(id: string, sdp: RTCSessionDescriptionInit) {
    peer.current = createPeer(id);
    await peer.current.setRemoteDescription(sdp);
    const answer = await peer.current.createAnswer();
    await peer.current.setLocalDescription(answer);
    socket?.emit("answer", code, { sdp: answer });

    log("Answer sent.");
  }

  // Handle when we get an answer (sender side).
  async function handleAnswer(sdp: RTCSessionDescriptionInit) {
    if (peer.current) {
      await peer.current.setRemoteDescription(sdp);
      // Drain queued ICE
      queuedCandidates.current.splice(0).forEach(candidate => {
        peer.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(log);
      });
      log("Remote description set.");
    }
  }

  // Handle ICE candidate messages
  async function handleIce(id: string, candidate: Candidate) {
    if (peer.current?.remoteDescription) {
      await peer.current.addIceCandidate(new RTCIceCandidate(candidate));  
      log("Added ICE candidate.");
    } else {
      queuedCandidates.current.push(candidate);
      log("Buffered ICE candidate.");
    }
  }

  useEffect(() => {
    if (!socket) return;

    if (!code) {
      log("Invalid room code.");
      return;
    }
    socket.emit("joinFlight", code, (resp: { success: boolean; message?: string }) => {
      if (resp.success) {
        log("Joined signaling.");
      } else {
        log(`Failed to join: ${resp.message}`);
      }
    });

    socket.on("flightUsers", ({ ownerId: oid, members: m }) => {
      setOwnerId(oid);
      setMembers(m);
      log(`Members in room: ${m.length}`);

      if (socket?.id === oid && !peer.current) {
        // Initiate as sender
        peer.current = createPeer(oid);
        initiateSender(oid);
      }
    });

    socket.on("offer", async (id, { sdp }) => {
      await handleOffer(id, sdp.sdp);
    });

    socket.on("answer", async ({ sdp }) => {
      await handleAnswer(sdp);
    });

    socket.on("ice-candidate", async ({ candidate, id }) => {
      await handleIce(id, candidate);
    });

    return () => {
      socket.off("flightUsers");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");

      if (peer.current) {
        peer.current.close();
        peer.current = null;
      }
    };
  }, [socket, code]);

  return { 
    dataChannel: dataChannel.current, 
    status, 
    members, 
    restartPeer 
  };
}

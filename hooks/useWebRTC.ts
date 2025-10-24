import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/context/socketContext";
import { useRouter } from "next/navigation";

type Candidate = RTCIceCandidateInit;

function userMessage(msg: string) {
  // Map internal log messages to a more user-friendly status string, this is helpfull when Debugging  + user friendly at the same time .
  if (msg.includes("DataChannel opened")) return "Connection established";
  if (msg.includes("Connected")) return "Connection established";
  if (msg.includes("Offer sent")) return "Ready to connect";
  if (msg.includes("Answer sent")) return "Offer accepted...";
  if (msg.includes("Remote description set")) return "finalizing...";
  if (msg.includes("Added ICE candidate")) return "Connection improved";
  if (msg.includes("Buffered ICE candidate")) return "Connecting ...";
  if (msg.includes("Joined signaling")) return "Joined room, waiting";
  if (msg.includes("Failed to join")) return "Failed to join room";
  if (msg.includes("Invalid room code")) return "Invalid room code";
  if (msg.includes("Failed to add ICE candidate")) return "Connection Failed";
  return msg;
}

type Member = {
  id: string;
  name: string;
};

export function useWebRTC(onMessage: (e: MessageEvent) => void) {
  const isDebug = true;
  const [flightCode, setFlightCode] = useState<string | null>(null);
  const { socket } = useSocket();
  const peer = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const [status, setStatus] = useState("Connecting...");
  const [members, setMembers] = useState<Member[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");
  const [nearByUsers, setNearByUsers] = useState<Member[]>([]);
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([]);
  const queuedOwnerCandidates = useRef<RTCIceCandidateInit[]>([]); 

  // HELPERS 
  function connectToFlight(code: string) {
    if (isDebug) console.log("DEBUG: connectToFlight called with code:", code);
    setFlightCode(code);
  }

  function log(msg: string) {
    const friendly = userMessage(msg);
    if (isDebug) console.log(`DEBUG: log() called. Raw: "${msg}", Friendly: "${friendly}"`);
    setStatus(friendly);
  }

  function sendFeedback(form: {
    email: string;
    type: string;
    subject: string;
    message: string;
  }) {
    if (isDebug) console.log("DEBUG: sendFeedback called with form:", form);
    socket?.emit("feedback", JSON.stringify({ form }));
  }

  // --- Peer connection creation -----------------------------------------
  function createPeer(id: string) {
    if (isDebug) console.log("DEBUG: createPeer called for id:", id);

    // Create the RTCPeerConnection with STUN servers ( TURN REMOVED ) +  might not work in corporate network
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ],
    });

    pc.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        if (isDebug) console.log("DEBUG: icecandidate event (raw):", event.candidate?.candidate);
        const candidate = event.candidate.candidate;
        if (candidate.includes("typ relay")) {
        } else if (
          candidate.includes("typ srflx") ||
          candidate.includes("typ host")
        ) {
        }
      }
    });

    // Connection state change handling
    if (pc) {
      pc.onconnectionstatechange = () => {
        const state = peer.current?.connectionState;
        if (isDebug) console.log("DEBUG: onconnectionstatechange:", state);
        // When disconnected/failed/closed -> clean up
        if (state === "disconnected" || state === "failed" || state === "closed") {
          log("Disconnected");
          disconnect();
        }
        // When connected -> update status
        if (state === "connected") {
          log("Connected");
        }
      };
    }

    const isOwner = (socket?.id === id); // Check if we are the owner

    // Emit ICE candidates to signaling server as they are discovered
    pc.onicecandidate = (e) => {
      if (e.candidate && socket?.id) {
        
        if (isOwner) {
          // I am the OWNER. Buffer my own candidates until I know who the joiner is.
          if (isDebug) console.log("DEBUG: createPeer (Owner): Buffering own candidate.");
          queuedOwnerCandidates.current.push(e.candidate);
        } else {
          // I am the JOINER. Send candidates to the owner (the 'id' passed in).
          if (isDebug) console.log("DEBUG: createPeer (Joiner): Emitting 'ice-candidate' to owner:", id);
          socket?.emit("ice-candidate", { id, candidate: e.candidate });
        }

      }
    };

    return pc;
  }

  // Disconnect / cleanup
  function disconnect() {
    if (isDebug) console.log("DEBUG: disconnect() called.");
    // Clean up peer connection
    if (peer.current) {
      peer.current.onicecandidate = null;
      peer.current.ondatachannel = null;
      peer.current.close();
      peer.current = null;
    }

    // Clean up data channel
    if (dataChannel.current) {
      dataChannel.current.onmessage = null;
      dataChannel.current.onopen = null;
      dataChannel.current.close();
      dataChannel.current = null;
    }

    // Reset UI state and buffers
    setFlightCode(null);
    setStatus("Disconnected");
    setOwnerId("");
    setMembers([]);
    queuedCandidates.current = [];
    queuedOwnerCandidates.current = [];

    socket?.emit("leaveFlight");
  }

  //  Sender
  async function initiateSender() {
    if (isDebug) console.log("DEBUG: initiateSender() called.");
    if (!peer.current) return;

    // Create the fileTransfer data channel and wire handlers
    dataChannel.current = peer.current.createDataChannel("fileTransfer");
    if (isDebug) console.log("DEBUG: createDataChannel 'fileTransfer' created.");
    dataChannel.current.onopen = () => log("DataChannel opened.");
    dataChannel.current.onmessage = onMessage;

    // Create and set local offer
    const offer = await peer.current.createOffer();
    if (isDebug) console.log("DEBUG: createOffer successful.");
    await peer.current.setLocalDescription(offer);
    if (isDebug) console.log("DEBUG: setLocalDescription successful.");

    log("Preparing offer...");
    // Emit offer immediately (do not wait for full ICE)
    socket?.emit("offer", flightCode, { sdp: peer.current.localDescription });
    if (isDebug) console.log("DEBUG: Emitted 'offer' for flightCode:", flightCode);
    log("Offer sent.");
  }

  //  refresh !! HELPER 
  async function refreshNearby() {
    if (isDebug) console.log("DEBUG: refreshNearby() called. Emitting 'getNearbyUsers'.");
    socket?.emit("getNearbyUsers");
  }

  const updateStats = (files: number, transferred: number) => {
    if (isDebug) console.log("DEBUG: updateStats() called. Emitting 'updateStats'.", { files, transferred });
    socket?.emit("updateStats", {
      filesShared: files,
      Transferred: transferred,
    });
  };

  //  Receiver
  async function handleOffer(id: string, sdp: RTCSessionDescriptionInit) {
    if (isDebug) console.log("DEBUG: handleOffer() called from id:", id);
    // Create local peer instance for this incoming session
    peer.current = createPeer(id);

    // When remote creates a data channel, capture it and attach handlers
    peer.current.ondatachannel = (e) => {
      if (isDebug) console.log("DEBUG: ondatachannel event fired. Channel captured.");
      dataChannel.current = e.channel;
      e.channel.onmessage = onMessage;
      e.channel.onopen = () => log("DataChannel opened");
    };


    // Apply remote description, flush any buffered ICE candidates,
    // create answer and set local description
    await peer.current.setRemoteDescription(sdp);
    if (isDebug) console.log("DEBUG: handleOffer: setRemoteDescription successful.");
    flushBufferedCandidates();
    if (isDebug) console.log("DEBUG: handleOffer: flushBufferedCandidates called.");
    const answer = await peer.current.createAnswer();
    if (isDebug) console.log("DEBUG: handleOffer: createAnswer successful.");
    await peer.current.setLocalDescription(answer);
    if (isDebug) console.log("DEBUG: handleOffer: setLocalDescription successful.");

    // Wait until ICE gathering completes before sending answer (original logic)
    if (isDebug) console.log("DEBUG: handleOffer: Waiting for ICE gathering to complete...");
    await new Promise((resolve) => {
      if (peer.current?.iceGatheringState === "complete") {
        if (isDebug) console.log("DEBUG: handleOffer: ICE gathering was already complete.");
        resolve(null);
      } else {
        const checkState = () => {
          if (peer.current?.iceGatheringState === "complete") {
            if (isDebug) console.log("DEBUG: handleOffer: ICE gathering completed (event listener).");
            peer.current.removeEventListener("icegatheringstatechange", checkState);
            resolve(null);
          }
        };
        peer.current?.addEventListener("icegatheringstatechange", checkState);
      }
    });

    socket?.emit("answer", flightCode, { sdp: answer });
    if (isDebug) console.log("DEBUG: handleOffer: Emitted 'answer'.");
    log("Answer sent.");
  }

  // Sender: handle incoming answer
// Sender: handle incoming answer
  async function handleAnswer(sdp: RTCSessionDescriptionInit, remoteId: string) { 
    if (isDebug) console.log("DEBUG: handleAnswer() called from remoteId:", remoteId);
    if (peer.current) {
      
      // Overwrite onicecandidate for any *future* trickle candidates
      peer.current.onicecandidate = (e) => {
        if (e.candidate && socket?.id) {
          if (isDebug) console.log("DEBUG: onicecandidate (owner). Emitting to Joiner at id:", remoteId);
          socket?.emit("ice-candidate", { id: remoteId, candidate: e.candidate });
        }
      };

      try {
        await peer.current.setRemoteDescription(sdp);
        
        // Flush the JOINER's candidates that we buffered earlier
        flushBufferedCandidates();

        // Now, flush our OWN buffered candidates and send them to the JOINER
        if (isDebug) console.log(`DEBUG: handleAnswer: Flushing ${queuedOwnerCandidates.current.length} owner candidates to remoteId:`, remoteId);
        for (const candidate of queuedOwnerCandidates.current) {
          socket?.emit("ice-candidate", { id: remoteId, candidate });
        }
        queuedOwnerCandidates.current = []; // Clear the buffer
        
        log("Remote description set.");
      } catch (e) {
        console.error("Failed to set remote description", e);
        log("Failed to set remote description");
      }
    }
  }

  // Handle incoming ICE candidate from remote 
  async function handleIce(id: string, candidate: Candidate) {
    if (isDebug) console.log("DEBUG: handleIce() called from id:", id);

    try {
      if (peer.current?.remoteDescription) {
        // If remoteDescription exists, add candidate immediately
        if (isDebug) console.log("DEBUG: handleIce: Adding ICE candidate immediately.");
        await peer.current.addIceCandidate(new RTCIceCandidate(candidate));
        log("Added ICE candidate");
      } else {
        // Otherwise buffer for later
        if (isDebug) console.log("DEBUG: handleIce: Buffering ICE candidate.");
        queuedCandidates.current.push(candidate);
        log("Buffered ICE candidate");
      }
    } catch (err) {
      console.error("Failed to add ICE candidate", err);
    }
  }

  // Flush any buffered ICE candidates once remoteDescription is set 
  const flushBufferedCandidates = async () => {
    if (isDebug) console.log("DEBUG: flushBufferedCandidates() called. Flushing candidates:", queuedCandidates.current);
    for (const c of queuedCandidates.current) {
      try {
        await peer.current?.addIceCandidate(new RTCIceCandidate(c));
        if (isDebug) console.log("DEBUG: flushBufferedCandidates: Added buffered candidate:", c);
      } catch (e) {
        console.error("Failed to add buffered ICE", e);
      }
    }
    queuedCandidates.current = [];
  };

  // Invite send .
  async function inviteToFlight(user: Member, currentFlightCode: string): Promise<void> {
    if (isDebug) console.log("DEBUG: inviteToFlight() called. Emitting 'inviteToFlight'.", { user, currentFlightCode });
    return new Promise((resolve, reject) => {
      socket?.emit(
        "inviteToFlight",
        {
          targetId: user.id,
          flightCode: currentFlightCode,
        },
        (res: { success: boolean; message?: string }) => {
          if (isDebug) console.log("DEBUG: inviteToFlight callback received:", res);
          if (res.success) {
            resolve();
          } else {
            console.error("Invite failed:", res.message);
            reject(res.message);
          }
        }
      );
    });
  }

  const router = useRouter();

  useEffect(() => {
    
    if (isDebug) console.log("DEBUG: useEffect running. Socket present?", !!socket);
    if (!socket || !flightCode) return;

    socket.on("offer", async (id, { sdp }) => {
      if (isDebug) console.log("DEBUG: Received 'offer' event from id:", id);
      if (!sdp) {
        log("Failed : missing payload");
        return;
      }
      await handleOffer(id, sdp.sdp);
    });

socket.on("answer", async ({ sdp, id }) => { 
      if (isDebug) console.log("DEBUG: Received 'answer' event from id:", id);
      await handleAnswer(sdp, id); 
    });

    socket.on("ice-candidate", async ({ candidate, id }) => {
      if (isDebug) console.log("DEBUG: Received 'ice-candidate' event from id:", id);
      await handleIce(id, candidate);
    });

    socket.on("nearbyUsers", (users: Member[]) => {
      if (isDebug) console.log("DEBUG: Received 'nearbyUsers' event:", users);
      setNearByUsers(users);
    });

    if (!flightCode) {
      if (isDebug) console.log("DEBUG: useEffect: No flightCode, setting up minimal listeners and returning.");
      log("Invalid room code.");
      return () => {
        socket.off("nearbyUsers");
        socket.off("offer");
        socket.off("answer");
        socket.off("ice-candidate");
      };
    }

    if (isDebug) console.log("DEBUG: Emitting 'joinFlight' for code:", flightCode);
    socket.emit("joinFlight", flightCode, (resp: { success: boolean; message?: string }) => {
      if (isDebug) console.log("DEBUG: 'joinFlight' callback received:", resp);
      if (resp.success) {
        log("Joined signaling.");
      } else {
        if (resp.message === "Flight is full") {
          router.push("/flightFull");
        } else {
          log(`Failed to join: ${resp.message}`);
        }
      }
    });

    socket.on("flightUsers", ({ ownerId: oid, members: m }) => {
      if (isDebug) console.log("DEBUG: Received 'flightUsers' event.", { ownerId: oid, members: m });
      setOwnerId(oid);
      setMembers(m);

      if (socket?.id === oid && !peer.current) {
        if (isDebug) console.log("DEBUG: User is owner, creating peer and initiating sender.");
        peer.current = createPeer(oid);
        initiateSender();
      }

      if (isDebug) console.log("DEBUG: Emitting 'getNearbyUsers' after receiving flightUsers.");
      socket.emit("getNearbyUsers");
    })

    return () => {
      if (isDebug) console.log("DEBUG: useEffect cleanup function running for flightCode:", flightCode);
      socket.off("flightUsers");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("nearbyUsers");

      if (peer.current) {
        peer.current.close();
        peer.current = null;
      }
    };
  }, [socket, flightCode]);

  return {
    dataChannel: dataChannel.current,
    status,
    nearByUsers,
    inviteToFlight,
    updateStats,
    sendFeedback,
    connectToFlight,
    refreshNearby,
    disconnect,
    members,
  };
}
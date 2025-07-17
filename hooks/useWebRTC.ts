import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/socketContext";
import { useRouter } from "next/navigation";
type Candidate = RTCIceCandidateInit;

function userMessage(msg: string) {
  if (msg.includes("DataChannel opened")) return "Connection established";
  if (msg.includes("Connected")) return "Connection established";
  if (msg.includes("Offer sent")) return "Ready to connect";
  if (msg.includes("Answer sent")) return "Offer accepted...";
  if (msg.includes("Remote description set")) return "finalizing...";
  if (msg.includes("Added ICE candidate")) return "Connection improved";
  if (msg.includes("Buffered ICE candidate")) return "ready to connect...";
  if (msg.includes("Joined signaling")) return "Joined room, waiting";
  if (msg.includes("Failed to join")) return "Failed to join room";
  if (msg.includes("Invalid room code")) return "Invalid room code";
  if (msg.includes("Failed to add ICE candidate")) return "Connection Failed"
  return msg;
}

type Member  = {
  id: string
  name : string
};

export function useWebRTC(
  onMessage: (e: MessageEvent) => void,
) {

  const [flightCode, setFlightCode] = useState<string | null>(null);
  const { socket } = useSocket();

  const peer = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const [status, setStatus] = useState("Connecting...");
  const [members, setMembers] = useState<Member[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");
  const [nearByUsers, setNearByUsers ] = useState<Member[]>([]);

  // Buffer ICE until we have a remoteDescription
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([]);

  function connectToFlight( code: string ){
    setFlightCode(code);
  }

  function log(msg: string) {
    const friendly = userMessage(msg);
    setStatus(friendly);
  }


  function sendFeedback( form: { email : string , type : string , subject : string , message : string }){
    socket?.emit("feedback" , JSON.stringify({form}));
  }
  function createPeer(id: string) {
    const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME || "";
    const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "";

  
  
     const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [ "stun:stun.l.google.com:19302" ] // Reliable and fast
        },
        {
          urls: [
            "turn:bn-turn2.xirsys.com:80?transport=udp",
            "turn:bn-turn2.xirsys.com:3478?transport=udp",
            "turn:bn-turn2.xirsys.com:80?transport=tcp",
            "turn:bn-turn2.xirsys.com:3478?transport=tcp"
          ],
          username: TURN_USERNAME,
          credential: TURN_CREDENTIAL
        }
      ],
      iceTransportPolicy: "all", // allows STUN first, fallback to TURN
    });

    pc.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      const candidate = event.candidate.candidate;
      if (candidate.includes("typ relay")) {
      } else if (candidate.includes("typ srflx") || candidate.includes("typ host")) {
      }
    }
  });



if (pc) {
  pc.onconnectionstatechange = () => {
    const state = peer.current?.connectionState;
    // console.log("Peer connection state changed:", state);
    if (state === "disconnected" || state === "failed" || state === "closed") {
      log("Disconnected");
      disconnect();
    }

    if(state === "connected"){
      log("Connected")
    }
  };
}


    pc.onicecandidate = e => {
      if (e.candidate && socket?.id) {
        socket?.emit("ice-candidate", { id, candidate: e.candidate });
      }
    };
    return pc;
  }


  function disconnect() {
  if (peer.current) {
    peer.current.onicecandidate = null;
    peer.current.ondatachannel = null;
    peer.current.close();
    peer.current = null;
  }

  if (dataChannel.current) {
    dataChannel.current.onmessage = null;
    dataChannel.current.onopen = null;
    dataChannel.current.close();
    dataChannel.current = null;
  }

  setFlightCode(null);
  setStatus("Disconnected");
  setOwnerId("");
  setMembers([]);
  queuedCandidates.current = [];

  socket?.emit("leaveFlight"); 
}


  


 async function initiateSender() {
  if (!peer.current) return;

  dataChannel.current = peer.current.createDataChannel("fileTransfer");
  dataChannel.current.onopen = () => log("DataChannel opened.");
  dataChannel.current.onmessage = onMessage;

  const offer = await peer.current.createOffer();
  await peer.current.setLocalDescription(offer);

  log("Preparing offer...")
  // Emit offer immediately — don't wait for full ICE

  if (peer.current.localDescription) {

    await new Promise(resolve => {
    if (peer.current?.iceGatheringState === 'complete') {
      resolve(null);
    } else {
      const checkState = () => {
        if (peer.current?.iceGatheringState === 'complete') {
          peer.current?.removeEventListener('icegatheringstatechange', checkState);
          resolve(null);
        }
      };
      peer.current?.addEventListener('icegatheringstatechange', checkState);
    }
  });

    socket?.emit("offer", flightCode, { sdp: peer.current.localDescription });
    log("Offer sent.");
  } else {
    log("failed preparing offer.");
  }
}


  async function refreshNearby() {
    socket?.emit("getNearbyUsers");
    
  }

  const updateStats = (files: number, transferred: number) => {
    socket?.emit("updateStats", {
      filesShared : files,
      Transferred: transferred,
    });
  };
  

  // Handle when we get an offer (receiver side).
  async function handleOffer(id: string, sdp: RTCSessionDescriptionInit) {
    peer.current = createPeer(id);

    peer.current.ondatachannel = e => {
      dataChannel.current = e.channel;
      e.channel.onmessage = onMessage;
      e.channel.onopen = () => log("DataChannel opened")
    }

    console.log(sdp);

    await peer.current.setRemoteDescription(sdp);
    flushBufferedCandidates();
    const answer = await peer.current.createAnswer();

    await peer.current.setLocalDescription(answer);
    
await new Promise(resolve => {
  if (peer.current?.iceGatheringState === 'complete') {
    resolve(null);
  } else {
    const checkState = () => {
      if (peer.current?.iceGatheringState === 'complete') {
        peer.current.removeEventListener('icegatheringstatechange', checkState);
        resolve(null);
      }
    };
    peer.current?.addEventListener('icegatheringstatechange', checkState);
  }
});
socket?.emit("answer", flightCode, { sdp: answer });
log("Answer sent.");

  }

  // Handle when we get an answer (sender side).
  async function handleAnswer(sdp: RTCSessionDescriptionInit) {
  if (peer.current) {
    try {
      await peer.current.setRemoteDescription(sdp);
      flushBufferedCandidates();
      queuedCandidates.current.splice(0).forEach(candidate => {
        peer.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(log);
      });
      log("Remote description set.");
    } catch (e) {
      console.error("Failed to set remote description", e);
      log("Failed to set remote description");
    }
  }
}


  // Handle ICE candidate messages
 async function handleIce(id: string, candidate: Candidate) {
  try {

    if (peer.current?.remoteDescription) {
      await peer.current.addIceCandidate(new RTCIceCandidate(candidate));
      log("Added ICE candidate");
    } else {
      queuedCandidates.current.push(candidate);
      log("Buffered ICE candidate");
    }
  } catch (err) {
    console.error("Failed to add ICE candidate", err);
  }
}

const flushBufferedCandidates = async () => {
  for (const c of queuedCandidates.current) {
    try {
      await peer.current?.addIceCandidate(new RTCIceCandidate(c));
    } catch (e) {
      console.error("Failed to add buffered ICE", e);
    }
  }
  queuedCandidates.current = [];
};



  async function inviteToFlight(user: Member, currentFlightCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      socket?.emit(
        "inviteToFlight",
        {
          targetId: user.id,
          flightCode: currentFlightCode,
        },
        (res: { success: boolean; message?: string }) => {
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
    if (!socket) return;

    socket.on("nearbyUsers" , ( users : Member[] ) => {
      setNearByUsers(users);
    })  

  

    if (!flightCode) {
      log("Invalid room code.");
      return () => {
              socket.off("nearbyUsers");
      };
    }
    

   

    socket.emit("joinFlight", flightCode, (resp: { success: boolean; message?: string }) => {
      if (resp.success) {
        log("Joined signaling.");
      } else {
        if(resp.message === "Flight is full"){
            router.push('/flightFull');
        }else{ 
          log(`Failed to join: ${resp.message}`);
        }
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

        
    socket.on("flightUsers", ({ ownerId: oid, members: m }) => {
      setOwnerId(oid);
      setMembers(m);

      if (socket?.id === oid && !peer.current) {
        // Initiate as sender
        peer.current = createPeer(oid);
        initiateSender();
      }

      socket.emit("getNearbyUsers");
    });

    return () => {
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
    // restartPeer 
    
  };
}

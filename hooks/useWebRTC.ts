import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/socketContext";
import { useRouter } from "next/navigation";

type Candidate = RTCIceCandidateInit;

function userMessage(msg: string) {
  // Map technical messages to user-friendly ones
  if (msg.includes("DataChannel opened")) return "Connection established. Ready to transfer files.";
  if (msg.includes("Offer sent")) return "Connecting to the other device...";
  if (msg.includes("Answer sent")) return "Connected to the other device.";
  if (msg.includes("Remote description set")) return "Connection secured.";
  if (msg.includes("Added ICE candidate")) return "Connection improved.";
  if (msg.includes("Buffered ICE candidate")) return "Setting up connection...";
  if (msg.includes("Joined signaling")) return "Joined the room. Waiting for others...";
  if (msg.includes("Failed to join")) return "Could not join the room. Please check the code.";
  if (msg.includes("Invalid room code")) return "Please enter a valid room code.";
   return msg;
}

type Member  = {
  id: string
  name : string
};

export function useWebRTC(
  code: string,
  onMessage: (e: MessageEvent) => void,
) {
  const { socket } = useSocket();

  const peer = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const [status, setStatus] = useState("Connecting...");
  const [members, setMembers] = useState<Member[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");
  const [nearByUsers, setNearByUsers ] = useState<Member[]>([]);

  // Buffer ICE until we have a remoteDescription
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([]);

  function log(msg: string) {
    const friendly = userMessage(msg);
    setStatus(friendly);
  }


  function createPeer(id: string) {
    const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME || "";
    const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "";

    const pc = new RTCPeerConnection({ iceServers: [
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
    ]});

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
      initiateSender();
    }
  }

  async function initiateSender() {
    if (!peer.current) return;

    dataChannel.current = peer.current.createDataChannel("fileTransfer" , {
    });

    dataChannel.current.onopen = () => log("DataChannel opened.");
    dataChannel.current.onmessage = onMessage;

    const offer = await peer.current.createOffer();
    await peer.current.setLocalDescription(offer);
    socket?.emit("offer", code, { sdp: offer });

    log("Offer sent.");
  }

  async function refreshNearby() {
    socket?.emit("getNearbyUsers");
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

  // Request to connect to a nearby user and start WebRTC offer if successful
  // TODO 
  // async function requestToConnect(targetId: string): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     socket?.emit("requestToConnect", targetId, (res: { success: boolean; code?: string; message?: string }) => {
  //       if (res.success && res.code) {
  //         console.log("Flight created! Code:", res.code);
  //         initiateSender(targetId);
  //         resolve();
  //       } else {
  //         console.error("Failed to connect:", res.message);
  //         reject(res.message);
  //       }
  //     });
  //   });
  // }


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
            console.log("User invited successfully!");
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

    if (!code) {
      log("Invalid room code.");
      return;
    }
    socket.emit("joinFlight", code, (resp: { success: boolean; message?: string }) => {
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

    socket.on("flightUsers", ({ ownerId: oid, members: m }) => {
      setOwnerId(oid);
      setMembers(m);
      log(`Members in room: ${m.length}`);

      if (socket?.id === oid && !peer.current) {
        // Initiate as sender
        peer.current = createPeer(oid);
        initiateSender();
      }

      socket.emit("getNearbyUsers");
    });
    socket.on("nearbyUsers" , ( users : Member[] ) => {
      setNearByUsers(users);
    })

    


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
    nearByUsers,
    inviteToFlight,
    refreshNearby,
    
    members, 
    restartPeer 
  };
}

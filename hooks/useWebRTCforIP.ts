
export function getLocalIp(callback: (ip : string) => void){
    const ips = new Set<string>();
    const TURN_USERNAME = process.env.NEXT_PUBLIC_TURN_USERNAME || "";
    const TURN_CREDENTIAL = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "";



    const pc = new RTCPeerConnection({ iceServers: [{
   urls: [ "stun:bn-turn2.xirsys.com" ]
}, {
   username: TURN_USERNAME,
   credential: TURN_CREDENTIAL,
   urls: [
       "turn:bn-turn2.xirsys.com:80?transport=udp",
       "turn:bn-turn2.xirsys.com:3478?transport=udp",
       "turn:bn-turn2.xirsys.com:80?transport=tcp",
       "turn:bn-turn2.xirsys.com:3478?transport=tcp",
       "turns:bn-turn2.xirsys.com:443?transport=tcp",
       "turns:bn-turn2.xirsys.com:5349?transport=tcp"
   ]
}]
});

    pc.createDataChannel("getlocalip");

    pc.onicecandidate = (e) => {
        if(!e.candidate){
            pc.close(); // done
            return;
        }

         const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
         const ipMatch = ipRegex.exec(e.candidate.candidate);
         if(ipMatch){
            const ip = ipMatch[1];
            if(!ips.has(ip)){
                ips.add(ip);
                const prefix = ip.split(".").slice(0,3).join(".");
                callback(prefix);
            }
         }

    }

    pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(console.error);
}
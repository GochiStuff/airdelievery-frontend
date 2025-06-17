"use client";

import { useState, useRef, ChangeEvent, useEffect, useCallback } from "react";
import PQueue from "p-queue";
import pRetry from "p-retry";
import streamSaver from "streamsaver";
import { flattenFileList } from "@/utils/flattenFilelist";
import { buffer } from "stream/consumers";

type TransferStatus = "queued" | "sending" | "paused" | "done" | "error" | "canceled" | "receiving" ;

type Transfer = {
  file: File;
  transferId: string;
  directoryPath: string;
  progress: number;
  speedBps: number;
  status: TransferStatus;
};

type RecvTransfer = {
  transferId: string;
  directoryPath: string;
  size: number;
  received: number;
  progress: number;
  status: TransferStatus;
};

type Meta = {
  totalSent: number;
  totalReceived: number;
  speedBps: number;
};

export function useFileTransfer(
  dataChannel: RTCDataChannel | null
) {

  const [queue, setQueue] = useState<Transfer[]>([]);
  const [recvQueue, setRecvQueue] = useState<RecvTransfer[]>([]);
  const [meta, setMeta] = useState<Meta>({
    totalSent: 0,
    totalReceived: 0,
    speedBps: 0,
  });

  
  const MAX_RAM_SIZE = 1024 * 1024 * 1024;
  const peerMax = (dataChannel as any)?.maxMessageSize || 256 * 1024;
  const CHUNK_SIZE = Math.min(256 * 1024, Math.floor(peerMax * 0.9));
  const BUFFER_THRESHOLD = CHUNK_SIZE * 8;
  const PROGRESS_INTERVAL_MS = 500;

  // Incoming streams
  const incoming = useRef<
    Record<string, { size: number; received: number;writing : boolean;  queue: ArrayBuffer[], lastProgressUpdate : number ; writer: WritableStreamDefaultWriter }>
  >({});
  const currentReceivingIdRef = useRef<string | null>(null);

  // Queue
  const pq = useRef(new PQueue({ concurrency: 1 }));

  const transferControls = useRef<
    Record<
      string,
      {
        paused: boolean;
        resumePromise?: Promise<void>;
        resumeResolve?: () => void;
        canceled: boolean;
    } >>({});

  const statusMap: Record<TransferStatus, string> = {
    queued: "Waiting to send",
    sending: "Transferring",
    paused: "Paused",
    done: "Completed",
    error: "Failed",
    canceled: "Canceled",
    receiving: "Receiving"
  };

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const files = await flattenFileList(e.target.files);
      setQueue((prev) => {
        const existingPaths = new Set(prev.map((t) => t.directoryPath));
        const newTransfers: Transfer[] = files
          .filter((f) => {
            const path = (f as any).webkitRelativePath || f.name;
            return !existingPaths.has(path);
          })
          .map((file) => {
            const id = crypto.randomUUID();
            transferControls.current[id] = { paused: false, canceled: false };
            return {
              file,
              transferId: id,
              directoryPath: (file as any).webkitRelativePath || file.name,
              progress: 0,
              speedBps: 0,
              status: "queued",
            };
          });
        return [...prev, ...newTransfers];
      });
    },
    []
  );

  // READ FILE IN CHUNKS HELPER 
  async function* readFileInChunks(file: File) {
  const total = file.size;
  let offset = 0;
  while (offset < total) {
    const end = Math.min(offset + CHUNK_SIZE, total);
    // slice returns a Blob for [offset, end)
    const blobSlice = file.slice(offset, end);
    const arrayBuffer = await blobSlice.arrayBuffer();
    yield new Uint8Array(arrayBuffer);
    offset = end;
  }
}


  function concat(a: Uint8Array, b: Uint8Array) {
    const c = new Uint8Array(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
  }

function createPacket( transferId  : string  , chunk : Uint8Array ){

    const transferIdBuf = new TextEncoder().encode(transferId);
    const headerSize = 4 + transferIdBuf.length + 4;
    const packet = new ArrayBuffer(headerSize + chunk.byteLength);
    const view = new DataView(packet);

    let offset = 0 ; 
    view.setUint32( offset , transferIdBuf.length);
    offset += 4;

    new Uint8Array(packet , offset , transferIdBuf.length).set(transferIdBuf);
    offset += transferIdBuf.length;

    view.setUint32(offset, chunk.byteLength);
    offset += 4;

    new Uint8Array(packet , offset).set(new Uint8Array(chunk));

    return packet;

  }

  // SEND 
const sendFile = useCallback(
  async ({ file, transferId, directoryPath }: Transfer) => {
    if (!dataChannel) throw new Error("No dataChannel");
    if (dataChannel.readyState !== "open") throw new Error("Connection is not open");

    const controls = transferControls.current[transferId];
    if (!controls) throw new Error("No controls for transfer");

    const total = file.size;
    let sent = 0;
    let lastTime = Date.now();
    let lastSent = 0;

    // Send init 
    dataChannel.send(JSON.stringify({ type: "init", transferId, directoryPath, size: total }));

    for await (const chunk of readFileInChunks(file)) {
      // CONTROLS 
      if (controls.canceled) {
        dataChannel.send(JSON.stringify({ type: "cancel", transferId }));
        setQueue((q) =>
          q.map((x) =>
            x.transferId === transferId ? { ...x, status: "canceled" } : x
          )
        );
        throw new Error("Canceled");
      }
      if (controls.paused) {
        dataChannel.send(JSON.stringify({ type: "pause", transferId }));
        await controls.resumePromise;
        dataChannel.send(JSON.stringify({ type: "resume", transferId }));
      }


      // Backpressure
      if (dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise<void>((res) => {
          const listener = () => {
            dataChannel.onbufferedamountlow = null;
            res();
          };
          dataChannel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
          dataChannel.onbufferedamountlow = listener;
        });
      }
      if (dataChannel.readyState !== "open") throw new Error("Connection closed");

     const packet = createPacket(transferId, chunk);
      dataChannel.send(packet);

      // Progress track
      sent += chunk.length;
      const now = Date.now();
      const pct = (sent / total) * 100;
      if (
        now - lastTime > PROGRESS_INTERVAL_MS ||
        pct - (lastSent / total) * 100 >= 5
      ) {
        setQueue((q) =>
          q.map((x) =>
            x.transferId === transferId
              ? { ...x, progress: Math.round(pct) }
              : x
          )
        );
        const bytesSinceLast = sent - lastSent;
        const timeElapsedSec = (now - lastTime) / 1000;
        const speed = timeElapsedSec > 0 ? Math.round(bytesSinceLast / timeElapsedSec) : 0;
        setMeta((m) => ({ ...m, speedBps: speed }));
        lastTime = now;
        lastSent = sent;
      }
    }

    // Done
    dataChannel.send(JSON.stringify({ type: "done", transferId }));
    setQueue((q) =>
      q.map((x) =>
        x.transferId === transferId
          ? { ...x, progress: 100, status: "done" }
          : x
      )
    );
    setMeta((m) => ({ ...m, totalSent: m.totalSent + total }));
  },
  [dataChannel]
);


function unpack(buffer : ArrayBuffer ){
  const view = new DataView(buffer);
  let offset = 0;

  const transferIdLength = view.getUint32(offset);
  offset += 4;

  const transferId = new TextDecoder().decode(
    new Uint8Array( buffer , offset , transferIdLength)
  );

  offset += transferIdLength;

  const chunkSize = view.getUint32(offset);
  offset += 4;
  
  const chunk = buffer.slice(offset, offset + chunkSize);

  return { transferId, chunk };
}

async function ProcessRecQue(transferId: string) {
  const rec = incoming.current[transferId];

  if (!rec) {
    console.warn("No matching incoming entry for:", transferId);
    currentReceivingIdRef.current = null;
    return;
  }

  try {
    while (rec.queue.length > 0) {
      const chunk = rec.queue.shift();
      if (!chunk) continue;

      try {
        await rec.writer.write(new Uint8Array(chunk));
        rec.received += chunk.byteLength;


        if (
          !rec.lastProgressUpdate ||
          Date.now() - rec.lastProgressUpdate > PROGRESS_INTERVAL_MS
        ) {
            setMeta((m) => ({
            ...m,
            totalReceived: m.totalReceived + chunk.byteLength,
            }));
          setRecvQueue((rq) =>
            rq.map((r) =>
              r.transferId === transferId && r.status === "receiving"
                ? {
                    ...r,
                    received: rec.received,
                    progress: Math.round((rec.received / rec.size) * 100),
                  }
                : r
            )
          );
          rec.lastProgressUpdate = Date.now();
        }
      } catch (err) {
        console.error("Writer error:", err);
        try {
          await rec.writer.abort?.();
        } catch {}
        delete incoming.current[transferId];
        setRecvQueue((rq) =>
          rq.map((r) =>
            r.transferId === transferId ? { ...r, status: "error" } : r
          )
        );
        return;
      }
    }

    if (rec.received >= rec.size) {
      try {
        await rec.writer.close();
      } catch {}
      delete incoming.current[transferId];
      setRecvQueue((rq) =>
        rq.map((r) =>
          r.transferId === transferId
            ? { ...r, status: "done", progress: 100 }
            : r
        )
      );
      currentReceivingIdRef.current = null;
    }
  } finally {

    rec.writing = false;
  }
}



  // RECIEVE
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // headers 
      if (typeof event.data === "string") {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          console.warn("Received string but not JSON:", event.data);
          return;
        }
        const { type, transferId, directoryPath, size } = msg;
        // CHUNK HEADER 
        if (type === "chunk") {
          currentReceivingIdRef.current = transferId;
          return;
        }
        
        // INIT 
        if (type === "init") {
          try {

          let writer: WritableStreamDefaultWriter;
          let chunks: Uint8Array[] | undefined = undefined;
          

            if ( size < MAX_RAM_SIZE){
              console.log("USING RAM")
              chunks = [];
              // writing own ram writer 
              writer = {
                write: (chunk: Uint8Array) => { chunks!.push(chunk); return Promise.resolve(); },
                close: () => {
                  const totalLength = chunks!.reduce((sum, c) => sum + c.length, 0);
                  const all = new Uint8Array(totalLength);
                  let offset = 0;
                  for (const c of chunks!) {
                    all.set(c, offset);
                    offset += c.length;
                  }

                  const blob = new Blob([all]);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = directoryPath;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    URL.revokeObjectURL(url);
                    a.remove();
                  }, 200);
                  return Promise.resolve();
                },
                abort: () => { chunks = undefined; return Promise.resolve(); },
                // Required properties for WritableStreamDefaultWriter
                get closed() { return Promise.resolve(); },
                get desiredSize() { return null; },
                get ready() { return Promise.resolve(); },
                releaseLock: () => {},
              } as WritableStreamDefaultWriter<any>;

              
            }else{
              const stream = streamSaver.createWriteStream(directoryPath, { size });
              writer = stream.getWriter();
            }
            incoming.current[transferId] = {
              writer,
              queue: [],
              writing:false,
              size,
              received: 0,
              lastProgressUpdate : 0,
            };
    
            setRecvQueue((rq) => [
              ...rq,
              { transferId, directoryPath, size, received: 0, progress: 0, status: "receiving" }
            ]);
          } catch (err) {
            console.error("Error creating write stream:", err);
            setRecvQueue((rq) =>
              rq.map((r) =>
                r.transferId === transferId
                  ? { ...r, status: "error" }
                  : r
              )
            );
          }
          return;
        }

        // CONTROLS 
        if (type === "pause") {
          setRecvQueue((rq) =>
            rq.map((r) =>
              r.transferId === transferId && r.status === "receiving"
                ? { ...r, status: "paused" }
                : r
            )
          );
          return;
        }
        if (type === "resume") {
          setRecvQueue((rq) =>
            rq.map((r) =>
              r.transferId === transferId && r.status === "paused"
                ? { ...r, status: "receiving" }
                : r
            )
          );
          return;
        }
        if (type === "cancel") {
          if (incoming.current[transferId]) {
            try {
              incoming.current[transferId].writer.abort();
            } catch {}
            delete incoming.current[transferId];
            setRecvQueue((rq) =>
              rq.map((r) =>
          r.transferId === transferId ? { ...r, status: "canceled" } : r
              )
            );
            return;
          }
          // Else, if this transfer is in our send queue, it means remote receiver canceled: abort send
          if (transferControls.current[transferId]) {
            const controls = transferControls.current[transferId];
            controls.canceled = true;
            // If paused, resolve to continue so send loop can detect canceled
            if (controls.paused && controls.resumeResolve) {
              controls.paused = false;
              controls.resumeResolve();
            }
            setQueue((q) =>
              q.map((x) =>
          x.transferId === transferId ? { ...x, status: "canceled" } : x
              )
            );
          }
          return;
        }
        // DONE
        if (type === "done") {
          return;
        }
        return;
      }

      // Binary data
      
      const { transferId , chunk } =  unpack(event.data);

      const rec = incoming.current[transferId];
      if(!rec) return;

      rec.queue.push(chunk);
      if (!rec.writing) {
        rec.writing = true;
        ProcessRecQue(transferId);
      }

      
    },
    [ recvQueue]
  );



  // SETUP 
  useEffect(() => {
    if (!dataChannel) return;
    dataChannel.binaryType = "arraybuffer";
    dataChannel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
    dataChannel.onmessage = handleMessage;
    dataChannel.onopen = () => {
    };
    dataChannel.onclose = () => {
    };
    dataChannel.onerror = (err) => {
      console.error("RTCDataChannel error", err);

    };
    return () => {
      dataChannel.onmessage = null;
      dataChannel.onopen = null;
      dataChannel.onclose = null;
      dataChannel.onerror = null;
    };
  }, [dataChannel, handleMessage]);


  // SENDING QUEUE 
  useEffect(() => {
    if (dataChannel?.readyState !== "open") return;
    queue.forEach((t) => {
      if (t.status !== "queued") return;
      setQueue((q) =>
        q.map((x) =>
          x.transferId === t.transferId ? { ...x, status: "sending" } : x
        )
      );
      pq.current
        .add(() => pRetry(() => sendFile(t), { retries: 0 })) // I MIGHT CHANGE IT 
        .catch((err) => {
          if (err.message === "Canceled") {
            // already marked canceled
          } else {
            console.error("Send failed for", t.transferId, err);
            setQueue((q) =>
              q.map((x) =>
                x.transferId === t.transferId
                  ? { ...x, status: "error" }
                  : x
              )
            );
          }
        });
    });
  }, [queue, dataChannel, sendFile ])
 

  // CONTROL HELLPER 
  const pauseTransfer = useCallback((transferId: string) => {
    setQueue((q) =>
      q.map((x) => {
        if (x.transferId === transferId && (x.status === "sending" || x.status === "queued")) {
          const controls = transferControls.current[transferId];
          if (controls) {
            controls.paused = true;
            controls.resumePromise = new Promise((res) => {
              controls.resumeResolve = res;
            });
          }
          return { ...x, status: "paused" };
        }
        return x;
      })
    );
  }, []);
  const resumeTransfer = useCallback((transferId: string) => {
    setQueue((q) =>
      q.map((x) => {
        if (x.transferId === transferId && x.status === "paused") {
          const controls = transferControls.current[transferId];
          if (controls) {
            controls.paused = false;
            controls.resumeResolve?.();
            controls.resumePromise = undefined;
            controls.resumeResolve = undefined;
          }
          const nextStatus = x.progress > 0 ? "sending" : "queued";
          return { ...x, status: nextStatus };
        }
        return x;
      })
    );
  }, []);
  const cancelTransfer = useCallback((transferId: string) => {
    const controls = transferControls.current[transferId];
    if (controls) {
      controls.canceled = true;
      if (controls.paused && controls.resumeResolve) {
        controls.paused = false;
        controls.resumeResolve();
      }
    }
    setQueue((q) =>
      q.map((x) =>
        x.transferId === transferId ? { ...x, status: "canceled" } : x
      )
    );
    // Notify remote to stop sending
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(JSON.stringify({ type: "cancel", transferId }));
    }
  }, [ dataChannel]);
  const cancelReceive = useCallback((transferId: string) => {
    const rec = incoming.current[transferId];
    if (rec) {
      try { rec.writer.abort(); } catch {}
      delete incoming.current[transferId];
    }
    setRecvQueue((rq) =>
      rq.map((r) =>
        r.transferId === transferId ? { ...r, status: "canceled" } : r
      )
    );
    if (currentReceivingIdRef.current === transferId) {
      currentReceivingIdRef.current = null;
    }
    // Notify remote sender to stop sending
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(JSON.stringify({ type: "cancel", transferId }));
    }
  }, [ dataChannel]);
   //STATUS UPDATES 
  const userQueue = queue.map((t) => ({
    ...t,
    userStatus: statusMap[t.status],
  }));

  return {
    queue: userQueue,
    recvQueue,
    meta,
    handleFileSelect,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    cancelReceive,
    handleMessage
  };
}

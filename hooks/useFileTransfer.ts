"use client";

import { useState, useRef, ChangeEvent, useEffect, useCallback } from "react";
import PQueue from "p-queue";
import pRetry from "p-retry";
import streamSaver from "streamsaver";
import { flattenFileList } from "@/utils/flattenFilelist";

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

  // Constants for chunking
  const peerMax = (dataChannel as any)?.maxMessageSize || 256 * 1024;
  const CHUNK_SIZE = Math.min(512 * 1024, peerMax - 1024); 
  const BUFFER_THRESHOLD = CHUNK_SIZE * 32;
  const PROGRESS_INTERVAL_MS = 500;

  // Incoming streams
  const incoming = useRef<
    Record<string, { size: number; received: number; lastProgressUpdate : number ; writer: WritableStreamDefaultWriter }>
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
    const reader = file.stream().getReader();
    let buffer = new Uint8Array(0);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = concat(buffer, new Uint8Array(value));
      while (buffer.length >= CHUNK_SIZE) {
        yield buffer.slice(0, CHUNK_SIZE);
        buffer = buffer.slice(CHUNK_SIZE);
      }
    }
    if (buffer.length) yield buffer;
  }

  function concat(a: Uint8Array, b: Uint8Array) {
    const c = new Uint8Array(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
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

      // CHUNK 
      // - header 
      dataChannel.send(JSON.stringify({ type: "chunk", transferId, size: chunk.length }));
      // - body 
      dataChannel.send(chunk.buffer);

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
            const stream = streamSaver.createWriteStream(directoryPath, { size });
            incoming.current[transferId] = {
              writer: stream.getWriter(),
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
      const transferId = currentReceivingIdRef.current;
      if (!transferId) {
        console.warn("No transferId set for incoming chunk");
        return;
      }
      const rec = incoming.current[transferId];
      if (!rec) {
        console.warn("No matching incoming entry for:", transferId);
        currentReceivingIdRef.current = null;
        return;
      }

      const recvEntry = recvQueue.find((r) => r.transferId === transferId);
      if (recvEntry) {
        if (recvEntry.status === "canceled") {
          currentReceivingIdRef.current = null;
          return;
        }
        if (recvEntry.status === "paused") {
          return;
        }
      }

      try {
        rec.writer.write(new Uint8Array(event.data as ArrayBuffer));
      } catch (err) {
        console.error("Error writing chunk:", err);
        try { rec.writer.abort?.(); } catch {}
        delete incoming.current[transferId];
        setRecvQueue((rq) =>
          rq.map((r) =>
            r.transferId === transferId ? { ...r, status: "error" } : r
          )
        );
        currentReceivingIdRef.current = null;
        return;
      }
      rec.received += (event.data as ArrayBuffer).byteLength;
      // Throttle progress update to every 0.5s
      if (!rec.lastProgressUpdate || Date.now() - rec.lastProgressUpdate > 500) {
        setMeta((m) => ({
          ...m,
          totalReceived: m.totalReceived + (event.data as ArrayBuffer).byteLength,
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

      // If done
      if (rec.received >= rec.size) {
        try {
          rec.writer.close();
        } catch (err) {
          console.error("Error closing writer:", err);
        }
        delete incoming.current[transferId];
        setRecvQueue((rq) =>
          rq.map((r) =>
            r.transferId === transferId ? { ...r, status: "done", progress: 100 } : r
          )
        );
        currentReceivingIdRef.current = null;
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

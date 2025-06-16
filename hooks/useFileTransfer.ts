"use client";

import { useState, useRef, ChangeEvent, useEffect, useCallback } from "react";
import PQueue from "p-queue";
import pRetry from "p-retry";
import streamSaver from "streamsaver";
import { flattenFileList } from "@/utils/flattenFilelist";

type TransferStatus = "queued" | "sending" | "paused" | "done" | "error" | "canceled";

type Transfer = {
  file: File;
  transferId: string;
  directoryPath: string;
  progress: number;
  speedBps: number;
  status: TransferStatus;
};

type RecvTransferStatus = "receiving" | "paused" | "done" | "canceled" | "error";

type RecvTransfer = {
  transferId: string;
  directoryPath: string;
  size: number;
  received: number;
  progress: number;
  status: RecvTransferStatus;
};

type Meta = {
  totalSent: number;
  totalReceived: number;
  speedBps: number;
};

export function useFileTransfer(
  dataChannel: RTCDataChannel | null,
  addLog: (msg: string) => void
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
  const BUFFER_THRESHOLD = CHUNK_SIZE * 16;
  const PROGRESS_INTERVAL_MS = 500;

  // Incoming raw streams
  const incoming = useRef<
    Record<string, { size: number; received: number; writer: WritableStreamDefaultWriter }>
  >({});
  const currentReceivingIdRef = useRef<string | null>(null);

  // Queue for sequential sending
  const pq = useRef(new PQueue({ concurrency: 1 }));

  // Controls for pause/resume/cancel per transfer
  const transferControls = useRef<
    Record<
      string,
      {
        paused: boolean;
        resumePromise?: Promise<void>;
        resumeResolve?: () => void;
        canceled: boolean;
      }
    >
  >({});

  const statusMap: Record<TransferStatus, string> = {
    queued: "Waiting to send",
    sending: "Transferring",
    paused: "Paused",
    done: "Completed",
    error: "Failed",
    canceled: "Canceled",
  };

  // Handle file selection: add to sender queue
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

  // Read file in chunks
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

  // Send a file with pause/resume/cancel and notify receiver
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

    addLog(`🚀 Sending ${directoryPath}`);
    // Send init header
    dataChannel.send(JSON.stringify({ type: "init", transferId, directoryPath, size: total }));

    for await (const chunk of readFileInChunks(file)) {
      // 1. If canceled before starting this chunk:
      if (controls.canceled) {
        addLog(`❌ Sending canceled locally before chunk: ${directoryPath}`);
        dataChannel.send(JSON.stringify({ type: "cancel", transferId }));
        setQueue((q) =>
          q.map((x) =>
            x.transferId === transferId ? { ...x, status: "canceled" } : x
          )
        );
        throw new Error("Canceled");
      }
      // 2. Pause handling
      if (controls.paused) {
        dataChannel.send(JSON.stringify({ type: "pause", transferId }));
        await controls.resumePromise;
        dataChannel.send(JSON.stringify({ type: "resume", transferId }));
      }
      // 3. Backpressure
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

      // 4. Send chunk header
      dataChannel.send(JSON.stringify({ type: "chunk", transferId, size: chunk.length }));

      // 5. Check cancellation again before sending the body:
      if (controls.canceled) {
        addLog(`❌ Sending canceled locally after header: ${directoryPath}`);
        dataChannel.send(JSON.stringify({ type: "cancel", transferId }));
        setQueue((q) =>
          q.map((x) =>
            x.transferId === transferId ? { ...x, status: "canceled" } : x
          )
        );
        throw new Error("Canceled");
      }

      // 6. Send the chunk data
      dataChannel.send(chunk.buffer);

      // 7. Update progress
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

    // Done successfully
    dataChannel.send(JSON.stringify({ type: "done", transferId }));
    setQueue((q) =>
      q.map((x) =>
        x.transferId === transferId
          ? { ...x, progress: 100, status: "done" }
          : x
      )
    );
    setMeta((m) => ({ ...m, totalSent: m.totalSent + total }));
    addLog(`✅ Completed ${directoryPath}`);
  },
  [dataChannel, addLog]
);


  // Handle incoming messages: build recvQueue and track progress, plus handle control messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (typeof event.data === "string") {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          console.warn("Received string but not JSON:", event.data);
          return;
        }
        const { type, transferId, directoryPath, size } = msg;
        // INIT from remote sender
        if (type === "init") {
          try {
            const stream = streamSaver.createWriteStream(directoryPath, { size });
            incoming.current[transferId] = {
              writer: stream.getWriter(),
              size,
              received: 0,
            };
            // Add to receive queue
            setRecvQueue((rq) => [
              ...rq,
              { transferId, directoryPath, size, received: 0, progress: 0, status: "receiving" }
            ]);
            addLog(`📥 Preparing to receive ${directoryPath}`);
          } catch (err) {
            console.error("Error creating write stream:", err);
            setRecvQueue((rq) =>
              rq.map((r) =>
                r.transferId === transferId
                  ? { ...r, status: "error" }
                  : r
              )
            );
            addLog(`❌ Failed to prepare receiving for ${directoryPath}`);
          }
          return;
        }
        // Remote informs us of a pause: if we're receiving, update status to paused
        if (type === "pause") {
          setRecvQueue((rq) =>
            rq.map((r) =>
              r.transferId === transferId && r.status === "receiving"
                ? { ...r, status: "paused" }
                : r
            )
          );
          addLog(`⏸️ Remote paused receiving ${transferId}`);
          return;
        }
        // Remote informs us of a resume: if we had paused, update back to receiving
        if (type === "resume") {
          setRecvQueue((rq) =>
            rq.map((r) =>
              r.transferId === transferId && r.status === "paused"
                ? { ...r, status: "receiving" }
                : r
            )
          );
          addLog(`▶️ Remote resumed receiving ${transferId}`);
          return;
        }
        // Remote informs us of cancel: 
        // Could be: 
        // - Sender sending cancel: we’re receiver -> abort receive
        // - Receiver sending cancel: we’re sender -> abort send
        if (type === "cancel") {
          // If we have this transfer in incoming (i.e., receiver side), abort receive
          if (incoming.current[transferId]) {
            // Abort the writer if exists
            try {
              incoming.current[transferId].writer.abort();
            } catch {}
            delete incoming.current[transferId];
            setRecvQueue((rq) =>
              rq.map((r) =>
          r.transferId === transferId ? { ...r, status: "canceled" } : r
              )
            );
            addLog(`🛑 Remote canceled receiving ${transferId}`);
            // Prevent further downloads by disabling streamSaver for this transfer
            // (No further action needed: abort() and delete from incoming prevents any more writes)
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
            addLog(`🛑 Remote canceled sending ${transferId}`);
          }
          return;
        }
        // Remote signals done: optional to show a log
        if (type === "done") {
          // Remote finished sending; but actual writer close happens on binary end detection
          addLog(`ℹ️ Remote finished sending ${transferId}`);
          return;
        }
        // CHUNK header: indicates next binary belongs to that transfer
        if (type === "chunk") {
          currentReceivingIdRef.current = transferId;
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
      // Check if this receive was canceled or paused
      const recvEntry = recvQueue.find((r) => r.transferId === transferId);
      if (recvEntry) {
        if (recvEntry.status === "canceled") {
          // skip writing further chunks
          currentReceivingIdRef.current = null;
          return;
        }
        if (recvEntry.status === "paused") {
          // skip writing until resume arrives
          return;
        }
      }

      try {
        rec.writer.write(new Uint8Array(event.data as ArrayBuffer));
      } catch (err) {
        console.error("Error writing chunk:", err);
        addLog(`❌ Error writing chunk for ${transferId}`);
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
      setMeta((m) => ({
        ...m,
        totalReceived: m.totalReceived + (event.data as ArrayBuffer).byteLength,
      }));
      // Update receive queue progress
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

      // If done
      if (rec.received >= rec.size) {
        try {
          rec.writer.close();
          addLog(`✅ File received completed: ${transferId}`);
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
    [addLog, recvQueue]
  );

  // Setup dataChannel
  useEffect(() => {
    if (!dataChannel) return;
    dataChannel.binaryType = "arraybuffer";
    dataChannel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;
    dataChannel.onmessage = handleMessage;
    dataChannel.onopen = () => {
      addLog("⚙️ Receiver: dataChannel open");
    };
    dataChannel.onclose = () => {
      addLog("ℹ️ dataChannel closed");
    };
    dataChannel.onerror = (err) => {
      console.error("RTCDataChannel error", err);
      addLog("❌ dataChannel error");
    };
    return () => {
      dataChannel.onmessage = null;
      dataChannel.onopen = null;
      dataChannel.onclose = null;
      dataChannel.onerror = null;
    };
  }, [dataChannel, handleMessage, addLog]);

  // Process sender queue: sequentially send queued items
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
        .add(() => pRetry(() => sendFile(t), { retries: 2 }))
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
  }, [queue, dataChannel, sendFile]);

  // Pause a transfer (sender)
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
    addLog(`⏸️ Paused transfer ${transferId}`);
  }, [addLog]);

  // Resume a paused transfer (sender)
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
    addLog(`▶️ Resumed transfer ${transferId}`);
  }, [addLog]);

  // Cancel a transfer (sender): mark status canceled locally, send cancel to remote
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
    addLog(`🛑 Canceled transfer locally ${transferId}`);
  }, [addLog, dataChannel]);

  // Cancel receive: mark in recvQueue as canceled, skip further writes, notify remote
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
    addLog(`🛑 Canceled receiving locally ${transferId}`);
  }, [addLog, dataChannel]);

  // Expose a user-friendly status string
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
    handleMessage, 
  };
}

"use client"
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

interface BenchmarkResult {
  chunkSizeKB: number;
  thresholdMultiplier: number;
  throughputMBps: number;
}

interface RealTimePoint {
  timeSec: number;
  throughput: number;
}

export default function TransferBenchmark() {
  // Peer connection and DataChannel refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  // Signaling state
  const [localSDP, setLocalSDP] = useState('');
  const [remoteSDP, setRemoteSDP] = useState('');
  const [isOfferer, setIsOfferer] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');

  // Benchmark parameters
  const [chunkSizesKB, setChunkSizesKB] = useState<string>('64,128,256');
  const [thresholdMultipliers, setThresholdMultipliers] = useState<string>('4,8,16');
  const TEST_TOTAL_MB = 20; // MB per test

  // Results
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  // Real-time state
  const [realTimeData, setRealTimeData] = useState<RealTimePoint[]>([]);
  const [currentLog, setCurrentLog] = useState<string[]>([]);
  const [currentTestConfig, setCurrentTestConfig] = useState<{chunkKB: number; mult: number} | null>(null);
  const [currentStats, setCurrentStats] = useState<{sentMB: number; elapsedSec: number; instMbps: number} | null>(null);

  // Utility: append log
  const log = (msg: string) => {
    setCurrentLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    // Initialize peer connection
    const pc = new RTCPeerConnection();
    pcRef.current = pc;
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);
      log(`Connection state: ${state}`);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        // ICE candidates are included in SDP automatically in most browsers with trickle disabled or enabled.
      }
    };
    pc.ondatachannel = (e) => {
      const receiveChannel = e.channel;
      dcRef.current = receiveChannel;
      log('Received DataChannel');
      setupDataChannel(receiveChannel);
    };
    return () => {
      pc.close();
      pcRef.current = null;
      dcRef.current = null;
    };
  }, []);

  // Setup DataChannel events
  const setupDataChannel = (dc: RTCDataChannel) => {
    dc.binaryType = 'arraybuffer';
    dc.onopen = () => {
      log('DataChannel open');
      setConnectionState('connected');
    };
    dc.onclose = () => {
      log('DataChannel closed');
      setConnectionState('disconnected');
    };
    dc.onerror = (e) => {
      console.error(e);
      log('DataChannel error');
    };
    dc.onmessage = (e) => {
      // Drain data for benchmark; no action needed beyond reading
      // Could count received bytes if validating
    };
  };

  // Create offer
  const createOffer = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const dc = pc.createDataChannel('benchmark', { ordered: true });
    dcRef.current = dc;
    setupDataChannel(dc);
    setIsOfferer(true);
    log('Creating offer...');
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const checkState = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', checkState);
      });
      const sdp = pc.localDescription?.sdp;
      setLocalSDP(sdp || '');
      log('Offer created');
    } catch (err) {
      console.error(err);
      log('Error creating offer');
    }
  };
  function fillRandom(buffer: Uint8Array) {
  const MAX = 65536; // max bytes per getRandomValues call
  let offset = 0;
  while (offset < buffer.length) {
    const sliceLength = Math.min(MAX, buffer.length - offset);
    // Create a view into the existing buffer
    const view = new Uint8Array(buffer.buffer, buffer.byteOffset + offset, sliceLength);
    crypto.getRandomValues(view);
    offset += sliceLength;
  }
}

  // Create answer
  const handleRemoteOffer = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    log('Setting remote offer and creating answer...');
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: remoteSDP }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      // Wait ICE
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const checkState = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', checkState);
      });
      const sdp = pc.localDescription?.sdp;
      setLocalSDP(sdp || '');
      log('Answer created');
    } catch (err) {
      console.error(err);
      log('Error setting remote offer');
    }
  };

  // Handle remote answer
  const handleRemoteAnswer = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    log('Setting remote answer...');
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: remoteSDP }));
      log('Remote answer set');
    } catch (err) {
      console.error(err);
      log('Error setting remote answer');
    }
  };

  // Run benchmark
  const runBenchmark = async () => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') {
      log('DataChannel not open');
      return;
    }
    setResults([]);
    setRealTimeData([]);
    setCurrentLog([]);
    log('Starting benchmark');
    setRunning(true);
    const sizes = chunkSizesKB.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    const mults = thresholdMultipliers.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    const newResults: BenchmarkResult[] = [];

    for (const sizeKB of sizes) {
      for (const mult of mults) {
        if (!dc || dc.readyState !== 'open') break;
        log(`Test: chunk ${sizeKB} KB, threshold x${mult}`);
        setCurrentTestConfig({ chunkKB: sizeKB, mult });
        const mbps = await runSingleTest(dc, sizeKB * 1024, mult);
        newResults.push({ chunkSizeKB: sizeKB, thresholdMultiplier: mult, throughputMBps: Number(mbps.toFixed(2)) });
        log(`Result: ${mbps.toFixed(2)} MB/s`);
      }
    }
    newResults.sort((a, b) => b.throughputMBps - a.throughputMBps);
    setResults(newResults);
    log('Benchmark completed');
    setCurrentTestConfig(null);
    setRunning(false);
  };

  // Run a single test, updating real-time state
  const runSingleTest = async (dc: RTCDataChannel, chunkSize: number, thresholdMultiplier: number): Promise<number> => {
    const totalBytes = TEST_TOTAL_MB * 1024 * 1024;
    const chunk = new Uint8Array(chunkSize);
    fillRandom(chunk);

    dc.bufferedAmountLowThreshold = chunkSize * thresholdMultiplier;

    let sent = 0;
    const startTime = performance.now();
    const dataPoints: RealTimePoint[] = [];
    let lastTime = startTime;
    let lastSent = 0;

    while (sent < totalBytes) {
      if (dc.bufferedAmount > chunkSize * thresholdMultiplier) {
        await new Promise<void>((res) => {
          const listener = () => {
            if (dc.bufferedAmount <= chunkSize * thresholdMultiplier) {
              dc.onbufferedamountlow = null;
              res();
            }
          };
          dc.bufferedAmountLowThreshold = chunkSize * thresholdMultiplier;
          dc.onbufferedamountlow = listener;
        });
      }
      dc.send(chunk.buffer);
      sent += chunkSize;
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const instThroughput = ((sent - lastSent) / ((now - lastTime) / 1000)) / (1024 * 1024);
      lastTime = now;
      lastSent = sent;
      // Update real-time data every 200ms
      if (dataPoints.length === 0 || elapsed - (dataPoints[dataPoints.length - 1].timeSec) >= 0.2) {
        dataPoints.push({ timeSec: elapsed, throughput: Number((sent / elapsed / (1024 * 1024)).toFixed(2)) });
        setRealTimeData([...dataPoints]);
        setCurrentStats({ sentMB: Number((sent / (1024 * 1024)).toFixed(2)), elapsedSec: Number(elapsed.toFixed(2)), instMbps: Number(instThroughput.toFixed(2)) });
      }
    }
    // Wait drain
    await new Promise<void>((res) => {
      if (dc.bufferedAmount === 0) return res();
      const listener = () => {
        if (dc.bufferedAmount === 0) {
          dc.onbufferedamountlow = null;
          res();
        }
      };
      dc.bufferedAmountLowThreshold = 0;
      dc.onbufferedamountlow = listener;
    });
    const endTime = performance.now();
    const totalSec = (endTime - startTime) / 1000;
    const throughput = totalBytes / totalSec / (1024 * 1024);
    // Final update
    dataPoints.push({ timeSec: totalSec, throughput: Number(throughput.toFixed(2)) });
    setRealTimeData([...dataPoints]);
    setCurrentStats({ sentMB: Number((totalBytes / (1024 * 1024)).toFixed(2)), elapsedSec: Number(totalSec.toFixed(2)), instMbps: Number(throughput.toFixed(2)) });
    return throughput;
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">DataChannel Transfer Benchmark</h2>
      {/* Signaling UI */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          className="px-4 py-2 rounded-lg shadow bg-blue-600 text-white"
          onClick={createOffer}
          disabled={connectionState !== 'disconnected'}
        >
          Create Offer
        </button>
        <textarea
          className="w-full h-32 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border rounded"
          placeholder="Local SDP"
          value={localSDP}
          readOnly
        />
        <textarea
          className="w-full h-32 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border rounded"
          placeholder="Paste remote SDP here"
          value={remoteSDP}
          onChange={(e) => setRemoteSDP(e.target.value)}
        />
        {isOfferer ? (
          <button
            className="px-4 py-2 rounded-lg shadow bg-green-600 text-white"
            onClick={handleRemoteAnswer}
            disabled={!remoteSDP || connectionState !== 'connecting'}
          >
            Set Remote Answer
          </button>
        ) : (
          <button
            className="px-4 py-2 rounded-lg shadow bg-green-600 text-white"
            onClick={handleRemoteOffer}
            disabled={!remoteSDP || connectionState !== 'disconnected'}
          >
            Set Remote Offer & Create Answer
          </button>
        )}
      </div>

      {/* Benchmark Parameters */}
      <div className="mb-4">
        <label className="block mb-1">Chunk Sizes (KB, comma-separated):</label>
        <input
          className="w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border rounded mb-2"
          value={chunkSizesKB}
          onChange={(e) => setChunkSizesKB(e.target.value)}
          disabled={running}
        />
        <label className="block mb-1">Threshold Multipliers (comma-separated):</label>
        <input
          className="w-full p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border rounded"
          value={thresholdMultipliers}
          onChange={(e) => setThresholdMultipliers(e.target.value)}
          disabled={running}
        />
      </div>

      {/* Run Benchmark */}
      <button
        className={`px-4 py-2 rounded-lg shadow ${dcRef.current && connectionState === 'connected' && !running ? 'bg-blue-600 text-white' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
        onClick={runBenchmark}
        disabled={!dcRef.current || connectionState !== 'connected' || running}
      >
        {running ? 'Running...' : 'Run Benchmark'}
      </button>

      {/* Status / Real-time */}
      {currentTestConfig && (
        <div className="mt-6 p-4 bg-white dark:bg-gray-700 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Current Test</h3>
          <p>Chunk Size: {currentTestConfig.chunkKB} KB, Threshold ×{currentTestConfig.mult}</p>
          {currentStats && (
            <p>Sent: {currentStats.sentMB} MB, Elapsed: {currentStats.elapsedSec}s, Throughput: {currentStats.instMbps} MB/s</p>
          )}
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={realTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeSec" label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Avg MB/s', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="throughput" stroke="#8884d8" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Results (sorted by throughput)</h3>
          <table className="min-w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <thead>
              <tr>
                <th className="px-4 py-2 border">Chunk Size (KB)</th>
                <th className="px-4 py-2 border">Threshold Multiplier</th>
                <th className="px-4 py-2 border">Throughput (MB/s)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res, idx) => (
                <tr key={idx} className={idx === 0 ? 'bg-green-100 dark:bg-green-700' : ''}>
                  <td className="px-4 py-2 border text-center">{res.chunkSizeKB}</td>
                  <td className="px-4 py-2 border text-center">{res.thresholdMultiplier}</td>
                  <td className="px-4 py-2 border text-center">{res.throughputMBps}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results[0] && (
            <p className="mt-2">Best setting: Chunk {results[0].chunkSizeKB} KB, Threshold ×{results[0].thresholdMultiplier}, ~{results[0].throughputMBps} MB/s</p>
          )}
        </div>
      )}

      {/* Logs */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Logs</h3>
        <div className="h-48 overflow-y-auto p-2 bg-white dark:bg-gray-700 border rounded text-sm font-mono">
          {currentLog.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Download, File, Pause, Play, X } from "lucide-react";
import { useState } from "react";
import { Switch } from "../ui/switch";
import Image from "next/image";

interface QueueTrayProp {
  title: string;
  items: any[];
  reciver?: boolean;
  pauseTransfer?: (id: string) => void;
  fileDownload?: (file: {
    transferId: string;
    blobUrl: string;
    directoryPath: string;
  }) => void;
  openfile?: (url: string) => void;
  allfileDownload?: () => void;
  autoDownload?: boolean;
  setAutoDownload?: (b: boolean) => void;
  resumeTransfer?: (id: string) => void;
  cancelTransfer?: (id: string) => void;
}

export function QueueTray({
  title,
  items,
  reciver = false,
  pauseTransfer,
  fileDownload,
  autoDownload,
  setAutoDownload,
  openfile,
  resumeTransfer,
  cancelTransfer,
}: QueueTrayProp) {
  const statusLabels: Record<string, string> = {
    queued: "Queued",
    sending: "Sending",
    paused: "Paused",
    done: "Done",
    error: "Error",
    canceled: "Canceled",
  };

  const [show, setShow] = useState(false);

  return (
    <div className="bg-[#f8f9fa] relative rounded-2xl shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {reciver && (
        <div className="absolute top-3 align-text-top right-5 flex gap-2">
          {/*  DOWNLOAD ALL TODO  */}
          <button
            className=" text-xs font-bold text-zinc-500 text-mono "
            onClick={() => setShow(true)}
          >
            Auto Download / not working ?
          </button>
        </div>
      )}
      {show && (
        <div className="absolute top-8 animate-fadeIn right-2 z-50 max-w-102 rounded-xl border bg-white p-4 shadow-xl dark:bg-zinc-900 dark:text-white">
          <div className="flex absolute top-3 right-3 items-center justify-between mb-3">
            <button onClick={() => setShow(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Switch
              checked={autoDownload}
              onCheckedChange={setAutoDownload}
              id="auto-download-toggle"
            />
            <label htmlFor="auto-download-toggle" className="text-sm">
              Auto-download
            </label>
          </div>

          {!autoDownload && (
            <p className="text-sm mb-2 text-orange-500">
              Auto-download is off. Please use the Download buttons shown next
              to files.
            </p>
          )}

          <p className="text-sm leading-snug">
            Some browsers block multiple automatic downloads for security
            reasons. If that happens:
          </p>
          <ul className="list-disc list-inside text-sm pl-2 mt-2">
            <li>Use the manual download buttons below each file.</li>
            <li className="text-orange-600">
              Use Opera (suggested) or different browser if site not working.
            </li>
            <li>For small multiple files, upload them as a ZIP archive.</li>
            <li>Try new session.</li>
            <li>Large files (~500MB+) are streamed directly to disk.</li>
          </ul>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 pb-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full text-zinc-400 py-8">
            <File className="w-8 h-8 mb-2" />
            <span className="text-sm">No items yet</span>
          </div>
        ) : (
          items.map((item) => (
            <div
  key={item.transferId}
  className="w-48 flex-shrink-0 rounded-2xl border border-zinc-100 bg-white shadow-md hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden"
>
  {/* Thumbnail or Icon */}
  {item.thumbnail ? (
    <div className="w-full h-32 bg-zinc-100">
      <Image
        src={item.thumbnail}
        alt="Thumbnail"
        width={224}
        height={128}
        className="w-full h-full object-cover"
      />
    </div>
  ) : (
    <div className="w-full h-32 bg-zinc-100 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center shadow-inner">
        <File className="w-6 h-6 text-zinc-500" />
      </div>
    </div>
  )}

  {/* File Info */}
  <div className="flex flex-col items-center text-center px-3 py-2 gap-1">
    <span className="text-sm font-medium text-zinc-800 truncate w-full">
      {item.file?.name || item.name || item.directoryPath}
    </span>

    {/* Progress Bar */}
    <div className="w-full h-1.5 rounded-full bg-zinc-200 overflow-hidden shadow-inner">
      <div
        className="h-full bg-orange-500 transition-all duration-300"
        style={{ width: `${item.progress || 0}%` }}
      />
    </div>

    {/* Status Row */}
    <div className="w-full flex justify-between text-[11px] text-zinc-500 mt-1 font-medium">
      <span>{item.progress}%</span>
      <span>{statusLabels[item.status] || item.status}</span>
    </div>
  </div>

  {/* Action Buttons */}
  <div className="w-full flex justify-center items-center gap-2 py-2 mb-1 border-zinc-100">
    {reciver ? (
      <>
        {item.status !== "done" && item.status !== "canceled" && (
          <button
            className="rounded-full p-1.5 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition"
            onClick={() => cancelTransfer?.(item.transferId)}
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {item.status === "done" && item.downloaded ? (
          <p className="text-[11px] text-zinc-500 font-semibold">Downloaded</p>
        ) : (
          item.status === "done" &&
          !autoDownload &&
          item.blobUrl && (
            <button
              className="rounded-full p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-500 border border-blue-200 transition"
              onClick={() => fileDownload?.(item)}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )
        )}
      </>
    ) : (
      <>
        {item.status === "paused" && (
          <button
            className="rounded-full p-1.5 bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 transition"
            onClick={() => resumeTransfer?.(item.transferId)}
            title="Resume"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
        {item.status === "sending" && (
          <button
            className="rounded-full p-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 border border-yellow-200 transition"
            onClick={() => pauseTransfer?.(item.transferId)}
            title="Pause"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
        {item.status !== "done" && item.status !== "canceled" && (
          <button
            className="rounded-full p-1.5 bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition"
            onClick={() => cancelTransfer?.(item.transferId)}
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </>
    )}
  </div>
</div>

          ))
        )}
      </div>
    </div>
  );
}
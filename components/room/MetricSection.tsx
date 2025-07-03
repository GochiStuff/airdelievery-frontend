import { ArrowDown, ArrowUp, Gauge } from "lucide-react";

export function MetricsSection({ meta }: { meta: any }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm p-5 max-h-72 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-zinc-800">Overall Metrics</h2>
        </div>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto">
        <MetricCard
          label="Sent"
          value={`${(meta.totalSent / 1e9).toFixed(2)} GB`}
          icon={<ArrowUp className="w-5 h-5 text-orange-500" />}
        />
        <MetricCard
          label="Received"
          value={`${(meta.totalReceived / 1e9).toFixed(2)} GB`}
          icon={<ArrowDown className="w-5 h-5 text-orange-500" />}
        />
        <MetricCard
          label="Speed"
          value={
            meta.speedBps >= 1048576
              ? `${(meta.speedBps / 1048576).toFixed(2)} MB/s`
              : `${(meta.speedBps / 1024).toFixed(2)} KB/s`
          }
          icon={<Gauge className="w-5 h-5 text-orange-500" />}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="w-full flex items-center gap-3 rounded-xl px-3 py-2 border border-zinc-200 hover:border-orange-400 hover:bg-orange-50 transition bg-white text-left">
      <div className="bg-orange-100 p-1 rounded-full">{icon}</div>
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium text-zinc-900 truncate">
          {label}
        </span>
        <span className="text-xs text-zinc-500 font-mono truncate">
          {value}
        </span>
      </div>
    </div>
  );
}

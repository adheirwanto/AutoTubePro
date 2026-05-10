import { useState, useEffect } from "react";
import {
  Download,
  Trash2,
  Loader2,
  Play
} from "lucide-react";
import { getSocket } from "../lib/socket";
import { RenderJob } from "../types";

export default function RenderQueue() {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const fetchJobs = async () => {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        setJobs(Array.isArray(data) ? data.reverse() : []);
      } catch (err) {
        console.error("Fetch error:", err);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();

    const socket = getSocket();

    socket.off("job_update");

    socket.on("job_update", (updatedJob: RenderJob) => {
      setJobs(prev => {
        const index = prev.findIndex(j => j.id === updatedJob.id);

        if (index === -1) return [updatedJob, ...prev];

        const copy = [...prev];
        copy[index] = { ...copy[index], ...updatedJob };

        return copy;
      });
    });

    return () => {
      socket.off("job_update");
    };

  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Render Queue</h2>

      {jobs.length === 0 && (
        <div className="text-center text-gray-500">
          Belum ada render
        </div>
      )}

      {jobs.map(job => (
        <RenderJobCard key={job.id} job={job} setJobs={setJobs} />
      ))}
    </div>
  );
}

// ================= CARD =================

function RenderJobCard({ job, setJobs }: { job: RenderJob; setJobs: React.Dispatch<React.SetStateAction<RenderJob[]>> }) {

  const videoUrl = job?.file
    ? `/renders/${job.file}`
    : null;

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "0s";

    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);

    return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
  };

  const handleDelete = async () => {
    if (!confirm("Hapus job ini?")) return;

    try {
      await fetch(`/api/jobs/${job.id}`, {
        method: "DELETE"
      });

      setJobs((prev) => prev.filter(j => j.id !== job.id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Gagal hapus job");
    }
  };

  const getStatus = () => {
    if (job?.status === "done") return "DONE";
    if (job?.status === "failed") return "FAILED";
    return "PROCESSING";
  };

  const getColor = () => {
    if (job?.status === "done") return "text-green-400";
    if (job?.status === "failed") return "text-red-400";
    return "text-cyan-400";
  };

  return (
    <div className="bg-black/50 border border-gray-800 rounded-xl p-5 space-y-4">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-white font-bold">
            JOB-{job?.id?.slice(0, 6)}
          </p>
          <p className={`text-xs ${getColor()}`}>
            {getStatus()}
          </p>
        </div>

        <div className="flex gap-2">
          {videoUrl && (
            <a href={videoUrl} target="_blank" className="p-2 bg-cyan-500 text-black rounded">
              <Play size={16} />
            </a>
          )}

          {videoUrl && (
            <a href={videoUrl} download className="p-2 bg-green-500 text-black rounded">
              <Download size={16} />
            </a>
          )}

          <button onClick={handleDelete} className="p-2 bg-red-500 text-white rounded">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* VIDEO */}
      {videoUrl && job?.status === "done" && (
        <video
          src={videoUrl}
          controls
          className="w-full rounded border border-gray-700"
        />
      )}

      {/* PROGRESS */}
      <div className="w-full bg-gray-800 h-2 rounded overflow-hidden">
        <div
          className={`h-2 transition-all duration-300 ${
            job?.status === "done"
              ? "bg-green-500"
              : job?.status === "failed"
              ? "bg-red-500"
              : "bg-cyan-500"
          }`}
          style={{ width: `${job?.progress || 0}%` }}
        />
      </div>

      {/* INFO */}
      {job?.status === "processing" && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatTime(job?.duration)}</span>
          <span className="text-cyan-400 font-mono">
            {Math.floor(job?.progress || 0)}%
          </span>
        </div>
      )}
    </div>
  );
}

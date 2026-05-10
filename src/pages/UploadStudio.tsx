import { useCallback, useEffect, useMemo, useState } from "react";
import { Upload, Sparkles, Calendar, Video, User } from "lucide-react";

const API = "http://localhost:3000";

type Account = { id: string; name: string; subscribers?: string | number };
type Job = { id: string; file: string; status: string };

const QUICK_1080_PRESET = {
  resolution: "1920x1080",
  fps: 30,
  codec: "h264",
  crf: 24,
  preset: "veryfast",
  audioBitrate: "128k",
};

export default function UploadStudio() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [accountId, setAccountId] = useState("");
  const [video, setVideo] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState("private");
  const [schedule, setSchedule] = useState("");

  const [bulk, setBulk] = useState(false);
  const [interval, setIntervalHours] = useState(24);
  const [total, setTotal] = useState(5);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const doneJobs = useMemo(() => jobs.filter((j) => j.status === "done"), [jobs]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accRes, jobRes] = await Promise.all([
        fetch(`${API}/api/accounts`),
        fetch(`${API}/api/jobs`),
      ]);

      if (!accRes.ok || !jobRes.ok) {
        throw new Error("Gagal memuat akun/jobs");
      }

      const [acc, job] = await Promise.all([accRes.json(), jobRes.json()]);
      setAccounts(Array.isArray(acc) ? acc : []);
      setJobs(Array.isArray(job) ? job : []);
    } catch (error) {
      console.error(error);
      alert("Gagal load data. Cek API server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const generateTitle = () => setTitle("🔥 Viral Relaxing Music for Deep Sleep (10 Hours)");
  const generateTags = () => setTags("sleep,relax,meditation,calm,lofi,deep sleep");

  const upload = async () => {
    if (!accountId || !video || !title.trim()) {
      alert("Lengkapi data dulu");
      return;
    }

    setIsUploading(true);
    try {
      const res = await fetch(`${API}/api/upload-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          videoPath: video,
          title: title.trim(),
          description: desc,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          privacyStatus: privacy,
          publishAt: schedule || null,
          renderPreset: QUICK_1080_PRESET,
        }),
      });

      if (!res.ok) {
        throw new Error(`Upload gagal (${res.status})`);
      }

      alert("🚀 Upload success (1080p quick preset)");
    } catch (error) {
      console.error(error);
      alert("Upload gagal. Cek log console/server.");
    } finally {
      setIsUploading(false);
    }
  };

  const generateBulk = async () => {
    const res = await fetch(`${API}/api/bulk-schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: schedule, intervalHours: interval, total }),
    });

    const data = await res.json();
    console.log("Bulk schedule:", data);
    alert("Bulk schedule generated (cek console)");
  };

  return (
    <div className="p-8 text-white space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold cyber-header">🚀 Upload Studio</h1>
        <p className="text-gray-500 text-sm">Fast 1080p preset (CPU-safe) → Upload → Schedule</p>
      </div>

      <div className="cyber-panel p-4 space-y-2">
        <h3 className="flex items-center text-sm text-cyan-400">
          <User size={16} className="mr-2" /> Select Channel
        </h3>
        <select className="cyber-input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Select channel</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.subscribers ?? 0})
            </option>
          ))}
        </select>
      </div>

      <div className="cyber-panel p-4 space-y-2">
        <h3 className="flex items-center text-sm text-cyan-400">
          <Video size={16} className="mr-2" /> Select Rendered Video
        </h3>
        <select className="cyber-input" value={video} onChange={(e) => setVideo(e.target.value)}>
          <option value="">Select video</option>
          {doneJobs.map((j) => (
            <option key={j.id} value={j.file}>
              {j.file}
            </option>
          ))}
        </select>
      </div>

      <div className="cyber-panel p-4 space-y-3">
        <h3 className="flex items-center text-sm text-cyan-400">
          <Sparkles size={16} className="mr-2" /> AI Generator
        </h3>
        <div className="flex gap-2">
          <button className="cyber-button" onClick={generateTitle}>Generate Title</button>
          <button className="cyber-button" onClick={generateTags}>Generate Tags</button>
        </div>
      </div>

      <div className="cyber-panel p-4 space-y-3">
        <input placeholder="Title" className="cyber-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Description" className="cyber-input" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <input placeholder="Tags (comma separated)" className="cyber-input" value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>

      <div className="cyber-panel p-4 space-y-3">
        <h3 className="flex items-center text-sm text-cyan-400"><Calendar size={16} className="mr-2" /> Schedule</h3>
        <select className="cyber-input" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
          <option value="private">Private</option>
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
        </select>
        <input type="datetime-local" className="cyber-input" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
      </div>

      <div className="cyber-panel p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm text-cyan-400">
          <input type="checkbox" checked={bulk} onChange={(e) => setBulk(e.target.checked)} /> Enable Bulk Upload
        </label>
        {bulk && (
          <>
            <input type="number" placeholder="Interval (hours)" className="cyber-input" value={interval} onChange={(e) => setIntervalHours(Number(e.target.value))} />
            <input type="number" placeholder="Total videos" className="cyber-input" value={total} onChange={(e) => setTotal(Number(e.target.value))} />
            <button className="cyber-button" onClick={generateBulk}>Generate Schedule</button>
          </>
        )}
      </div>

      <button onClick={upload} disabled={isUploading || isLoading} className="w-full py-3 cyber-button flex items-center justify-center text-sm disabled:opacity-50">
        <Upload size={18} className="mr-2" />
        {isUploading ? "Uploading..." : isLoading ? "Loading..." : "Upload to YouTube"}
      </button>
    </div>
  );
}
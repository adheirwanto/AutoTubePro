import { useEffect, useMemo, useState } from "react";

type Job = {
  id: string;
  status: string;
  progress?: number;
  file?: string | null;
  error?: string | null;
  duration?: number;
};

type UploadResult = {
  video: string;
  audio?: string | null;
};

const API = ""; // pakai Vite proxy (/api -> localhost:3000)

// Durasi looping (detik)
const DURATION_OPTIONS = [
  { label: "1 Jam", value: 3600 },
  { label: "3 Jam", value: 10800 },
  { label: "5 Jam", value: 18000 },
  { label: "10 Jam", value: 36000 },
];

// Kualitas render
const QUALITY_OPTIONS = [
  { label: "720p (Fast)", value: "720" },
  { label: "1080p (HQ)", value: "1080" },
];

export default function VideoBuilder() {
  // upload inputs
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);

  // backend filenames hasil upload
  const [uploadedVideoName, setUploadedVideoName] = useState("");
  const [uploadedMusicName, setUploadedMusicName] = useState("");

  // render options
  const [duration, setDuration] = useState<number>(3600);
  const [quality, setQuality] = useState<"720" | "1080">("1080");

  // UI states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isUploadingAssets, setIsUploadingAssets] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const doneJobs = useMemo(
    () => jobs.filter((j) => (j.status || "").toLowerCase() === "done" && j.file),
    [jobs]
  );

  async function loadJobs() {
    try {
      const res = await fetch(`${API}/api/jobs`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load jobs failed:", err);
    }
  }

  useEffect(() => {
    void loadJobs();
    const timer = setInterval(() => void loadJobs(), 2000);
    return () => clearInterval(timer);
  }, []);

  async function uploadSingle(kind: "video" | "audio", file: File): Promise<string> {
    const form = new FormData();

    // server lama banyak yang expect field "video"
    // jadi audio juga kita upload via field "video" agar kompatibel
    form.append("video", file);

    const res = await fetch(`${API}/api/upload`, {
      method: "POST",
      body: form,
    });

    const data: UploadResult = await res.json();

    if (!res.ok || !data?.video) {
      throw new Error(`Upload ${kind} gagal (${res.status})`);
    }

    return data.video;
  }

  async function handleUploadAssets() {
    if (!videoFile) {
      alert("Pilih file video dulu.");
      return;
    }

    setIsUploadingAssets(true);
    try {
      const uploadedVideo = await uploadSingle("video", videoFile);
      setUploadedVideoName(uploadedVideo);

      if (musicFile) {
        const uploadedAudio = await uploadSingle("audio", musicFile);
        setUploadedMusicName(uploadedAudio);
      } else {
        setUploadedMusicName("");
      }

      alert("✅ File berhasil di-upload. Lanjut klik Start Render.");
    } catch (err) {
      console.error(err);
      alert("Upload file gagal. Cek console/server log.");
    } finally {
      setIsUploadingAssets(false);
    }
  }

  async function handleRender() {
    if (!uploadedVideoName) {
      alert("Upload video dulu sebelum render.");
      return;
    }

    setIsRendering(true);
    try {
      // kirim opsi kualitas + preset agar backend bisa pakai kalau sudah support
      const payload = {
        video: uploadedVideoName,
        audio: uploadedMusicName || null,
        duration, // 1h/3h/5h/10h
        quality, // "720" | "1080"
        renderPreset:
          quality === "1080"
            ? {
                resolution: "1920x1080",
                fps: 30,
                codec: "h264",
                crf: 23,
                preset: "veryfast",
                audioBitrate: "160k",
              }
            : {
                resolution: "1280x720",
                fps: 30,
                codec: "h264",
                crf: 24,
                preset: "superfast",
                audioBitrate: "128k",
              },
      };

      const res = await fetch(`${API}/api/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Render error:", data);
        throw new Error(`Render gagal (${res.status})`);
      }

      alert("🚀 Render dimulai");
      await loadJobs();
    } catch (err) {
      console.error(err);
      alert("Render gagal. Cek log server.");
    } finally {
      setIsRendering(false);
    }
  }

  function sendToUploadStudio(fileName: string) {
    // kirim pilihan render ke halaman upload studio
    localStorage.setItem("selectedRenderedVideo", fileName);
    alert("✅ Video dipilih untuk Upload Studio. Buka tab Upload Studio.");
  }

  function sendToLiveManager(fileName: string) {
    // kirim pilihan render ke halaman live manager
    localStorage.setItem("selectedLiveVideo", fileName);
    alert("✅ Video dipilih untuk Live Manager. Buka tab Live Manager.");
  }

  return (
    <div className="max-w-5xl mx-auto p-6 text-white space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🎬 Video Render Studio</h1>
        <p className="text-sm text-gray-400">
          Upload video + musik, pilih durasi loop & kualitas, render cepat dan halus.
        </p>
      </div>

      {/* Upload Section */}
      <div className="rounded-xl border border-cyan-900/30 p-4 space-y-4 bg-black/30">
        <h2 className="text-cyan-400 font-semibold">1) Upload Asset</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300 block mb-2">Masukan Video</label>
            <input
              type="file"
              accept="video/*"
              className="w-full p-2 rounded bg-zinc-900 border border-zinc-700"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-gray-400 mt-1">
              {videoFile ? `Selected: ${videoFile.name}` : "Belum pilih video"}
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-2">Masukan Musik (opsional)</label>
            <input
              type="file"
              accept="audio/*"
              className="w-full p-2 rounded bg-zinc-900 border border-zinc-700"
              onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-gray-400 mt-1">
              {musicFile ? `Selected: ${musicFile.name}` : "Belum pilih musik"}
            </p>
          </div>
        </div>

        <button
          onClick={handleUploadAssets}
          disabled={isUploadingAssets}
          className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
        >
          {isUploadingAssets ? "Uploading..." : "Upload File"}
        </button>

        <div className="text-xs text-gray-400 space-y-1">
          <p>Uploaded video: {uploadedVideoName || "-"}</p>
          <p>Uploaded music: {uploadedMusicName || "-"}</p>
        </div>
      </div>

      {/* Render Settings */}
      <div className="rounded-xl border border-cyan-900/30 p-4 space-y-4 bg-black/30">
        <h2 className="text-cyan-400 font-semibold">2) Render Settings</h2>

        <div>
          <p className="text-sm text-gray-300 mb-2">Pilih Durasi Looping</p>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDuration(d.value)}
                className={`px-3 py-2 rounded border text-sm transition ${
                  duration === d.value
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                    : "bg-zinc-900 border-zinc-700 text-gray-300 hover:border-cyan-700"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-300 mb-2">Pilih Kualitas Render</p>
          <div className="flex flex-wrap gap-2">
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q.value}
                onClick={() => setQuality(q.value as "720" | "1080")}
                className={`px-3 py-2 rounded border text-sm transition ${
                  quality === q.value
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                    : "bg-zinc-900 border-zinc-700 text-gray-300 hover:border-cyan-700"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRender}
          disabled={isRendering || isUploadingAssets}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
        >
          {isRendering ? "Rendering..." : "Start Render"}
        </button>

        <p className="text-xs text-gray-400">
          Tips cepat & halus: 1080p + preset veryfast + crf 23 (seimbang kualitas/kecepatan).
        </p>
      </div>

      {/* Jobs */}
      <div className="rounded-xl border border-cyan-900/30 p-4 space-y-3 bg-black/30">
        <h2 className="text-cyan-400 font-semibold">3) Render Queue</h2>

        {jobs.length === 0 && <p className="text-gray-400 text-sm">Belum ada job render.</p>}

        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="text-sm grid md:grid-cols-5 gap-2">
                <p><span className="text-gray-400">ID:</span> {j.id}</p>
                <p><span className="text-gray-400">Status:</span> {j.status}</p>
                <p><span className="text-gray-400">Progress:</span> {Math.floor(j.progress || 0)}%</p>
                <p>
                  <span className="text-gray-400">Durasi:</span>{" "}
                  {j.duration ? `${Math.round((j.duration || 0) / 3600)} jam` : "-"}
                </p>
                <p><span className="text-gray-400">File:</span> {j.file || "-"}</p>
              </div>

              {j.error ? <p className="text-red-400 text-sm mt-2">Error: {j.error}</p> : null}

              {j.file ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  <a
                    href={`/renders/${j.file}`}
                    download
                    className="px-3 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-sm"
                  >
                    Download
                  </a>

                  <button
                    onClick={() => sendToUploadStudio(j.file!)}
                    className="px-3 py-2 rounded bg-purple-700 hover:bg-purple-600 text-sm"
                  >
                    Send to Upload Studio
                  </button>

                  <button
                    onClick={() => sendToLiveManager(j.file!)}
                    className="px-3 py-2 rounded bg-orange-700 hover:bg-orange-600 text-sm"
                  >
                    Send to Live Manager
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Done summary */}
      <div className="rounded-xl border border-cyan-900/30 p-4 bg-black/30">
        <h2 className="text-cyan-400 font-semibold mb-2">4) Hasil Render Selesai</h2>
        {doneJobs.length === 0 ? (
          <p className="text-gray-400 text-sm">Belum ada hasil render selesai.</p>
        ) : (
          <ul className="list-disc ml-6 text-sm text-gray-200 space-y-1">
            {doneJobs.map((j) => (
              <li key={j.id}>
                <a
                  href={`/renders/${j.file}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 underline"
                >
                  {j.file}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
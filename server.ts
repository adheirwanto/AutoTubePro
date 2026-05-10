// --- AutoTubePro Server ---

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs-extra";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import { google } from "googleapis";
import os from "os";

// --- Interfaces ---

interface Account {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
  channelId: string;
  projectId: string;
  tokens: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
    [key: string]: unknown;
  };
}

interface Project {
  id: string;
  client_id: string;
  client_secret: string;
}

interface RenderJob {
  id: string;
  status: "processing" | "done" | "failed";
  progress: number;
  duration: number;
  quality: string;
  file: string | null;
  error: string | null;
  url?: string;
  createdAt: string;
}

interface QueueItem {
  id: string;
  accountId: string;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: string;
  publishAt?: string | null;
  status: "pending" | "uploading" | "done" | "failed";
  attempts: number;
  error?: string | null;
  videoId?: string;
}

interface RenderOptions {
  video: string;
  audio: string | null;
  duration: number;
  quality: string;
  renderPreset: {
    resolution?: string;
    fps?: number;
    codec?: string;
    crf?: number;
    preset?: string;
    audioBitrate?: string;
  } | null;
}

interface StreamProcess {
  id: string;
  videoPath: string;
  rtmpUrl: string;
  streamKey: string;
  status: "live" | "stopped";
  pid?: number;
}

// --- Configuration ---

const app = express();
const httpServer = createServer(app);

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const CALLBACK_URL = process.env.OAUTH_CALLBACK_URL || `${APP_URL}/auth/callback`;

const FRONTEND_ORIGINS = (
  process.env.FRONTEND_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const PUBLIC_DIR = path.join(ROOT, "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const RENDERS_DIR = path.join(PUBLIC_DIR, "renders");
const ACCOUNTS_FILE = path.join(ROOT, "accounts.json");
const PROJECTS_FILE = path.join(ROOT, "projects.json");
const QUEUE_FILE = path.join(ROOT, "uploadQueue.json");

// --- Socket.io ---

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGINS,
    credentials: true,
  },
});

// --- Init directories ---

fs.ensureDirSync(PUBLIC_DIR);
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(RENDERS_DIR);

// --- Helpers ---

function readJsonSafe<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return fs.readJsonSync(filePath) as T;
  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath: string, data: unknown): void {
  fs.writeJsonSync(filePath, data, { spaces: 2 });
}

function parseTimeToSec(timeStr: string): number {
  const m = timeStr.match(/(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function createOAuthClient(project: Project) {
  return new google.auth.OAuth2(
    project.client_id,
    project.client_secret,
    CALLBACK_URL
  );
}

function sanitizeUploadName(name: string): string {
  return path.basename(String(name || "")).trim();
}

function resolveUploadFile(name: string): string | null {
  const clean = sanitizeUploadName(name);
  if (!clean) return null;
  const candidate = path.join(UPLOADS_DIR, clean);
  return fs.existsSync(candidate) ? candidate : null;
}

function checkFfmpeg(): { ok: boolean; bin: string } {
  const bin = process.env.FFMPEG_PATH || "ffmpeg";
  const probe = spawnSync(bin, ["-version"], { stdio: "ignore" });
  return { ok: probe.status === 0, bin };
}

// --- CPU usage tracking ---

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

function getCpuPercent(): number {
  const now = Date.now();
  const currentUsage = process.cpuUsage(lastCpuUsage);
  const elapsedMs = now - lastCpuTime;
  if (elapsedMs === 0) return 0;
  const totalMicros = currentUsage.user + currentUsage.system;
  const percent = (totalMicros / 1000 / elapsedMs) * 100;
  lastCpuUsage = process.cpuUsage();
  lastCpuTime = now;
  return Math.min(Math.round(percent * 10) / 10, 100);
}

// --- State ---

let jobs: RenderJob[] = [];
let queue: QueueItem[] = readJsonSafe<QueueItem[]>(QUEUE_FILE, []);
let accounts: Account[] = readJsonSafe<Account[]>(ACCOUNTS_FILE, []);
let projects: Project[] = readJsonSafe<Project[]>(PROJECTS_FILE, []);
let uploading = false;
const activeStreams: StreamProcess[] = [];
const streamProcesses = new Map<string, ChildProcess>();

// --- Middleware ---

app.use(cors({ origin: FRONTEND_ORIGINS, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.static(PUBLIC_DIR));
app.use("/renders", express.static(RENDERS_DIR));

// --- Routes: Root ---

app.get("/", (_, res) => {
  res.status(200).send(`
    <html>
      <head><title>AutoTubePro</title></head>
      <body style="font-family:Arial;padding:30px">
        <h1>AutoTubePro Server</h1>
        <ul>
          <li><a href="/api/health">Health</a></li>
          <li><a href="/api/system/usage">System Usage</a></li>
          <li><a href="/api/jobs">Jobs</a></li>
          <li><a href="/api/accounts">Accounts</a></li>
          <li><a href="/api/projects">Projects</a></li>
          <li><a href="/api/queue">Queue</a></li>
        </ul>
      </body>
    </html>
  `);
});

// --- Routes: Health ---

app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    port: PORT,
    root: ROOT,
    appUrl: APP_URL,
    callbackUrl: CALLBACK_URL,
    uploadsDir: UPLOADS_DIR,
    rendersDir: RENDERS_DIR,
    jobs: jobs.length,
    queue: queue.length,
    ffmpeg: checkFfmpeg(),
    origins: FRONTEND_ORIGINS,
  });
});

// --- Routes: System Usage ---

app.get("/api/system/usage", (_, res) => {
  try {
    const processing = jobs.filter((j) => j.status === "processing").length;
    const done = jobs.filter((j) => j.status === "done").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const pending = queue.filter((q) => q.status === "pending").length;
    const uploadingCount = queue.filter((q) => q.status === "uploading").length;

    const ramUsage = (process.memoryUsage().rss / os.totalmem()) * 100;

    res.json({
      cpu: getCpuPercent(),
      ram: Math.round(ramUsage * 10) / 10,
      gpu: null,
      processing,
      done,
      failed,
      pending,
      uploading: uploadingCount,
      totalJobs: jobs.length,
      totalQueue: queue.length,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// --- Routes: Projects ---

app.post("/api/projects", (req, res) => {
  const { client_id, client_secret } = req.body || {};
  if (!client_id || typeof client_id !== "string" || !client_id.trim()) {
    return res.status(400).json({ error: "client_id is required and must be a non-empty string" });
  }
  if (!client_secret || typeof client_secret !== "string" || !client_secret.trim()) {
    return res.status(400).json({ error: "client_secret is required and must be a non-empty string" });
  }

  const project: Project = {
    id: uuidv4(),
    client_id: client_id.trim(),
    client_secret: client_secret.trim(),
  };
  projects.push(project);
  writeJsonSafe(PROJECTS_FILE, projects);
  res.json(project);
});

app.get("/api/projects", (_, res) => {
  res.json(projects);
});

app.delete("/api/projects/:id", (req, res) => {
  projects = projects.filter((p) => p.id !== req.params.id);
  writeJsonSafe(PROJECTS_FILE, projects);
  res.json({ ok: true });
});

// --- Routes: YouTube Auth ---

app.get("/auth/youtube/:projectId", (req, res) => {
  const project = projects.find((p) => p.id === req.params.projectId);
  if (!project) {
    return res.status(404).send("Project not found");
  }

  const oauth = createOAuthClient(project);
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.upload",
    ],
    state: project.id,
  });
  res.redirect(url);
});

// --- Routes: OAuth Callback ---

app.get("/auth/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const projectId = req.query.state as string;
    if (!code || !projectId) {
      return res.status(400).send("Missing code or state parameter");
    }

    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return res.status(404).send("Project not found");
    }

    const oauth = createOAuthClient(project);
    const { tokens } = await oauth.getToken(code);
    oauth.setCredentials(tokens);

    const youtube = google.youtube({ version: "v3", auth: oauth });
    const channel = await youtube.channels.list({
      part: ["snippet", "statistics"],
      mine: true,
    });

    const data = channel.data.items?.[0];
    if (!data) {
      return res.status(400).send("Channel not found");
    }

    const account: Account = {
      id: uuidv4(),
      name: data.snippet?.title || "Unknown",
      avatar: data.snippet?.thumbnails?.default?.url || "",
      subscribers: data.statistics?.subscriberCount || "0",
      channelId: data.id || "",
      projectId,
      tokens: tokens as Account["tokens"],
    };

    accounts.push(account);
    writeJsonSafe(ACCOUNTS_FILE, accounts);
    console.log("Connected:", account.name);
    res.send(`<script>window.close()</script>`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("OAuth error:", message);
    res.status(500).send("OAuth Failed");
  }
});

// --- Routes: Accounts ---

app.get("/api/accounts", (_, res) => {
  res.json(accounts);
});

app.delete("/api/accounts/:id", (req, res) => {
  accounts = accounts.filter((a) => a.id !== req.params.id);
  writeJsonSafe(ACCOUNTS_FILE, accounts);
  res.json({ ok: true });
});

// --- Routes: File Upload ---

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.post("/api/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "file missing" });
  }
  res.json({ video: req.file.filename });
});

// --- Routes: Jobs ---

app.get("/api/jobs", (_, res) => {
  res.json(jobs);
});

app.delete("/api/jobs/:id", (req, res) => {
  jobs = jobs.filter((j) => j.id !== req.params.id);
  res.json({ ok: true });
});

// --- Routes: Render ---

app.post("/api/render", (req, res) => {
  const video = req.body?.video;
  const audio = req.body?.audio || null;
  const duration = Number(req.body?.duration) || 20;
  const quality = String(req.body?.quality || "1080");
  const renderPreset = req.body?.renderPreset || null;

  if (!video || typeof video !== "string" || !video.trim()) {
    return res.status(400).json({ error: "video is required and must be a non-empty string" });
  }

  const job: RenderJob = {
    id: uuidv4(),
    status: "processing",
    progress: 0,
    duration,
    quality,
    file: null,
    error: null,
    createdAt: new Date().toISOString(),
  };

  jobs.unshift(job);
  io.emit("job_update", job);

  startRender(job, { video, audio, duration, quality, renderPreset });
  res.json(job);
});

// --- Render Logic ---

function startRender(job: RenderJob, opts: RenderOptions): void {
  const { video, audio, duration, quality, renderPreset } = opts;

  const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";
  const ffmpegCheck = checkFfmpeg();

  if (!ffmpegCheck.ok) {
    job.status = "failed";
    job.error = "FFmpeg not installed";
    io.emit("job_update", job);
    return;
  }

  const inputVideo = resolveUploadFile(video);
  const inputAudio = audio ? resolveUploadFile(audio) : null;
  const hasAudio = !!inputAudio;

  if (!inputVideo) {
    job.status = "failed";
    job.error = "Video not found";
    io.emit("job_update", job);
    return;
  }

  const outputFile = `output-${job.id}.mp4`;
  const output = path.join(RENDERS_DIR, outputFile);

  const resolution =
    renderPreset?.resolution ||
    (quality === "720" ? "1280x720" : "1920x1080");
  const [w, h] = resolution.split("x");
  const scalePad = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
  const preset = renderPreset?.preset || "veryfast";
  const crf = String(renderPreset?.crf ?? (quality === "720" ? 24 : 23));
  const fps = String(renderPreset?.fps ?? 30);

  const args = [
    "-y",
    "-hide_banner",
    "-stream_loop", "-1",
    "-i", inputVideo,
    ...(hasAudio ? ["-stream_loop", "-1", "-i", inputAudio!] : []),
    "-t", String(duration),
    "-r", fps,
    "-vf", scalePad,
    "-c:v", "libx264",
    "-preset", preset,
    "-crf", crf,
    "-pix_fmt", "yuv420p",
    ...(hasAudio
      ? ["-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "160k"]
      : ["-an"]),
    "-movflags", "+faststart",
    "-shortest",
    output,
  ];

  const ff = spawn(ffmpegBin, args);

  ff.stderr.on("data", (data: Buffer) => {
    const s = data.toString();
    const timeMatch = s.match(/time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
    if (timeMatch?.[1]) {
      const current = parseTimeToSec(timeMatch[1]);
      job.progress = Math.min((current / duration) * 100, 100);
      io.emit("job_update", job);
    }
  });

  ff.on("close", (code) => {
    if (code === 0 && fs.existsSync(output)) {
      job.status = "done";
      job.progress = 100;
      job.file = outputFile;
      job.url = `/renders/${outputFile}`;
    } else {
      job.status = "failed";
      job.error = `Render failed (${code})`;
    }
    io.emit("job_update", job);
  });
}

// --- Routes: Queue ---

app.post("/api/queue", (req, res) => {
  const { accountId, videoPath } = req.body || {};
  if (!accountId || typeof accountId !== "string") {
    return res.status(400).json({ error: "accountId is required" });
  }
  if (!videoPath || typeof videoPath !== "string") {
    return res.status(400).json({ error: "videoPath is required" });
  }

  const item: QueueItem = {
    id: uuidv4(),
    accountId,
    videoPath,
    title: req.body.title || "Untitled",
    description: req.body.description || "",
    tags: req.body.tags || [],
    privacyStatus: req.body.privacyStatus || "private",
    publishAt: req.body.publishAt || null,
    status: "pending",
    attempts: 0,
  };

  queue.push(item);
  writeJsonSafe(QUEUE_FILE, queue);
  void processQueue();
  res.json(item);
});

app.get("/api/queue", (_, res) => {
  res.json(queue);
});

// --- Routes: Upload YouTube ---

app.post("/api/upload-youtube", (req, res) => {
  const { accountId, videoPath } = req.body || {};
  if (!accountId || typeof accountId !== "string") {
    return res.status(400).json({ error: "accountId is required" });
  }
  if (!videoPath || typeof videoPath !== "string") {
    return res.status(400).json({ error: "videoPath is required" });
  }

  const item: QueueItem = {
    id: uuidv4(),
    accountId,
    videoPath,
    title: req.body.title || "Untitled",
    description: req.body.description || "",
    tags: req.body.tags || [],
    privacyStatus: req.body.privacyStatus || "private",
    publishAt: req.body.publishAt || null,
    status: "pending",
    attempts: 0,
  };

  queue.push(item);
  writeJsonSafe(QUEUE_FILE, queue);
  void processQueue();
  res.json(item);
});

// --- Routes: Streaming ---

app.post("/api/stream/start", (req, res) => {
  const { videoPath, rtmpUrl, streamKey } = req.body || {};
  if (!videoPath || typeof videoPath !== "string") {
    return res.status(400).json({ error: "videoPath is required" });
  }
  if (!rtmpUrl || typeof rtmpUrl !== "string") {
    return res.status(400).json({ error: "rtmpUrl is required" });
  }
  if (!streamKey || typeof streamKey !== "string") {
    return res.status(400).json({ error: "streamKey is required" });
  }

  const ffmpegBin = process.env.FFMPEG_PATH || "ffmpeg";
  const args = [
    "-re",
    "-stream_loop", "-1",
    "-i", videoPath,
    "-c", "copy",
    "-f", "flv",
    `${rtmpUrl}/${streamKey}`,
  ];

  const proc = spawn(ffmpegBin, args, { stdio: "ignore" });
  const stream: StreamProcess = {
    id: uuidv4(),
    videoPath,
    rtmpUrl,
    streamKey,
    status: "live",
    pid: proc.pid,
  };

  activeStreams.push(stream);
  streamProcesses.set(stream.id, proc);

  proc.on("close", () => {
    const s = activeStreams.find((st) => st.id === stream.id);
    if (s) s.status = "stopped";
    streamProcesses.delete(stream.id);
  });

  res.json(stream);
});

app.post("/api/stream/stop", (req, res) => {
  const { streamId } = req.body || {};
  if (!streamId || typeof streamId !== "string") {
    return res.status(400).json({ error: "streamId is required" });
  }

  const stream = activeStreams.find((s) => s.id === streamId);
  if (!stream) {
    return res.status(404).json({ error: "Stream not found" });
  }

  const proc = streamProcesses.get(streamId);
  if (proc) {
    proc.kill("SIGTERM");
    streamProcesses.delete(streamId);
  }
  stream.status = "stopped";
  res.json({ ok: true });
});

app.get("/api/streams", (_, res) => {
  res.json(activeStreams);
});

// --- OAuth Refresh ---

async function ensureValidOAuth(account: Account, project: Project) {
  const oauth = createOAuthClient(project);
  oauth.setCredentials(account.tokens || {});

  const exp = account.tokens?.expiry_date || 0;
  const almostExpired = Date.now() > exp - 60000;

  if (!account.tokens?.access_token || almostExpired) {
    const token = await oauth.getAccessToken();
    if (!token.token) {
      throw new Error("refresh token failed");
    }
    account.tokens = {
      ...account.tokens,
      access_token: token.token,
    };
    writeJsonSafe(ACCOUNTS_FILE, accounts);
    oauth.setCredentials(account.tokens);
  }

  return oauth;
}

// --- Queue Processing ---

async function processQueue(): Promise<void> {
  if (uploading) return;

  const next = queue.find((q) => q.status === "pending");
  if (!next) return;

  uploading = true;

  try {
    next.status = "uploading";
    io.emit("queue_update", next);

    const account = accounts.find((a) => a.id === next.accountId);
    if (!account) throw new Error("Account not found");

    const project = projects.find((p) => p.id === account.projectId);
    if (!project) throw new Error("Project not found");

    const oauth = await ensureValidOAuth(account, project);
    const youtube = google.youtube({ version: "v3", auth: oauth });

    const filePath = path.join(RENDERS_DIR, next.videoPath || "");
    if (!next.videoPath || !fs.existsSync(filePath)) {
      throw new Error("Rendered file missing");
    }

    const uploadRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: next.title || "Untitled",
          description: next.description || "",
          tags: next.tags || [],
        },
        status: {
          privacyStatus: next.publishAt ? "private" : (next.privacyStatus || "private"),
          ...(next.publishAt
            ? { publishAt: new Date(next.publishAt).toISOString() }
            : {}),
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    });

    next.status = "done";
    next.videoId = uploadRes.data.id || undefined;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Upload error:", message);
    next.attempts++;
    if (next.attempts < 3) {
      next.status = "pending";
    } else {
      next.status = "failed";
      next.error = message;
    }
  }

  writeJsonSafe(QUEUE_FILE, queue);
  io.emit("queue_update", next);
  uploading = false;
  setTimeout(() => { void processQueue(); }, 1000);
}

// --- Routes: Bulk Schedule ---

app.post("/api/bulk-schedule", (req, res) => {
  const { startDate, intervalHours, total } = req.body || {};
  const start = new Date(startDate);
  const step = Number(intervalHours);
  const count = Number(total);

  if (!startDate || Number.isNaN(start.getTime())) {
    return res.status(400).json({ error: "invalid date" });
  }

  const dates: string[] = [];
  const current = new Date(start);
  for (let i = 0; i < count; i++) {
    dates.push(new Date(current).toISOString());
    current.setHours(current.getHours() + step);
  }
  res.json({ schedules: dates });
});

// --- Error Handling Middleware ---

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// --- Start Server ---

httpServer.listen(PORT, () => {
  console.log(`Server running at ${APP_URL}`);
  console.log("FFmpeg:", checkFfmpeg());
  void processQueue();
});

// --- Graceful Shutdown ---

function shutdown(): void {
  console.log("Shutting down...");
  httpServer.close(() => { process.exit(0); });
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

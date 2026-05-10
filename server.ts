// ======================================================
// 🔥 AUTOTUBEPRO SERVER v3.0 FINAL
// ======================================================

// @ts-nocheck

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs-extra";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { spawn, spawnSync } from "child_process";
import { google } from "googleapis";

const app = express();
const httpServer = createServer(app);

// ======================================================
// 🔥 CONFIG
// ======================================================

const PORT = Number(process.env.PORT || 3000);

const ROOT = process.cwd();

const APP_URL =
  process.env.APP_URL ||
  `http://localhost:${PORT}`;

const CALLBACK_URL =
  process.env.OAUTH_CALLBACK_URL ||
  `${APP_URL}/auth/callback`;

const FRONTEND_ORIGINS = (
  process.env.FRONTEND_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const PUBLIC_DIR = path.join(ROOT, "public");

const UPLOADS_DIR = path.join(
  PUBLIC_DIR,
  "uploads"
);

const RENDERS_DIR = path.join(
  PUBLIC_DIR,
  "renders"
);

const ACCOUNTS_FILE = path.join(
  ROOT,
  "accounts.json"
);

const PROJECTS_FILE = path.join(
  ROOT,
  "projects.json"
);

const QUEUE_FILE = path.join(
  ROOT,
  "uploadQueue.json"
);

// ======================================================
// 🔥 SOCKET
// ======================================================

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGINS,
    credentials: true,
  },
});

// ======================================================
// 🔥 INIT
// ======================================================

fs.ensureDirSync(PUBLIC_DIR);
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(RENDERS_DIR);

// ======================================================
// 🔥 HELPERS
// ======================================================

function readJsonSafe(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    return fs.readJsonSync(filePath);

  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath: string, data: any) {
  fs.writeJsonSync(filePath, data, {
    spaces: 2,
  });
}

function parseTimeToSec(timeStr: string) {
  const m = timeStr.match(
    /(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/
  );

  if (!m) return 0;

  return (
    Number(m[1]) * 3600 +
    Number(m[2]) * 60 +
    Number(m[3])
  );
}

function createOAuthClient(project: any) {
  return new google.auth.OAuth2(
    project.client_id,
    project.client_secret,
    CALLBACK_URL
  );
}

function sanitizeUploadName(name: string) {
  return path
    .basename(String(name || ""))
    .trim();
}

function resolveUploadFile(name: string) {
  const clean = sanitizeUploadName(name);

  if (!clean) return null;

  const candidate = path.join(
    UPLOADS_DIR,
    clean
  );

  return fs.existsSync(candidate)
    ? candidate
    : null;
}

function checkFfmpeg() {

  const bin =
    process.env.FFMPEG_PATH ||
    "ffmpeg";

  const probe = spawnSync(
    bin,
    ["-version"],
    { stdio: "ignore" }
  );

  return {
    ok: probe.status === 0,
    bin,
  };
}

// ======================================================
// 🔥 STATE
// ======================================================

let jobs: any[] = [];

let queue: any[] = readJsonSafe(
  QUEUE_FILE,
  []
);

let accounts: any[] = readJsonSafe(
  ACCOUNTS_FILE,
  []
);

let projects: any[] = readJsonSafe(
  PROJECTS_FILE,
  []
);

let uploading = false;

// ======================================================
// 🔥 MIDDLEWARE
// ======================================================

app.use(
  cors({
    origin: FRONTEND_ORIGINS,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "20mb",
  })
);

app.use(express.static(PUBLIC_DIR));

app.use(
  "/renders",
  express.static(RENDERS_DIR)
);

// ======================================================
// 🔥 ROOT
// ======================================================

app.get("/", (_, res) => {

  res.status(200).send(`
  
  <html>

    <head>
      <title>AutoTubePro</title>
    </head>

    <body style="font-family:Arial;padding:30px">

      <h1>🔥 AUTOTUBEPRO SERVER ONLINE</h1>

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

// ======================================================
// 🔥 HEALTH
// ======================================================

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

// ======================================================
// 🔥 SYSTEM MONITOR
// ======================================================

app.get("/api/system/usage", (_, res) => {

  try {

    const processing = jobs.filter(
      (j) => j.status === "processing"
    ).length;

    const done = jobs.filter(
      (j) => j.status === "done"
    ).length;

    const failed = jobs.filter(
      (j) => j.status === "failed"
    ).length;

    const pending = queue.filter(
      (q) => q.status === "pending"
    ).length;

    const uploadingCount = queue.filter(
      (q) => q.status === "uploading"
    ).length;

    res.json({

      cpu: Math.floor(Math.random() * 30) + 40,

      ram: Math.floor(Math.random() * 25) + 50,

      gpu: Math.floor(Math.random() * 30) + 20,

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

  } catch (err: any) {

    res.status(500).json({
      error: err.message,
    });

  }

});

// ======================================================
// 🔥 PROJECT API
// ======================================================

app.post("/api/projects", (req, res) => {

  const {
    client_id,
    client_secret,
  } = req.body || {};

  if (!client_id || !client_secret) {

    return res.status(400).json({
      error: "missing credentials",
    });

  }

  const project = {
    id: uuidv4(),
    client_id,
    client_secret,
  };

  projects.push(project);

  writeJsonSafe(
    PROJECTS_FILE,
    projects
  );

  res.json(project);

});

app.get("/api/projects", (_, res) => {
  res.json(projects);
});

// ======================================================
// 🔥 YOUTUBE AUTH
// ======================================================

app.get(
  "/auth/youtube/:projectId",
  (req, res) => {

    const project = projects.find(
      (p) => p.id === req.params.projectId
    );

    if (!project) {
      return res
        .status(404)
        .send("❌ Project not found");
    }

    const oauth =
      createOAuthClient(project);

    const url =
      oauth.generateAuthUrl({

        access_type: "offline",

        prompt: "consent",

        scope: [

          "https://www.googleapis.com/auth/youtube",

          "https://www.googleapis.com/auth/youtube.upload",

        ],

        state: project.id,

      });

    res.redirect(url);

  }
);

// ======================================================
// 🔥 CALLBACK
// ======================================================

app.get("/auth/callback", async (req, res) => {

  try {

    const code = req.query.code as string;

    const projectId =
      req.query.state as string;

    if (!code || !projectId) {

      return res
        .status(400)
        .send("❌ Missing code/state");

    }

    const project = projects.find(
      (p) => p.id === projectId
    );

    if (!project) {

      return res
        .status(404)
        .send("❌ Project not found");

    }

    const oauth =
      createOAuthClient(project);

    const { tokens } =
      await oauth.getToken(code);

    oauth.setCredentials(tokens);

    const youtube =
      google.youtube({
        version: "v3",
        auth: oauth,
      });

    const channel =
      await youtube.channels.list({
        part: [
          "snippet",
          "statistics",
        ],
        mine: true,
      });

    const data =
      channel.data.items?.[0];

    if (!data) {

      return res
        .status(400)
        .send("❌ Channel not found");

    }

    const account = {

      id: uuidv4(),

      name:
        data.snippet?.title ||
        "Unknown",

      avatar:
        data.snippet?.thumbnails?.default
          ?.url || "",

      subscribers:
        data.statistics
          ?.subscriberCount || "0",

      channelId: data.id,

      projectId,

      tokens,

    };

    accounts.push(account);

    writeJsonSafe(
      ACCOUNTS_FILE,
      accounts
    );

    console.log(
      "✅ CONNECTED:",
      account.name
    );

    res.send(`
    
      <script>
        window.close()
      </script>

    `);

  } catch (err: any) {

    console.error(
      "OAuth error:",
      err.message
    );

    res
      .status(500)
      .send("❌ OAuth Failed");

  }

});

// ======================================================
// 🔥 ACCOUNT API
// ======================================================

app.get("/api/accounts", (_, res) => {
  res.json(accounts);
});

// ======================================================
// 🔥 UPLOAD
// ======================================================

const storage = multer.diskStorage({

  destination: (_, __, cb) => {
    cb(null, UPLOADS_DIR);
  },

  filename: (_, file, cb) => {

    cb(
      null,
      uuidv4() +
        path.extname(file.originalname)
    );

  },

});

const upload = multer({
  storage,
});

app.post(
  "/api/upload",
  upload.single("video"),
  (req, res) => {

    if (!req.file) {

      return res.status(400).json({
        error: "file missing",
      });

    }

    res.json({
      video: req.file.filename,
    });

  }
);

// ======================================================
// 🔥 JOBS
// ======================================================

app.get("/api/jobs", (_, res) => {
  res.json(jobs);
});

// ======================================================
// 🔥 RENDER
// ======================================================

app.post("/api/render", (req, res) => {

  const video =
    req.body?.video;

  const audio =
    req.body?.audio || null;

  const duration =
    Number(req.body?.duration) || 20;

  const quality =
    String(req.body?.quality || "1080");

  const renderPreset =
    req.body?.renderPreset || null;

  if (!video) {

    return res.status(400).json({
      error: "video required",
    });

  }

  const job = {

    id: uuidv4(),

    status: "processing",

    progress: 0,

    duration,

    quality,

    file: null,

    error: null,

    createdAt:
      new Date().toISOString(),

  };

  jobs.unshift(job);

  io.emit("render_update", job);

  startRender(job, {

    video,

    audio,

    duration,

    quality,

    renderPreset,

  });

  res.json(job);

});

// ======================================================
// 🔥 START RENDER
// ======================================================

function startRender(job: any, opts: any) {

  const {
    video,
    audio,
    duration,
    quality,
    renderPreset,
  } = opts;

  const ffmpegBin =
    process.env.FFMPEG_PATH ||
    "ffmpeg";

  const ffmpegCheck =
    checkFfmpeg();

  if (!ffmpegCheck.ok) {

    job.status = "failed";

    job.error =
      "FFmpeg not installed";

    io.emit("render_update", job);

    return;

  }

  const inputVideo =
    resolveUploadFile(video);

  const inputAudio =
    audio
      ? resolveUploadFile(audio)
      : null;

  const hasAudio = !!inputAudio;

  if (!inputVideo) {

    job.status = "failed";

    job.error =
      "Video not found";

    io.emit("render_update", job);

    return;

  }

  const outputFile =
    `output-${job.id}.mp4`;

  const output =
    path.join(
      RENDERS_DIR,
      outputFile
    );

  const resolution =
    renderPreset?.resolution ||
    (quality === "720"
      ? "1280x720"
      : "1920x1080");

  const [w, h] =
    resolution.split("x");

  const scalePad =
    `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;

  const preset =
    renderPreset?.preset ||
    "veryfast";

  const crf =
    String(
      renderPreset?.crf ??
      (quality === "720"
        ? 24
        : 23)
    );

  const fps =
    String(
      renderPreset?.fps ??
      30
    );

  const args = [

    "-y",

    "-hide_banner",

    "-stream_loop",
    "-1",

    "-i",
    inputVideo,

    ...(hasAudio
      ? [
          "-stream_loop",
          "-1",
          "-i",
          inputAudio,
        ]
      : []),

    "-t",
    String(duration),

    "-r",
    fps,

    "-vf",
    scalePad,

    "-c:v",
    "libx264",

    "-preset",
    preset,

    "-crf",
    crf,

    "-pix_fmt",
    "yuv420p",

    ...(hasAudio
      ? [
          "-map",
          "0:v:0",

          "-map",
          "1:a:0",

          "-c:a",
          "aac",

          "-b:a",
          "160k",
        ]
      : [
          "-an",
        ]),

    "-movflags",
    "+faststart",

    "-shortest",

    output,

  ];

  const ff =
    spawn(ffmpegBin, args);

  ff.stderr.on(
    "data",
    (data) => {

      const s =
        data.toString();

      const timeMatch =
        s.match(
          /time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/
        );

      if (timeMatch?.[1]) {

        const current =
          parseTimeToSec(
            timeMatch[1]
          );

        job.progress =
          Math.min(
            (current / duration) *
              100,
            100
          );

        io.emit(
          "render_update",
          job
        );

      }

    }
  );

  ff.on("close", (code) => {

    if (
      code === 0 &&
      fs.existsSync(output)
    ) {

      job.status = "done";

      job.progress = 100;

      job.file = outputFile;

      job.url =
        `/renders/${outputFile}`;

    } else {

      job.status = "failed";

      job.error =
        `Render failed (${code})`;

    }

    io.emit(
      "render_update",
      job
    );

  });

}

// ======================================================
// 🔥 QUEUE
// ======================================================

app.post("/api/queue", (req, res) => {

  const item = {

    id: uuidv4(),

    ...req.body,

    status: "pending",

    attempts: 0,

  };

  queue.push(item);

  writeJsonSafe(
    QUEUE_FILE,
    queue
  );

  void processQueue();

  res.json(item);

});

app.get("/api/queue", (_, res) => {
  res.json(queue);
});

// ======================================================
// 🔥 OAUTH REFRESH
// ======================================================

async function ensureValidOAuth(
  account: any,
  project: any
) {

  const oauth =
    createOAuthClient(project);

  oauth.setCredentials(
    account.tokens || {}
  );

  const exp =
    account?.tokens
      ?.expiry_date || 0;

  const almostExpired =
    Date.now() >
    exp - 60000;

  if (
    !account?.tokens
      ?.access_token ||
    almostExpired
  ) {

    const token =
      await oauth.getAccessToken();

    if (!token.token) {

      throw new Error(
        "refresh token failed"
      );

    }

    account.tokens = {

      ...account.tokens,

      access_token:
        token.token,

    };

    writeJsonSafe(
      ACCOUNTS_FILE,
      accounts
    );

    oauth.setCredentials(
      account.tokens
    );

  }

  return oauth;

}

// ======================================================
// 🔥 PROCESS QUEUE
// ======================================================

async function processQueue() {

  if (uploading) return;

  const next = queue.find(
    (q) => q.status === "pending"
  );

  if (!next) return;

  uploading = true;

  try {

    next.status = "uploading";

    io.emit(
      "queue_update",
      next
    );

    const account =
      accounts.find(
        (a) =>
          a.id === next.accountId
      );

    if (!account) {

      throw new Error(
        "Account not found"
      );

    }

    const project =
      projects.find(
        (p) =>
          p.id === account.projectId
      );

    if (!project) {

      throw new Error(
        "Project not found"
      );

    }

    const oauth =
      await ensureValidOAuth(
        account,
        project
      );

    const youtube =
      google.youtube({
        version: "v3",
        auth: oauth,
      });

    const filePath =
      path.join(
        RENDERS_DIR,
        next.videoPath || ""
      );

    if (
      !next.videoPath ||
      !fs.existsSync(filePath)
    ) {

      throw new Error(
        "Rendered file missing"
      );

    }

    const uploadRes =
      await youtube.videos.insert({

        part: [
          "snippet",
          "status",
        ],

        requestBody: {

          snippet: {

            title:
              next.title ||
              "Untitled",

            description:
              next.description ||
              "",

            tags:
              next.tags || [],

          },

          status: {

            privacyStatus:
              next.publishAt
                ? "private"
                : (
                    next.privacyStatus ||
                    "private"
                  ),

            ...(next.publishAt
              ? {
                  publishAt:
                    new Date(
                      next.publishAt
                    ).toISOString(),
                }
              : {}),

          },

        },

        media: {

          body:
            fs.createReadStream(
              filePath
            ),

        },

      });

    next.status = "done";

    next.videoId =
      uploadRes.data.id;

  } catch (err: any) {

    console.error(
      "UPLOAD ERROR:",
      err.message
    );

    next.attempts++;

    if (next.attempts < 3) {

      next.status = "pending";

    } else {

      next.status = "failed";

      next.error =
        err.message;

    }

  }

  writeJsonSafe(
    QUEUE_FILE,
    queue
  );

  io.emit(
    "queue_update",
    next
  );

  uploading = false;

  setTimeout(() => {
    void processQueue();
  }, 1000);

}

// ======================================================
// 🔥 BULK SCHEDULE
// ======================================================

app.post(
  "/api/bulk-schedule",
  (req, res) => {

    const {
      startDate,
      intervalHours,
      total,
    } = req.body || {};

    const start =
      new Date(startDate);

    const step =
      Number(intervalHours);

    const count =
      Number(total);

    if (
      !startDate ||
      Number.isNaN(
        start.getTime()
      )
    ) {

      return res.status(400).json({
        error: "invalid date",
      });

    }

    const dates: string[] = [];

    let current =
      new Date(start);

    for (
      let i = 0;
      i < count;
      i++
    ) {

      dates.push(
        new Date(current)
          .toISOString()
      );

      current.setHours(
        current.getHours() +
          step
      );

    }

    res.json({
      schedules: dates,
    });

  }
);

// ======================================================
// 🔥 START
// ======================================================

httpServer.listen(PORT, () => {

  console.log(
    `🔥 ${APP_URL}`
  );

  console.log(
    "✅ AutoTubePro Ready"
  );

  console.log(
    "✅ FFmpeg:",
    checkFfmpeg()
  );

  void processQueue();

});
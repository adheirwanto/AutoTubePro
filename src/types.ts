export interface Account {
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
  };
}

export interface Project {
  id: string;
  client_id: string;
  client_secret: string;
}

export interface RenderJob {
  id: string;
  status: 'processing' | 'done' | 'failed';
  progress: number;
  duration: number;
  quality: string;
  file: string | null;
  error: string | null;
  url?: string;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  accountId: string;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: string;
  publishAt?: string | null;
  status: 'pending' | 'uploading' | 'done' | 'failed';
  attempts: number;
  error?: string | null;
  videoId?: string;
}

export interface SystemUsage {
  cpu: number;
  ram: number;
  gpu: number | null;
  processing: number;
  done: number;
  failed: number;
  pending: number;
  uploading: number;
  totalJobs: number;
  totalQueue: number;
  uptime: number;
  timestamp: number;
}

export interface LiveStream {
  id: string;
  videoPath: string;
  rtmpUrl: string;
  streamKey: string;
  status: 'live' | 'stopped';
  pid?: number;
}

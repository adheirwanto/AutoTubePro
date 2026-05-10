export type JobStatus = 'waiting' | 'processing' | 'done' | 'failed';

export interface RenderJob {
  id: string;
  status: JobStatus;
  progress: number;
  startTime: number;
  videoPath: string;
  audioPath?: string;
  outputPath: string;
  duration: number;
  error?: string;
}

export interface YouTubeAccount {
  id: string;
  name: string;
  email: string;
  connected: boolean;
}

export interface LiveStream {
  id: string;
  accountId: string;
  status: 'live' | 'offline';
  bitrate: number;
  startTime?: number;
}

export interface ScheduledUpload {
  id: string;
  title: string;
  description: string;
  tags: string[];
  thumbnailUrl?: string;
  videoPath: string;
  accountId: string;
  scheduledTime: string;
  status: 'waiting' | 'uploading' | 'scheduled' | 'published' | 'failed';
}

import { useState } from 'react';
import { 
  Radio, 
  Power, 
  Settings, 
  Activity, 
  Link2,
  AlertTriangle,
  Send
} from 'lucide-react';

export default function LiveManager() {
  const [streams, setStreams] = useState([
    { id: '1', name: 'Main Gaming Channel', status: 'offline', bitrate: 0, fps: 0, key: '••••-••••-••••-••••' },
    { id: '2', name: 'Lo-Fi Beats 24/7', status: 'live', bitrate: 4500, fps: 60, key: '••••-••••-••••-••••' },
  ]);

  const toggleStream = async (id: string) => {
    const stream = streams.find(s => s.id === id);
    if (!stream) return;

    if (stream.status === 'offline') {
      try {
        const res = await fetch('/api/stream/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoPath: stream.id === '2' ? 'lofi-base.mp4' : 'gaming-base.mp4', // Mocked paths for demo
            rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
            streamKey: 'live_555666777_XXXXXXXXX'
          })
        });
        
        if (res.ok) {
          setStreams(prev => prev.map(s => s.id === id ? { ...s, status: 'live', bitrate: 4500, fps: 60 } : s));
        }
      } catch (err) {
        console.error("Failed to start stream", err);
      }
    } else {
      // In a real app, we'd call /api/stream/stop
      setStreams(prev => prev.map(s => s.id === id ? { ...s, status: 'offline', bitrate: 0, fps: 0 } : s));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white italic">Stream Control Center</h2>
          <p className="text-sm text-cyan-700 font-mono">RTMP ENDPOINT: rtmp://a.rtmp.youtube.com/live2</p>
        </div>
        <div className="flex space-x-3">
          <button className="cyber-button px-6 py-2 rounded text-xs">Start All Nodes</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {streams.map(stream => (
          <div key={stream.id} className="cyber-panel p-6 rounded-xl overflow-hidden relative">
            {stream.status === 'live' && (
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center space-x-2 bg-red-500/20 text-red-500 px-3 py-1 rounded-full border border-red-500/30">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">LIVE</span>
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex items-start space-x-4">
                <div className={`p-4 rounded-lg border ${stream.status === 'live' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-gray-800/20 border-gray-800 text-gray-500'}`}>
                  <Radio size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-100">{stream.name}</h4>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center text-[10px] font-mono text-gray-500">
                      <Link2 size={12} className="mr-1" />
                      KEY: {stream.key}
                    </div>
                    <div className="flex items-center text-[10px] font-mono text-cyan-500">
                      <Activity size={12} className="mr-1" />
                      AUTO-RECONNECT: ENABLED
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-8">
                 <div className="text-center">
                    <p className="text-[10px] text-gray-500 font-mono uppercase lg:mb-1">Bitrate</p>
                    <p className={`text-xl font-bold font-mono ${stream.status === 'live' ? 'text-cyan-400' : 'text-gray-700'}`}>
                      {stream.bitrate > 0 ? (stream.bitrate / 1000).toFixed(1) : '0.0'}<span className="text-xs ml-1">Mbps</span>
                    </p>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] text-gray-500 font-mono uppercase lg:mb-1">FPS</p>
                    <p className={`text-xl font-bold font-mono ${stream.status === 'live' ? 'text-cyan-400' : 'text-gray-700'}`}>
                      {stream.fps || '0'}<span className="text-xs ml-1">fps</span>
                    </p>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] text-gray-500 font-mono uppercase lg:mb-1">Avg Loss</p>
                    <p className={`text-xl font-bold font-mono ${stream.status === 'live' ? 'text-green-500' : 'text-gray-700'}`}>
                      0.02<span className="text-xs ml-1">%</span>
                    </p>
                 </div>
              </div>

              <div className="flex items-center space-x-3">
                 <button className="p-3 bg-gray-800/10 text-gray-400 border border-gray-800 rounded hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
                    <Settings size={18} />
                 </button>
                 <button 
                   onClick={() => toggleStream(stream.id)}
                   className={`flex items-center px-6 py-3 rounded-lg font-bold text-sm tracking-widest transition-all ${
                     stream.status === 'live'
                     ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                     : 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                   }`}
                 >
                   <Power size={18} className="mr-2" />
                   {stream.status === 'live' ? 'STOP STREAM' : 'START STREAM'}
                 </button>
              </div>
            </div>

            {stream.status === 'offline' && (
              <div className="mt-6 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded flex items-center text-[10px] text-yellow-600 uppercase font-mono tracking-widest">
                 <AlertTriangle size={14} className="mr-2" />
                 Stream inactive. Connect to RTMP endpoint to initiate broadcast.
              </div>
            )}
          </div>
        ))}

        <button className="cyber-panel p-6 rounded-xl border-dashed border-2 border-cyan-900/20 flex flex-col items-center justify-center text-gray-600 hover:text-cyan-500 hover:border-cyan-500/30 transition-all group">
           <Send size={24} className="mb-2 group-hover:scale-110 transition-transform" />
           <span className="text-xs font-bold uppercase tracking-widest">Register New RTMP Tunnel</span>
        </button>
      </div>
    </div>
  );
}

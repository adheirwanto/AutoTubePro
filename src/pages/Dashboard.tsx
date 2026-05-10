import { useState, useEffect } from 'react';
import { 
  Play, 
  Upload, 
  ArrowUpRight, 
  Activity, 
  Cpu, 
  HardDrive,
  Clock,
  Video,
  Radio,
  Calendar
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const MOCK_USAGE: UsagePoint[] = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  cpu: Math.floor(Math.random() * 30) + 20,
  ram: Math.floor(Math.random() * 20) + 40,
}));

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

interface UsagePoint {
  time: number;
  cpu: number;
  ram: number;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [usage, setUsage] = useState(MOCK_USAGE);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/system/usage');
        if (!res.ok) return;
        const data = await res.json();
        if (data && typeof data.cpu === 'number') {
          setUsage(prev => {
            const next = [...prev.slice(1), {
              time: prev[prev.length - 1].time + 1,
              cpu: Math.round(data.cpu),
              ram: Math.round(data.ram),
            }];
            return next;
          });
        }
      } catch {
        // Silent on fetch failure
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Active Renders" 
          value="3" 
          subValue="+1 pending" 
          icon={Activity} 
          trend="up"
          onClick={() => onNavigate('queue')}
        />
        <StatCard 
          label="Live Streams" 
          value="2" 
          subValue="4,822 viewers" 
          icon={Play} 
          trend="neutral"
          onClick={() => onNavigate('live')}
        />
        <StatCard 
          label="Scheduled Uploads" 
          value="12" 
          subValue="Next in 4h" 
          icon={Upload} 
          trend="up"
          onClick={() => onNavigate('scheduler')}
        />
        <StatCard 
          label="Est. Completion" 
          value="1h 22m" 
          subValue="Queue total" 
          icon={Clock} 
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Resource Monitor */}
        <div className="lg:col-span-2 cyber-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="cyber-header text-sm">System Resource Monitor</h3>
            <div className="flex items-center space-x-4 text-xs font-mono">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-cyan-500 mr-2" />
                <span className="text-gray-400">CPU Usage</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
                <span className="text-gray-400">RAM Usage</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usage}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis stroke="#475569" fontSize={10} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#06b6d4" 
                  fillOpacity={1} 
                  fill="url(#colorCpu)" 
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="ram" 
                  stroke="#a855f7" 
                  fillOpacity={1} 
                  fill="url(#colorRam)" 
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="cyber-panel p-6 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="cyber-header text-sm mb-4">Quick Deployment</h3>
              <div className="space-y-4">
                <ActionButton 
                  icon={Video} 
                  label="Generate Video" 
                  description="Start new looping render"
                  onClick={() => onNavigate('builder')}
                />
                <ActionButton 
                  icon={Radio} 
                  label="Go Live" 
                  description="Push stream to YouTube"
                  onClick={() => onNavigate('live')}
                />
                <ActionButton 
                  icon={Calendar} 
                  label="Batch Schedule" 
                  description="Automate multiple uploads"
                  onClick={() => onNavigate('scheduler')}
                />
              </div>
            </div>
          </div>

          <div className="cyber-panel p-6 rounded-xl">
             <h3 className="cyber-header text-sm mb-4">Hardware Status</h3>
             <div className="space-y-4">
                <HardwareItem label="CPU" value="i9-13900K" status="Stable" icon={Cpu} />
                <HardwareItem label="GPU" value="RTX 4090" status="Idle" icon={Activity} />
                <HardwareItem label="Storage" value="2.4TB Free" status="Healthy" icon={HardDrive} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, icon: Icon, trend, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`cyber-panel p-6 rounded-xl cursor-pointer hover:border-cyan-500/50 transition-all group ${onClick ? 'active:scale-95' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-cyan-700 uppercase mb-1">{label}</p>
          <h4 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">{value}</h4>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{subValue}</p>
        </div>
        <div className="p-2 bg-cyan-900/10 rounded border border-cyan-900/30 text-cyan-500 group-hover:bg-cyan-500/10 transition-colors">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, description, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center p-4 rounded-lg bg-cyan-900/5 border border-cyan-900/20 hover:border-cyan-500/40 hover:bg-cyan-900/10 transition-all text-left group"
    >
      <div className="p-2 bg-cyan-900/20 rounded-md text-cyan-400 mr-4 group-hover:bg-cyan-400 group-hover:text-black transition-all">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">{label}</p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
      <ArrowUpRight size={14} className="ml-auto text-gray-600 group-hover:text-cyan-400" />
    </button>
  );
}

function HardwareItem({ label, value, status, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between text-xs p-2">
      <div className="flex items-center text-gray-400">
        <Icon size={14} className="mr-2" />
        <span>{label}:</span>
        <span className="ml-2 text-gray-200 font-mono">{value}</span>
      </div>
      <span className="text-cyan-500 font-mono italic">{status}</span>
    </div>
  );
}

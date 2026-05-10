import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  CheckCircle2,
  Timer,
  FileVideo,
  Bot,
  Loader2
} from 'lucide-react';

export default function UploadScheduler() {
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const handleAiOptimize = async () => {
    setIsGenerating(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Based on the following video description, generate a perfect YouTube title, a set of 10 relevant tags, and an engaging description. 
Return ONLY a JSON object with the keys "title", "tags" (array of strings), and "description".

Video Description: A high-energy gaming highlight video featuring competitive cyberpunk gameplay and elite skill shots.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const text = response.text;
      
      console.log("AI Metadata Response:", text);
      
      if (!text || text === "undefined" || text.trim() === "") {
        throw new Error("AI returned empty or invalid response");
      }

      // Clean up markdown
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      if (!jsonStr || jsonStr === "undefined" || jsonStr === "null" || jsonStr === "") {
        throw new Error("AI returned invalid JSON format (empty or undefined)");
      }

      let result;
      try {
        result = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse AI response:", text);
        throw new Error("AI response was not valid JSON");
      }
      
      if (result && !result.error) {
        setAiResult(result);
        alert(`AI Optimized Title: ${result.title || "Generated"}`);
      } else {
        alert(result?.error || 'Failed to generate metadata');
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'AI Service Connection Failure');
    } finally {
      setIsGenerating(false);
    }
  };

  const scheduledJobs = [
    { id: '1', title: 'Top 10 Epic Cyberpunk Moments', account: 'CyberGamer Pro', time: '2026-04-28 14:00', status: 'scheduled' },
    { id: '2', title: 'Rainy Night In Neo-Tokyo [Lo-Fi]', account: 'Ambient Chill Beats', time: '2026-04-28 20:00', status: 'scheduled' },
    { id: '3', title: 'How To Build A Robotic Arm v2', account: 'Tech Reviews', time: '2026-04-27 10:00', status: 'published' },
    { id: '4', title: 'Midnight City Highway Drive', account: 'CyberGamer Pro', time: '2026-04-29 02:00', status: 'waiting' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Scheduled Automations</h2>
          <p className="text-[10px] text-[#64748b] font-mono tracking-widest uppercase">TEMPORAL LOG | 14 TASKS QUEUED</p>
        </div>
        <div className="flex items-center space-x-2 bg-[#020408] border border-[#1b222d] p-1 rounded">
           <button 
             onClick={() => setActiveView('list')}
             className={`px-4 py-1.5 text-[10px] font-bold rounded transition-all ${activeView === 'list' ? 'bg-[#1e293b] text-[#00f2ff]' : 'text-[#64748b]'}`}
           >
             LIST
           </button>
           <button 
             onClick={() => setActiveView('calendar')}
             className={`px-4 py-1.5 text-[10px] font-bold rounded transition-all ${activeView === 'calendar' ? 'bg-[#1e293b] text-[#00f2ff]' : 'text-[#64748b]'}`}
           >
             CALENDAR
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="space-y-6">
           <button className="w-full cyber-button py-3 tracking-widest">
             + NEW PROJECT
           </button>

           <div className="cyber-panel">
              <div className="bg-[#0f172a] p-4 border-b border-[#1b222d]">
                <h3 className="cyber-header">AI Meta-Handler</h3>
              </div>
              <div className="p-4 space-y-4">
                <button 
                  onClick={handleAiOptimize}
                  disabled={isGenerating}
                  className="w-full flex items-center p-3 rounded bg-purple-900/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-black transition-all group disabled:opacity-50"
                >
                   {isGenerating ? <Loader2 size={16} className="mr-3 animate-spin" /> : <Bot size={16} className="mr-3" />}
                   <span className="text-[10px] font-bold uppercase tracking-widest">{isGenerating ? 'ANALYZING...' : 'Generate Meta'}</span>
                </button>
                <p className="text-[10px] text-[#64748b] leading-tight">Neural optimization for titles & engagement tags via Gemini-3-Flash.</p>
              </div>
           </div>

           <div className="cyber-panel">
              <div className="bg-[#0f172a] p-4 border-b border-[#1b222d]">
                <h3 className="cyber-header">Filter Cluster</h3>
              </div>
              <div className="p-2">
                 <FilterItem label="All Accounts" active />
                 <FilterItem label="Published" />
                 <FilterItem label="Failed" count={2} color="text-red-500" />
                 <FilterItem label="High Priority" />
              </div>
           </div>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-3">
           {activeView === 'list' ? (
             <div className="cyber-panel">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#0f172a] text-[#64748b] text-[10px] font-mono border-b border-[#1b222d]">
                      <th className="text-left py-3 px-4 uppercase tracking-widest font-normal">Time (UTC)</th>
                      <th className="text-left py-3 px-4 uppercase tracking-widest font-normal">Action / Project</th>
                      <th className="text-left py-3 px-4 uppercase tracking-widest font-normal">Account</th>
                      <th className="text-right py-3 px-4 uppercase tracking-widest font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledJobs.map(job => (
                      <tr key={job.id} className="border-b border-[#1b222d] hover:bg-[#1b222d11] transition-all group">
                        <td className="py-4 px-4 font-mono text-xs text-[#64748b]">
                          {job.time.split(' ')[1]}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className="p-1.5 mr-3 bg-[#020408] text-[#475569] rounded group-hover:text-[#00f2ff]">
                              <FileVideo size={14} />
                            </div>
                            <span className="text-sm font-semibold text-gray-200 group-hover:text-white">{job.title}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                           <div className="account-pill inline-flex bg-[#1e293b] text-[#94a3b8] px-2 py-0.5 rounded text-[10px]">
                             @{job.account.split(' ')[0]}
                           </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`text-[10px] font-bold font-mono tracking-widest ${
                            job.status === 'published' ? 'text-[#39ff14]' : 
                            job.status === 'scheduled' ? 'text-[#00f2ff]' : 
                            job.status === 'waiting' ? 'text-yellow-500' : 'text-[#64748b]'
                          }`}>
                            {job.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           ) : (
             <div className="cyber-panel h-[600px] flex items-center justify-center border-dashed border-2 border-[#1b222d]">
                <div className="text-center opacity-30">
                   <Clock size={48} className="mx-auto text-gray-600 mb-4" />
                   <p className="text-sm italic">Temporal Visualization Loading...</p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function FilterItem({ label, count, active, color }: any) {
  return (
    <div className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${active ? 'bg-cyan-900/20 text-cyan-400' : 'text-gray-500 hover:bg-white/5'}`}>
       <span className={`text-xs ${color}`}>{label}</span>
       {count && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{count}</span>}
    </div>
  );
}

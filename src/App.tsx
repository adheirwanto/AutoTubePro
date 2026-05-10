import { useState } from "react";
import {
  LayoutDashboard,
  Video,
  ListOrdered,
  Radio,
  Users,
  Calendar,
  Settings,
  Menu,
  X,
  UploadCloud,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import Dashboard from "./pages/Dashboard";
import VideoBuilder from "./pages/VideoBuilder";
import RenderQueue from "./pages/RenderQueue";
import LiveManager from "./pages/LiveManager";
import AccountManager from "./pages/AccountManager";
import UploadScheduler from "./pages/UploadScheduler";
import UploadStudio from "./pages/UploadStudio";

type TabId =
  | "dashboard"
  | "builder"
  | "queue"
  | "upload"
  | "live"
  | "accounts"
  | "scheduler";

const NAV_ITEMS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "builder", label: "Video Builder", icon: Video },
  { id: "queue", label: "Render Queue", icon: ListOrdered },
  { id: "upload", label: "Upload Studio", icon: UploadCloud },
  { id: "live", label: "Live Manager", icon: Radio },
  { id: "accounts", label: "Accounts", icon: Users },
  { id: "scheduler", label: "Scheduler", icon: Calendar },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} />;
      case "builder":
        return <VideoBuilder />;
      case "queue":
        return <RenderQueue />;
      case "upload":
        return <UploadStudio />;
      case "live":
        return <LiveManager />;
      case "accounts":
        return <AccountManager />;
      case "scheduler":
        return <UploadScheduler />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-black text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="border-r border-cyan-900/30 flex flex-col z-20"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.h1 className="text-xl font-bold italic text-cyan-400">
              AutoTube<span className="text-white">Pro</span>
            </motion.h1>
          )}

          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-2 hover:bg-cyan-900/20 rounded-md text-cyan-400"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                  : "text-gray-400 hover:bg-cyan-900/10 hover:text-cyan-300"
              }`}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="ml-4">{item.label}</span>}
            </button>
          ))}
        </nav>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-cyan-900/20 flex items-center justify-between px-8">
          <div className="text-sm text-cyan-500">{activeTab.toUpperCase()} MODULE</div>
          <Settings className="text-cyan-400" />
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
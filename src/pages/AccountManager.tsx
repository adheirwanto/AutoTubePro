import { useState, useEffect } from 'react';
import {
  Plus,
  Video,
  Trash2,
  ExternalLink,
  RefreshCw,
  BadgeCheck
} from 'lucide-react';
import { Account, Project } from '../types';

export default function AccountManager() {

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  // ================= LOAD =================
  const loadAccounts = async () => {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(data);
  };

  const loadProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  useEffect(() => {
    loadAccounts();
    loadProjects();

    const interval = setInterval(loadAccounts, 3000);
    return () => clearInterval(interval);
  }, []);

  // ================= ADD PROJECT =================
  const addProject = async () => {
    if (!clientId || !clientSecret) {
      alert("Isi client_id & client_secret dulu");
      return;
    }

    await fetch('/api/projects', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    setClientId("");
    setClientSecret("");

    loadProjects();
  };

  // ================= DELETE =================
  const deleteAccount = async (id: string) => {
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    loadAccounts();
  };

  const deleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    loadProjects();
  };

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-white italic">
          Identity & Security
        </h2>
        <p className="text-sm text-cyan-700 font-mono">
          MULTI PROJECT OAUTH ACTIVE
        </p>
      </div>

      {/* ================= ADD PROJECT ================= */}
      <div className="cyber-panel p-6 rounded-xl space-y-4">

        <h3 className="text-white font-bold text-sm">
          Tambah Google OAuth Project
        </h3>

        <input
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          placeholder="CLIENT ID"
          className="w-full p-2 bg-black border border-gray-700 text-white rounded text-xs"
        />

        <input
          value={clientSecret}
          onChange={e => setClientSecret(e.target.value)}
          placeholder="CLIENT SECRET"
          className="w-full p-2 bg-black border border-gray-700 text-white rounded text-xs"
        />

        <button
          onClick={addProject}
          className="cyber-button px-4 py-2 text-xs"
        >
          Save Project
        </button>

      </div>

      {/* ================= PROJECT LIST ================= */}
      <div>
        <h3 className="text-white text-sm mb-3">OAuth Projects</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {projects.map(p => (
            <div key={p.id} className="cyber-panel p-4 rounded-xl space-y-3">

              <p className="text-xs text-gray-400">Client ID</p>

              <p className="text-xs text-cyan-400 break-all">
                {p.client_id.slice(0, 40)}...
              </p>

              <div className="flex gap-2">

                <button
                  onClick={() => {
                    window.open(`/auth/youtube/${p.id}`, "_blank");
                  }}
                  className="cyber-button flex-1 text-xs py-2 flex items-center justify-center"
                >
                  <Plus size={14} className="mr-2" />
                  Connect
                </button>

                <button
                  onClick={() => deleteProject(p.id)}
                  className="text-red-500 px-2"
                >
                  <Trash2 size={14} />
                </button>

              </div>

            </div>
          ))}

        </div>
      </div>

      {/* ================= ACCOUNTS ================= */}
      <div>
        <h3 className="text-white text-sm mb-3">Connected Accounts</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {accounts.length === 0 && (
            <div className="text-gray-500 text-center col-span-full">
              Belum ada akun YouTube
            </div>
          )}

          {accounts.map(account => (
            <div key={account.id} className="cyber-panel p-6 rounded-xl">

              {/* HEADER */}
              <div className="flex justify-between mb-4">

                {account.avatar ? (
                  <img
                    src={account.avatar}
                    className="w-16 h-16 rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
                    <Video size={20} className="text-red-500" />
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={loadAccounts}>
                    <RefreshCw size={16} />
                  </button>

                  <button onClick={() => deleteAccount(account.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* INFO */}
              <h4 className="text-white font-bold flex items-center">
                {account.name}
                <BadgeCheck size={14} className="ml-2 text-cyan-400" />
              </h4>

              <p className="text-xs text-gray-500">
                Subs: {account.subscribers}
              </p>

              <p className="text-[10px] text-gray-600 mt-1">
                Project: {account.projectId}
              </p>

              {/* LINK */}
              <a
                href={`https://youtube.com/channel/${account.channelId}`}
                target="_blank"
                className="text-xs text-cyan-400 flex items-center mt-2"
              >
                Open Channel <ExternalLink size={12} className="ml-1" />
              </a>

            </div>
          ))}

        </div>
      </div>

      {/* FOOTER */}
      <div className="cyber-panel p-6">
        <p className="text-sm text-gray-400">
          Multi OAuth siap. Tinggal lanjut ke auto upload
        </p>
      </div>

    </div>
  );
}

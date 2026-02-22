
import React, { useState } from 'react';
import type { UserStats } from '../types';
import { ShareModal } from './ShareModal';

interface SettingsProps {
  onBack: () => void;
  user: UserStats;
  onUpdateProfile: (name: string) => void;
  onLogout: () => void;
  onUpgrade: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  onBack, user, onUpdateProfile, onLogout, onUpgrade
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(user.username);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleSaveProfile = () => {
    if (tempName.trim()) {
      onUpdateProfile(tempName.trim());
      setIsEditing(false);
    }
  };

  const shareApp = () => {
    setShowShareModal(true);
  };

  const sections = [
    {
      title: 'Tutorial',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      content: 'Upload any audio file. Our engine analyzes the rhythm and generates beat-synced tiles. Tap the tiles as they enter the target zone to maintain your combo and rack up points!'
    },
    {
      title: 'About',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: 'Vibe Rush V2.5 is a high-performance, local-first rhythm engine. It utilizes advanced signal processing to analyze audio frequency and transient data, transforming any track into a precise, beat-synced gameplay map in real-time'
    },
    {
      title: 'About Developer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-4">
          <p className="font-bold text-white">The GAV3NA Difference</p>
          <p>GAV3NA was born from Tapuwa P Mapfumo's relentless passion to solve real-world problems through innovative software. With years of experience as a professional developer and entrepreneur, Tapuwa recognized a gap in the market—businesses needed partners who truly understood their challenges and could deliver transformative solutions, not just code.</p>
          <p>From the ground up, GAV3NA has been built on the belief that technology is a powerful tool for change. Whether it's creating intelligent chatbot-powered platforms for cross-border remittance services, designing interactive gaming experiences like rhythm-based games, or developing AI-enhanced applications that redefine productivity, we approach each project as an opportunity to push boundaries and create something meaningful. Our portfolio spans React Native mobile experiences, Laravel-powered backends, AI integrations, and cutting-edge web applications—each one crafted with precision and creativity.</p>
          <p>What sets us apart isn't just our technical expertise—it's our commitment to understanding the human side of software. We collaborate deeply with our clients to translate their vision into reality. Whether working with startups exploring new ideas or enterprises scaling their operations, we bring the same level of innovation, dedication, and excellence. At GAV3NA, we don't just build applications; we build partnerships that drive real business impact and create digital solutions that users love.</p>
        </div>
      )
    },
    {
      title: 'Legal',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      content: 'All uploaded audio is processed locally and via Google APIs. We do not store your audio files on our servers. Use tracks you have rights to play.'
    }
  ];

  const formatTime = (seconds?: number) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="h-full container mx-auto px-4 py-8 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="max-w-2xl mx-auto space-y-12 pb-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
            Settings
          </h2>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[1rem] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-widest italic text-white">Profile</h3>
              <button
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300"
              >
                {isEditing ? 'Save' : 'Edit'}
              </button>
            </div>

            {isEditing ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter username"
              />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{user.username}</div>
                  <div className="text-sm text-slate-400">Level {user.level} • {user.exp} EXP</div>
                </div>
              </div>
            )}
          </div>


          {/* Analytics Section */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[1rem] space-y-6">
            <h3 className="text-lg font-black uppercase tracking-widest italic text-white flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Analytics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 p-4 rounded-xl">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Playtime</div>
                <div className="text-2xl font-black text-white">{formatTime(user.playtime)}</div>
              </div>
              <div className="bg-black/20 p-4 rounded-xl">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Songs Cleared</div>
                <div className="text-2xl font-black text-white">{user.songsPlayed || 0}</div>
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 p-8 rounded-[1rem] space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black uppercase tracking-widest italic text-white">Pro Status</h3>
                <p className="text-sm text-blue-200 mt-1">{user.isPro ? 'Active Member' : 'Support the developer'}</p>
              </div>
              {user.isPro ? (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/50 uppercase tracking-widest">Active</span>
              ) : (
                <button
                  onClick={onUpgrade}
                  className="px-6 py-2 bg-white text-black text-xs font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
                >
                  Remove Ads
                </button>
              )}
            </div>
          </div>

          {sections.map((section, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 p-8 rounded-[1rem] space-y-4">
              <div className="flex items-center gap-3 text-white">
                {section.icon}
                <h3 className="text-lg font-black uppercase tracking-widest italic">{section.title}</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                {section.content}
              </p>
            </div>
          ))}

          <button
            onClick={shareApp}
            className="w-full py-6 bg-white text-black rounded-[1rem] font-black text-xl tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-xl uppercase italic flex items-center justify-center gap-4 mt-8"
          >
            Share App
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          <button
            onClick={onLogout}
            className="w-full py-4 text-red-500 font-bold uppercase tracking-widest text-sm hover:bg-red-500/10 rounded-xl transition-colors mt-4"
          >
            Log Out
          </button>

          <div className="text-center text-[10px] text-slate-600 uppercase tracking-widest mt-8 pb-8">
            Vibe Rush v2.5.0 • Build 2026.02
          </div>
        </div>
      </div>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </div >
  );
};

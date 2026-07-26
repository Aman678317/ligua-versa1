import React, { useState, useEffect } from 'react';
import Navbar from './components/navbar/Navbar';
import DashboardLayout from './components/dashboard/DashboardLayout';
import PreJoinPreview from './components/prejoin/PreJoinPreview';
import VideoRoom from './components/call/VideoRoom';
import MeetingSummaryView from './components/summary/MeetingSummaryView';
import AdminAnalytics from './components/analytics/AdminAnalytics';
import SettingsTab from './components/settings/SettingsTab';
import AuthModal from './components/auth/AuthModal';
import ScheduleMeetingModal from './components/modals/ScheduleMeetingModal';
import MeetingCreatedModal from './components/modals/MeetingCreatedModal';
import { mockLanguages, mockMeetings, mockSummaries, mockAnalytics, mockUsers } from './mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'prejoin' | 'call' | 'summary' | 'analytics' | 'settings'
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [activeRoomCode, setActiveRoomCode] = useState('global-sync-892');
  
  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState(null);

  // User & Preference Settings state
  const [userSettings, setUserSettings] = useState({
    captionSize: 'medium',
    dualCaptionStyle: 'stacked',
    originalVoiceVolume: 0.3,
    autoPlayTranslation: true,
    autoTranslateChat: true
  });

  const [currentUser, setCurrentUser] = useState({
    id: 'user-aman',
    name: 'Aman Sharma',
    email: 'aman@linguaversa.io',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    defaultLang: 'en'
  });

  // Data States
  const [languages, setLanguages] = useState(mockLanguages);
  const [meetings, setMeetings] = useState(mockMeetings);
  const [summaries, setSummaries] = useState(mockSummaries);
  const [analytics, setAnalytics] = useState(mockAnalytics);
  const [contacts, setContacts] = useState(mockUsers);

  // Check URL pathname for direct join link e.g. /meet/lingua-382-991
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/meet/')) {
      const code = path.replace('/meet/', '').trim();
      if (code) {
        setActiveRoomCode(code);
        setActiveTab('prejoin');
      }
    }
  }, []);

  // API Data Fetching
  useEffect(() => {
    fetch('/api/languages')
      .then(res => res.json())
      .then(data => data.success && setLanguages(data.languages))
      .catch(() => {});

    fetch('/api/meetings')
      .then(res => res.json())
      .then(data => data.success && setMeetings(data.meetings))
      .catch(() => {});

    fetch('/api/summaries')
      .then(res => res.json())
      .then(data => data.success && setSummaries(data.summaries))
      .catch(() => {});

    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => data.success && setAnalytics(data.analytics))
      .catch(() => {});
  }, []);

  // Handlers
  const handleStartInstantCall = async () => {
    const code = `lingua-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
    
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Instant Video Call' })
      });
      const data = await res.json();
      const finalCode = data?.meeting?.code || code;
      
      setActiveRoomCode(finalCode);
      setActiveTab('prejoin');
      window.history.pushState({}, '', `/meet/${finalCode}`);
    } catch (e) {
      setActiveRoomCode(code);
      setActiveTab('prejoin');
      window.history.pushState({}, '', `/meet/${code}`);
    }
  };

  const handleCreateForLater = async () => {
    const code = `lingua-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
    const newMeeting = {
      id: `meeting-${Date.now()}`,
      code,
      title: 'Scheduled Call for Later',
      description: 'Share this link with participants to join later',
      status: 'SCHEDULED',
      hostId: currentUser.id,
      scheduledStart: new Date(Date.now() + 3600000).toISOString()
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    setCreatedMeeting(newMeeting);
  };

  const handleJoinCall = (code) => {
    const cleanCode = code || 'global-sync-892';
    setActiveRoomCode(cleanCode);
    setActiveTab('prejoin');
    window.history.pushState({}, '', `/meet/${cleanCode}`);
  };

  const handleConfirmJoinFromGreenroom = (roomCode, participantDetails) => {
    if (participantDetails?.name) {
      setCurrentUser(prev => ({ ...prev, name: participantDetails.name }));
    }
    setActiveRoomCode(roomCode);
    setActiveTab('call');
  };

  const handleLeaveCall = () => {
    setActiveTab('dashboard');
    window.history.pushState({}, '', '/');
  };

  const handleMeetingCreated = (newMeeting) => {
    setIsScheduleOpen(false);
    setMeetings((prev) => [newMeeting, ...prev]);
    setCreatedMeeting(newMeeting);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        languages={languages}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Dynamic Main View */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <DashboardLayout
            currentUser={currentUser}
            onStartInstantCall={handleStartInstantCall}
            onJoinCall={handleJoinCall}
            onCreateForLater={handleCreateForLater}
            onOpenSchedule={() => setIsScheduleOpen(true)}
            meetings={meetings}
            contacts={contacts}
            onSelectSummary={() => setActiveTab('summary')}
          />
        )}

        {activeTab === 'prejoin' && (
          <PreJoinPreview
            roomCode={activeRoomCode}
            currentUser={currentUser}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            languages={languages}
            onJoinCall={handleConfirmJoinFromGreenroom}
            onCancel={handleLeaveCall}
          />
        )}

        {activeTab === 'call' && (
          <VideoRoom
            roomCode={activeRoomCode}
            currentUser={currentUser}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            languages={languages}
            userSettings={userSettings}
            onLeaveCall={handleLeaveCall}
          />
        )}

        {activeTab === 'summary' && (
          <MeetingSummaryView summaries={summaries} />
        )}

        {activeTab === 'analytics' && (
          <AdminAnalytics analytics={analytics} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            onSaveSettings={(newSettings) => setUserSettings(prev => ({ ...prev, ...newSettings }))}
          />
        )}
      </main>

      {/* App Flow Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />

      <ScheduleMeetingModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onMeetingCreated={handleMeetingCreated}
        languages={languages}
      />

      <MeetingCreatedModal
        isOpen={!!createdMeeting}
        onClose={() => setCreatedMeeting(null)}
        meeting={createdMeeting}
        onJoinCall={handleJoinCall}
      />

    </div>
  );
}

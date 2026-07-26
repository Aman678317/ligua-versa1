// Database Mock / Seed Handler for LinguaVersa Express API
export const mockLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', piperVoice: 'en_US-lessac' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', piperVoice: 'ja_JP-takumi' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', piperVoice: 'hi_IN-kalpana' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', piperVoice: 'es_ES-dave' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', piperVoice: 'de_DE-thorsten' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', piperVoice: 'fr_FR-siwis' },
  { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文', flag: '🇨🇳', piperVoice: 'zh_CN-huayan' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', piperVoice: 'ar_JO-karem' },
];

export const mockUsers = [
  { id: 'user-aman', name: 'Aman Sharma', email: 'aman@linguaversa.io', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', defaultLang: 'en' },
  { id: 'user-kenji', name: 'Kenji Sato', email: 'kenji.sato@tokyo-tech.jp', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', defaultLang: 'ja' },
  { id: 'user-priya', name: 'Priya Patel', email: 'priya@mumbaidev.in', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', defaultLang: 'hi' },
  { id: 'user-elena', name: 'Elena Rostova', email: 'elena.r@berlin-consulting.de', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', defaultLang: 'de' },
];

export const mockMeetings = [
  {
    id: 'meeting-101',
    code: 'global-sync-892',
    title: 'Cross-Border Product & Engineering Architecture Sync',
    description: 'Weekly roadmap align call between Mumbai engineering lead, Tokyo product owner, and Berlin operations.',
    status: 'LIVE',
    hostId: 'user-aman',
    scheduledStart: new Date().toISOString(),
    participantsCount: 4,
    settings: {
      waitingRoomEnabled: true,
      isLocked: false,
      muteOnJoin: false,
      allowScreenShare: true,
      allowChat: true,
      allowReactions: true,
    }
  },
  {
    id: 'meeting-102',
    code: 'family-reunion-442',
    title: 'Weekend Family Catchup',
    description: 'Grandparent (Hindi) + Grandchildren (English) live translated family call.',
    status: 'SCHEDULED',
    hostId: 'user-priya',
    scheduledStart: new Date(Date.now() + 86400000).toISOString(),
    participantsCount: 3,
    settings: {
      waitingRoomEnabled: false,
      isLocked: false,
      muteOnJoin: false,
      allowScreenShare: true,
      allowChat: true,
      allowReactions: true,
    }
  }
];

export const mockSummaries = [
  {
    id: 'sum-1',
    meetingId: 'meeting-101',
    meetingTitle: 'Cross-Border Product & Engineering Architecture Sync',
    date: '2026-07-25',
    durationMin: 42,
    languagesUsed: ['English', 'Japanese', 'Hindi', 'German'],
    overview: 'The team finalized the WebRTC TURN relay deployment strategy for cross-network connectivity and agreed on lowering STT chunking intervals to achieve P75 latency of 1.8s.',
    keyPoints: [
      'Kenji confirmed Tokyo client sign-off on dual-caption interface.',
      'Aman demonstrated Piper TTS fallback pipeline to Edge-TTS for German voice coverage.',
      'Priya reviewed the Prisma analytics schema for STT/TTS latency metering.'
    ],
    actionItems: [
      { id: 'act-1', text: 'Deploy coturn TURN server on Render for fallback cross-network WebSockets', assignee: 'Aman Sharma', done: true },
      { id: 'act-2', text: 'Integrate browser SpeechRecognition backup for offline caption fallback', assignee: 'Priya Patel', done: false },
      { id: 'act-3', text: 'Conduct latency benchmark across 50 simulated concurrent streams', assignee: 'Kenji Sato', done: false }
    ],
    transcriptSample: [
      { id: 't1', speaker: 'Kenji Sato', sourceLang: 'ja', original: '来週のデプロイの準備はできていますか？', targetLang: 'en', translated: 'Are you ready for next week’s deployment?', time: '10:02 AM' },
      { id: 't2', speaker: 'Aman Sharma', sourceLang: 'en', original: 'Yes, the TURN server setup is active and end-to-end latency is under 2.1 seconds.', targetLang: 'ja', translated: 'はい、TURNサーバーの設定が完了しており、エンドツーエンドのレイテンシーは2.1秒未満です。', time: '10:03 AM' },
      { id: 't3', speaker: 'Priya Patel', sourceLang: 'hi', original: 'मुख्य सारांश और कार्य बिंदु स्वचालित रूप से हिंदी में भी सहेजे गए हैं।', targetLang: 'en', translated: 'Key summary and action items are automatically saved in Hindi as well.', time: '10:04 AM' }
    ]
  }
];

export const mockAnalytics = {
  p75LatencyMs: 1840,
  sttAvgLatencyMs: 420,
  nmtAvgLatencyMs: 610,
  ttsAvgLatencyMs: 810,
  totalTranslatedMinutes: 14280,
  activeCallsCount: 18,
  totalAudioChunks: 189200,
  languageDistribution: [
    { language: 'English', percentage: 38 },
    { language: 'Japanese', percentage: 24 },
    { language: 'Hindi', percentage: 20 },
    { language: 'Spanish', percentage: 11 },
    { language: 'German', percentage: 7 }
  ],
  latencyTrend: [
    { time: '10:00', latency: 2200 },
    { time: '10:15', latency: 1950 },
    { time: '10:30', latency: 1840 },
    { time: '10:45', latency: 1790 },
    { time: '11:00', latency: 1820 },
  ]
};

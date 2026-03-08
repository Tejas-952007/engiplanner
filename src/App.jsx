import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import AuthScreen from './components/AuthScreen';
import { auth, db, doc, getDoc, setDoc, firebaseConfig } from './firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

// ── Premium Logo — IDE Window Style ────────────
function LogoMark({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.12)) drop-shadow(0 4px 12px rgba(0,0,0,0.9))', flexShrink: 0 }}>
      {/* Black base */}
      <rect width="56" height="56" rx="14" fill="#0d0d0d" />
      <rect x="0.5" y="0.5" width="55" height="55" rx="13.5" stroke="rgba(255,255,255,0.14)" />
      {/* Title bar background */}
      <rect x="6" y="6" width="44" height="13" rx="4" fill="rgba(255,255,255,0.07)" />
      <line x1="6" y1="19" x2="50" y2="19" stroke="rgba(255,255,255,0.09)" strokeWidth="0.8" />
      {/* macOS traffic lights */}
      <circle cx="14" cy="12.5" r="2.4" fill="#ff5f57" />
      <circle cx="21.5" cy="12.5" r="2.4" fill="#ffbd2e" />
      <circle cx="29" cy="12.5" r="2.4" fill="#28c840" />
      {/* Code area */}
      <rect x="6" y="19" width="44" height="30" rx="0" fill="rgba(0,0,0,0.15)" />
      {/* Left bracket < */}
      <path d="M19 27.5L12.5 33.5L19 39.5" stroke="#ffffff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
      {/* Right bracket > */}
      <path d="M37 27.5L43.5 33.5L37 39.5" stroke="#ffffff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
      {/* Slash / */}
      <path d="M32.5 25L23.5 42" stroke="rgba(255,255,255,0.72)" strokeWidth="2.3" strokeLinecap="round" />
      {/* Circuit traces */}
      <path d="M28 43V46.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M28 46.5H16" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M28 46.5H40" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M16 46.5V49" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M40 46.5V49" stroke="rgba(255,255,255,0.14)" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="16" cy="49" r="1.5" fill="rgba(255,255,255,0.35)" />
      <circle cx="40" cy="49" r="1.5" fill="rgba(255,255,255,0.35)" />
      <circle cx="28" cy="43" r="1.3" fill="rgba(255,255,255,0.28)" />
    </svg>
  );
}

function TopBar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.9rem',
      marginBottom: '2.5rem',
      paddingBottom: '1.6rem',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <LogoMark size={68} />
      {/* Creative brand text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', userSelect: 'none' }}>

        {/* Line 1:  < Engi */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', lineHeight: 1 }}>
          <span style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: '1.1rem', fontWeight: 400,
            color: 'rgba(255,255,255,0.28)',
            letterSpacing: '-0.02em',
          }}>&lt;</span>
          <span style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: '1.6rem', fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}>Engi</span>
        </div>

        {/* Line 2:  Planner /> */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', lineHeight: 1, marginLeft: '2px' }}>
          <span style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: '1.0rem', fontWeight: 300,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.06em',
          }}>Planner</span>
          <span style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: '0.85rem', fontWeight: 400,
            color: 'rgba(255,255,255,0.28)',
            letterSpacing: '-0.01em',
          }}>/&gt;</span>
        </div>

        {/* Tagline */}
        <div style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: '0.56rem',
          color: 'rgba(255,255,255,0.18)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginTop: '5px',
          marginLeft: '1px',
        }}>
          Engineer's OS
        </div>
      </div>
      <div style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.6rem', color: 'rgba(255,255,255,0.14)', letterSpacing: '0.06em' }}>
        v1.0
      </div>
    </div>
  );
}

function App() {
  const safeGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const safeParse = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

  const [userProfile, setUserProfile] = useState(() => {
    const raw = safeGet('dream_user_profile');
    return raw ? safeParse(raw) : null;
  });
  const [uid, setUid] = useState(() => safeGet('dream_user_uid') || null);
  const [authStatus, setAuthStatus] = useState(() => safeGet('dream_auth_status') || 'pending');
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const safeGet = (key) => {
      try { return localStorage.getItem(key); } catch { return null; }
    };
    const safeSet = (key, value) => {
      try { localStorage.setItem(key, value); } catch { return; }
    };
    const safeRemove = (key) => {
      try { localStorage.removeItem(key); } catch { return; }
    };
    const safeParse = (raw) => {
      try { return JSON.parse(raw); } catch { return null; }
    };
    const readJson = (key) => {
      const raw = safeGet(key);
      return raw ? safeParse(raw) : null;
    };

    const hydrateUserDoc = async (userUid) => {
      if (!db) return;

      const docRef = doc(db, 'users', userUid);
      let data = null;
      try {
        const docSnap = await getDoc(docRef);
        data = docSnap.exists() ? docSnap.data() : {};
      } catch (e) {
        console.error('Cloud load failed', e);
        data = {};
      }

      const localProfile = readJson('dream_user_profile');
      let profile = data?.profile || localProfile || null;

      if (!data?.profile && localProfile) {
        try { await setDoc(docRef, { profile: localProfile }, { merge: true }); } catch (e) {
          console.error('Cloud profile hydrate failed:', e);
        }
      }

      // Store Cloud → Local (prefer uid-based keys; keep name-based for backward compat)
      const tasksKeyUid = `dream_tasks_uid_${userUid}`;
      const historyKeyUid = `dream_history_uid_${userUid}`;
      const catsKeyUid = `dream_cats_uid_${userUid}`;

      const maybeWriteByName = (kind, value) => {
        if (!profile?.name) return;
        const key = kind === 'tasks'
          ? `dream_tasks_${profile.name}`
          : kind === 'history'
            ? `dream_history_${profile.name}`
            : `dream_cats_${profile.name}`;
        safeSet(key, JSON.stringify(value));
      };

      if (data?.tasks) {
        safeSet(tasksKeyUid, JSON.stringify(data.tasks));
        maybeWriteByName('tasks', data.tasks);
      } else {
        // If Cloud missing tasks but Local has them (guest → login), upload once
        const localTasks = readJson(tasksKeyUid) || (profile?.name ? readJson(`dream_tasks_${profile.name}`) : null);
        if (localTasks) {
          safeSet(tasksKeyUid, JSON.stringify(localTasks));
          maybeWriteByName('tasks', localTasks);
          try { await setDoc(docRef, { tasks: localTasks }, { merge: true }); } catch (e) { console.error('Cloud tasks hydrate failed:', e); }
        }
      }

      if (data?.history) {
        safeSet(historyKeyUid, JSON.stringify(data.history));
        maybeWriteByName('history', data.history);
      } else {
        const localHistory = readJson(historyKeyUid) || (profile?.name ? readJson(`dream_history_${profile.name}`) : null);
        if (localHistory) {
          safeSet(historyKeyUid, JSON.stringify(localHistory));
          maybeWriteByName('history', localHistory);
          try { await setDoc(docRef, { history: localHistory }, { merge: true }); } catch (e) { console.error('Cloud history hydrate failed:', e); }
        }
      }

      if (data?.categories) {
        safeSet(catsKeyUid, JSON.stringify(data.categories));
        maybeWriteByName('cats', data.categories);
      } else {
        const localCats = readJson(catsKeyUid) || (profile?.name ? readJson(`dream_cats_${profile.name}`) : null);
        if (localCats) {
          safeSet(catsKeyUid, JSON.stringify(localCats));
          maybeWriteByName('cats', localCats);
          try { await setDoc(docRef, { categories: localCats }, { merge: true }); } catch (e) { console.error('Cloud categories hydrate failed:', e); }
        }
      }

      if (profile) {
        safeSet('dream_user_profile', JSON.stringify(profile));
        if (!cancelled) setUserProfile(profile);
      } else {
        if (!cancelled) setUserProfile(null);
      }
    };

    setBootError('');

    // Force Google login: app works only when Firebase keys are configured.
    if (!firebaseConfig?.apiKey || !auth) {
      setAuthStatus('unauth');
      setLoading(false);
      setUid(null);
      setUserProfile(null);
      setBootError('Firebase is not configured. Add your keys in `.env` (VITE_FIREBASE_...) to enable Google login.');
      return () => { cancelled = true; };
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;

      if (!user) {
        safeRemove('dream_user_uid');
        safeSet('dream_auth_status', 'unauth');
        setUid(null);
        setAuthStatus('unauth');
        setLoading(false);
        return;
      }

      // Always show loading while syncing with cloud to prevent outdated local cache
      // from instantly overwriting the newest cloud data when Dashboard renders.
      setLoading(true);

      const userUid = user.uid;
      safeSet('dream_user_uid', userUid);
      safeSet('dream_auth_status', 'auth');
      setUid(userUid);
      setAuthStatus('auth');

      try {
        await hydrateUserDoc(userUid);
      } catch (e) {
        console.error('Hydration failed:', e);
        if (!cancelled) setBootError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, (err) => {
      console.error('Auth state listener failed:', err);
      if (!cancelled) {
        safeSet('dream_auth_status', 'unauth');
        setAuthStatus('unauth');
        setUid(null);
        setBootError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    });

    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const handleSaveProfile = async (profile) => {
    try { localStorage.setItem('dream_user_profile', JSON.stringify(profile)); } catch (e) { console.warn('Local profile save failed:', e); }
    setUserProfile(profile);
    if (uid && db) {
      try { await setDoc(doc(db, 'users', uid), { profile }, { merge: true }); } catch (e) { console.error('Cloud profile save failed:', e); }
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem('dream_user_profile');
      localStorage.removeItem('dream_user_uid');
      localStorage.setItem('dream_auth_status', 'unauth');
      setUserProfile(null);
      setUid(null);
      setAuthStatus('unauth');
    } catch (e) { console.error('Logout failed:', e); }
  };

  // Always show loading screen when computing auth or actively syncing with cloud
  if (authStatus === 'pending' || (authStatus === 'auth' && loading)) {
    return (
      <div className="app-container">
        <TopBar />
        <div className="glass-panel" style={{ maxWidth: 560, margin: '0 auto', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="spin-pulse" style={{ display: 'inline-block' }}>⚡</span> Syncing with Cloud...
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>
            Fetching your securely saved profile.
          </p>
          {bootError ? (
            <div style={{ marginTop: '1rem', color: 'var(--accent-red)', fontSize: '0.85rem' }}>
              {bootError}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <TopBar />
      {!userProfile && authStatus === 'unauth' ? (
        <AuthScreen />
      ) : userProfile ? (
        <Dashboard userProfile={userProfile} uid={uid} onLogout={handleLogout} onUpdateProfile={handleSaveProfile} />
      ) : (
        <Onboarding onComplete={handleSaveProfile} />
      )}
    </div>
  );
}

export default App;

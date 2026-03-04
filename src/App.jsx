import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';

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
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('dream_user_profile');
    if (saved) setUserProfile(JSON.parse(saved));
    setLoading(false);
  }, []);

  const handleSaveProfile = (profile) => {
    localStorage.setItem('dream_user_profile', JSON.stringify(profile));
    setUserProfile(profile);
  };

  const handleReset = () => {
    localStorage.removeItem('dream_user_profile');
    setUserProfile(null);
  };

  if (loading) return null;

  return (
    <div className="app-container">
      <TopBar />
      {userProfile
        ? <Dashboard userProfile={userProfile} onReset={handleReset} />
        : <Onboarding onComplete={handleSaveProfile} />
      }
    </div>
  );
}

export default App;

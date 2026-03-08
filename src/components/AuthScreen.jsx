import React, { useState } from 'react';
import { Cloud, AlertCircle } from 'lucide-react';
import { auth, provider, firebaseConfig } from '../firebase';

export default function AuthScreen() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isFirebaseConfigured = !!firebaseConfig.apiKey;

    const handleGoogleLogin = async () => {
        if (!isFirebaseConfigured) {
            setError('Cloud (Firebase) is not configured yet. Add API keys in `.env`.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { signInWithPopup } = await import('firebase/auth');
            await signInWithPopup(auth, provider);
        } catch (err) {
            setError(err?.message || 'Google login failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="onboarding-wrapper animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', marginBottom: '1rem', boxShadow: '0 0 20px rgba(255,255,255,0.05)' }}>
                        <Cloud size={40} color="var(--accent-blue)" />
                    </div>
                    <h2 style={{ fontSize: '1.4rem' }}>Welcome to EngiPlanner</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        Log in with Google to sync your tasks to the Cloud.
                    </p>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,123,114,0.1)', border: '1px solid rgba(255,123,114,0.3)', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {!isFirebaseConfigured && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', color: '#fbbf24', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                        <AlertCircle size={16} /> Add Firebase keys in <code>.env</code> to enable Google login.
                    </div>
                )}

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading || !isFirebaseConfigured}
                    className="btn"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', background: '#fff', color: '#000', fontWeight: 'bold' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {loading ? "Connecting to Google..." : "Continue with Google"}
                </button>
            </div>
        </div>
    );
}

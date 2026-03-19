import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, CheckCircle2, AlertCircle, X, ExternalLink, MessageSquare } from 'lucide-react';
import { db, doc, setDoc, onSnapshot, messaging, getToken } from '../firebase';

/**
 * Premium Notification Hub for EngiPlanner
 * Handles:
 * 1. Firebase Cloud Messaging (FCM) — REAL BACKGROUND NOTIFICATIONS
 * 2. In-app Rich Toast Feed
 */
export default function NotificationManager({ uid, userProfile }) {
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);
    const [notifications, setNotifications] = useState([]);
    const [fcmToken, setFcmToken] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [showHub, setShowHub] = useState(false);

    // ── Setup FCM Token for Background Messaging ─────────────────────────
    const requestToken = useCallback(async () => {
        if (!messaging || !uid) return;
        
        try {
            // VAPID_KEY is required for web push (get it from Firebase Console Messaging settings)
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''; 
            const currentToken = await getToken(messaging, { vapidKey });
            if (currentToken) {
                setFcmToken(currentToken);
                // Save token to Firestore so your backend can push to this device
                await setDoc(doc(db, 'users', uid), { 
                    fcmTokens: { [currentToken]: true } 
                }, { merge: true });
                console.log('FCM Token generated and saved 🚀');
            } else {
                console.warn('No registration token available. Request permission to generate one.');
            }
        } catch (err) {
            console.error('An error occurred while retrieving token:', err);
        }
    }, [uid]);

    // Request token automatically if permission is already granted
    useEffect(() => {
        if (permissionStatus === 'granted') {
            requestToken();
        }
    }, [permissionStatus, requestToken]);

    // ── Sync Notifications from Firestore ──────────────────────────────────
    useEffect(() => {
        if (!uid || !db) return;

        const unsub = onSnapshot(doc(db, 'users', uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.notifications) {
                    setNotifications(data.notifications);
                    setUnreadCount(data.notifications.filter(n => !n.read).length);
                }
            }
        });
        return () => unsub();
    }, [uid]);

    // ── Request Browser Permission ──────────────────────────────────────────
    const requestPermission = async () => {
        try {
            const result = await Notification.requestPermission();
            setPermissionStatus(result);
            if (result === 'granted') {
                showInApp('🔔 System Alert Enabled', 'EngiPlanner will now notify you even if you\'re in another tab!', 'success');
            } else {
                showInApp('⚠️ Permission Denied', 'Browser notifications were blocked. You can still see in-app alerts.', 'warn');
            }
        } catch (e) {
            console.error('Permission error:', e);
        }
    };

    // ── Show System Notification ────────────────────────────────────────────
    const showSystemNotification = useCallback((title, body, url = '/') => {
        if (permissionStatus !== 'granted') return;

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(title, {
                    body,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    vibrate: [200, 100, 200, 100],
                    data: { url }
                });
            });
        } else {
            new Notification(title, { body, icon: '/icon-192.png' });
        }
    }, [permissionStatus]);

    // ── Internal Toast Trigger ──────────────────────────────────────────────
    const showInApp = (title, body, type = 'info') => {
        const id = Date.now();
        const next = { id, title, body, type, read: false, date: new Date().toISOString() };
        setNotifications(prev => [next, ...prev].slice(0, 50));
        
        // Persist to Firestore if logged in
        if (uid && db) {
            setDoc(doc(db, 'users', uid), { 
                notifications: [next, ...notifications].slice(0, 50) 
            }, { merge: true }).catch(console.error);
        }
        
        // Show system one too if app hidden
        if (document.hidden) {
            showSystemNotification(title, body);
        }
    };

    const markAllAsRead = () => {
        const next = notifications.map(n => ({ ...n, read: true }));
        setNotifications(next);
        setUnreadCount(0);
        if (uid && db) {
            setDoc(doc(db, 'users', uid), { notifications: next }, { merge: true }).catch(console.error);
        }
    };

    const deleteNotification = (id) => {
        const next = notifications.filter(n => n.id !== id);
        setNotifications(next);
        setUnreadCount(next.filter(n => !n.read).length);
        if (uid && db) {
            setDoc(doc(db, 'users', uid), { notifications: next }, { merge: true }).catch(console.error);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* ── Bell Icon with Unread Badge ── */}
            <button 
                onClick={() => { setShowHub(!showHub); markAllAsRead(); }}
                className="btn btn-outline"
                style={{ 
                    padding: '0.6rem', position: 'relative', borderRadius: '50%',
                    background: unreadCount > 0 ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.05)',
                    borderColor: unreadCount > 0 ? 'rgba(96,165,250,0.4)' : 'var(--border-hi)'
                }}
            >
                {unreadCount > 0 ? <Bell className="pulse-blue" size={20} color="#60a5fa" /> : <BellOff size={20} />}
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '-5px', right: '-5px',
                        background: '#f87171', color: '#fff', fontSize: '0.65rem',
                        fontWeight: 900, padding: '2px 6px', borderRadius: '99px',
                        boxShadow: '0 0 10px rgba(248,113,113,0.5)',
                        animation: 'popIn 0.3s var(--spring)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* ── Notification Hub (Slide-out or Panel) ── */}
            {showHub && (
                <div 
                    className="glass-panel" 
                    style={{
                        position: 'fixed', top: '5.5rem', right: '2rem',
                        width: '380px', maxHeight: '500px', zIndex: 1000,
                        padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        border: '1px solid rgba(255,255,255,0.1)',
                        animation: 'slideInRight 0.3s var(--spring)'
                    }}
                >
                    <div style={{ 
                        padding: '1.2rem', background: 'rgba(255,255,255,0.02)', 
                        borderBottom: '1px solid var(--border-hi)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={18} color="var(--accent-blue)" />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Notification Center</h3>
                        </div>
                        <button 
                            onClick={() => setShowHub(false)} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.8rem' }}>
                        {permissionStatus !== 'granted' && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(167,139,250,0.05) 100%)',
                                border: '1px dashed rgba(96,165,250,0.3)',
                                borderRadius: '12px', padding: '1rem', marginBottom: '1rem'
                            }}>
                                <div style={{ display: 'flex', gap: '0.7rem' }}>
                                    <AlertCircle size={18} color="#60a5fa" style={{ flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Missing System Alerts</p>
                                        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                                            Enable browser notifications to get alerts like Swiggy & Zomato!
                                        </p>
                                        <button 
                                            onClick={requestPermission} 
                                            className="btn btn-primary" 
                                            style={{ marginTop: '0.8rem', padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
                                        >
                                            Allow Notifications
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {notifications.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <MessageSquare size={40} color="var(--border-hi)" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>No notifications yet.</p>
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
                                    Live updates from your workspace will appear here.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {notifications.map(n => (
                                    <div 
                                        key={n.id}
                                        style={{
                                            padding: '0.9rem', borderRadius: '12px',
                                            background: n.read ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.04)',
                                            border: n.read ? '1px solid var(--border)' : '1px solid rgba(255,255,255,0.1)',
                                            position: 'relative', transition: 'all 0.2s',
                                            cursor: 'default'
                                        }}
                                        className="hover-card"
                                    >
                                        {!n.read && (
                                            <div style={{
                                                position: 'absolute', top: '10px', right: '10px',
                                                width: '6px', height: '6px', borderRadius: '50%',
                                                background: 'var(--accent-blue)', boxShadow: '0 0 6px var(--accent-blue)'
                                            }} />
                                        )}
                                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: n.type === 'warn' ? '#f87171' : n.type === 'success' ? '#34d399' : '#fff', marginBottom: '2px' }}>
                                            {n.title}
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                                            {n.body}
                                        </p>
                                        <div style={{ 
                                            marginTop: '6px', display: 'flex', justifyContent: 'space-between', 
                                            alignItems: 'center', fontSize: '0.65rem'
                                        }}>
                                            <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                                                {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <button 
                                                onClick={() => deleteNotification(n.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '2px' }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ 
                        padding: '0.7rem', background: 'rgba(0,0,0,0.1)', 
                        borderTop: '1px solid var(--border-hi)', textAlign: 'center'
                    }}>
                        <button 
                            onClick={() => { setShowHub(false); }}
                            className="btn btn-outline" 
                            style={{ padding: '0.3rem 1rem', fontSize: '0.75rem' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop click to close */}
            {showHub && (
                <div 
                    onClick={() => setShowHub(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                />
            )}
        </div>
    );
}

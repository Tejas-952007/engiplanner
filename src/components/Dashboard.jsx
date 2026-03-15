import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    BookOpen, FolderDot, GraduationCap, Code2,
    Briefcase, CheckCircle2, Circle, Plus, Flame,
    CalendarDays, AlertCircle, Terminal, Coffee, Cpu,
    Dumbbell, Map, LogOut, History, Settings, Trash2, X,
    Bell, BellOff, Edit2, Play, Square, Clock, Save, User, Sliders, Mail,
    Send, Share2, UserPlus, Copy, Check, BarChart2
} from 'lucide-react';
import { db, doc, setDoc, onSnapshot, auth } from '../firebase';
import StatsPanel from './StatsPanel';
import FitnessPanel from './FitnessPanel';
import RoadmapPanel from './RoadmapPanel';

const CATEGORIES = {
    'Academics': { icon: BookOpen, color: '#60a5fa', hex: '#60a5fa', glow: 'rgba(96,165,250,0.35)' },
    'Projects': { icon: FolderDot, color: '#c084fc', hex: '#c084fc', glow: 'rgba(192,132,252,0.35)' },
    'Roadmap': { icon: Map, color: '#f472b6', hex: '#f472b6', glow: 'rgba(244,114,182,0.35)' },
    'DSA / LeetCode': { icon: Code2, color: '#f87171', hex: '#f87171', glow: 'rgba(248,113,113,0.35)' },
    'Internships': { icon: Briefcase, color: '#34d399', hex: '#34d399', glow: 'rgba(52,211,153,0.35)' },
    'Exams': { icon: GraduationCap, color: '#fbbf24', hex: '#fbbf24', glow: 'rgba(251,191,36,0.35)' },
    'Fitness': { icon: Dumbbell, color: '#fb923c', hex: '#fb923c', glow: 'rgba(251,146,60,0.35)' },
};

// ── Accent map for CSS vars (keep backward compat) ──────────────────────────
const CAT_ACCENT = {
    'Academics': 'var(--accent-blue)',
    'Projects': 'var(--accent-purple)',
    'DSA / LeetCode': 'var(--accent-red)',
    'Internships': 'var(--accent-green)',
    'Exams': 'var(--accent-orange)',
    'Fitness': '#fb923c',
};

const PRIORITIES = { High: 'priority-high', Medium: 'priority-medium', Low: 'priority-low' };
const DAILY_CHAL = ["Solve 1 Easy LeetCode 🧠", "Apply to 1 Job 💼", "Read 1 Tech Article 📰", "Review Resume 5 min 📝", "Drink 2L water 💧", "Learn 1 CLI trick 💻", "Refactor a messy function 🛠️"];

const COLOR_OPTIONS = [
    '#58a6ff', '#bc8cff', '#3fb950', '#ff7b72', '#f6ad55', '#a0aec0',
    '#f687b3', '#68d391', '#fc8181', '#b794f4', '#90cdf4', '#fbd38d',
];

// ── Smart task generator ─────────────────────────────────────────────────────
function buildSmartTasks(userProfile) {
    const today = new Date();
    const d = n => { const x = new Date(today); x.setDate(x.getDate() + n); return x.toISOString().split('T')[0]; };
    const { subjects = [], roadmap = '', year = '' } = userProfile;
    let id = 1000;
    const tasks = [];

    subjects.forEach((sub, i) => {
        tasks.push({ id: id++, title: `${sub} — Complete pending assignments`, category: 'Academics', subject: sub, priority: 'High', completed: false, deadline: d(2), source: 'auto', completedAt: null });
        tasks.push({ id: id++, title: `${sub} — Revise Chapter ${i + 2} notes`, category: 'Academics', subject: sub, priority: 'Medium', completed: false, deadline: d(5), source: 'auto', completedAt: null });
        tasks.push({ id: id++, title: `${sub} — Mid-term Preparation`, category: 'Exams', subject: sub, priority: 'High', completed: false, deadline: d(10), source: 'auto', completedAt: null });
    });

    tasks.push({ id: id++, title: 'LeetCode — Solve 2 Array problems', category: 'DSA / LeetCode', priority: 'High', completed: false, deadline: d(1), source: 'auto', completedAt: null });
    tasks.push({ id: id++, title: 'LeetCode — Study DP patterns', category: 'DSA / LeetCode', priority: 'Medium', completed: false, deadline: d(4), source: 'auto', completedAt: null });
    tasks.push({ id: id++, title: 'Practice Mock Interview (30 min)', category: 'DSA / LeetCode', priority: 'High', completed: false, deadline: d(3), source: 'auto', completedAt: null });

    if (roadmap) {
        tasks.push({ id: id++, title: `Plan ${roadmap} project architecture`, category: 'Projects', priority: 'High', completed: false, deadline: d(3), source: 'auto', completedAt: null });
        tasks.push({ id: id++, title: `Build & deploy ${roadmap} demo`, category: 'Projects', priority: 'Medium', completed: false, deadline: d(7), source: 'auto', completedAt: null });
        tasks.push({ id: id++, title: `Add ${roadmap} to GitHub & LinkedIn`, category: 'Projects', priority: 'Medium', completed: false, deadline: d(9), source: 'auto', completedAt: null });
    }

    if (['2nd Year', '3rd Year', '4th Year'].includes(year)) {
        tasks.push({ id: id++, title: 'Apply to 5 internship listings', category: 'Internships', priority: 'High', completed: false, deadline: d(1), source: 'auto', completedAt: null });
        tasks.push({ id: id++, title: 'Polish resume with latest project', category: 'Internships', priority: 'High', completed: false, deadline: d(2), source: 'auto', completedAt: null });
        tasks.push({ id: id++, title: 'Update LinkedIn & GitHub', category: 'Internships', priority: 'Medium', completed: false, deadline: d(4), source: 'auto', completedAt: null });
    }

    tasks.push({ id: id++, title: 'Morning workout — 30 min gym', category: 'Fitness', priority: 'Low', completed: false, deadline: d(1), source: 'auto', completedAt: null });
    tasks.push({ id: id++, title: 'Sleep 7-8 hrs & reduce screen time', category: 'Fitness', priority: 'Low', completed: false, deadline: d(1), source: 'auto', completedAt: null });

    return tasks;
}

// ── Streak helpers ────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split('T')[0]; }

function calcStreak(history) {
    if (!history?.length) return 0;
    const dates = [...new Set(history.map(h => h.date))].sort((a, b) => b.localeCompare(a));
    let streak = 0, cursor = todayStr();
    for (const d of dates) {
        if (d === cursor) { streak++; const c = new Date(cursor); c.setDate(c.getDate() - 1); cursor = c.toISOString().split('T')[0]; }
        else break;
    }
    return streak;
}

// Analytics logic extracted to StatsPanel

// ── Main component ─────────────────────────────────────────────────────────────
export default function Dashboard({ userProfile, uid, onLogout, onUpdateProfile }) {
    const [editingTask, setEditingTask] = useState(null);
    const [activeTimer, setActiveTimer] = useState(null);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [sendingReminder, setSendingReminder] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const BACKEND = 'https://engiplanner-backend.onrender.com';

    // Timer Effect
    useEffect(() => {
        let interval = null;
        if (activeTimer) {
            interval = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [activeTimer]);

    const storageKey = uid ? `dream_tasks_uid_${uid}` : `dream_tasks_${userProfile?.name}`;
    const historyKey = uid ? `dream_history_uid_${uid}` : `dream_history_${userProfile?.name}`;

    const safeGet = (key) => {
        try { return localStorage.getItem(key); } catch { return null; }
    };
    const safeSet = (key, value) => {
        try { localStorage.setItem(key, value); return true; } catch { return false; }
    };
    const safeParse = (raw) => {
        try { return JSON.parse(raw); } catch { return null; }
    };

    const [tasks, setTasks] = useState(() => {
        const fallbackKey = uid && userProfile?.name ? `dream_tasks_${userProfile.name}` : null;
        const savedRaw = safeGet(storageKey) || (fallbackKey ? safeGet(fallbackKey) : null);
        const saved = savedRaw ? safeParse(savedRaw) : null;
        return Array.isArray(saved) ? saved : buildSmartTasks(userProfile);
    });

    const [history, setHistory] = useState(() => {
        const fallbackKey = uid && userProfile?.name ? `dream_history_${userProfile.name}` : null;
        const savedRaw = safeGet(historyKey) || (fallbackKey ? safeGet(fallbackKey) : null);
        const saved = savedRaw ? safeParse(savedRaw) : null;
        return Array.isArray(saved) ? saved : [];
    });

    const [dailyChallenge, setDailyChallenge] = useState(() => {
        const saved = localStorage.getItem(`dc_${userProfile?.name}_${todayStr()}`);
        return saved ? JSON.parse(saved) : { title: DAILY_CHAL[Math.floor(Math.random() * DAILY_CHAL.length)], completed: false };
    });

    const catStoreKey = uid ? `dream_cats_uid_${uid}` : `dream_cats_${userProfile?.name}`;
    const [customCategories, setCustomCategories] = useState(() => {
        const fallbackKey = uid && userProfile?.name ? `dream_cats_${userProfile.name}` : null;
        const savedRaw = safeGet(catStoreKey) || (fallbackKey ? safeGet(fallbackKey) : null);
        const saved = savedRaw ? safeParse(savedRaw) : null;
        return Array.isArray(saved) ? saved : [];
        // shape: [{ name: 'Reading', color: '#f6ad55' }, ...]
    });
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState(COLOR_OPTIONS[0]);

    // Record login streak
    useEffect(() => {
        const loginKey = `logins_${userProfile?.name}`;
        const logins = JSON.parse(localStorage.getItem(loginKey) || '[]');
        if (!logins.includes(todayStr())) {
            const next = [...logins, todayStr()];
            localStorage.setItem(loginKey, JSON.stringify(next));
        }
    }, []);

    // Persist tasks to Local and Cloud
    useEffect(() => {
        safeSet(storageKey, JSON.stringify(tasks));
        if (uid && userProfile?.name) {
            safeSet(`dream_tasks_${userProfile.name}`, JSON.stringify(tasks));
        }
        if (uid && db) setDoc(doc(db, 'users', uid), { tasks }, { merge: true }).catch(console.error);
    }, [tasks, uid]);

    // Persist history
    useEffect(() => {
        safeSet(historyKey, JSON.stringify(history));
        if (uid && userProfile?.name) {
            safeSet(`dream_history_${userProfile.name}`, JSON.stringify(history));
        }
        if (uid && db) setDoc(doc(db, 'users', uid), { history }, { merge: true }).catch(console.error);
    }, [history, uid]);

    // Persist daily challenge
    useEffect(() => { localStorage.setItem(`dc_${userProfile?.name}_${todayStr()}`, JSON.stringify(dailyChallenge)); }, [dailyChallenge]);

    // Persist custom categories
    useEffect(() => {
        safeSet(catStoreKey, JSON.stringify(customCategories));
        if (uid && userProfile?.name) {
            safeSet(`dream_cats_${userProfile.name}`, JSON.stringify(customCategories));
        }
        if (uid && db) setDoc(doc(db, 'users', uid), { categories: customCategories }, { merge: true }).catch(console.error);
    }, [customCategories, uid]);

    // ── Real-time Cross-Device Sync ────────────────────────────────────────────
    useEffect(() => {
        if (!uid || !db) return;
        const unsub = onSnapshot(doc(db, 'users', uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // If it has pending writes, it means *we* just triggered this update locally
                // Ignoring it prevents an endless write loop and UI flickering.
                if (docSnap.metadata.hasPendingWrites) return;

                if (data.tasks) setTasks(data.tasks);
                if (data.history) setHistory(data.history);
                if (data.categories) setCustomCategories(data.categories);
            }
        });
        return () => unsub();
    }, [uid]);


    // Merge built-in + custom categories into one object
    const allCategories = useMemo(() => {
        const merged = { ...CATEGORIES };
        customCategories.forEach(c => {
            merged[c.name] = { icon: null, color: c.color };
        });
        return merged;
    }, [customCategories]);

    const addCustomCategory = e => {
        e.preventDefault();
        const name = newCatName.trim();
        if (!name || allCategories[name]) return; // no duplicates
        setCustomCategories(prev => [...prev, { name, color: newCatColor }]);
        setNewCatName('');
    };

    const deleteCustomCategory = name => {
        setCustomCategories(prev => prev.filter(c => c.name !== name));
    };

    const loginStreak = useMemo(() => {
        const logins = JSON.parse(localStorage.getItem(`logins_${userProfile?.name}`) || '[]');
        const dates = [...new Set(logins)].sort((a, b) => b.localeCompare(a));
        let streak = 0, cursor = todayStr();
        for (const d of dates) {
            if (d === cursor) { streak++; const c = new Date(cursor); c.setDate(c.getDate() - 1); cursor = c.toISOString().split('T')[0]; }
            else break;
        }
        return streak;
    }, []);

    const completionStreak = useMemo(() => calcStreak(history), [history]);

    // Views
    const [view, setView] = useState('tasks');
    const [activeCategory, setActiveCategory] = useState('All');


    const handleLogoutClick = async () => {
        if (uid && db) {
            const userRef = doc(db, 'users', uid);
            // Give Firebase up to 3 seconds to save data.
            // If we don't 'await', Firebase cancels the save when onLogout() tears down the session.
            try {
                await Promise.race([
                    Promise.allSettled([
                        setDoc(userRef, { profile: userProfile }, { merge: true }),
                        setDoc(userRef, { tasks }, { merge: true }),
                        setDoc(userRef, { history }, { merge: true }),
                        setDoc(userRef, { categories: customCategories }, { merge: true }),
                    ]),
                    new Promise(r => setTimeout(r, 3000))
                ]);
            } catch (e) {
                console.error('Logout save failed:', e);
            }
        }
        if (onLogout) {
            await onLogout();
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        const updatedProfile = {
            ...userProfile,
            name: editProfileData.name,
            year: editProfileData.year,
            roadmap: editProfileData.roadmap,
            height: editProfileData.height,
            weight: editProfileData.weight,
            subjects: editProfileData.subjects,
        };
        showToast('Profile Updated', 'Your profile details have been saved successfully.', 'success', 3000);
        if (onUpdateProfile) {
            await onUpdateProfile(updatedProfile);
        }
    };

    const [editProfileData, setEditProfileData] = useState({
        name: userProfile?.name || '',
        year: userProfile?.year || '',
        roadmap: userProfile?.roadmap || '',
        height: userProfile?.height || '',
        weight: userProfile?.weight || '',
        subjects: userProfile?.subjects || [],
    });
    const [newSubject, setNewSubject] = useState('');

    const handleAddSubject = (e) => {
        if (e) e.preventDefault();
        const s = newSubject.trim();
        if (s && !editProfileData.subjects.includes(s)) {
            setEditProfileData(prev => ({ ...prev, subjects: [...prev.subjects, s] }));
            setNewSubject('');
        }
    };

    const handleRemoveSubject = (sub, e) => {
        if (e) e.preventDefault();
        if (window.confirm(`Remove subject: ${sub}?`)) {
            setEditProfileData(prev => ({ ...prev, subjects: prev.subjects.filter(x => x !== sub) }));
        }
    };

    // ── In-App Toast / Reminder System (works on all devices, no HTTPS needed) ──
    const REMINDER_KEY = `reminders_${userProfile?.name}`;
    const [remindersEnabled, setRemindersEnabled] = useState(() =>
        localStorage.getItem(REMINDER_KEY) === 'true'
    );
    const [toasts, setToasts] = useState([]);

    // Add a toast — id, type ('info'|'warn'|'success'), title, body, duration ms
    const showToast = useCallback((title, body, type = 'info', duration = 6000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-2), { id, title, body, type }]); // max 3
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ── Send Reminder Now (calls backend with Firebase ID token) ──────────────
    const sendReminderNow = async () => {
        if (sendingReminder) return;
        setSendingReminder(true);
        try {
            const currentUser = auth?.currentUser;
            if (!currentUser) {
                // Fallback: if auth not available, show helpful message
                showToast('⚠️ Sign-in Required', 'Please refresh the page and sign in again, then try.', 'warn', 5000);
                return;
            }
            const idToken = await currentUser.getIdToken(/* forceRefresh */ true);
            const res = await fetch(`${BACKEND}/send-my-reminder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('📧 Reminder Sent!', `Check your inbox at ${userProfile?.email} — your task briefing is on its way! 🚀`, 'success', 7000);
            } else {
                showToast('Send Failed', data.error || 'Could not send email. Try again.', 'warn', 4000);
            }
        } catch (e) {
            console.error('sendReminderNow error:', e);
            showToast('Network Error', 'Could not reach server. Try again in a moment.', 'warn', 4000);
        } finally {
            setSendingReminder(false);
        }
    };

    const copyReferralLink = () => {
        navigator.clipboard.writeText('https://engiplanner.vercel.app').then(() => {
            setCopiedLink(true);
            showToast('Link Copied! 🔗', 'Share https://engiplanner.vercel.app with your friends!', 'success', 3000);
            setTimeout(() => setCopiedLink(false), 2500);
        }).catch(() => {
            showToast('Copy Failed', 'Please copy the link manually.', 'warn', 3000);
        });
    };

    const checkAndNotify = useCallback(() => {
        if (!remindersEnabled) return;
        const todayKey = new Date().toISOString().split('T')[0];
        const pending = tasks.filter(t => !t.completed);
        const dueToday = pending.filter(t => t.deadline === todayKey);
        const overdue = pending.filter(t => t.deadline && t.deadline < todayKey);

        if (overdue.length > 0) {
            showToast(
                `⚠️ ${overdue.length} Overdue Task${overdue.length > 1 ? 's' : ''}`,
                overdue.slice(0, 3).map(t => `• ${t.title}`).join('\n') +
                (overdue.length > 3 ? `\n…+${overdue.length - 3} more` : ''),
                'warn', 8000
            );
        } else if (dueToday.length > 0) {
            showToast(
                `📅 ${dueToday.length} Task${dueToday.length > 1 ? 's' : ''} Due Today`,
                dueToday.slice(0, 3).map(t => `• ${t.title}`).join('\n') +
                (dueToday.length > 3 ? `\n…+${dueToday.length - 3} more` : ''),
                'info', 7000
            );
        } else {
            showToast('✅ All Caught Up!', 'No pending tasks due today. Keep the streak going 🔥', 'success', 5000);
        }
    }, [remindersEnabled, tasks, showToast]);

    // Fire on load + every 60 min
    // Use refs to avoid re-running effect on dependency change
    const checkFnRef = React.useRef(checkAndNotify);
    useEffect(() => { checkFnRef.current = checkAndNotify; }, [checkAndNotify]);

    useEffect(() => {
        if (!remindersEnabled) return;
        const timer = setTimeout(() => checkFnRef.current(), 800); // slight delay after mount
        const interval = setInterval(() => checkFnRef.current(), 60 * 60 * 1000);
        return () => { clearTimeout(timer); clearInterval(interval); };
    }, [remindersEnabled]);

    const toggleReminders = () => {
        const next = !remindersEnabled;
        setRemindersEnabled(next);
        localStorage.setItem(REMINDER_KEY, String(next));
        if (next) {
            showToast('🔔 Reminders Enabled', 'You\'ll get in-app task reminders every hour!', 'success', 5000);
        } else {
            showToast('🔕 Reminders Off', 'Task reminders have been disabled.', 'info', 3000);
        }
    };

    const sendTestNotification = () => {
        const todayKey = new Date().toISOString().split('T')[0];
        const pending = tasks.filter(t => !t.completed).length;
        const dueToday = tasks.filter(t => !t.completed && t.deadline === todayKey).length;
        const overdue = tasks.filter(t => !t.completed && t.deadline && t.deadline < todayKey).length;
        showToast(
            '🧪 Test Reminder — Working!',
            `📋 ${pending} pending  •  📅 ${dueToday} due today  •  ⚠️ ${overdue} overdue`,
            overdue > 0 ? 'warn' : dueToday > 0 ? 'info' : 'success',
            7000
        );
    };

    const today = new Date();
    const formatDate = d => d.toISOString().split('T')[0];
    const fallbackSubs = userProfile?.subjects?.length > 0 ? userProfile.subjects : [];

    const [newTask, setNewTask] = useState({
        title: '', category: 'Academics', subject: fallbackSubs[0] || '', priority: 'Medium',
        deadline: formatDate(today)
    });

    // ── Actions ─────────────────────────────────────────────────────────────
    const toggleTimer = id => {
        if (activeTimer === id) {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, timeSpent: (t.timeSpent || 0) + timerSeconds } : t));
            setActiveTimer(null);
            setTimerSeconds(0);
        } else {
            if (activeTimer) {
                setTasks(prev => prev.map(t => t.id === activeTimer ? { ...t, timeSpent: (t.timeSpent || 0) + timerSeconds } : t));
            }
            setActiveTimer(id);
            setTimerSeconds(0);
        }
    };

    const formatTime = (seconds, isLive = false, liveSecs = 0) => {
        const total = (seconds || 0) + (isLive ? liveSecs : 0);
        if (!total) return null;
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m ${s}s`;
    };

    const deleteHistoryItem = (item) => {
        if (window.confirm('Delete this completed task from history?')) {
            setHistory(prev => prev.filter(h => h !== item));
            showToast('History Deleted', 'Task removed from completion history.', 'success', 2000);
        }
    };

    const clearAllHistory = () => {
        if (window.confirm('Are you sure you want to clear your entire task history? This cannot be undone.')) {
            setHistory([]);
            showToast('History Cleared', 'All completion history has been removed.', 'success', 2000);
        }
    };

    const saveEdit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setTasks(prev => prev.map(t => t.id === editingTask.id ? editingTask : t));
        setEditingTask(null);
    };

    const toggleTask = id => {
        setTasks(prev => prev.map(t => {
            if (t.id !== id) return t;
            const nowCompleted = !t.completed;
            if (nowCompleted) {
                // record to history
                setHistory(h => [...h, { id: t.id, title: t.title, category: t.category, date: todayStr(), subject: t.subject || null }]);
            } else {
                setHistory(h => h.filter(e => !(e.id === t.id && e.date === todayStr())));
            }
            return { ...t, completed: nowCompleted, completedAt: nowCompleted ? todayStr() : null };
        }));
    };

    const deleteTask = id => setTasks(prev => prev.filter(t => t.id !== id));

    const addCustomTask = e => {
        e.preventDefault();
        if (!newTask.title.trim()) return;
        setTasks(prev => [{ ...newTask, id: Date.now(), completed: false, source: 'custom', completedAt: null }, ...prev]);
        setNewTask({ ...newTask, title: '', deadline: formatDate(today) });
    };

    // ── Computed ─────────────────────────────────────────────────────────────
    const bmi = useMemo(() => {
        if (!userProfile?.height || !userProfile?.weight) return null;
        const h = parseInt(userProfile.height) / 100, w = parseInt(userProfile.weight);
        const val = w / (h * h);
        let status = 'Healthy ✅', color = 'var(--accent-green)';
        if (val < 18.5) { status = 'Underweight ⚠️'; color = 'var(--accent-orange)'; }
        if (val >= 25) { status = 'Overweight ⚠️'; color = 'var(--accent-red)'; }
        return { value: val.toFixed(1), status, color };
    }, [userProfile]);

    const productivityScore = useMemo(() => {
        if (!tasks.length) return 0;
        let total = 0, done = 0;
        tasks.forEach(t => { const w = t.priority === 'High' ? 3 : t.priority === 'Medium' ? 2 : 1; total += w; if (t.completed) done += w; });
        return Math.min(100, Math.round((done / total) * 100) + (dailyChallenge.completed ? 5 : 0));
    }, [tasks, dailyChallenge.completed]);

    const subjectLag = useMemo(() => fallbackSubs.map(sub => {
        const s = tasks.filter(t => t.subject === sub);
        const done = s.filter(t => t.completed).length;
        return { subject: sub, done, pending: s.length - done, total: s.length, pct: s.length ? Math.round((done / s.length) * 100) : 0 };
    }).sort((a, b) => b.pending - a.pending), [tasks, fallbackSubs]);

    const weakest = subjectLag.find(s => s.pending > 0);

    const getDeadlineStatus = (deadline, completed) => {
        if (completed || !deadline) return null;
        const diff = Math.ceil((new Date(deadline) - new Date(formatDate(today))) / 86400000);
        if (diff < 0) return { text: 'OVERDUE', color: 'var(--accent-red)' };
        if (diff === 0) return { text: 'Due Today', color: '#f6ad55' };
        if (diff <= 2) return { text: `${diff}d`, color: 'var(--accent-purple)' };
        return { text: `${diff}d`, color: 'var(--text-secondary)' };
    };

    const categories = ['All', ...Object.keys(allCategories), 'Custom'];
    const filteredTasks = [...tasks]
        .filter(t => {
            if (activeCategory === 'All') return true;
            if (activeCategory === 'Custom') return t.source === 'custom';
            return t.category === activeCategory;
        })
        .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const dd = new Date(a.deadline) - new Date(b.deadline);
            if (dd !== 0) return dd;
            return ({ High: 3, Medium: 2, Low: 1 }[b.priority] - { High: 3, Medium: 2, Low: 1 }[a.priority]);
        });

    // Group history by date
    const historyByDate = useMemo(() => {
        const groups = {};
        history.forEach(h => {
            if (!groups[h.date]) groups[h.date] = [];
            groups[h.date].push(h);
        });
        return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    }, [history]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="animate-fade-in">
            {/* ── Header ── */}
            <div className="header">
                {/* Left — User identity block */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    {/* Vertical white accent bar */}
                    <div style={{
                        width: '4px', height: '100%', minHeight: '64px',
                        background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.2) 100%)',
                        borderRadius: '999px', flexShrink: 0, marginTop: '3px'
                    }} />
                    <div>
                        {/* Name */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, letterSpacing: '-0.045em', color: '#fff', lineHeight: 1 }}>
                                {userProfile?.name}
                            </h1>
                            {/* Year tag pill */}
                            <span style={{
                                fontSize: '0.7rem', fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                color: 'rgba(255,255,255,0.55)', padding: '0.25rem 0.65rem',
                                borderRadius: '999px', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                                boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset'
                            }}>
                                {userProfile?.year}
                            </span>
                        </div>
                        {/* Roadmap */}
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.06em' }}>
                                ROADMAP
                            </span>
                            <span style={{
                                fontSize: '0.78rem', fontWeight: 600,
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                color: 'rgba(255,255,255,0.8)', padding: '0.2rem 0.65rem',
                                borderRadius: '6px', letterSpacing: '-0.01em'
                            }}>
                                {userProfile?.roadmap}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right side controls */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="streak-badge" style={{ '--streak-color': 'var(--orange)' }}>🔥 {loginStreak}d</div>
                    <div className="streak-badge" style={{ '--streak-color': 'var(--green)' }}>✅ {completionStreak}d</div>
                    <div className="productivity-badge">
                        <Terminal size={14} /> <strong style={{ color: '#fff' }}>{productivityScore} XP</strong>
                    </div>
                    {[
                        { id: 'tasks', icon: <Cpu size={15} />, label: 'Dashboard' },
                        { id: 'stats', icon: <BarChart2 size={15} />, label: 'Stats' },
                        { id: 'fitness', icon: <Dumbbell size={15} />, label: 'Fitness' },
                        { id: 'roadmap', icon: <Map size={15} />, label: 'Roadmap' },
                        { id: 'history', icon: <History size={15} />, label: 'History' },
                        { id: 'custom', icon: <Sliders size={15} />, label: 'Customize' },
                        { id: 'profile', icon: <Settings size={15} />, label: 'Settings' }
                    ].map(btn => (
                        <button key={btn.id} onClick={() => setView(btn.id)} title={btn.label}
                            className={`btn ${view === btn.id ? 'btn-primary' : 'btn-outline'}`}
                            style={{ gap: '0.35rem' }}>
                            {btn.icon}
                            <span className="nav-label">{btn.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ══ TOAST STACK — fixed overlay, top-right ══ */}
            <div style={{
                position: 'fixed', top: '1.2rem', right: '1.2rem',
                zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.6rem',
                pointerEvents: 'none', maxWidth: '340px', width: 'calc(100vw - 2.4rem)',
            }}>
                {toasts.map(toast => {
                    const colors = {
                        warn: { border: 'rgba(251,191,36,0.4)', bg: 'rgba(251,191,36,0.08)', icon: '#fbbf24' },
                        success: { border: 'rgba(52,211,153,0.4)', bg: 'rgba(52,211,153,0.07)', icon: '#34d399' },
                        info: { border: 'rgba(96,165,250,0.4)', bg: 'rgba(96,165,250,0.07)', icon: '#60a5fa' },
                    };
                    const c = colors[toast.type] || colors.info;
                    return (
                        <div key={toast.id} style={{
                            background: `#111111`,
                            border: `1px solid ${c.border}`,
                            boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05), 0 0 20px ${c.bg}`,
                            borderRadius: '14px',
                            padding: '0.9rem 1rem',
                            pointerEvents: 'all',
                            animation: 'fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both',
                            position: 'relative',
                        }}>
                            {/* Top accent line */}
                            <div style={{
                                position: 'absolute', top: 0, left: '10%', right: '10%', height: '2px', borderRadius: '999px',
                                background: `linear-gradient(90deg, transparent, ${c.icon}, transparent)`, opacity: 0.8
                            }} />
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.6rem' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: c.icon, marginBottom: '0.25rem' }}>
                                        {toast.title}
                                    </div>
                                    <div style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                                        {toast.body}
                                    </div>
                                </div>
                                <button onClick={() => dismissToast(toast.id)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'rgba(255,255,255,0.3)', padding: '2px', flexShrink: 0,
                                    lineHeight: 1, fontSize: '1rem',
                                }}>✕</button>
                            </div>
                        </div>
                    );
                })}
            </div>



            {/* ── Daily Challenge ── */}
            <div className={`glass-panel daily-challenge ${dailyChallenge.completed ? 'challenge-success' : ''}`}
                style={{ marginBottom: '1.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ padding: '0.65rem', background: 'rgba(251,146,60,0.1)', borderRadius: '10px', color: 'var(--accent-orange)', flexShrink: 0 }}>
                        <Coffee size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: dailyChallenge.completed ? 'var(--accent-green)' : 'var(--accent-orange)', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace" }}>
                            DAILY DEV CHALLENGE
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.15rem' }}>{dailyChallenge.title}</div>
                    </div>
                </div>
                <button onClick={() => setDailyChallenge(c => ({ ...c, completed: !c.completed }))}
                    className={`btn ${dailyChallenge.completed ? 'btn-success' : 'btn-outline'}`} style={{ flexShrink: 0 }}>
                    {dailyChallenge.completed ? <><CheckCircle2 size={14} /> Done! +5 XP</> : 'Execute'}
                </button>
            </div>

            {/* ═══════ VIEW: DASHBOARD ═══════ */}
            {view === 'tasks' && (<>
                {/* Stats */}
                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="glass-panel stat-card highlight-card">
                        <span className="stat-label">Performance Score</span>
                        <span className="stat-value" style={{ color: 'var(--accent-purple)' }}>{productivityScore}<small style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/100</small></span>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${productivityScore}%`, background: 'var(--accent-purple)' }} /></div>
                    </div>
                    <div className="glass-panel stat-card">
                        <span className="stat-label">BMI</span>
                        {bmi ? <>
                            <span className="stat-value" style={{ color: bmi.color, fontSize: '1.8rem' }}>{bmi.value}</span>
                            <p style={{ color: bmi.color, fontSize: '0.8rem', fontWeight: '600', marginTop: '0.3rem' }}>{bmi.status}</p>
                        </> : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                    </div>
                    <div className="glass-panel stat-card">
                        <span className="stat-label">Tasks Done</span>
                        <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{tasks.filter(t => t.completed).length}<small style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/{tasks.length}</small></span>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.3rem' }}>Total completed</p>
                    </div>
                    <div className="glass-panel stat-card">
                        <span className="stat-label">Lagging Subject ⚠️</span>
                        {weakest ? <>
                            <span className="stat-value" style={{ color: 'var(--accent-red)', fontSize: '1.3rem', lineHeight: '1.2' }}>{weakest.subject}</span>
                            <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '0.3rem' }}>{weakest.pending} tasks behind</p>
                        </> : <span className="stat-value" style={{ color: 'var(--accent-green)', fontSize: '1rem', marginTop: '0.5rem' }}>All caught up! 🎉</span>}
                    </div>
                </div>

                <div className="dashboard-grid">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Task List */}
                        <div className="glass-panel">
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                {categories.map(cat => (
                                    <button key={cat} onClick={() => setActiveCategory(cat)}
                                        className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
                                        style={{ '--cat-color': cat === 'All' ? 'var(--accent-blue)' : cat === 'Custom' ? 'var(--accent-green)' : CATEGORIES[cat]?.color }}>
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h2 style={{ fontSize: '1.1rem' }}>📋 Task Planner ({filteredTasks.filter(t => !t.completed).length} pending)</h2>
                                <button onClick={() => setView('custom')} className="btn btn-primary" style={{ gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                                    <Plus size={16} /> Add Task
                                </button>
                            </div>
                            <div className="tasks-container" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '6px' }}>
                                {filteredTasks.map(task => {
                                    if (editingTask?.id === task.id) {
                                        return (
                                            <div key={task.id} className="task-item" style={{ borderLeft: `3px solid var(--accent-blue)`, display: 'block' }}>
                                                <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                                    <input type="text" className="input-field" value={editingTask.title} onChange={e => setEditingTask({ ...editingTask, title: e.target.value })} style={{ fontSize: '0.9rem', padding: '0.5rem' }} required />
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <input type="date" className="input-field" value={editingTask.deadline || ''} onChange={e => setEditingTask({ ...editingTask, deadline: e.target.value })} style={{ padding: '0.4rem', flex: 1, minWidth: '120px' }} required />
                                                        <select className="input-field" value={editingTask.priority} onChange={e => setEditingTask({ ...editingTask, priority: e.target.value })} style={{ padding: '0.4rem', flex: 1, minWidth: '100px' }}>
                                                            <option value="High">🔥 High</option>
                                                            <option value="Medium">⚡ Medium</option>
                                                            <option value="Low">🌱 Low</option>
                                                        </select>
                                                        <select className="input-field" value={editingTask.category} onChange={e => setEditingTask({ ...editingTask, category: e.target.value, subject: '' })} style={{ padding: '0.4rem', flex: 1, minWidth: '120px' }}>
                                                            {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                        {(editingTask.category === 'Academics' || editingTask.category === 'Exams') && fallbackSubs.length > 0 && (
                                                            <select className="input-field" value={editingTask.subject || ''} onChange={e => setEditingTask({ ...editingTask, subject: e.target.value })} style={{ padding: '0.4rem', flex: 1, minWidth: '120px' }}>
                                                                <option value="">No Subject</option>
                                                                {fallbackSubs.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                                        <button type="button" onClick={() => setEditingTask(null)} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }}>Cancel</button>
                                                        <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}><Save size={14} /> Save</button>
                                                    </div>
                                                </form>
                                            </div>
                                        );
                                    }
                                    const CatIcon = allCategories[task.category]?.icon || Circle;
                                    const catColor = allCategories[task.category]?.color || 'white';
                                    const dl = getDeadlineStatus(task.deadline, task.completed);
                                    return (
                                        <div key={task.id} className={`task-item ${task.completed ? 'task-completed' : ''}`}
                                            style={{ '--task-color': catColor }}>
                                            <div className="task-info" style={{ minWidth: 0 }}>
                                                <div className="task-icon" style={{ color: catColor, background: `color-mix(in srgb, ${catColor}, transparent 88%)`, flexShrink: 0 }}>
                                                    <CatIcon size={18} />
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="task-title" style={{ textDecoration: task.completed ? 'line-through' : 'none', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        {task.title}
                                                        {task.source === 'custom' && <span style={{ fontSize: '0.65rem', background: 'rgba(63,185,80,0.15)', color: 'var(--accent-green)', padding: '1px 6px', borderRadius: '8px' }}>Custom</span>}
                                                        {dl?.text === 'OVERDUE' && <AlertCircle size={13} color="var(--accent-red)" />}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <span className="task-category">{task.category}</span>
                                                        {task.subject && <span style={{ fontSize: '0.7rem', background: 'rgba(88,166,255,0.1)', color: 'var(--accent-blue)', padding: '1px 7px', borderRadius: '10px' }}>{task.subject}</span>}
                                                        {dl && <span style={{ fontSize: '0.7rem', color: dl.color, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}><CalendarDays size={11} /> {dl.text}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="task-actions">
                                                {(task.timeSpent > 0 || activeTimer === task.id) && (
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(88,166,255,0.1)', padding: '2px 6px', borderRadius: '10px' }}>
                                                        <Clock size={11} className={activeTimer === task.id ? "spin-pulse" : ""} />
                                                        {formatTime(task.timeSpent, activeTimer === task.id, timerSeconds)}
                                                    </span>
                                                )}
                                                <span className={`priority-badge ${PRIORITIES[task.priority]}`}>{task.priority}</span>
                                                {!task.completed && (
                                                    <button onClick={() => toggleTimer(task.id)} className="task-check-btn" title={activeTimer === task.id ? "Stop Timer" : "Start Timer"}>
                                                        {activeTimer === task.id ? <Square size={16} color="var(--accent-red)" /> : <Play size={16} color="var(--accent-green)" />}
                                                    </button>
                                                )}
                                                {!task.completed && (
                                                    <button onClick={() => setEditingTask({ ...task })} className="task-check-btn" title="Edit task">
                                                        <Edit2 size={16} color="rgba(255,255,255,0.7)" />
                                                    </button>
                                                )}
                                                <button onClick={() => deleteTask(task.id)} className="task-check-btn" title="Remove task">
                                                    <Trash2 size={16} color="rgba(255,123,114,0.7)" />
                                                </button>
                                                <button onClick={() => toggleTask(task.id)} className="task-check-btn">
                                                    {task.completed ? <CheckCircle2 size={26} color="var(--accent-green)" /> : <Circle size={26} color="rgba(255,255,255,0.2)" />}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredTasks.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>All clear in this category!</p>}
                            </div>
                        </div>

                        {/* ═══════ STATS & FITNESS SECTIONS MIGRATED ═══════ */}
                    </div>

                    {/* Right sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Syllabus health */}
                        <div className="glass-panel">
                            <h2 style={{ marginBottom: '1.2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Map size={18} color="var(--accent-blue)" /> Syllabus Health</h2>
                            {subjectLag.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No subjects tracked.</p>}
                            {subjectLag.map((s, i) => (
                                <div key={i} style={{ marginBottom: '1.1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{s.subject}</span>
                                        <span style={{ color: s.pct < 50 ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: '700', fontSize: '0.9rem' }}>{s.pct}%</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: '7px' }}>
                                        <div className="progress-fill" style={{ width: `${s.pct}%`, background: s.pct < 50 ? 'var(--accent-red)' : s.pct < 80 ? 'var(--accent-orange)' : 'var(--accent-green)' }} />
                                    </div>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{s.done}/{s.total} done · {s.pending} pending</p>
                                </div>
                            ))}
                        </div>

                        {/* Roadmap panel */}
                        <div className="glass-panel" style={{ borderLeft: '4px solid #f472b6', background: 'rgba(244,114,182,0.04)', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setView('roadmap')}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                <h3 style={{ color: '#f472b6', fontSize: '1rem' }}>🗺️ Roadmap Target</h3>
                                <span style={{ fontSize: '0.7rem', color: '#f472b6', border: '1px solid #f472b6', padding: '2px 6px', borderRadius: '10px' }}>Open Space ↗</span>
                            </div>
                            <p style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '0.5rem' }}>{userProfile?.roadmap}</p>
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                    <span>Progress</span>
                                    <span style={{ color: '#f472b6', fontWeight: 'bold' }}>
                                        {tasks.filter(t => t.category === 'Roadmap' && t.completed).length}/{tasks.filter(t => t.category === 'Roadmap').length} Tasks
                                    </span>
                                </div>
                                <div className="progress-bar" style={{ height: '7px' }}>
                                    <div className="progress-fill" style={{
                                        width: `${tasks.filter(t => t.category === 'Roadmap').length > 0
                                            ? Math.round((tasks.filter(t => t.category === 'Roadmap' && t.completed).length / tasks.filter(t => t.category === 'Roadmap').length) * 100)
                                            : 0}%`,
                                        background: '#f472b6'
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* Today's urgent */}
                        <div className="glass-panel">
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚡ Due Today / Overdue</h3>
                            {tasks.filter(t => !t.completed && ['Due Today', 'OVERDUE'].includes(getDeadlineStatus(t.deadline, t.completed)?.text))
                                .slice(0, 5)
                                .map(task => {
                                    const dl = getDeadlineStatus(task.deadline, task.completed);
                                    return (
                                        <div key={task.id} onClick={() => toggleTask(task.id)} className="task-item urgent-task">
                                            <span style={{ fontSize: '0.88rem', flex: 1 }}>{task.title}</span>
                                            <span style={{ color: dl?.color, fontSize: '0.72rem', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>{dl?.text}</span>
                                        </div>
                                    );
                                })
                            }
                            {!tasks.some(t => !t.completed && ['Due Today', 'OVERDUE'].includes(getDeadlineStatus(t.deadline, t.completed)?.text)) && (
                                <p style={{ color: 'var(--accent-green)', fontSize: '0.9rem' }}>✅ Nothing urgent today!</p>
                            )}
                        </div>
                    </div>
                </div>
            </>)}

            {/* ═══════ VIEW: STATS ═══════ */}
            {view === 'stats' && (
                <div className="animate-fade-in" style={{ marginTop: '1.5rem' }}>
                    <StatsPanel tasks={tasks} history={history} allCategories={allCategories} />
                </div>
            )}

            {/* ═══════ VIEW: FITNESS ═══════ */}
            {view === 'fitness' && (
                <div className="animate-fade-in" style={{ marginTop: '1.5rem' }}>
                    <FitnessPanel tasks={tasks} setTasks={setTasks} />
                </div>
            )}

            {/* ═══════ VIEW: ROADMAP ═══════ */}
            {view === 'roadmap' && (
                <div style={{ marginTop: '1.5rem' }}>
                    <RoadmapPanel userProfile={userProfile} tasks={tasks} setTasks={setTasks} />
                </div>
            )}

            {/* ═══════ VIEW: HISTORY ═══════ */}
            {view === 'history' && (
                <div className="glass-panel animate-fade-in" style={{ marginTop: '1.5rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <History size={22} /> Completion History
                        {history.length > 0 && (
                            <button onClick={clearAllHistory} className="btn" style={{ marginLeft: '1rem', background: 'rgba(248,113,113,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(248,113,113,0.3)', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                <Trash2 size={13} /> Clear All
                            </button>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                            {history.length} total completions
                        </span>
                    </h2>
                    {historyByDate.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>No history yet. Start completing tasks!</p>}
                    {historyByDate.map(([date, entries]) => (
                        <div key={date} style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <CalendarDays size={16} color="var(--accent-blue)" />
                                <h3 style={{ color: 'var(--accent-blue)', fontSize: '1rem' }}>{date === todayStr() ? 'Today' : date}</h3>
                                <span style={{ background: 'rgba(88,166,255,0.15)', color: 'var(--accent-blue)', fontSize: '0.75rem', padding: '2px 10px', borderRadius: '12px', fontWeight: '600' }}>
                                    {entries.length} tasks
                                </span>
                            </div>
                            {entries.map((e, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(63,185,80,0.05)', borderRadius: '10px', border: '1px solid rgba(63,185,80,0.1)', marginBottom: '0.5rem' }}>
                                    <CheckCircle2 size={18} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                                    <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{e.title}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{e.category}</span>
                                    {e.subject && <span style={{ fontSize: '0.7rem', background: 'rgba(88,166,255,0.1)', color: 'var(--accent-blue)', padding: '1px 7px', borderRadius: '10px' }}>{e.subject}</span>}
                                    <button onClick={() => deleteHistoryItem(e)} className="task-check-btn" style={{ marginLeft: '0.5rem' }} title="Remove from history">
                                        <Trash2 size={15} color="rgba(255,123,114,0.7)" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* ═══════ VIEW: CUSTOMIZE ═══════ */}
            {view === 'custom' && (
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Add custom task */}
                    <div className="glass-panel animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Plus size={20} /> Add Custom Task
                        </h2>
                        <form onSubmit={addCustomTask} className="add-task-form">
                            <div className="form-group">
                                <label>Task Title</label>
                                <input type="text" className="input-field" placeholder="E.g., Read Clean Code book" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <div className="category-selector">
                                    {Object.keys(allCategories).map(cat => (
                                        <div key={cat} className={`cat-pill ${newTask.category === cat ? 'active' : ''}`}
                                            style={{ '--cat-color': allCategories[cat].color }}
                                            onClick={() => setNewTask({ ...newTask, category: cat, subject: '' })}>
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {(newTask.category === 'Academics' || newTask.category === 'Exams') && fallbackSubs.length > 0 && (
                                <div className="form-group">
                                    <label>Link to Subject</label>
                                    <select value={newTask.subject} onChange={e => setNewTask({ ...newTask, subject: e.target.value })} className="input-field">
                                        <option value="">No Subject</option>
                                        {fallbackSubs.map((s, i) => <option key={i} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Deadline</label>
                                    <input type="date" className="input-field" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Priority</label>
                                    <select className="input-field" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                                        <option value="High">🔥 High</option>
                                        <option value="Medium">⚡ Medium</option>
                                        <option value="Low">🌱 Low</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '1rem', justifyContent: 'center', fontSize: '1rem' }}>
                                Add to Planner
                            </button>
                        </form>
                    </div>

                    {/* All custom tasks */}
                    <div className="glass-panel animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem' }}>✏️ Your Custom Tasks</h2>
                        {tasks.filter(t => t.source === 'custom').length === 0 && (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No custom tasks yet. Add one above!</p>
                        )}
                        <div className="tasks-container">
                            {tasks.filter(t => t.source === 'custom').map(task => {
                                const CatIcon = allCategories[task.category]?.icon || Circle;
                                const catColor = allCategories[task.category]?.color || 'white';
                                const dl = getDeadlineStatus(task.deadline, task.completed);
                                return (
                                    <div key={task.id} className={`task-item ${task.completed ? 'task-completed' : ''}`}
                                        style={{ borderLeft: `3px solid ${catColor}` }}>
                                        <div className="task-info">
                                            <div className="task-icon" style={{ color: catColor, background: 'rgba(255,255,255,0.04)' }}>
                                                <CatIcon size={18} />
                                            </div>
                                            <div>
                                                <div className="task-title" style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <span className="task-category">{task.category}</span>
                                                    {dl && <span style={{ fontSize: '0.7rem', color: dl.color, fontWeight: '700' }}>{dl.text}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="task-actions">
                                            <span className={`priority-badge ${PRIORITIES[task.priority]}`}>{task.priority}</span>
                                            <button onClick={() => deleteTask(task.id)} className="task-check-btn">
                                                <Trash2 size={16} color="rgba(255,123,114,0.7)" />
                                            </button>
                                            <button onClick={() => toggleTask(task.id)} className="task-check-btn">
                                                {task.completed ? <CheckCircle2 size={24} color="var(--accent-green)" /> : <Circle size={24} color="rgba(255,255,255,0.2)" />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Manage Categories panel ── */}
                    <div className="glass-panel animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🏷️ Manage Categories
                        </h2>

                        {/* Existing custom categories */}
                        {customCategories.length === 0 && (
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>No custom categories yet. Create one below!</p>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {customCategories.map(c => (
                                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', border: `2px solid ${c.color}`, borderRadius: '12px', padding: '0.5rem 1rem' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                                    <span style={{ fontWeight: '600', color: c.color }}>{c.name}</span>
                                    <button onClick={() => deleteCustomCategory(c.name)} className="task-check-btn" title="Remove category" style={{ marginLeft: '0.25rem' }}>
                                        <Trash2 size={14} color="rgba(255,123,114,0.8)" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add new category form */}
                        <form onSubmit={addCustomCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Category Name</label>
                                <input type="text" className="input-field" placeholder="E.g., Research, Language Learning, Side Project"
                                    value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Pick a Color</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.4rem', alignItems: 'center' }}>
                                    {COLOR_OPTIONS.map(col => (
                                        <div key={col} onClick={() => setNewCatColor(col)}
                                            style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: col, cursor: 'pointer',
                                                border: newCatColor === col ? '3px solid white' : '3px solid transparent',
                                                transition: 'border 0.15s, transform 0.15s',
                                                transform: newCatColor === col ? 'scale(1.2)' : 'scale(1)'
                                            }} />
                                    ))}
                                    <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)}
                                        title="Custom color" style={{ width: '32px', height: '32px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: 0, background: 'transparent' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: newCatColor, flexShrink: 0 }} />
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Preview: <strong style={{ color: newCatColor }}>{newCatName || 'Category Name'}</strong>
                                </span>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', padding: '0.75rem 1.5rem' }}>
                                + Create Category
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════ VIEW: PROFILE SETTINGS ═══════ */}
            {view === 'profile' && (
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-panel animate-fade-in" style={{ borderTop: '4px solid var(--accent-blue)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.8rem', background: 'rgba(88,166,255,0.1)', borderRadius: '14px', color: 'var(--accent-blue)' }}>
                                <User size={32} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.2rem' }}>Edit Profile</h2>
                                <p style={{ color: 'var(--accent-blue)', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.03em' }}>Update your personal details</p>
                            </div>
                        </div>

                        <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxWidth: '600px' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', display: 'block' }}>Full Name</label>
                                <input type="text" className="input-field" value={editProfileData.name} onChange={e => setEditProfileData(prev => ({ ...prev, name: e.target.value }))} required />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', display: 'block' }}>Current Year / Role</label>
                                <select className="input-field" value={editProfileData.year} onChange={e => setEditProfileData(prev => ({ ...prev, year: e.target.value }))} required>
                                    <option value="1st Year">1st Year Student</option>
                                    <option value="2nd Year">2nd Year Student</option>
                                    <option value="3rd Year">3rd Year Student</option>
                                    <option value="4th Year">4th Year / Senior</option>
                                    <option value="Graduate">Recent Graduate</option>
                                    <option value="Working Pro">Working Professional</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', display: 'block' }}>Your Target Roadmap / Goal</label>
                                <input type="text" className="input-field" placeholder="e.g. Fullstack Developer, AI Researcher..." value={editProfileData.roadmap} onChange={e => setEditProfileData(prev => ({ ...prev, roadmap: e.target.value }))} required />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', display: 'block' }}>Height (cm)</label>
                                    <input type="number" className="input-field" placeholder="170" value={editProfileData.height} onChange={e => setEditProfileData(prev => ({ ...prev, height: e.target.value }))} required />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', display: 'block' }}>Weight (kg)</label>
                                    <input type="number" className="input-field" placeholder="65" value={editProfileData.weight} onChange={e => setEditProfileData(prev => ({ ...prev, weight: e.target.value }))} required />
                                </div>
                            </div>

                            <div className="form-group" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.2rem', marginTop: '0.5rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', display: 'block' }}>Manage Subjects / Courses</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                    {editProfileData.subjects.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No subjects added yet.</span>}
                                    {editProfileData.subjects.map(sub => (
                                        <div key={sub} style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)', padding: '0.3rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ color: 'var(--accent-blue)', fontSize: '0.85rem' }}>{sub}</span>
                                            <button onClick={(e) => handleRemoveSubject(sub, e)} style={{ background: 'none', border: 'none', color: 'rgba(255,123,114,0.8)', cursor: 'pointer', padding: '2px', display: 'flex' }} title="Remove subject">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="text" className="input-field" placeholder="E.g. Engineering Maths III" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddSubject(e); }} style={{ flex: 1 }} />
                                    <button onClick={handleAddSubject} className="btn btn-outline" style={{ padding: '0.6rem 1rem' }} type="button">
                                        <Plus size={16} /> Add
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 1.5rem', width: 'fit-content', marginTop: '0.5rem' }}>
                                <Save size={18} /> Save Changes
                            </button>
                        </form>
                    </div>

                    {/* ── System Settings & Danger Zone ── */}
                    <div className="glass-panel animate-fade-in" style={{ borderTop: '4px solid var(--accent-orange)' }}>
                        <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Settings size={20} color="var(--accent-orange)" /> System Settings
                        </h3>

                        {/* ── Email Reminders Toggle ── */}
                        {(() => {
                            const emailEnabled = userProfile?.emailReminders || false;
                            const reminderHour = userProfile?.reminderHour || '08'; // Default 8 AM

                            const updateReminderHour = async (h) => {
                                const updated = { ...userProfile, reminderHour: h };
                                if (onUpdateProfile) await onUpdateProfile(updated);
                                showToast('Reminder Time Updated', `We'll send your daily briefing at ${h}:00 IST.`, 'success', 3000);
                            };

                            const toggleEmailReminders = async () => {
                                const updated = { ...userProfile, emailReminders: !emailEnabled, reminderHour };
                                if (onUpdateProfile) await onUpdateProfile(updated);
                                showToast(
                                    emailEnabled ? 'Email Reminders OFF' : '📧 Email Reminders ON',
                                    emailEnabled ? 'You will no longer receive daily email alerts.' : `You will receive daily briefings at ${reminderHour || '08'}:00 IST.`,
                                    emailEnabled ? 'info' : 'success', 4000
                                );
                            };
                            return (
                                <div style={{
                                    marginBottom: '1rem',
                                    display: 'flex', flexDirection: 'column', gap: '0.8rem',
                                    border: emailEnabled ? '1px solid rgba(88,166,255,0.3)' : '1px solid rgba(255,255,255,0.07)',
                                    background: emailEnabled ? 'rgba(88,166,255,0.03)' : 'rgba(255,255,255,0.02)',
                                    padding: '1rem', borderRadius: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                                                background: emailEnabled ? 'rgba(88,166,255,0.1)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${emailEnabled ? 'rgba(88,166,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Mail size={17} color={emailEnabled ? 'var(--accent-blue)' : 'rgba(255,255,255,0.3)'} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: emailEnabled ? 'var(--accent-blue)' : 'rgba(255,255,255,0.8)' }}>
                                                    {emailEnabled ? 'Email Reminders: ON' : 'Email Reminders: OFF'}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                    Sent to <b style={{ color: 'rgba(255,255,255,0.5)' }}>{userProfile?.email || 'your email'}</b>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={toggleEmailReminders}
                                            className={`btn ${emailEnabled ? 'btn-outline' : 'btn-primary'}`}
                                            style={{ fontSize: '0.78rem', background: emailEnabled ? undefined : 'rgba(88,166,255,0.15)', borderColor: 'rgba(88,166,255,0.4)', color: 'var(--accent-blue)' }}>
                                            {emailEnabled ? 'Disable' : '📧 Enable Email Alerts'}
                                        </button>
                                    </div>

                                    {emailEnabled && (
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                            <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Clock size={14} /> Send my daily briefing at:
                                            </label>
                                            <select
                                                value={reminderHour}
                                                onChange={(e) => updateReminderHour(e.target.value)}
                                                className="input-field"
                                                style={{ width: 'auto', minWidth: '100px', height: '32px', fontSize: '0.8rem', padding: '0 0.5rem' }}
                                            >
                                                {Array.from({ length: 24 }).map((_, i) => {
                                                    const h = i.toString().padStart(2, '0');
                                                    return <option key={h} value={h}>{h}:00 IST</option>;
                                                })}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* ── Send Reminder Now ── */}
                        <div style={{
                            marginBottom: '1rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: '0.8rem',
                            border: '1px solid rgba(52,211,153,0.2)',
                            background: 'rgba(52,211,153,0.03)',
                            padding: '1rem', borderRadius: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                                    background: 'rgba(52,211,153,0.1)',
                                    border: '1px solid rgba(52,211,153,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Send size={17} color="#34d399" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#34d399' }}>Send Reminder Now</div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                        Instantly email today's task briefing to <b style={{ color: 'rgba(255,255,255,0.5)' }}>{userProfile?.email || 'your email'}</b>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={sendReminderNow}
                                disabled={sendingReminder}
                                className="btn btn-primary"
                                style={{
                                    fontSize: '0.78rem', gap: '0.4rem',
                                    background: sendingReminder ? 'rgba(52,211,153,0.05)' : 'rgba(52,211,153,0.15)',
                                    borderColor: 'rgba(52,211,153,0.4)', color: '#34d399',
                                    opacity: sendingReminder ? 0.7 : 1,
                                    cursor: sendingReminder ? 'not-allowed' : 'pointer'
                                }}>
                                {sendingReminder ? '⏳ Sending...' : <><Send size={13} /> Send Now</>}
                            </button>
                        </div>
                        <div style={{
                            marginBottom: '1.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: '0.8rem',
                            border: remindersEnabled ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.07)',
                            background: remindersEnabled ? 'rgba(251,191,36,0.03)' : 'rgba(255,255,255,0.02)',
                            padding: '1rem', borderRadius: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                                    background: remindersEnabled ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${remindersEnabled ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {remindersEnabled ? <Bell size={17} color="#fbbf24" /> : <BellOff size={17} color="rgba(255,255,255,0.3)" />}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: remindersEnabled ? '#fbbf24' : 'rgba(255,255,255,0.8)' }}>
                                        {remindersEnabled ? 'In-App Reminders: ON' : 'In-App Reminders: OFF'}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                        Receive gentle nudges for due tasks directly in the app.
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {remindersEnabled && (
                                    <button onClick={sendTestNotification} className="btn btn-outline" style={{ fontSize: '0.78rem', gap: '0.4rem' }}>
                                        <Bell size={13} /> Test
                                    </button>
                                )}
                                <button onClick={toggleReminders}
                                    className={`btn ${remindersEnabled ? 'btn-outline' : 'btn-primary'}`}
                                    style={{ fontSize: '0.78rem' }}>
                                    {remindersEnabled ? 'Disable' : '🔔 Enable Reminders'}
                                </button>
                            </div>
                        </div>

                        {/* Danger zone line */}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '1.5rem 0' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h4 style={{ color: 'var(--accent-red)', fontSize: '0.95rem', fontWeight: 'bold' }}>Sign Out</h4>
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>Safely disconnect your Google account. Your data is synced.</p>
                            </div>
                            <button onClick={handleLogoutClick} className="btn" style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(248,113,113,0.3)', padding: '0.6rem 1rem' }}>
                                <LogOut size={16} /> Logout from Device
                            </button>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════
                        REFER TO FRIENDS — Premium invite card
                    ═══════════════════════════════════════════════════════ */}
                    <div className="glass-panel animate-fade-in" style={{
                        background: 'linear-gradient(135deg, rgba(110,86,207,0.08) 0%, rgba(88,166,255,0.06) 50%, rgba(192,132,252,0.08) 100%)',
                        border: '1px solid rgba(110,86,207,0.3)',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        {/* Background glow blobs */}
                        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(110,86,207,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,166,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                                background: 'linear-gradient(135deg, #6e56cf, #58a6ff)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(110,86,207,0.4)'
                            }}>
                                <UserPlus size={20} color="#fff" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>Refer to Friends</h3>
                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', margin: 0, marginTop: '2px' }}>Help your friends stay on top of their engineering goals 🚀</p>
                            </div>
                            <span style={{
                                marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
                                background: 'linear-gradient(135deg, #6e56cf, #58a6ff)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                fontFamily: "'JetBrains Mono', monospace"
                            }}>FREE · ALWAYS</span>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                            EngiPlanner helps engineering students <strong style={{ color: '#fff' }}>track tasks, build streaks, crush exams</strong>, and stay laser-focused on their roadmap.
                            Share it with your college friends — it's <strong style={{ color: '#c084fc' }}>100% free</strong> and works on any device.
                        </p>

                        {/* Shareable link box */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(110,86,207,0.3)',
                            borderRadius: '10px', padding: '0.65rem 1rem', marginBottom: '1rem'
                        }}>
                            <span style={{ flex: 1, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                https://engiplanner.vercel.app
                            </span>
                            <button onClick={copyReferralLink} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', gap: '0.35rem', borderColor: copiedLink ? 'rgba(52,211,153,0.5)' : 'rgba(110,86,207,0.4)', color: copiedLink ? '#34d399' : '#c084fc', flexShrink: 0, transition: 'all 0.3s ease' }}>
                                {copiedLink ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
                            </button>
                        </div>

                        {/* Share buttons row */}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {/* WhatsApp */}
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent('Hey! Try EngiPlanner 🎓 — the ultimate task planner for engineering students. Track assignments, build streaks, get deadline reminders and more. It\'s FREE!\n\n🔗 https://engiplanner.vercel.app')}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 1.1rem', borderRadius: '9px',
                                    background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)',
                                    color: '#25d366', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none',
                                    transition: 'all 0.2s ease', flex: 1, justifyContent: 'center', minWidth: '130px'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,211,102,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,211,102,0.12)'}>
                                <span style={{ fontSize: '1rem' }}>📱</span> WhatsApp
                            </a>

                            {/* Email invite */}
                            <a
                                href={`mailto:?subject=You should try EngiPlanner 🎓&body=Hey!%0A%0ATry EngiPlanner — the ultimate task planner for engineering students.%0A%0AFeatures:%0A✅ Smart task planner with deadlines%0A🔥 Streak tracking%0A📧 Daily email reminders%0A📊 Analytics & insights%0A%0AIt's FREE → https://engiplanner.vercel.app%0A%0ASent with ❤️ by ${userProfile?.name || 'a friend'}`}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 1.1rem', borderRadius: '9px',
                                    background: 'rgba(88,166,255,0.12)', border: '1px solid rgba(88,166,255,0.3)',
                                    color: '#58a6ff', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none',
                                    transition: 'all 0.2s ease', flex: 1, justifyContent: 'center', minWidth: '130px'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(88,166,255,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(88,166,255,0.12)'}>
                                <Mail size={15} /> Email Invite
                            </a>

                            {/* Share button for mobile native share */}
                            {typeof navigator !== 'undefined' && navigator.share && (
                                <button
                                    onClick={() => navigator.share({ title: 'EngiPlanner', text: 'Track your engineering tasks, build streaks & crush exams! 🎓', url: 'https://engiplanner.vercel.app' })}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.6rem 1.1rem', borderRadius: '9px', cursor: 'pointer',
                                        background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.3)',
                                        color: '#c084fc', fontSize: '0.82rem', fontWeight: 600,
                                        flex: 1, justifyContent: 'center', minWidth: '130px'
                                    }}>
                                    <Share2 size={15} /> Share
                                </button>
                            )}
                        </div>

                        {/* Feature highlights */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1.2rem' }}>
                            {['🎯 Smart Task Planner', '🔥 Streak Tracker', '📧 Email Reminders', '📊 Analytics', '🔄 Google Sync', '📱 Works on Mobile'].map(f => (
                                <span key={f} style={{
                                    fontSize: '0.7rem', padding: '0.25rem 0.65rem', borderRadius: '99px',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.5)'
                                }}>{f}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

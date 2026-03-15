import React, { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Activity, User, Calendar, Trophy, Clock, X, Check, Flame } from 'lucide-react';

export default function FitnessPanel({ tasks, setTasks }) {
    const todayStr = new Date().toISOString().split('T')[0];

    // --- State Storage Management ---
    const safeGet = (key, defaultVal) => {
        try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : defaultVal; }
        catch { return defaultVal; }
    };

    const [workouts, setWorkouts] = useState(() => safeGet('engiplanner_workouts', []));
    const [prs, setPrs] = useState(() => safeGet('engiplanner_prs', {}));

    useEffect(() => {
        localStorage.setItem('engiplanner_workouts', JSON.stringify(workouts));
        localStorage.setItem('engiplanner_prs', JSON.stringify(prs));
    }, [workouts, prs]);

    // --- Suggest AI Workout ---
    const [bodyPart, setBodyPart] = useState('Chest');
    const [timeAvail, setTimeAvail] = useState('45');
    const [goal, setGoal] = useState('Hypertrophy');
    const [aiLoading, setAiLoading] = useState(false);
    const [suggestedWorkout, setSuggestedWorkout] = useState(null);

    const useGroqApi = async () => {
        setAiLoading(true);
        // Replace with actual API call inside your backend or using VITE_GROQ_API_KEY
        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            if (!apiKey) {
                // Mock response if no API key is provided for demo
                setTimeout(() => {
                    setSuggestedWorkout([
                        { name: `Bench Press (${goal})`, sets: 3, reps: '8-10' },
                        { name: `Incline Dumbbell Press`, sets: 3, reps: '10-12' },
                        { name: `Cable Crossovers`, sets: 3, reps: '12-15' }
                    ]);
                    setAiLoading(false);
                }, 1000);
                return;
            }

            const prompt = `Generate a ${timeAvail}-minute workout for ${bodyPart} with the goal of ${goal}. Return ONLY a JSON array of objects with keys 'name', 'sets', 'reps'. Do NOT wrap in markdown code blocks like \`\`\`json. Return pure JSON.`;
            const req = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await req.json();
            const text = data.choices[0].message.content.trim();
            // Try to parse out the JSON if there's markdown
            let pureJson = text;
            if (pureJson.startsWith('```json')) { pureJson = pureJson.replace(/```json/g, '').replace(/```/g, '').trim(); }
            if (pureJson.startsWith('```')) { pureJson = pureJson.replace(/```/g, '').trim(); }
            setSuggestedWorkout(JSON.parse(pureJson));
        } catch (e) {
            console.error(e);
            alert("Error generating workout. Make sure Groq API is valid.");
        } finally {
            setAiLoading(false);
        }
    };

    const addWorkoutToTasks = () => {
        if (!suggestedWorkout) return;
        const newTasks = suggestedWorkout.map((ex, i) => ({
            id: Date.now() + i,
            title: `Workout: ${ex.name} (${ex.sets} sets of ${ex.reps})`,
            category: 'Fitness',
            priority: 'Medium',
            completed: false,
            deadline: todayStr,
            source: 'ai_workout'
        }));
        setTasks(prev => [...newTasks, ...prev]);
        setSuggestedWorkout(null);
        alert('Workout logic pushed to your Todo list!');
    };

    // --- Streak & Progress logic ---
    const fitnessTasks = tasks.filter(t => t.category === 'Fitness' || t.category === 'Exercise');
    const fitnessHistory = fitnessTasks.filter(t => t.completed);

    const currentStreak = useMemo(() => {
        const dates = [...new Set(fitnessHistory.map(h => h.completedAt || todayStr))].sort().reverse();
        let streak = 0, cursor = todayStr;
        for (const d of dates) {
            if (d === cursor) { streak++; const nd = new Date(cursor); nd.setDate(nd.getDate() - 1); cursor = nd.toISOString().split('T')[0]; }
            else break;
        }
        return streak;
    }, [fitnessHistory]);

    const workoutDaysThisWeek = useMemo(() => {
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        return fitnessHistory.filter(h => {
            const d = new Date(h.completedAt || todayStr);
            return d >= startOfWeek;
        }).length;
    }, [fitnessHistory]);

    // Muscle Group Balance Logic
    const balance = useMemo(() => {
        const bodyParts = { Chest: 0, Back: 0, Legs: 0, Arms: 0, Core: 0 };
        workouts.forEach(w => {
            if (w.part && bodyParts[w.part] !== undefined) bodyParts[w.part]++;
        });
        return bodyParts;
    }, [workouts]);

    const trackOverload = (exercise, weight, reps, part) => {
        if (!exercise || !weight || !reps) return;
        const newEntry = { date: todayStr, weight, reps, part };
        let warning = '';
        if (prs[exercise]) {
            const best = prs[exercise];
            if (weight < best.weight) warning = `Warning: Logged ${weight}kg, your previous best is ${best.weight}kg. Progressive Overload alert!`;
            if (weight > best.weight) {
                warning = `🎉 NEW PR CELEBRATION! 🎉 ${weight}kg`;
                setPrs(prev => ({ ...prev, [exercise]: newEntry }));
            }
        } else {
            setPrs(prev => ({ ...prev, [exercise]: newEntry }));
        }
        setWorkouts(prev => [{ exercise, ...newEntry }, ...prev]);
        if (warning) alert(warning);
    };

    // Active tracking
    const [trkEx, setTrkEx] = useState('');
    const [trkWeight, setTrkWeight] = useState('');
    const [trkReps, setTrkReps] = useState('');
    const [trkPart, setTrkPart] = useState('Chest');

    // Workout Timer
    const [restTimer, setRestTimer] = useState(0);
    useEffect(() => {
        if (restTimer > 0) {
            const i = setInterval(() => setRestTimer(s => s - 1), 1000);
            return () => clearInterval(i);
        } else if (restTimer === 0 && document.title.includes('Rest')) {
            alert("⏰ Set is starting! Let's go!");
            document.title = "EngiPlanner />";
        }
    }, [restTimer]);

    const startRest = (sec) => {
        setRestTimer(sec);
        document.title = `Rest: ${sec}s`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={24} color="var(--accent-green)" /> Fitness HQ
            </h2>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="glass-panel" style={{ border: currentStreak >= 3 ? '1px solid var(--accent-orange)' : undefined }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Workout Streak</div>
                    <h3 style={{ fontSize: '1.8rem', color: currentStreak >= 3 ? 'var(--accent-orange)' : 'var(--white)' }}>
                        🔥 {currentStreak} Days
                    </h3>
                    {currentStreak >= 7 && <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)' }}>7-Day Badge Unlocked!</span>}
                    {currentStreak >= 3 && currentStreak < 7 && <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>Warning: 3 consecutive days! Rest recommended tomorrow.</span>}
                </div>
                <div className="glass-panel">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Weekly Goal</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-blue)' }}>{workoutDaysThisWeek}/5</h3>
                        <Trophy size={20} color={workoutDaysThisWeek >= 5 ? 'var(--accent-green)' : 'rgba(255,255,255,0.2)'} />
                    </div>
                    <div className="progress-bar" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${Math.min(100, Math.round(workoutDaysThisWeek / 5 * 100))}%`, background: 'var(--accent-blue)' }} /></div>
                </div>
            </div>

            {/* AI Generator */}
            <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Dumbbell size={18} color="var(--accent-purple)" /> AI Workout Generator
                </h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                        <label>Body Part</label>
                        <select className="input-field" value={bodyPart} onChange={e => setBodyPart(e.target.value)}>
                            {['Chest', 'Back', 'Legs', 'Arms', 'Core', 'Full Body'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                        <label>Time (min)</label>
                        <input type="number" className="input-field" value={timeAvail} onChange={e => setTimeAvail(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                        <label>Goal</label>
                        <select className="input-field" value={goal} onChange={e => setGoal(e.target.value)}>
                            {['Hypertrophy', 'Strength', 'Endurance', 'Flexibility'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={useGroqApi} className="btn btn-primary" style={{ width: '100%' }}>
                    {aiLoading ? 'Generating...' : `Build me a ${timeAvail}m ${goal} workout`}
                </button>

                {suggestedWorkout && (
                    <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--accent-green)' }}>Suggested Plan:</h4>
                        {suggestedWorkout.map((ex, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <span>{ex.name}</span>
                                <span style={{ color: 'var(--text-dim)' }}>{ex.sets}x{ex.reps}</span>
                            </div>
                        ))}
                        <button onClick={addWorkoutToTasks} className="btn btn-success" style={{ marginTop: '1rem' }}>Add to Tasks</button>
                    </div>
                )}
            </div>

            {/* Live Tracking & Timer Log */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass-panel">
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Flame size={18} color="var(--accent-red)" /> Log PR & Overload
                    </h3>
                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <input className="input-field" placeholder="Exercise (e.g. Bench Press)" value={trkEx} onChange={e => setTrkEx(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input type="number" placeholder="Weight (kg)" className="input-field" value={trkWeight} onChange={e => setTrkWeight(e.target.value)} />
                        <input type="number" placeholder="Reps" className="input-field" value={trkReps} onChange={e => setTrkReps(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <select className="input-field" value={trkPart} onChange={e => setTrkPart(e.target.value)}>
                            {['Chest', 'Back', 'Legs', 'Arms', 'Core'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={() => trackOverload(trkEx, Number(trkWeight), Number(trkReps), trkPart)}>Log Set & Check PR</button>
                </div>

                <div className="glass-panel" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Clock size={18} color="var(--accent-blue)" /> Rest Timer
                    </h3>
                    <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'monospace', color: restTimer > 0 ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
                        {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                        <button className="btn btn-outline" onClick={() => startRest(30)}>30s</button>
                        <button className="btn btn-outline" onClick={() => startRest(60)}>60s</button>
                        <button className="btn btn-outline" onClick={() => startRest(90)}>90s</button>
                    </div>
                </div>
            </div>

            {/* Muscle Group Balance Warning */}
            <div className="glass-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>⚖️ Muscle Group Balance</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {Object.entries(balance).map(([part, count]) => (
                        <div key={part} style={{ flex: 1, minWidth: '80px', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{part}</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{count} logs</div>
                        </div>
                    ))}
                </div>
                {balance.Chest > balance.Back * 2 && <p style={{ color: 'var(--accent-red)', marginTop: '1rem' }}>⚠️ Warning: You're training Chest heavily but ignoring Back. Imbalance risks posture issues!</p>}
                {balance.Legs < 2 && balance.Chest > 2 && <p style={{ color: 'var(--accent-red)', marginTop: '1rem' }}>⚠️ Don't skip leg day! Legs are severely undertrained.</p>}
            </div>

        </div>
    );
}

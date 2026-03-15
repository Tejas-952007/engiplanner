import React, { useState, useEffect, useMemo } from 'react';
import { Map, Target, CheckCircle2, Circle, ChevronRight, Award, Zap, BarChart2, Edit2, Trash2, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RoadmapPanel({ userProfile }) {
    // Basic state management via generic unsafe Get or safe get
    const safeGet = (key, defaultVal) => {
        try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : defaultVal; }
        catch { return defaultVal; }
    };

    // Roadmap State
    // milestones structure: [{ id, title, status: 'completed'|'current'|'locked', tasks: [{ id, title, completed, deadline, priority }] }]
    const [roadmapData, setRoadmapData] = useState(() => safeGet('engiplanner_ai_roadmap', null));
    const [goalInput, setGoalInput] = useState(userProfile?.roadmap || '');
    const [aiLoading, setAiLoading] = useState(false);
    const [showStats, setShowStats] = useState(false);

    // Edit states
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [addingTo, setAddingTo] = useState(null); // 'milestone' or mId
    const [newValue, setNewValue] = useState('');

    useEffect(() => {
        localStorage.setItem('engiplanner_ai_roadmap', JSON.stringify(roadmapData));
    }, [roadmapData]);

    const generateRoadmap = async (e) => {
        if (e) e.preventDefault();
        if (!goalInput) return alert("Please enter a goal!");
        setAiLoading(true);

        const prompt = `You are an expert career and goal coach. Generate a roadmap for the goal: "${goalInput}". 
Break it down into exactly 5 sequential milestones. For each milestone, provide exactly 3 specific, actionable sub-tasks.
Return ONLY valid JSON. The format must be an array of objects where each object represents a milestone:
[{
  "id": "1",
  "title": "Milestone Title",
  "status": "locked",
  "tasks": [
    { "id": "t1", "title": "Subtask 1", "completed": false, "deadline": "7", "priority": "High" }
  ]
}]
Note: 'deadline' should be the number of days from now. Provide strictly JSON arrays. Nothing else.`;

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY;
            let finalJson = [];

            if (!apiKey) {
                // Mock data if no API key is present
                await new Promise(res => setTimeout(res, 1500));
                finalJson = [
                    {
                        id: "m1", title: "Fundamentals & Basics", status: "current", tasks: [
                            { id: "t1", title: "Understand the core concepts", completed: false, priority: "High", deadline: "3" },
                            { id: "t2", title: "Set up the development environment", completed: false, priority: "Medium", deadline: "5" },
                            { id: "t3", title: "Build a 'Hello World' project", completed: false, priority: "Medium", deadline: "7" }
                        ]
                    },
                    {
                        id: "m2", title: "Intermediate Concepts", status: "locked", tasks: [
                            { id: "t4", title: "Learn advanced patterns", completed: false, priority: "High", deadline: "14" },
                            { id: "t5", title: "Work with APIs and Databases", completed: false, priority: "High", deadline: "20" },
                            { id: "t6", title: "Build a full-stack clone", completed: false, priority: "Medium", deadline: "30" }
                        ]
                    },
                    {
                        id: "m3", title: "Advanced Architecture", status: "locked", tasks: [
                            { id: "t7", title: "System Design basics", completed: false, priority: "High", deadline: "45" },
                            { id: "t8", title: "Caching & Performance", completed: false, priority: "High", deadline: "50" },
                            { id: "t9", title: "Deploy to cloud (AWS/GCP)", completed: false, priority: "Medium", deadline: "60" }
                        ]
                    },
                    {
                        id: "m4", title: "Portfolio & Open Source", status: "locked", tasks: [
                            { id: "t10", title: "Contribute to 1 repo", completed: false, priority: "Medium", deadline: "75" },
                            { id: "t11", title: "Build a personal portfolio", completed: false, priority: "High", deadline: "80" },
                            { id: "t12", title: "Write a technical blog post", completed: false, priority: "Low", deadline: "90" }
                        ]
                    },
                    {
                        id: "m5", title: "Interview Prep & Landing Jobs", status: "locked", tasks: [
                            { id: "t13", title: "LeetCode Grind (Top 100)", completed: false, priority: "High", deadline: "100" },
                            { id: "t14", title: "Mock Interviews", completed: false, priority: "High", deadline: "110" },
                            { id: "t15", title: "Apply and Negotiate", completed: false, priority: "High", deadline: "120" }
                        ]
                    }
                ];
            } else {
                const req = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant',
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const data = await req.json();
                let text = data.choices[0].message.content.trim();
                // Strip markdown
                if (text.startsWith('```json')) { text = text.replace(/```json/g, '').replace(/```/g, '').trim(); }
                if (text.startsWith('```')) { text = text.replace(/```/g, '').trim(); }
                finalJson = JSON.parse(text);

                // Set first to current
                if (finalJson.length > 0) finalJson[0].status = 'current';
            }

            // Map relative deadlines to absolute dates
            const today = new Date();
            const processData = finalJson.map(m => {
                let mCompleted = true;
                const newT = m.tasks.map(t => {
                    if (!t.completed) mCompleted = false;
                    const d = new Date(today);
                    d.setDate(d.getDate() + parseInt(t.deadline || "7"));
                    return { ...t, deadline: d.toISOString().split('T')[0] };
                });
                return { ...m, id: m.id || Math.random().toString(), status: mCompleted ? 'completed' : m.status, tasks: newT };
            });

            // Ensure first non-completed is current
            let foundCurrent = false;
            const finalData = processData.map(m => {
                if (m.tasks.every(t => t.completed)) return { ...m, status: 'completed' };
                if (!foundCurrent) { foundCurrent = true; return { ...m, status: 'current' }; }
                return { ...m, status: 'locked' };
            });

            setRoadmapData(finalData);
            setGoalInput('');
        } catch (e) {
            console.error(e);
            alert("Error generating roadmap. Please check your API key and try again.");
        } finally {
            setAiLoading(false);
        }
    };

    const recalculateStatuses = (data) => {
        let foundCurrent = false;
        return data.map(m => {
            const tempM = { ...m };
            if (tempM.tasks.length > 0 && tempM.tasks.every(t => t.completed)) {
                tempM.status = 'completed';
            } else if (!foundCurrent) {
                tempM.status = 'current';
                foundCurrent = true;
            } else {
                tempM.status = 'locked';
            }
            return tempM;
        });
    };

    const toggleSubTask = (mId, tId) => {
        setRoadmapData(prev => {
            const newData = [...prev];
            const mIdx = newData.findIndex(m => m.id === mId);
            if (mIdx === -1) return prev;

            const m = { ...newData[mIdx] };
            const tIdx = m.tasks.findIndex(t => t.id === tId);
            if (tIdx === -1) return prev;

            m.tasks[tIdx].completed = !m.tasks[tIdx].completed;
            newData[mIdx] = m;

            const updatedData = recalculateStatuses(newData);

            // Check if milestone JUST finished
            const mFinal = updatedData.find(x => x.id === mId);
            if (m.status !== 'completed' && mFinal.status === 'completed') {
                triggerConfetti();
                alert(`🎉 Milestone Unlocked: ${mFinal.title}! Great job progressing on your roadmap!`);
            }

            return updatedData;
        });
    };

    // Editing Logic
    const saveEdit = (mId, type, tId = null) => {
        if (!editValue.trim()) { setEditingId(null); return; }
        setRoadmapData(prev => {
            const newData = [...prev];
            const mIdx = newData.findIndex(m => m.id === mId);
            if (mIdx === -1) return prev;

            if (type === 'milestone') {
                newData[mIdx].title = editValue;
            } else if (type === 'task') {
                const tIdx = newData[mIdx].tasks.findIndex(t => t.id === tId);
                if (tIdx > -1) newData[mIdx].tasks[tIdx].title = editValue;
            }
            return newData;
        });
        setEditingId(null);
    };

    const saveNew = () => {
        if (!newValue.trim()) { setAddingTo(null); return; }
        setRoadmapData(prev => {
            let newData = [...prev];
            if (addingTo === 'milestone') {
                newData.push({
                    id: Math.random().toString(),
                    title: newValue,
                    status: 'locked', // will be recalculated
                    tasks: []
                });
            } else {
                const mIdx = newData.findIndex(m => m.id === addingTo);
                if (mIdx > -1) {
                    newData[mIdx].tasks.push({
                        id: Math.random().toString(),
                        title: newValue,
                        completed: false,
                        deadline: new Date(new Date().getTime() + 7 * 86400000).toISOString().split('T')[0],
                        priority: 'Medium'
                    });
                }
            }
            return recalculateStatuses(newData);
        });
        setAddingTo(null);
        setNewValue('');
    };

    const deleteItem = (mId, tId = null) => {
        setRoadmapData(prev => {
            let newData = [...prev];
            if (tId === null) {
                if (!window.confirm("Delete milestone and all its sub-tasks?")) return prev;
                newData = newData.filter(m => m.id !== mId);
            } else {
                const mIdx = newData.findIndex(m => m.id === mId);
                if (mIdx > -1) {
                    newData[mIdx].tasks = newData[mIdx].tasks.filter(t => t.id !== tId);
                }
            }
            return recalculateStatuses(newData);
        });
    };

    const triggerConfetti = () => {
        const duration = 3000;
        const end = Date.now() + duration;
        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#f472b6', '#c084fc', '#60a5fa'] });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#f472b6', '#c084fc', '#60a5fa'] });
            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    };

    const getDeadlineColor = (dateStr) => {
        const diff = (new Date(dateStr) - new Date()) / 86400000;
        if (diff < 3) return 'var(--accent-red)';
        if (diff < 14) return 'var(--accent-orange)';
        return 'var(--accent-green)';
    };

    const getDeadlineText = (dateStr) => {
        const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
        if (diff < 0) return 'Overdue';
        if (diff === 0) return 'Today';
        if (diff === 1) return '1 day left';
        if (diff < 14) return `${diff} days left`;
        if (diff < 30) return `${Math.floor(diff / 7)} weeks left`;
        return `${Math.floor(diff / 30)} month(s) left`;
    };

    // Calculate detailed stats
    const stats = useMemo(() => {
        if (!roadmapData) return null;
        let total = 0;
        let done = 0;

        // Simulating the "done this week" for roadmap, here we just show a mockup value based on total done so far if we don't have exact timestamps of completion
        roadmapData.forEach(m => {
            m.tasks.forEach(t => {
                total++;
                if (t.completed) {
                    done++;
                }
            });
        });

        return {
            percent: total === 0 ? 0 : Math.round((done / total) * 100),
            done, total,
            streakLabel: '🔥 Doing Great!'
        };
    }, [roadmapData]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
            <div className="glass-panel" style={{ borderTop: '4px solid #f472b6' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.8rem', background: 'rgba(244,114,182,0.1)', borderRadius: '14px', color: '#f472b6' }}>
                            <Map size={32} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.2rem' }}>AI Dynamic Roadmap</h2>
                            <p style={{ color: '#f472b6', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.03em' }}>
                                Generate, track, and crush your goals
                            </p>
                        </div>
                    </div>
                    {roadmapData && (
                        <button onClick={() => setShowStats(!showStats)} className="btn btn-outline" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <BarChart2 size={16} /> Progress Dashboard
                        </button>
                    )}
                </div>

                {/* Generator Input Section */}
                <form onSubmit={generateRoadmap} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
                        <input type="text" value={goalInput} onChange={e => setGoalInput(e.target.value)}
                            placeholder="What's your goal? (e.g. AI/ML Engineer, Learn Guitar, Run 5km)"
                            className="input-field" style={{ padding: '0.8rem 1rem', fontSize: '1rem' }} required
                            disabled={aiLoading} />
                    </div>
                    <button type="submit" disabled={aiLoading} className="btn btn-primary" style={{ background: '#f472b6', color: '#000', fontWeight: 'bold', padding: '0 1.5rem', borderRadius: '8px' }}>
                        {aiLoading ? <><Zap size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Target size={18} /> Build Roadmap</>}
                    </button>
                </form>

                {/* Empty State */}
                {!roadmapData && !aiLoading && (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', border: '1px dashed rgba(244,114,182,0.3)', borderRadius: '14px', background: 'rgba(244,114,182,0.02)' }}>
                        <Target size={40} color="rgba(244,114,182,0.5)" style={{ margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No roadmap setup</h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Type any goal above and watch AI break it down into achievable milestones.</p>
                    </div>
                )}
            </div>

            {/* Stats Dashboard */}
            {showStats && stats && roadmapData && (
                <div className="glass-panel animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(20,20,30,0.8), rgba(10,10,15,0.9))' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={20} color="var(--accent-orange)" /> Roadmap Dashboard
                    </h3>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Overall Progress</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f472b6' }}>{stats.percent}%</div>
                            <div className="progress-bar" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${stats.percent}%`, background: '#f472b6' }} /></div>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tasks Done</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-green)' }}>{stats.done} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/{stats.total}</span></div>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Momentum</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent-orange)', marginTop: '0.5rem' }}>{stats.streakLabel}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Focus Panel */}
            {roadmapData && (
                <div className="glass-panel animate-fade-in" style={{ borderLeft: '3px solid var(--accent-purple)' }}>
                    <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={18} /> Daily Focus (Top Priority)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(() => {
                            const currentMilestone = roadmapData.find(m => m.status === 'current');
                            if (!currentMilestone) return <p style={{ color: 'var(--accent-green)' }}>Goal Completed! Incredible!</p>;
                            const topTasks = currentMilestone.tasks.filter(t => !t.completed).slice(0, 3);
                            return topTasks.map(t => (
                                <div key={`focus-${t.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem', background: 'rgba(192,132,252,0.1)', borderRadius: '8px' }}>
                                    <ChevronRight size={16} color="var(--accent-purple)" />
                                    <div style={{ flex: 1, fontWeight: 500 }}>{t.title}</div>
                                    <button className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }} onClick={() => toggleSubTask(currentMilestone.id, t.id)}>
                                        Complete
                                    </button>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            )}

            {/* Timeline View */}
            {roadmapData && (
                <div className="glass-panel animate-fade-in">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>Milestone Timeline</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        {/* Vertical line connecting nodes */}
                        <div style={{ position: 'absolute', left: '26px', top: '15px', bottom: '15px', width: '2px', background: 'rgba(255,255,255,0.1)' }} />

                        {roadmapData.map((milestone, idx) => {
                            const isCompleted = milestone.status === 'completed';
                            const isCurrent = milestone.status === 'current';
                            const isLocked = milestone.status === 'locked';

                            const color = isCompleted ? 'var(--accent-green)' : isCurrent ? '#f472b6' : 'rgba(255,255,255,0.3)';

                            return (
                                <div key={milestone.id} style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', opacity: isLocked ? 0.6 : 1, position: 'relative' }}>
                                    {/* Indicator */}
                                    <div style={{
                                        width: '54px', height: '54px', borderRadius: '50%', background: '#111',
                                        border: `3px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, zIndex: 1, boxShadow: isCurrent ? `0 0 20px ${color}` : undefined
                                    }}>
                                        {isCompleted ? <CheckCircle2 size={24} color={color} /> : <span style={{ fontWeight: 800, color }}>L{idx + 1}</span>}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, paddingTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                {editingId === milestone.id ? (
                                                    <input
                                                        type="text" autoFocus value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onBlur={() => saveEdit(milestone.id, 'milestone')}
                                                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(milestone.id, 'milestone'); }}
                                                        style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '0.3rem 0.6rem', outline: 'none', fontSize: '1.2rem' }}
                                                    />
                                                ) : (
                                                    <>
                                                        <h4 style={{ fontSize: '1.2rem', color: isCompleted ? 'rgba(255,255,255,0.7)' : '#fff', textDecoration: isCompleted ? 'line-through' : 'none', margin: 0 }}>
                                                            {milestone.title}
                                                        </h4>
                                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                            <button onClick={() => { setEditingId(milestone.id); setEditValue(milestone.title); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }} title="Edit Milestone">
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button onClick={() => deleteItem(milestone.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,123,114,0.6)', cursor: 'pointer', padding: 0 }} title="Delete Milestone">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: `rgba(255,255,255,0.1)`, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {milestone.status}
                                            </span>
                                        </div>

                                        {/* Subtasks */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
                                            {milestone.tasks.map(t => {
                                                const dlColor = getDeadlineColor(t.deadline);
                                                const dlText = getDeadlineText(t.deadline);

                                                return (
                                                    <div key={t.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                        padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px',
                                                        transition: 'all 0.2s', cursor: isLocked ? 'not-allowed' : 'pointer'
                                                    }}
                                                        onClick={(e) => {
                                                            // Ignore click if editing
                                                            if (editingId === t.id) { e.stopPropagation(); return; }
                                                            if (!isLocked) toggleSubTask(milestone.id, t.id);
                                                        }}
                                                    >
                                                        <div style={{ color: t.completed ? 'var(--accent-green)' : 'rgba(255,255,255,0.3)' }}>
                                                            {t.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                        </div>
                                                        <div style={{ flex: 1, color: t.completed ? 'rgba(255,255,255,0.5)' : '#fff', display: 'flex', alignItems: 'center' }}>
                                                            {editingId === t.id ? (
                                                                <input
                                                                    type="text" autoFocus value={editValue}
                                                                    onClick={e => e.stopPropagation()}
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    onBlur={() => saveEdit(milestone.id, 'task', t.id)}
                                                                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(milestone.id, 'task', t.id); }}
                                                                    style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '0.2rem 0.5rem', outline: 'none' }}
                                                                />
                                                            ) : (
                                                                <div style={{ flex: 1, textDecoration: t.completed ? 'line-through' : 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                    {t.title}
                                                                    <div className="hover-actions" style={{ display: 'flex', gap: '0.4rem' }}>
                                                                        <button onClick={(e) => { e.stopPropagation(); setEditingId(t.id); setEditValue(t.title); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }} title="Edit Task">
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); deleteItem(milestone.id, t.id); }} style={{ background: 'none', border: 'none', color: 'rgba(255,123,114,0.6)', cursor: 'pointer', padding: 0 }} title="Delete Task">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!t.completed && editingId !== t.id && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                <span style={{ fontSize: '0.7rem', color: dlColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                                    {dlColor === 'var(--accent-red)' ? '🔴' : dlColor === 'var(--accent-orange)' ? '🟡' : '🟢'} {dlText}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Add task to milestone */}
                                            {addingTo === milestone.id ? (
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <input
                                                        type="text" autoFocus value={newValue} placeholder="New subtask title..."
                                                        onChange={e => setNewValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') saveNew(); else if (e.key === 'Escape') setAddingTo(null); }}
                                                        className="input-field" style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                                    />
                                                    <button onClick={() => saveNew()} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Save</button>
                                                    <button onClick={() => setAddingTo(null)} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setAddingTo(milestone.id); setNewValue(''); }} className="btn btn-outline" style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '0.3rem 0.7rem', gap: '0.3rem', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)' }}>
                                                    <Plus size={14} /> Add Subtask
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add new milestone */}
                        {addingTo === 'milestone' ? (
                            <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text" autoFocus value={newValue} placeholder="New milestone title..."
                                        onChange={e => setNewValue(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveNew(); else if (e.key === 'Escape') setAddingTo(null); }}
                                        className="input-field" style={{ flex: 1 }}
                                    />
                                    <button onClick={() => saveNew()} className="btn btn-primary" style={{ padding: '0 1rem' }}>Save Milestone</button>
                                    <button onClick={() => setAddingTo(null)} className="btn btn-outline" style={{ padding: '0 1rem' }}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ paddingLeft: '40px' }}>
                                <button onClick={() => { setAddingTo('milestone'); setNewValue(''); }} className="btn btn-outline" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem 1rem', borderStyle: 'dashed' }}>
                                    <Plus size={16} style={{ marginRight: '0.4rem' }} /> Add Milestone
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis,
    BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    Cell
} from 'recharts';

// A simple GitHub-style contribution graph component wrapper
function StreakGrid({ history }) {
    const today = new Date();
    const days = 14 * 7; // Last 14 weeks
    const data = useMemo(() => {
        const counts = {};
        history.forEach(h => {
            counts[h.date] = (counts[h.date] || 0) + 1;
        });
        const arr = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            arr.push({ date: dateStr, count: counts[dateStr] || 0 });
        }
        return arr;
    }, [history, today]);

    // Grouping by week
    const weeks = [];
    for (let i = 0; i < data.length; i += 7) {
        weeks.push(data.slice(i, i + 7));
    }

    const getColor = (count) => {
        if (count === 0) return 'var(--border)';
        if (count === 1) return 'rgba(52, 211, 153, 0.4)';
        if (count === 2) return 'rgba(52, 211, 153, 0.6)';
        if (count >= 3) return 'rgba(52, 211, 153, 1)';
        return 'var(--border)';
    };

    return (
        <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', padding: '0.5rem 0' }}>
            {weeks.map((week, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {week.map(day => (
                        <div key={day.date}
                            title={`${day.date}: ${day.count} tasks`}
                            style={{
                                width: '12px', height: '12px', borderRadius: '2px',
                                background: getColor(day.count)
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default function StatsPanel({ tasks, history, allCategories }) {
    // 1. Focus Score Line Chart (Productivity Pattern Weekly)
    const focusData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const counts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
        history.forEach(h => {
            const d = new Date(h.date);
            const dayName = days[d.getDay()];
            counts[dayName] += 1;
        });
        return days.map(d => ({ name: d, focus: counts[d] }));
    }, [history]);

    // 2. Scatter Chart - Task Priority vs Completion Check
    // We map Easy (Low) -> left, Hard (High) -> right. 
    // And y-axis: Completion status.
    const scatterData = useMemo(() => {
        return tasks.map(t => {
            const x = t.priority === 'Low' ? 1 : t.priority === 'Medium' ? 2 : 3;
            // 1: Done, 0: Pending. If hard tasks are pending, scatter shows them in bottom-right procrastinate zone
            const y = t.completed ? 1 : 0;
            return { x, y, name: t.title, priority: t.priority, completed: t.completed };
        });
    }, [tasks]);

    // 3. Goal Progress Bars (Weekly Goals)
    const goalData = useMemo(() => {
        const d = {
            Work: { done: 0, total: 0, color: 'var(--accent-blue)' },
            Learning: { done: 0, total: 0, color: 'var(--accent-purple)' },
            Exercise: { done: 0, total: 0, color: 'var(--accent-orange)' }
        };
        tasks.forEach(t => {
            if (t.category === 'Work' || t.category === 'Projects' || t.category === 'Internships') {
                d.Work.total++;
                if (t.completed) d.Work.done++;
            } else if (t.category === 'Academics' || t.category === 'DSA / LeetCode' || t.category === 'Learning') {
                d.Learning.total++;
                if (t.completed) d.Learning.done++;
            } else if (t.category === 'Fitness' || t.category === 'Exercise') {
                d.Exercise.total++;
                if (t.completed) d.Exercise.done++;
            }
        });
        return Object.entries(d).map(([name, val]) => ({
            name,
            progress: val.total > 0 ? Math.round((val.done / val.total) * 100) : 0,
            fill: val.color
        }));
    }, [tasks]);

    // 4. Radar Chart - Procrastination Index (Delay per Category)
    const radarData = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const cats = {};
        tasks.forEach(t => {
            if (!cats[t.category]) cats[t.category] = { delayDays: 0, count: 0 };
            if (!t.completed && t.deadline && t.deadline < todayStr) {
                const diff = Math.floor((new Date(todayStr) - new Date(t.deadline)) / 86400000);
                cats[t.category].delayDays += diff;
            }
            cats[t.category].count++;
        });

        return Object.keys(allCategories).map(cat => ({
            subject: cat.split(' /')[0],
            delay: cats[cat] ? cats[cat].delayDays : 0,
            fullMark: 20
        }));
    }, [tasks, allCategories]);


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📊 Advanced Analytics
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* 1. Focus Score Line Chart */}
                <div className="glass-panel">
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📅 Weekly Productivity Pattern</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Shows which day of the week you are most focused.</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={focusData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                            <Line type="monotone" dataKey="focus" stroke="var(--accent-blue)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent-blue)' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* 2. Radar Chart - Procrastination Index */}
                <div className="glass-panel">
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🕸️ Procrastination Index</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Which category has the most delayed/overdue tasks?</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                            <Radar name="Overdue Days" dataKey="delay" stroke="var(--accent-red)" fill="var(--accent-red)" fillOpacity={0.4} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* 3. Scatter Chart - Avoidance pattern */}
                <div className="glass-panel">
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🎯 Task Avoidance Map</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Priority vs Completion. Bottom-right means you procrastinate hard tasks.</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" dataKey="x" name="Priority" ticks={[1, 2, 3]} tickFormatter={(v) => ['Low', 'Med', 'High'][v - 1]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} domain={[0, 4]} />
                            <YAxis type="number" dataKey="y" name="Status" ticks={[0, 1]} tickFormatter={(v) => v === 1 ? 'Done' : 'Pending'} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} domain={[-0.5, 1.5]} />
                            <ZAxis type="number" range={[100, 100]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return <div style={{ background: '#1a1a1a', padding: '0.5rem', border: '1px solid #333', fontSize: '12px' }}>{d.name}</div>;
                                }
                                return null;
                            }} />
                            <Scatter name="Tasks" data={scatterData} fill="var(--accent-orange)" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* 4. Goal Progress Bars */}
                <div className="glass-panel">
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📈 Life Goals Progress</h3>
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={goalData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 12 }} width={70} stroke="none" />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(val) => `${val}% completed`} />
                            <Bar dataKey="progress" radius={[0, 4, 4, 0]} barSize={20}>
                                {goalData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 5. GitHub style streak */}
                <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🔥 Commitment Grid</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Your daily consistency over the last 14 weeks.</p>
                    <StreakGrid history={history} />
                </div>
            </div>
        </div>
    );
}

import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis,
    BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    Cell, Legend
} from 'recharts';

/* ─── Color Palette ─────────────────────────────────────────── */
const COLORS = {
    blue: '#60a5fa',
    purple: '#a78bfa',
    green: '#34d399',
    orange: '#fb923c',
    pink: '#f472b6',
    yellow: '#facc15',
    red: '#f87171',
    cyan: '#22d3ee',
};

/* ─── Mini Summary Cards at the top ─────────────────────────── */
function SummaryCard({ emoji, label, value, color, subtitle }) {
    return (
        <div style={{
            background: `linear-gradient(135deg, ${color}22, ${color}11)`,
            border: `1.5px solid ${color}55`,
            borderRadius: '16px',
            padding: '1.1rem 1.3rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            <span style={{ fontSize: '1.6rem' }}>{emoji}</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{label}</span>
            {subtitle && <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>{subtitle}</span>}
        </div>
    );
}

/* ─── Section Wrapper ────────────────────────────────────────── */
function ChartCard({ title, description, color, children, fullWidth = false }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1.5px solid ${color}44`,
            borderRadius: '18px',
            padding: '1.4rem',
            gridColumn: fullWidth ? '1 / -1' : undefined,
            transition: 'border-color 0.3s',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h3>
                <span style={{
                    background: `${color}22`,
                    color,
                    borderRadius: '30px',
                    padding: '2px 10px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    border: `1px solid ${color}44`,
                    whiteSpace: 'nowrap'
                }}>LIVE</span>
            </div>
            {description && (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', marginTop: 0 }}>
                    {description}
                </p>
            )}
            {children}
        </div>
    );
}

/* ─── GitHub-style Streak Grid ───────────────────────────────── */
function StreakGrid({ history }) {
    const today = new Date();
    const days = 14 * 7;
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
    }, [history]);

    const weeks = [];
    for (let i = 0; i < data.length; i += 7) {
        weeks.push(data.slice(i, i + 7));
    }

    const getColor = (count) => {
        if (count === 0) return 'rgba(255,255,255,0.07)';
        if (count === 1) return 'rgba(52, 211, 153, 0.35)';
        if (count === 2) return 'rgba(52, 211, 153, 0.65)';
        return 'rgba(52, 211, 153, 1)';
    };

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div>
            <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', padding: '0.5rem 0' }}>
                {/* day-of-week labels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginRight: '4px' }}>
                    {dayLabels.map((l, i) => (
                        <span key={i} style={{ width: '12px', height: '12px', lineHeight: '12px', fontSize: '8px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{l}</span>
                    ))}
                </div>
                {weeks.map((week, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {week.map(day => (
                            <div key={day.date}
                                title={`${day.date}: ${day.count} task${day.count !== 1 ? 's' : ''} completed`}
                                style={{
                                    width: '12px', height: '12px', borderRadius: '3px',
                                    background: getColor(day.count),
                                    transition: 'transform 0.1s',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.4)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                        ))}
                    </div>
                ))}
            </div>
            {/* legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.8rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Less</span>
                {[0, 1, 2, 3].map(c => (
                    <div key={c} style={{ width: '12px', height: '12px', borderRadius: '3px', background: getColor(c) }} />
                ))}
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>More</span>
            </div>
        </div>
    );
}

/* ─── Custom Tooltips ────────────────────────────────────────── */
const tooltipStyle = { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px', color: '#fff' };

/* ─── Main Component ─────────────────────────────────────────── */
export default function StatsPanel({ tasks, history, allCategories }) {

    /* Summary numbers */
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => !t.completed && t.deadline && t.deadline < new Date().toISOString().split('T')[0]).length;
    const streakDays = useMemo(() => {
        const set = new Set(history.map(h => h.date));
        let streak = 0;
        const d = new Date();
        while (set.has(d.toISOString().split('T')[0])) {
            streak++;
            d.setDate(d.getDate() - 1);
        }
        return streak;
    }, [history]);

    /* 1. Focus Score Line Chart */
    const focusData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const counts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
        history.forEach(h => {
            const d = new Date(h.date);
            counts[days[d.getDay()]] += 1;
        });
        return days.map(d => ({ name: d, focus: counts[d] }));
    }, [history]);

    /* 2. Scatter Chart */
    const scatterData = useMemo(() => tasks.map(t => ({
        x: t.priority === 'Low' ? 1 : t.priority === 'Medium' ? 2 : 3,
        y: t.completed ? 1 : 0,
        name: t.title, priority: t.priority, completed: t.completed
    })), [tasks]);

    /* Scatter point colors by priority */
    const scatterColor = (priority) => {
        if (priority === 'Low') return COLORS.green;
        if (priority === 'Medium') return COLORS.yellow;
        return COLORS.red;
    };

    /* 3. Goal Progress Bars */
    const goalData = useMemo(() => {
        const d = {
            '💼 Work': { done: 0, total: 0, color: COLORS.blue },
            '📚 Learning': { done: 0, total: 0, color: COLORS.purple },
            '🏋️ Fitness': { done: 0, total: 0, color: COLORS.orange },
        };
        tasks.forEach(t => {
            if (['Work', 'Projects', 'Internships'].includes(t.category)) {
                d['💼 Work'].total++; if (t.completed) d['💼 Work'].done++;
            } else if (['Academics', 'DSA / LeetCode', 'Learning'].includes(t.category)) {
                d['📚 Learning'].total++; if (t.completed) d['📚 Learning'].done++;
            } else if (['Fitness', 'Exercise'].includes(t.category)) {
                d['🏋️ Fitness'].total++; if (t.completed) d['🏋️ Fitness'].done++;
            }
        });
        return Object.entries(d).map(([name, val]) => ({
            name,
            progress: val.total > 0 ? Math.round((val.done / val.total) * 100) : 0,
            fill: val.color,
            done: val.done,
            total: val.total
        }));
    }, [tasks]);

    /* 4. Radar Chart */
    const radarData = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const cats = {};
        tasks.forEach(t => {
            if (!cats[t.category]) cats[t.category] = { delayDays: 0, count: 0 };
            if (!t.completed && t.deadline && t.deadline < todayStr) {
                cats[t.category].delayDays += Math.floor((new Date(todayStr) - new Date(t.deadline)) / 86400000);
            }
            cats[t.category].count++;
        });
        return Object.keys(allCategories).map(cat => ({
            subject: cat.split(' /')[0],
            delay: cats[cat] ? cats[cat].delayDays : 0,
            fullMark: 20
        }));
    }, [tasks, allCategories]);

    const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2rem' }}>📊</span>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>Advanced Analytics</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Your personal productivity dashboard</p>
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <SummaryCard emoji="✅" label="Tasks Done" value={doneTasks} color={COLORS.green} subtitle={`out of ${totalTasks} total`} />
                <SummaryCard emoji="📈" label="Completion" value={`${completionPct}%`} color={COLORS.blue} subtitle="overall rate" />
                <SummaryCard emoji="🔥" label="Current Streak" value={`${streakDays}d`} color={COLORS.orange} subtitle="days in a row" />
                <SummaryCard emoji="⚠️" label="Overdue" value={overdue} color={COLORS.red} subtitle="need attention" />
            </div>

            {/* ── Charts Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

                {/* 1. Weekly Productivity */}
                <ChartCard
                    title="📅 Weekly Productivity Pattern"
                    description="Which day of the week are you most focused? Higher = more tasks completed."
                    color={COLORS.blue}
                >
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={focusData}>
                            <defs>
                                <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={COLORS.blue} />
                                    <stop offset="100%" stopColor={COLORS.cyan} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} allowDecimals={false} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} tasks`, 'Focus']} />
                            <Line type="monotone" dataKey="focus" stroke="url(#focusGrad)" strokeWidth={3}
                                dot={{ r: 5, fill: COLORS.cyan, strokeWidth: 2, stroke: '#0f0f1a' }}
                                activeDot={{ r: 7, fill: COLORS.blue }} />
                        </LineChart>
                    </ResponsiveContainer>
                    {/* Day Summary */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {focusData.map(d => (
                            <div key={d.name} style={{
                                flex: 1, textAlign: 'center', background: d.focus > 0 ? `${COLORS.blue}22` : 'rgba(255,255,255,0.04)',
                                borderRadius: '6px', padding: '2px 0', border: `1px solid ${d.focus > 0 ? COLORS.blue + '44' : 'transparent'}`
                            }}>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{d.name}</div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: d.focus > 0 ? COLORS.blue : 'rgba(255,255,255,0.2)' }}>{d.focus}</div>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                {/* 2. Procrastination Radar */}
                <ChartCard
                    title="🕸️ Procrastination Index"
                    description="Bigger area = more overdue days in that category. Smaller is better!"
                    color={COLORS.red}
                >
                    <ResponsiveContainer width="100%" height={240}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <defs>
                                <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={COLORS.red} stopOpacity={0.8} />
                                    <stop offset="100%" stopColor={COLORS.pink} stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                            <PolarGrid stroke="rgba(255,255,255,0.08)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} />
                            <Radar name="Overdue Days" dataKey="delay" stroke={COLORS.red} fill="url(#radarGrad)" fillOpacity={0.6} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} overdue days`, 'Delay']} />
                        </RadarChart>
                    </ResponsiveContainer>
                    <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                        🟢 No overdue = great! &nbsp;🔴 Big radar = procrastinating here
                    </p>
                </ChartCard>

                {/* 3. Task Avoidance Scatter */}
                <ChartCard
                    title="🎯 Task Avoidance Map"
                    description="Bottom-right zone (Hard + Pending) = you're avoiding tough tasks!"
                    color={COLORS.yellow}
                >
                    {/* Quadrant legend */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                        {[
                            { dot: COLORS.green, label: '🟢 Low Priority' },
                            { dot: COLORS.yellow, label: '🟡 Medium Priority' },
                            { dot: COLORS.red, label: '🔴 High Priority' },
                        ].map(l => (
                            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.dot, display: 'inline-block' }} />
                                {l.label}
                            </span>
                        ))}
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis type="number" dataKey="x" name="Priority" ticks={[1, 2, 3]}
                                tickFormatter={(v) => ['Low', 'Med', 'High'][v - 1]}
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} domain={[0, 4]}
                                label={{ value: '← Priority →', position: 'insideBottom', offset: -12, fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                            <YAxis type="number" dataKey="y" name="Status" ticks={[0, 1]}
                                tickFormatter={(v) => v === 1 ? '✅ Done' : '⏳ Pending'}
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} domain={[-0.5, 1.5]} />
                            <ZAxis type="number" range={[80, 80]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div style={{ ...tooltipStyle, padding: '0.5rem 0.8rem' }}>
                                            <div style={{ fontWeight: 700 }}>{d.name}</div>
                                            <div style={{ color: scatterColor(d.priority), fontSize: '11px' }}>Priority: {d.priority}</div>
                                            <div style={{ color: d.completed ? COLORS.green : COLORS.red, fontSize: '11px' }}>{d.completed ? '✅ Completed' : '⏳ Pending'}</div>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                            <Scatter name="Tasks" data={scatterData}>
                                {scatterData.map((entry, index) => (
                                    <Cell key={index} fill={scatterColor(entry.priority)} opacity={0.85} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 4. Goal Progress Bars */}
                <ChartCard
                    title="📈 Life Goals Progress"
                    description="How far along are you in each major life category?"
                    color={COLORS.purple}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '0.5rem' }}>
                        {goalData.map(g => (
                            <div key={g.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{g.name}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: g.fill }}>
                                        {g.done}/{g.total} &nbsp;<span style={{ opacity: 0.7 }}>({g.progress}%)</span>
                                    </span>
                                </div>
                                {/* Custom progress bar */}
                                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${g.progress}%`,
                                        height: '100%',
                                        background: `linear-gradient(90deg, ${g.fill}bb, ${g.fill})`,
                                        borderRadius: '999px',
                                        transition: 'width 0.8s ease',
                                        boxShadow: `0 0 8px ${g.fill}88`,
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>
                                    {g.progress === 100 ? '🎉 All done!' : g.progress >= 60 ? '💪 Great progress!' : g.progress > 0 ? '🚀 Keep going!' : '📌 Not started yet'}
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                {/* 5. Commitment / Streak Grid */}
                <ChartCard
                    title="🔥 Commitment Grid"
                    description="Your daily consistency over the last 14 weeks. Hover a square to see what day it was!"
                    color={COLORS.green}
                    fullWidth
                >
                    <StreakGrid history={history} />
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            🟩 <span style={{ color: COLORS.green }}>Green</span> = task completed that day
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            ⬛ Gray = no activity — take action!
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            Darker green = more tasks done in one day
                        </div>
                    </div>
                </ChartCard>

            </div>
        </div>
    );
}

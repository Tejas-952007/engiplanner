import React, { useState } from 'react';
import { ChevronRight, Activity, BookOpen, Map, User, Rocket, Plus } from 'lucide-react';

export default function Onboarding({ onComplete }) {
    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState({
        name: '',
        year: '2nd Year',
        height: '',
        weight: '',
        subjects: ['', '', ''],
        roadmap: ''
    });

    const handleSubjectChange = (index, value) => {
        const s = [...profile.subjects];
        s[index] = value;
        setProfile({ ...profile, subjects: s });
    };

    const addSubject = () => setProfile({ ...profile, subjects: [...profile.subjects, ''] });

    const nextStep = () => {
        if (step === 1 && !profile.name.trim()) return;
        if (step === 4 && !profile.roadmap.trim()) return;
        if (step < 4) { setStep(step + 1); return; }
        const finalSubs = profile.subjects.filter(s => s.trim() !== '');
        onComplete({ ...profile, subjects: finalSubs.length ? finalSubs : ['General Academics'] });
    };

    const STEPS = [
        { icon: <User size={28} color="#fff" />, color: '#fff' },
        { icon: <Activity size={28} color="#60a5fa" />, color: '#60a5fa' },
        { icon: <BookOpen size={28} color="#4ade80" />, color: '#4ade80' },
        { icon: <Map size={28} color="#c084fc" />, color: '#c084fc' },
    ];

    return (
        <div className="onboarding-wrapper animate-fade-in">
            <div className="glass-panel onboarding-panel">
                {/* Progress bar */}
                <div className="onboarding-progress">
                    <div className="progress-fill"
                        style={{ width: `${(step / 4) * 100}%`, background: STEPS[step - 1].color, transition: 'width 0.4s ease, background 0.4s ease' }} />
                </div>

                {/* Step counter */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} style={{
                            flex: 1, height: '3px', borderRadius: '999px',
                            background: n <= step ? STEPS[step - 1].color : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.4s'
                        }} />
                    ))}
                </div>

                {/* Step 1: Identity */}
                {step === 1 && (
                    <div className="onboarding-step animate-fade-in">
                        <div className="step-icon">{STEPS[0].icon}</div>
                        <h2>Who are you?</h2>
                        <p>Let's set up your personal engineering command center.</p>
                        <div className="form-group mt-2">
                            <label>Your Name</label>
                            <input type="text" placeholder="E.g., Tejas" value={profile.name}
                                onChange={e => setProfile({ ...profile, name: e.target.value })}
                                autoFocus className="input-field" />
                        </div>
                        <div className="form-group mt-2">
                            <label>Engineering Year</label>
                            <select value={profile.year} onChange={e => setProfile({ ...profile, year: e.target.value })} className="input-field">
                                <option value="1st Year">1st Year — Foundation Phase</option>
                                <option value="2nd Year">2nd Year — Core Engineering</option>
                                <option value="3rd Year">3rd Year — Specialization</option>
                                <option value="4th Year">4th Year — Placement Season</option>
                                <option value="Graduate">Graduate / Alumni</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Step 2: Body Hardware */}
                {step === 2 && (
                    <div className="onboarding-step animate-fade-in">
                        <div className="step-icon">{STEPS[1].icon}</div>
                        <h2>Hardware Specs</h2>
                        <p>A good engineer maintains their hardware too. We'll track your BMI and fitness goals.</p>
                        <div style={{ display: 'flex', gap: '1rem' }} className="mt-2">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Height (cm)</label>
                                <input type="number" placeholder="175" value={profile.height}
                                    onChange={e => setProfile({ ...profile, height: e.target.value })} className="input-field" />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Weight (kg)</label>
                                <input type="number" placeholder="70" value={profile.weight}
                                    onChange={e => setProfile({ ...profile, weight: e.target.value })} className="input-field" />
                            </div>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginTop: '1rem', fontStyle: 'italic' }}>
                            You can skip this — height & weight are optional.
                        </p>
                    </div>
                )}

                {/* Step 3: Subjects */}
                {step === 3 && (
                    <div className="onboarding-step animate-fade-in">
                        <div className="step-icon">{STEPS[2].icon}</div>
                        <h2>Loaded Subjects</h2>
                        <p>Which subjects are you enrolled in this semester? We'll track your academic lag per subject.</p>
                        <div className="subjects-list mt-2">
                            {profile.subjects.map((sub, idx) => (
                                <div className="form-group" key={idx}>
                                    <input type="text" placeholder={`Subject ${idx + 1} — E.g., Data Structures`}
                                        value={sub} onChange={e => handleSubjectChange(idx, e.target.value)} className="input-field" />
                                </div>
                            ))}
                            <button type="button" onClick={addSubject} className="btn btn-outline"
                                style={{ width: 'fit-content', gap: '0.4rem', marginTop: '0.3rem' }}>
                                <Plus size={15} /> Add Subject
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Roadmap */}
                {step === 4 && (
                    <div className="onboarding-step animate-fade-in">
                        <div className="step-icon">{STEPS[3].icon}</div>
                        <h2>Master Roadmap</h2>
                        <p>What is your ultimate tech goal? This defines your project tasks and career direction.</p>
                        <div className="form-group mt-2">
                            <label>Your Ambition</label>
                            <input type="text" placeholder="E.g., Full Stack Web Dev, AI/ML Engineer, Cloud DevOps"
                                value={profile.roadmap} onChange={e => setProfile({ ...profile, roadmap: e.target.value })} className="input-field" autoFocus />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                            {['Full Stack Development', 'AI / Machine Learning', 'Cloud & DevOps', 'Competitive Programming', 'Data Science', 'Cybersecurity'].map(r => (
                                <button key={r} type="button" className={`cat-pill ${profile.roadmap === r ? 'active' : ''}`}
                                    style={{ '--cat-color': '#c084fc' }}
                                    onClick={() => setProfile({ ...profile, roadmap: r })}>
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button onClick={nextStep} className="btn btn-primary"
                    style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '0.95rem', justifyContent: 'center', borderRadius: '10px' }}>
                    {step === 4
                        ? <><Rocket size={18} /> Initialize Command Center</>
                        : <><ChevronRight size={18} /> Continue — Step {step} of 4</>
                    }
                </button>

                {step > 1 && (
                    <button onClick={() => setStep(s => s - 1)}
                        style={{ width: '100%', marginTop: '0.6rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.82rem', padding: '0.5rem' }}>
                        ← Back
                    </button>
                )}
            </div>
        </div>
    );
}

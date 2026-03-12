require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const admin = require('firebase-admin');
// No external email package needed — uses Node 18 built-in fetch + Resend REST API

// ─── Firebase Admin Init ──────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Render stores env vars with literal \n — convert them back
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

// ─── Resend REST API (native fetch, no package needed) ─────────────────────
// Resend uses HTTPS so no SMTP port issues on Render free tier
const sendEmail = async (to, subject, html) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EngiPlanner <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  console.log(`✉️ Resend OK → id: ${data.id}`);
  return data;
};


// ─── Helpers ─────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const today = todayStr();
  if (deadline < today) return 'OVERDUE';
  if (deadline === today) return 'Due Today';
  return null; // not urgent
}

// Days until deadline (negative = overdue)
function daysUntil(deadline) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

// ─── Core: Send Deadline Email ────────────────────────────────────────────
async function sendDeadlineEmail(email, userName, tasks) {
  const overdue = tasks.filter(t => getDeadlineStatus(t.deadline) === 'OVERDUE');
  const dueToday = tasks.filter(t => getDeadlineStatus(t.deadline) === 'Due Today');

  if (overdue.length === 0 && dueToday.length === 0) return; // nothing urgent

  const buildRows = (arr, color) =>
    arr
      .map(
        t => `
        <tr>
          <td style="padding:10px 16px; border-bottom:1px solid #1e1e2e; font-size:14px; color:#e6e6ef;">${t.title}</td>
          <td style="padding:10px 16px; border-bottom:1px solid #1e1e2e; font-size:13px; color:#888; white-space:nowrap;">${t.category || '—'}</td>
          <td style="padding:10px 16px; border-bottom:1px solid #1e1e2e; font-size:12px; font-weight:700; color:${color}; white-space:nowrap;">${t.deadline}</td>
        </tr>`
      )
      .join('');

  const overdueSection =
    overdue.length > 0
      ? `<h3 style="color:#ff7b72; margin:24px 0 8px;">⚠️ Overdue (${overdue.length})</h3>
         <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#12121c; border-radius:10px; overflow:hidden;">
           <thead><tr>
             <th style="text-align:left; padding:10px 16px; font-size:12px; color:#555; background:#0d0d1a;">Task</th>
             <th style="text-align:left; padding:10px 16px; font-size:12px; color:#555; background:#0d0d1a;">Category</th>
             <th style="text-align:left; padding:10px 16px; font-size:12px; color:#555; background:#0d0d1a;">Deadline</th>
           </tr></thead>
           <tbody>${buildRows(overdue, '#ff7b72')}</tbody>
         </table>`
      : '';

  const todaySection =
    dueToday.length > 0
      ? `<h3 style="color:#ffa657; margin:24px 0 8px;">📅 Due Today (${dueToday.length})</h3>
         <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#12121c; border-radius:10px; overflow:hidden;">
           <thead><tr>
             <th style="text-align:left; padding:10px 16px; font-size:12px; color:#555; background:#0d0d1a;">Task</th>
             <th style="text-align:left; padding:10px 16px; font-size:12px; color:#555; background:#0d0d1a;">Category</th>
             <th style="text-align:left; padding:10px 16px; font-size:12px; color:#555; background:#0d0d1a;">Deadline</th>
           </tr></thead>
           <tbody>${buildRows(dueToday, '#ffa657')}</tbody>
         </table>`
      : '';

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"></head>
  <body style="margin:0; padding:0; background:#050510; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; background:#0a0a1a; border-radius:24px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); box-shadow:0 30px 60px rgba(0,0,0,0.6);">
      <!-- Header with Gradient & Glow -->
      <div style="background:linear-gradient(135deg,#1a1a3a 0%,#0a0a1a 100%); padding:40px 32px 30px; border-bottom:1px solid rgba(255,255,255,0.05); text-align:center;">
        <div style="display:inline-block; margin-bottom:15px;">
           <div style="width:70px; height:70px; background:linear-gradient(135deg,#6e56cf,#58a6ff); border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:32px; box-shadow:0 0 30px rgba(110,86,207,0.4);">⚡</div>
        </div>
        <h1 style="color:#fff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.5px;">${process.env.APP_NAME} <span style="color:#58a6ff; font-weight:400;">Pulse</span></h1>
        <p style="color:#8b949e; margin:8px 0 0; font-size:13px; text-transform:uppercase; letter-spacing:2px;">Urgent Briefing</p>
      </div>

      <!-- Body -->
      <div style="padding:40px 32px;">
        <h2 style="color:#fff; margin:0 0 12px; font-size:22px;">Hey ${userName}!</h2>
        <p style="color:#8b949e; margin:0 0 32px; line-height:1.7; font-size:15px;">
          Time to shift into high gear. You have <strong>${overdue.length + dueToday.length}</strong> tasks requiring immediate attention.
        </p>

        ${overdueSection}
        <div style="margin:20px 0;"></div>
        ${todaySection}

        <div style="margin-top:40px; padding:32px; background:linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%); border-radius:20px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
          <p style="color:#8b949e; margin:0 0 20px; font-size:14px;">"The best way to predict the future is to create it."</p>
          <a href="https://engiplanner.vercel.app" 
             style="display:inline-block; background:linear-gradient(135deg,#6e56cf,#58a6ff); color:#fff; padding:16px 40px; border-radius:12px; text-decoration:none; font-weight:700; font-size:15px; box-shadow:0 10px 25px rgba(110,86,207,0.3);">
            ACCESS COMMAND CENTER →
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:30px 32px; border-top:1px solid rgba(255,255,255,0.05); text-align:center; background:#080815;">
        <p style="color:#3d3d5c; font-size:11px; margin:0; letter-spacing:0.5px;">
          ENGI-PLANNER V1.0 // CLOUD SYNC ACTIVE<br>
          <span style="opacity:0.5; margin-top:8px; display:block;">To modify alerts, visit System Settings in-app.</span>
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail(
    email,
    `⚡ ACTION REQUIRED: ${dueToday.length + overdue.length} Pending Tasks — ${process.env.APP_NAME}`,
    html
  );

  console.log(`✅ Email sent to ${email} (${overdue.length} overdue, ${dueToday.length} due today)`);
}

// ─── Core: Send Morning Briefing Email ───────────────────────────────────────
async function sendMorningBriefingEmail(email, userName, allTasks) {
  const pending = allTasks.filter(t => !t.completed);
  const overdue = pending.filter(t => t.deadline && daysUntil(t.deadline) < 0);
  const dueToday = pending.filter(t => t.deadline && daysUntil(t.deadline) === 0);
  const upcoming = pending.filter(t => t.deadline && daysUntil(t.deadline) > 0 && daysUntil(t.deadline) <= 3);
  const noDeadline = pending.filter(t => !t.deadline).slice(0, 5); // show max 5 undated

  const total = pending.length;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const buildRows = (arr, badgeColor, badgeText) =>
    arr.map(t => `
      <tr>
        <td style="padding:10px 16px; border-bottom:1px solid #1a1a2e; font-size:14px; color:#e6e6ef;">
          ${t.title}
          ${t.subject ? `<span style="font-size:11px; background:rgba(88,166,255,0.15); color:#58a6ff; padding:1px 7px; border-radius:8px; margin-left:6px;">${t.subject}</span>` : ''}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #1a1a2e; font-size:12px; color:#888; white-space:nowrap;">${t.category || '—'}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #1a1a2e; text-align:center; white-space:nowrap;">
          <span style="font-size:11px; font-weight:700; background:${badgeColor}22; color:${badgeColor}; padding:2px 8px; border-radius:99px;">${badgeText}</span>
        </td>
      </tr>`).join('');

  const section = (title, icon, arr, color, badge) =>
    arr.length === 0 ? '' : `
    <h3 style="color:${color}; margin:24px 0 8px; font-size:15px;">${icon} ${title} (${arr.length})</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; background:#0f0f1a; border-radius:10px; overflow:hidden; margin-bottom:12px;">
      <thead><tr>
        <th style="text-align:left; padding:9px 16px; font-size:11px; color:#555; background:#0a0a14;">Task</th>
        <th style="text-align:left; padding:9px 12px; font-size:11px; color:#555; background:#0a0a14;">Category</th>
        <th style="text-align:center; padding:9px 12px; font-size:11px; color:#555; background:#0a0a14;">Status</th>
      </tr></thead>
      <tbody>${buildRows(arr, color, badge)}</tbody>
    </table>`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"></head>
  <body style="margin:0; padding:0; background:#070710; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:620px; margin:40px auto; background:#0d0d1a; border-radius:24px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); box-shadow:0 30px 70px rgba(0,0,0,0.6);">

      <!-- Extreme Header -->
      <div style="background:linear-gradient(135deg,#12122a 0%,#0d0d1a 100%); padding:45px 32px 35px; border-bottom:1px solid rgba(255,255,255,0.05); position:relative;">
        <div style="display:flex; align-items:center; gap:20px;">
          <div style="width:55px; height:55px; background:linear-gradient(135deg,#6e56cf,#58a6ff); border-radius:15px; display:flex; align-items:center; justify-content:center; font-size:28px; box-shadow:0 0 25px rgba(88,166,255,0.3);">☀️</div>
          <div>
            <div style="font-size:22px; font-weight:900; color:#fff; letter-spacing:-0.4px;">${process.env.APP_NAME}</div>
            <div style="font-size:12px; color:#58a6ff; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-top:3px;">Morning Intelligence Report</div>
          </div>
        </div>
        <div style="position:absolute; right:32px; top:45px; font-size:11px; color:rgba(255,255,255,0.2); font-family:monospace;">${today}</div>
      </div>

      <!-- Greeting + Stats -->
      <div style="padding:40px 32px;">
        <h2 style="color:#fff; margin:0 0 8px; font-size:26px; font-weight:800;">Rise and grind, ${userName}.</h2>
        <p style="color:#8b949e; margin:0 0 35px; line-height:1.7; font-size:15px;">
          Your objectives for the day have been computed. You have
          <strong style="color:#fff;">${total} active tasks</strong> in your pipeline.
        </p>

        <!-- Premium Stats Cards -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:35px;">
          <tr>
            <td style="padding-right:10px; width:50%;">
              <div style="background:rgba(255,123,114,0.06); border:1px solid rgba(255,123,114,0.2); border-radius:16px; padding:20px; text-align:center;">
                <div style="font-size:28px; font-weight:900; color:#ff7b72;">${overdue.length}</div>
                <div style="font-size:11px; color:#ff7b72; text-transform:uppercase; font-weight:700; letter-spacing:1px; margin-top:5px;">Overdue</div>
              </div>
            </td>
            <td style="padding-left:10px; width:50%;">
              <div style="background:rgba(250,166,87,0.06); border:1px solid rgba(250,166,87,0.2); border-radius:16px; padding:20px; text-align:center;">
                <div style="font-size:28px; font-weight:900; color:#ffa657;">${dueToday.length}</div>
                <div style="font-size:11px; color:#ffa657; text-transform:uppercase; font-weight:700; letter-spacing:1px; margin-top:5px;">Due Today</div>
              </div>
            </td>
          </tr>
        </table>

        ${section('Active Objectives', '⚡', [...overdue, ...dueToday], '#58a6ff', 'Priority')}
        ${section('Tactical Backlog', '📌', [...upcoming, ...noDeadline], '#c084fc', 'Stored')}

        <!-- Deep CTA -->
        <div style="margin:45px 0 20px; padding:35px; background:linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%); border-radius:24px; border:1px solid rgba(255,255,255,0.06); text-align:center;">
          <p style="color:#6e7681; margin:0 0 20px; font-size:14px; font-style:italic;">"Execution is independent of inspiration."</p>
          <a href="https://engiplanner.vercel.app"
             style="display:inline-block; background:#fff; color:#0d0d1a; padding:15px 45px;
                    border-radius:12px; text-decoration:none; font-weight:800; font-size:15px; box-shadow:0 15px 35px rgba(0,0,0,0.4);">
            INITIALIZE DASHBOARD →
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:25px 32px; border-top:1px solid rgba(255,255,255,0.05); text-align:center; background:#0a0a14;">
        <p style="color:#2d2d4a; font-size:11px; margin:0; font-family:monospace; letter-spacing:1px;">
          ENGI-PLANNER AUTOMATED DISPATCH // ${new Date().getFullYear()}
        </p>
      </div>
    </div>
  </body>
  </html>`;

  const pendingCount = overdue.length + dueToday.length;
  const subjectEmoji = pendingCount > 0 ? '⚠️' : '☀️';
  await sendEmail(
    email,
    `${subjectEmoji} Morning Briefing — ${dueToday.length} due today, ${overdue.length} overdue · ${process.env.APP_NAME}`,
    html
  );

  console.log(`☀️ Morning briefing sent to ${email}`);
}

// ─── Core: Send Welcome/Greet Email ──────────────────────────────────────────
async function sendWelcomeEmail(email, userName) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"></head>
  <body style="margin:0; padding:0; background:#050510; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; background:#0a0a1a; border-radius:30px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); box-shadow:0 40px 100px rgba(0,0,0,0.7);">
      
      <!-- Hero Header -->
      <div style="background:linear-gradient(135deg,#16163a 0%,#050510 100%); padding:60px 40px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="display:inline-block; background:rgba(88,166,255,0.1); border:1px solid rgba(88,166,255,0.3); border-radius:24px; padding:25px; margin-bottom:25px; box-shadow:0 0 40px rgba(88,166,255,0.15);">
          <div style="font-size:60px; line-height:1;">⚡</div>
        </div>
        <h1 style="color:#fff; margin:0; font-size:36px; font-weight:900; letter-spacing:-1px;">EngiPlanner <span style="color:#58a6ff;">OS</span></h1>
        <p style="color:#8b949e; margin:15px 0 0; font-size:16px; font-weight:500; letter-spacing:1px; text-transform:uppercase;">System Initialized // ${userName}</p>
      </div>

      <!-- Content -->
      <div style="padding:50px 40px;">
        <h2 style="color:#fff; margin-top:0; font-size:24px; font-weight:700;">Zero-Day Setup Complete.</h2>
        <p style="color:#8b949e; margin:0 0 30px; line-height:1.8; font-size:16px;">
          Welcome to the future of academic management. <strong>EngiPlanner</strong> is now your primary command center for tracking missions, optimizing health hardware, and executing your master roadmap.
        </p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.02); border-radius:20px; border:1px solid rgba(255,255,255,0.05); margin:35px 0;">
          <tr>
            <td style="padding:30px;">
              <h3 style="color:#58a6ff; margin-top:0; font-size:18px; font-weight:800;">Protocol Checklist:</h3>
              <div style="margin-top:20px;">
                <div style="margin-bottom:15px; display:flex; gap:10px;">
                  <span style="color:#34d399;">[✓]</span> <span style="color:#e6e6ef;">Neural profile established</span>
                </div>
                <div style="margin-bottom:15px; display:flex; gap:10px;">
                  <span style="color:#c084fc;">[!]</span> <span style="color:#e6e6ef; font-weight:600;">Enable Daily Briefings in Settings</span>
                </div>
                <div style="margin-bottom:0; display:flex; gap:10px;">
                  <span style="color:#58a6ff;">[>]</span> <span style="color:#e6e6ef;">Initialize your first objective</span>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <div style="text-align:center; margin-top:40px;">
          <a href="https://engiplanner.vercel.app" 
             style="display:inline-block; background:linear-gradient(135deg,#fff,#f0f0f0); color:#000; padding:18px 50px; border-radius:15px; text-decoration:none; font-weight:900; font-size:16px; box-shadow:0 15px 30px rgba(255,255,255,0.1);">
            ENTER DASHBOARD
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:35px 40px; background:#070715; border-top:1px solid rgba(255,255,255,0.05); text-align:center;">
        <p style="color:#3d3d5c; font-size:11px; margin:0; font-family:monospace; letter-spacing:2px;">
          SYSTEM.ONBOARDING_STATUS = SUCCESSFUL<br>
          ALL SYSTEMS NOMINAL // DATA ENCRYPTED
        </p>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail(
    email,
    `🚀 Welcome to ${process.env.APP_NAME}, ${userName}!`,
    html
  );
  console.log(`✨ Welcome email sent to ${email}`);
}

// ─── Core: Send Morning Briefings to All Users ───────────────────────────────
async function runMorningBriefings(isAuto = false) {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const currentIstHour = istTime.getUTCHours().toString().padStart(2, '0');

  console.log(`\n[${new Date().toISOString()}] ☀️ ${isAuto ? 'Auto' : 'Manual'} briefing check for IST Hour: ${currentIstHour}:00...`);

  try {
    const snapshot = await db.collection('users').get();
    let sent = 0, skipped = 0;

    for (const userDoc of snapshot.docs) {
      const data = userDoc.data();
      const profile = data?.profile;
      const tasks = data?.tasks || [];

      if (!profile?.emailReminders) { skipped++; continue; }
      if (!profile?.email) { skipped++; continue; }

      // Personalized timing check:
      // If isAuto is true, only send if it's the user's preferred hour
      const userPrefHour = profile.reminderHour || '08';
      if (isAuto && userPrefHour !== currentIstHour) {
        continue;
      }

      const pending = tasks.filter(t => !t.completed);
      if (pending.length === 0) { skipped++; continue; }

      try {
        await sendMorningBriefingEmail(profile.email, profile.name || 'Student', tasks);
        sent++;
      } catch (err) {
        console.error(`❌ Failed to send briefing to ${profile.email}:`, err.message);
      }
    }

    console.log(`✅ ${isAuto ? 'Auto' : 'Manual'} briefings done. Sent: ${sent}, Skipped: ${skipped}`);
  } catch (err) {
    console.error('❌ Error fetching users:', err.message);
  }
}

// ─── Core: Check All Users & Send Emails ─────────────────────────────────
async function runDailyReminders() {
  console.log(`\n[${new Date().toISOString()}] 🚀 Running daily email reminders...`);

  try {
    const snapshot = await db.collection('users').get();
    let sent = 0, skipped = 0;

    for (const userDoc of snapshot.docs) {
      const data = userDoc.data();
      const profile = data?.profile;
      const tasks = data?.tasks || [];

      // Skip if user hasn't enabled email reminders or no email
      if (!profile?.emailReminders) { skipped++; continue; }
      if (!profile?.email) { skipped++; continue; }

      // Only look at pending tasks with a deadline
      const pendingWithDeadline = tasks.filter(
        t => !t.completed && t.deadline && getDeadlineStatus(t.deadline) !== null
      );

      if (pendingWithDeadline.length === 0) { skipped++; continue; }

      try {
        await sendDeadlineEmail(profile.email, profile.name || 'Student', pendingWithDeadline);
        sent++;
      } catch (err) {
        console.error(`❌ Failed to send email to ${profile.email}:`, err.message);
      }
    }

    console.log(`✅ Done. Sent: ${sent}, Skipped: ${skipped}`);
  } catch (err) {
    console.error('❌ Error fetching users from Firestore:', err.message);
  }
}

// ─── Express App (for Render health-check) ───────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: `${process.env.APP_NAME} Email Reminder Service`, time: new Date().toISOString() });
});

// ─── Health check endpoint (cron-job.org pings this to keep server alive) ────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime(), time: new Date().toISOString() });
});

// Manual trigger for deadline reminder
app.post('/trigger', async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.TRIGGER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ message: 'Deadline reminder job started' });
  runDailyReminders();
});

// Manual trigger for morning briefing (for testing)
app.post('/trigger-briefing', async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.TRIGGER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ message: 'Morning briefing job started' });
  runMorningBriefings();
});

// ─── User self-triggered reminder (secure via Firebase ID token) ─────────────
// Frontend calls this with the logged-in user's ID token — no shared secret needed
app.post('/send-my-reminder', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  let uid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const data = userDoc.data();
    const profile = data?.profile || {};
    const tasks = data?.tasks || [];

    if (!profile.email) return res.status(400).json({ error: 'No email on profile' });

    // Send and wait so we can report failure to the UI
    try {
      await sendMorningBriefingEmail(profile.email, profile.name || 'Student', tasks);
      console.log(`📧 Self-triggered briefing sent to ${profile.email}`);
      res.json({ message: 'Sending your reminder now! Check your inbox in a few seconds.' });
    } catch (e) {
      console.error('Self-trigger email error:', e.message);
      res.status(500).json({ error: 'Failed to send email. If you are in test mode, you can only send to the authorized email.' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Welcome Email trigger ───────────────────────────────────────────────────
app.post('/send-welcome', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const data = userDoc.data();
    const profile = data?.profile || {};

    if (!profile.email) return res.status(400).json({ error: 'No email found' });

    await sendWelcomeEmail(profile.email, profile.name || 'Engineer');
    res.json({ success: true, message: 'Welcome email sent!' });
  } catch (e) {
    console.error('Welcome email error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🌐 EngiPlanner Email Service running on port ${PORT}`);

  // ── PRECISE CRON: Run every hour to check user preferences ──────────
  // This replaces the fixed morning briefing cron
  cron.schedule('0 * * * *', () => {
    runMorningBriefings(true); // pass true to indicate auto-check
  }, { timezone: 'UTC' });
  console.log(`☀️  Personalized Briefing Engine: Enabled (Hourly check)`);

  // ── CRON 2: Deadline Reminder — Still runs daily for everyone ─────────────
  const schedule = process.env.CRON_SCHEDULE || '30 1 * * *'; // 7:00 AM IST
  cron.schedule(schedule, () => {
    runDailyReminders();
  }, { timezone: 'UTC' });
  console.log(`⏰  Global Deadline reminder CRON: "${schedule}" UTC`);
});

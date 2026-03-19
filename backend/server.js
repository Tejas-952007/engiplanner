require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

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

// ─── Nodemailer Setup ─────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
  },
});

transporter.verify((error, success) => {
  if (error) console.error('❌ Nodemailer sync error:', error.message);
  else console.log('✅ Nodemailer Ready: Using', process.env.EMAIL_USER);
});

async function sendEmail(to, subject, html) {
  const mailOptions = {
    from: `"EngiPlanner" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email Sent: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Mailer Error:`, err.message);
    throw err;
  }
}

// ─── Logging System ────────────────────────────────────────────────────────
async function logCronActivity(type, message, status = 'info') {
  try {
    await db.collection('system_logs').add({
      type,
      message,
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      timeStr: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
  } catch (e) {
    console.error('Log sync failed:', e.message);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const todayStr = () => {
  const d = new Date();
  const ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split('T')[0];
};

function getDeadlineStatus(deadline) {
  if (!deadline) return null;
  const today = todayStr();
  if (deadline < today) return 'OVERDUE';
  if (deadline === today) return 'Due Today';
  return null;
}

function daysUntil(deadline) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

// ─── Core: Email Content Generators ───────────────────────────────────────
async function sendDeadlineEmail(email, userName, tasks) {
  const overdue = tasks.filter(t => getDeadlineStatus(t.deadline) === 'OVERDUE');
  const dueToday = tasks.filter(t => getDeadlineStatus(t.deadline) === 'Due Today');

  if (overdue.length === 0 && dueToday.length === 0) return;

  const buildRows = (arr, color) =>
    arr.map(t => `
        <tr>
          <td style="padding:10px 16px; border-bottom:1px solid #1e1e2e; font-size:14px; color:#e6e6ef;">${t.title}</td>
          <td style="padding:10px 16px; border-bottom:1px solid #1e1e2e; font-size:13px; color:#888; white-space:nowrap;">${t.category || '—'}</td>
          <td style="padding:10px 16px; border-bottom:1px solid #1e1e2e; font-size:12px; font-weight:700; color:${color}; white-space:nowrap;">${t.deadline}</td>
        </tr>`).join('');

  const overdueSection = overdue.length > 0 ? `
    <h3 style="color:#ff7b72; margin:24px 0 8px;">⚠️ Overdue (${overdue.length})</h3>
    <table width="100%" style="border-collapse:collapse; background:#12121c; border-radius:10px; overflow:hidden;">
      <thead><tr style="background:#0d0d1a;">
        <th style="padding:10px 16px; font-size:11px; color:#555; text-align:left;">Task</th>
        <th style="padding:10px 16px; font-size:11px; color:#555; text-align:left;">Category</th>
        <th style="padding:10px 16px; font-size:11px; color:#555; text-align:left;">Deadline</th>
      </tr></thead>
      <tbody>${buildRows(overdue, '#ff7b72')}</tbody>
    </table>` : '';

  const todaySection = dueToday.length > 0 ? `
    <h3 style="color:#ffa657; margin:24px 0 8px;">📅 Due Today (${dueToday.length})</h3>
    <table width="100%" style="border-collapse:collapse; background:#12121c; border-radius:10px; overflow:hidden;">
      <thead><tr style="background:#0d0d1a;">
        <th style="padding:10px 16px; font-size:11px; color:#555; text-align:left;">Task</th>
        <th style="padding:10px 16px; font-size:11px; color:#555; text-align:left;">Category</th>
        <th style="padding:10px 16px; font-size:11px; color:#555; text-align:left;">Deadline</th>
      </tr></thead>
      <tbody>${buildRows(dueToday, '#ffa657')}</tbody>
    </table>` : '';

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0; padding:40px; background:#050510; font-family:sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:#0a0a1a; border-radius:24px; padding:40px; border:1px solid rgba(255,255,255,0.08);">
      <h1 style="color:#58a6ff; margin:0 0 20px;">⚡ Urgent Briefing</h1>
      <h2 style="color:#fff;">Hey ${userName}!</h2>
      <p style="color:#8b949e; font-size:15px; line-height:1.6;">You have <strong style="color:#fff;">${overdue.length + dueToday.length}</strong> tasks requiring immediate attention.</p>
      ${overdueSection} ${todaySection}
      <div style="margin-top:40px; text-align:center;">
        <a href="https://engiplanner.vercel.app" style="background:#6e56cf; color:#fff; padding:15px 35px; border-radius:12px; text-decoration:none; font-weight:700;">INITIALIZE DASHBOARD →</a>
      </div>
    </div>
  </body>
  </html>`;

  await sendEmail(email, `⚡ ACTION REQUIRED: ${dueToday.length + overdue.length} Tasks — ${process.env.APP_NAME}`, html);
}

// ─── UPDATED: Morning Briefing with Remaining vs Completed Stats ───────────
async function sendMorningBriefingEmail(email, userName, allTasks) {
  const total = allTasks.length;
  const completed = allTasks.filter(t => t.completed);
  const pending = allTasks.filter(t => !t.completed);
  const completedCount = completed.length;
  const pendingCount = pending.length;
  const completionPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const overdue = pending.filter(t => t.deadline && daysUntil(t.deadline) < 0);
  const dueToday = pending.filter(t => t.deadline && daysUntil(t.deadline) === 0);
  const upcoming = pending.filter(t => t.deadline && daysUntil(t.deadline) > 0 && daysUntil(t.deadline) <= 3);

  // Build upcoming rows (max 5)
  const buildUpcomingRows = (arr) =>
    arr.slice(0, 5).map(t => `
      <tr>
        <td style="padding:9px 14px; border-bottom:1px solid #1a1a2e; font-size:13px; color:#e6e6ef;">${t.title}</td>
        <td style="padding:9px 14px; border-bottom:1px solid #1a1a2e; font-size:12px; color:#666; white-space:nowrap;">${t.category || '—'}</td>
        <td style="padding:9px 14px; border-bottom:1px solid #1a1a2e; font-size:12px; color:#79c0ff; white-space:nowrap;">+${daysUntil(t.deadline)}d</td>
      </tr>`).join('');

  const upcomingSection = upcoming.length > 0 ? `
    <h3 style="color:#79c0ff; margin:24px 0 8px; font-size:14px;">📌 Upcoming in 3 Days (${upcoming.length})</h3>
    <table width="100%" style="border-collapse:collapse; background:#0d0d1c; border-radius:10px; overflow:hidden;">
      <thead><tr style="background:#0a0a16;">
        <th style="padding:9px 14px; font-size:10px; color:#444; text-align:left; text-transform:uppercase;">Task</th>
        <th style="padding:9px 14px; font-size:10px; color:#444; text-align:left; text-transform:uppercase;">Category</th>
        <th style="padding:9px 14px; font-size:10px; color:#444; text-align:left; text-transform:uppercase;">Due In</th>
      </tr></thead>
      <tbody>${buildUpcomingRows(upcoming)}</tbody>
    </table>` : '';

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0; padding:40px 20px; background:#070710; font-family:sans-serif; color:#e6e6ef;">
    <div style="max-width:600px; margin:0 auto; background:#0d0d1a; border-radius:24px; padding:40px; border:1px solid rgba(255,255,255,0.08);">
      
      <!-- Header -->
      <h1 style="color:#fff; margin:0; font-size:26px;">☀️ Morning Briefing</h1>
      <p style="color:#58a6ff; font-weight:700; text-transform:uppercase; font-size:11px; margin:6px 0 28px; letter-spacing:1px;">Daily Mission Report · ${userName}</p>

      <!-- Task Stats: 3 cards -->
      <div style="display:flex; gap:12px; margin-bottom:24px;">
        <div style="flex:1; background:#12121f; border-radius:14px; padding:18px 14px; text-align:center; border:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:30px; font-weight:800; color:#fff;">${pendingCount}</div>
          <div style="font-size:11px; color:#666; margin-top:4px; text-transform:uppercase; letter-spacing:0.5px;">Remaining</div>
        </div>
        <div style="flex:1; background:#12121f; border-radius:14px; padding:18px 14px; text-align:center; border:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:30px; font-weight:800; color:#3fb950;">${completedCount}</div>
          <div style="font-size:11px; color:#666; margin-top:4px; text-transform:uppercase; letter-spacing:0.5px;">Completed</div>
        </div>
        <div style="flex:1; background:#12121f; border-radius:14px; padding:18px 14px; text-align:center; border:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:30px; font-weight:800; color:#e3b341;">${total}</div>
          <div style="font-size:11px; color:#666; margin-top:4px; text-transform:uppercase; letter-spacing:0.5px;">Total Tasks</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div style="margin-bottom:28px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span style="font-size:12px; color:#8b949e;">Overall Progress</span>
          <span style="font-size:12px; font-weight:700; color:#3fb950;">${completionPct}% Done</span>
        </div>
        <div style="background:#1a1a2e; border-radius:999px; height:8px; overflow:hidden;">
          <div style="width:${completionPct}%; background:linear-gradient(90deg, #3fb950, #58a6ff); height:100%; border-radius:999px;"></div>
        </div>
      </div>

      <!-- Status Pills -->
      <div style="background:rgba(255,255,255,0.03); border-radius:14px; padding:16px 20px; margin-bottom:24px;">
        <span style="font-size:13px; margin-right:16px;">🔴 <strong style="color:#ff7b72;">${overdue.length}</strong> <span style="color:#666;">Overdue</span></span>
        <span style="font-size:13px; margin-right:16px;">🟠 <strong style="color:#ffa657;">${dueToday.length}</strong> <span style="color:#666;">Due Today</span></span>
        <span style="font-size:13px;">🔵 <strong style="color:#79c0ff;">${upcoming.length}</strong> <span style="color:#666;">Due in 3 Days</span></span>
      </div>

      ${upcomingSection}

      <p style="color:#555; font-size:13px; line-height:1.7; margin-top:24px; font-style:italic;">"Execution is independent of inspiration." Let's get to work.</p>

      <!-- CTA -->
      <div style="margin-top:32px; text-align:center;">
        <a href="https://engiplanner.vercel.app" style="background:#fff; color:#0d0d1a; padding:15px 40px; border-radius:12px; text-decoration:none; font-weight:800; font-size:14px; letter-spacing:0.5px;">OPEN COMMAND CENTER →</a>
      </div>
    </div>
  </body>
  </html>`;

  // Updated subject line: shows remaining + completion ratio
  await sendEmail(email, `☀️ ${dueToday.length} due today · ${completedCount}/${total} done — ${process.env.APP_NAME}`, html);
}

async function sendWelcomeEmail(email, userName) {
  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0; padding:40px; background:#050510; font-family:sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:#0a0a1a; border-radius:30px; padding:50px; text-align:center; border:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:50px; margin-bottom:20px;">🚀</div>
      <h1 style="color:#fff; font-size:32px; margin:0;">Welcome, ${userName}!</h1>
      <p style="color:#8b949e; font-size:16px; margin:20px 0 40px;">System Initialized. Your engineering command center is ready.</p>
      <a href="https://engiplanner.vercel.app" style="background:#fff; color:#000; padding:18px 45px; border-radius:15px; text-decoration:none; font-weight:900;">GO TO DASHBOARD</a>
    </div>
  </body>
  </html>`;

  await sendEmail(email, `🚀 Welcome to ${process.env.APP_NAME}, ${userName}!`, html);
}

// ─── Core: Engine logic ───────────────────────────────────────────────────
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

      if (!profile?.emailReminders || !profile?.email) { skipped++; continue; }

      const userPrefHour = profile.reminderHour || '08';
      if (isAuto && userPrefHour !== currentIstHour) {
        continue;
      }

      const lastSentDate = data.systemControls?.lastBriefingDate;
      const today = todayStr();
      if (isAuto && lastSentDate === today) {
        skipped++;
        continue;
      }

      const pending = tasks.filter(t => !t.completed);
      if (pending.length === 0) { skipped++; continue; }

      try {
        await sendMorningBriefingEmail(profile.email, profile.name || 'Student', tasks);
        await userDoc.ref.set({ systemControls: { lastBriefingDate: today } }, { merge: true });
        sent++;
      } catch (err) {
        console.error(`❌ Briefing Error (${profile.email}):`, err.message);
      }
    }

    const logMsg = `Briefings: Sent ${sent}, Skipped ${skipped} (IST Hour ${currentIstHour})`;
    console.log(`✅ ${logMsg}`);
    if (sent > 0 || !isAuto) logCronActivity('Briefing', logMsg, 'success');
  } catch (err) {
    console.error('❌ Firestore Error:', err.message);
    logCronActivity('Error', err.message, 'error');
  }
}

async function runDailyReminders() {
  console.log(`\n[${new Date().toISOString()}] 🚀 Running daily deadline reminders...`);
  try {
    const snapshot = await db.collection('users').get();
    let sent = 0;

    for (const userDoc of snapshot.docs) {
      const data = userDoc.data();
      const profile = data?.profile;
      const tasks = data?.tasks || [];

      if (!profile?.emailReminders || !profile?.email) continue;

      const pendingWithDeadline = tasks.filter(
        t => !t.completed && t.deadline && getDeadlineStatus(t.deadline) !== null
      );

      if (pendingWithDeadline.length === 0) continue;

      try {
        await sendDeadlineEmail(profile.email, profile.name || 'Student', pendingWithDeadline);
        sent++;
      } catch (err) {
        console.error(`❌ Deadline Email Error (${profile.email}):`, err.message);
      }
    }
    logCronActivity('Reminder', `Sent ${sent} deadline reminders`, 'success');
  } catch (err) {
    console.error('❌ Firestore Error:', err.message);
  }
}

// ─── Express App ────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'active', app: process.env.APP_NAME, time: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

app.get('/trigger-briefing', async (req, res) => {
  const { secret } = req.query;
  if (secret !== process.env.TRIGGER_SECRET) return res.status(401).send('Unauthorized');
  res.send('Manual morning briefing check initialized.');
  runMorningBriefings(true);
});

app.post('/trigger-briefing', async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.TRIGGER_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ message: 'Forced briefing job started' });
  runMorningBriefings(false);
});

app.post('/send-my-reminder', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const data = userDoc.data();
    await sendMorningBriefingEmail(data.profile.email, data.profile.name || 'Student', data.tasks || []);
    res.json({ message: 'Email sent successfully!' });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token or send failed' });
  }
});

app.post('/send-welcome', async (req, res) => {
  const { idToken } = req.body;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const data = userDoc.data();
    await sendWelcomeEmail(data.profile.email, data.profile.name || 'User');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🌐 EngiPlanner Backend running on port ${PORT}`);

  cron.schedule('0 * * * *', () => {
    runMorningBriefings(true);
  }, { timezone: 'UTC' });

  const deadlineSched = process.env.CRON_SCHEDULE || '30 1 * * *';
  cron.schedule(deadlineSched, () => {
    runDailyReminders();
  }, { timezone: 'UTC' });
});
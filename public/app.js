// ─────────────────────────────────────────────
//  ReadSmart — app.js
//  Supabase client + all UI logic
// ─────────────────────────────────────────────

// Supabase config is fetched from the Netlify function — keys never hardcoded in client
let db;

async function initSupabase() {
  const res = await fetch('/.netlify/functions/config');
  const cfg = await res.json();
  db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  });
}

// ─── State ────────────────────────────────────
let currentUser = null;
let currentLearner = null;
let learners = [];

// ─── Stage metadata ───────────────────────────
const STAGES = [
  { num: 1, name: 'Phonological foundation', ages: 'Ages 5–6', cls: 's1', color: '#1D9E75' },
  { num: 2, name: 'Decoding and phonics',    ages: 'Ages 6–7', cls: 's2', color: '#534AB7' },
  { num: 3, name: 'Word recognition',         ages: 'Ages 7–8', cls: 's3', color: '#993C1D' },
  { num: 4, name: 'Reading fluency',           ages: 'Ages 8–10', cls: 's4', color: '#185FA5' },
  { num: 5, name: 'Comprehension',             ages: 'Ages 9–12', cls: 's5', color: '#3B6D11' },
  { num: 6, name: 'Exceptional reader',        ages: 'Ages 12+',  cls: 's6', color: '#854F0B' },
];

const SESSION_TYPE_LABELS = {
  teaching: 'Teaching', review: 'Review', assessment: 'Assessment',
  gate: 'Gate', flag: 'OT flag'
};
const RATING_LABELS = {
  great: 'Great session', good: 'Good progress', mixed: 'Mixed', difficult: 'Difficult'
};
const FLAG_CAT_LABELS = {
  phonological_blend: 'Phonological blending',
  ran: 'Slow RAN', nonsense_word: 'Nonsense word failure',
  reversal: 'Letter reversals', tracking: 'Visual tracking',
  working_memory: 'Working memory', avoidance: 'Reading avoidance',
  family_history: 'Family history', fine_motor: 'Fine motor', other: 'Other'
};

// ─── Init ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await initSupabase();

  // Handle password reset token in URL hash
  const hash = window.location.hash;
  if (hash.includes('type=recovery')) {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('form-signin').style.display = 'none';
    document.getElementById('form-newpass').style.display = 'block';
    // Exchange the token
    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');
    if (accessToken) {
      await db.auth.setSession({ access_token: accessToken, refresh_token: params.get('refresh_token') || '' });
    }
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (session) {
    currentUser = session.user;
    showApp();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
  }

  // Set today's date on date inputs
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('sess-date').value = today;
});

// ─── Auth ─────────────────────────────────────
async function login() {
  const email = document.getElementById('auth-email').value.trim();
  const pw = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';

  if (!email || !pw) { showAuthError('Please enter your email and password.'); return; }

  const { data, error } = await db.auth.signInWithPassword({ email, password: pw });
  if (error) { showAuthError(error.message); return; }

  currentUser = data.user;
  showApp();
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg; el.style.display = 'block';
}

async function logout() {
  await db.auth.signOut();
  currentUser = null; currentLearner = null; learners = [];
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('auth-password').value = '';
}

// ─── Forgot password ─────────────────────────
function showForgot() {
  document.getElementById('form-signin').style.display = 'none';
  document.getElementById('form-forgot').style.display = 'block';
  document.getElementById('auth-error').style.display = 'none';
}
function showSignin() {
  document.getElementById('form-forgot').style.display = 'none';
  document.getElementById('form-newpass').style.display = 'none';
  document.getElementById('form-signin').style.display = 'block';
}

async function sendReset() {
  const email = document.getElementById('reset-email').value.trim();
  if (!email) { showAuthError('Please enter your email address.'); return; }
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://readsmart.metanoia-learn.com',
  });
  if (error) { showAuthError(error.message); return; }
  const s = document.getElementById('auth-success');
  s.textContent = 'Reset link sent to ' + email + '. Check your inbox.';
  s.style.display = 'block';
  document.getElementById('form-forgot').style.display = 'none';
}

async function updatePassword() {
  const pw = document.getElementById('new-password').value;
  if (!pw || pw.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  const { error } = await db.auth.updateUser({ password: pw });
  if (error) { showAuthError(error.message); return; }
  const s = document.getElementById('auth-success');
  s.textContent = 'Password updated! Signing you in...';
  s.style.display = 'block';
  document.getElementById('form-newpass').style.display = 'none';
  setTimeout(() => showApp(), 1500);
}

// ─── App shell ────────────────────────────────
async function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('topbar-user').textContent = currentUser.email;
  document.getElementById('settings-email').textContent = currentUser.email;
  document.getElementById('dash-sub').textContent = 'Welcome back, ' + (currentUser.email.split('@')[0]);
  await loadLearners();
  renderDashboard();
}

// ─── Navigation ───────────────────────────────
function navTo(pageId, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + pageId)?.classList.add('active');
  if (btn) btn.classList.add('active');

  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'learners') renderLearnerGrid();
  if (pageId === 'activities') renderActivityLibrary();
}

// ─── Learner data ─────────────────────────────
async function loadLearners() {
  const { data, error } = await db
    .from('rs_learner_profiles')
    .select('*, rs_ot_flags(id, flag_type, actioned), rs_sessions(id, session_date)')
    .eq('tutor_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (!error && data) learners = data;
}

async function addLearner() {
  const name = document.getElementById('new-name').value.trim();
  const dob = document.getElementById('new-dob').value;
  const stage = parseInt(document.getElementById('new-stage').value);
  const lang = document.getElementById('new-lang').value.trim();
  const eal = document.getElementById('new-eal').value === 'true';
  const notes = document.getElementById('new-notes').value.trim();

  if (!name) { toast('Please enter a learner name.', 'error'); return; }

  const { data, error } = await db.from('rs_learner_profiles').insert([{
    tutor_id: currentUser.id,
    full_name: name,
    date_of_birth: dob || null,
    current_stage: stage,
    language_primary: lang || 'English',
    eal_flag: eal,
    programme_notes: notes || null,
    entry_date: new Date().toISOString().split('T')[0],
  }]).select().single();

  if (error) { toast('Error adding learner: ' + error.message, 'error'); return; }

  // Clear form
  ['new-name','new-lang','new-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('new-dob').value = '';
  document.getElementById('new-stage').value = '1';
  document.getElementById('new-eal').value = 'false';

  closeModal('modal-add-learner');
  await loadLearners();
  renderLearnerGrid();
  renderDashboard();
  toast(name + ' added successfully.', 'success');
}

// ─── Dashboard ────────────────────────────────
function renderDashboard() {
  document.getElementById('stat-learners').textContent = learners.length;

  // Sessions this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSessions = learners.reduce((acc, l) => {
    return acc + (l.rs_sessions || []).filter(s => new Date(s.session_date) >= weekAgo).length;
  }, 0);
  document.getElementById('stat-sessions').textContent = weekSessions;

  // Unactioned flags
  const flags = learners.reduce((acc, l) => {
    return acc + (l.rs_ot_flags || []).filter(f => !f.actioned).length;
  }, 0);
  document.getElementById('stat-flags').textContent = flags;
  document.getElementById('stat-gates').textContent = '—';

  // Recent learners (last 5)
  const recentEl = document.getElementById('recent-learners-list');
  if (!learners.length) {
    recentEl.innerHTML = '<div class="empty-state" style="padding:1.5rem"><div class="empty-sub">No learners yet — add your first learner to get started.</div></div>';
  } else {
    recentEl.innerHTML = learners.slice(0, 5).map(l => `
      <div style="display:flex;align-items:center;gap:10px;padding:.6rem 0;border-bottom:1px solid var(--gray-100);cursor:pointer" onclick="openProfile('${l.id}')">
        <div class="avatar" style="width:34px;height:34px;font-size:13px">${initials(l.full_name)}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500;color:var(--gray-900)">${l.full_name}</div>
          <div style="font-size:12px;color:var(--gray-500)">${STAGES[l.current_stage-1]?.name || ''}</div>
        </div>
        <span class="stage-badge s${l.current_stage}">Stage ${l.current_stage}</span>
      </div>
    `).join('');
  }

  // Dashboard flags
  const urgentFlags = [];
  learners.forEach(l => {
    (l.rs_ot_flags || []).filter(f => !f.actioned && f.flag_type === 'urgent').forEach(f => {
      urgentFlags.push({ learner: l.full_name, learnerId: l.id, flag: f });
    });
  });
  const flagsEl = document.getElementById('dash-flags-list');
  if (!urgentFlags.length) {
    flagsEl.innerHTML = '<div class="empty-state" style="padding:1rem"><div class="empty-sub">No urgent unactioned flags.</div></div>';
  } else {
    flagsEl.innerHTML = urgentFlags.slice(0, 5).map(item => `
      <div class="flag-card flag-urgent" style="cursor:pointer" onclick="openProfile('${item.learnerId}')">
        <div class="flag-title">${item.learner} — Urgent OT flag</div>
        <div class="flag-desc">Tap to view learner profile and action this flag.</div>
      </div>
    `).join('');
  }
}

// ─── Learner grid ─────────────────────────────
function renderLearnerGrid() {
  const grid = document.getElementById('learner-grid');
  if (!learners.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:3rem">
      <div class="empty-icon">◎</div>
      <div class="empty-title">No learners yet</div>
      <div class="empty-sub">Add your first learner to get started</div>
    </div>`;
    return;
  }

  grid.innerHTML = learners.map(l => {
    const unactioned = (l.rs_ot_flags || []).filter(f => !f.actioned);
    const urgentFlag = unactioned.some(f => f.flag_type === 'urgent');
    const modFlag = unactioned.some(f => f.flag_type === 'moderate');
    const flagColor = urgentFlag ? 'flag-red' : modFlag ? 'flag-amber' : 'flag-green';
    const flagLabel = urgentFlag ? 'Urgent flag' : modFlag ? 'Moderate flag' : unactioned.length ? 'Monitor flag' : 'No flags';
    const age = l.date_of_birth ? calcAge(l.date_of_birth) : null;

    return `<div class="learner-card" onclick="openProfile('${l.id}')">
      <div class="learner-header">
        <div class="avatar">${initials(l.full_name)}</div>
        <div>
          <div class="learner-name">${l.full_name}</div>
          <div class="learner-meta">${age ? 'Age ' + age + ' · ' : ''}${STAGES[l.current_stage-1]?.ages || ''}</div>
        </div>
      </div>
      <div class="learner-footer">
        <span class="stage-badge s${l.current_stage}">Stage ${l.current_stage} — ${STAGES[l.current_stage-1]?.name}</span>
        <div style="display:flex;align-items:center;gap:5px">
          <div class="flag-dot ${flagColor}"></div>
          <span style="font-size:11px;color:var(--gray-500)">${flagLabel}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── Learner profile ──────────────────────────
async function openProfile(learnerId) {
  const learner = learners.find(l => l.id === learnerId);
  if (!learner) return;
  currentLearner = learner;

  // Load full data for this learner
  const { data: fullData } = await db
    .from('rs_learner_profiles')
    .select('*, rs_sessions(*), rs_ot_flags(*)')
    .eq('id', learnerId)
    .single();

  if (fullData) currentLearner = fullData;

  // Render header
  document.getElementById('profile-avatar').textContent = initials(currentLearner.full_name);
  document.getElementById('profile-name').textContent = currentLearner.full_name;
  const age = currentLearner.date_of_birth ? 'Age ' + calcAge(currentLearner.date_of_birth) + ' · ' : '';
  document.getElementById('profile-meta').textContent = age + (currentLearner.eal_flag ? 'EAL learner · ' : '') + (currentLearner.language_primary || 'English');

  // Render tabs
  renderStageProgress();
  renderSessionLog();
  renderOTFlags();
  renderProfileInfo();

  // Show page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-profile').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  // Reset tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('.tab-btn').classList.add('active');
  document.getElementById('tab-progress').classList.add('active');
}

function renderStageProgress() {
  const current = currentLearner.current_stage;
  const el = document.getElementById('stage-progress-list');
  el.innerHTML = STAGES.map(s => {
    const isActive = s.num === current;
    const isDone = s.num < current;
    const pct = isDone ? 100 : isActive ? 40 : 0;
    return `<div class="stage-row ${isActive ? 'current' : ''} ${isDone ? 'complete' : ''}">
      <div class="stage-circle" style="background:${isDone || isActive ? s.color : 'var(--gray-100)'};color:${isDone||isActive?'#fff':'var(--gray-500)'}">
        ${isDone ? '✓' : s.num}
      </div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <div>
            <span style="font-size:14px;font-weight:${isActive?'600':'400'};color:${isActive?'var(--teal-dark)':'var(--gray-700)'}">${s.name}</span>
            <span style="font-size:12px;color:var(--gray-500);margin-left:8px">${s.ages}</span>
          </div>
          ${isActive ? '<span style="font-size:11px;background:var(--teal-light);color:var(--teal-dark);padding:2px 8px;border-radius:10px;font-weight:500">Current stage</span>' : ''}
          ${isDone ? '<span style="font-size:11px;color:var(--gray-500)">Complete</span>' : ''}
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${s.color}"></div></div>
      </div>
    </div>`;
  }).join('');
}

function renderSessionLog() {
  const sessions = (currentLearner.rs_sessions || []).sort((a,b) => new Date(b.session_date) - new Date(a.session_date));
  const el = document.getElementById('session-log-list');
  if (!sessions.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-title">No sessions logged yet</div><div class="empty-sub">Log your first session to start building the record.</div></div>';
    return;
  }
  el.innerHTML = sessions.map(s => {
    const ratingTag = `tag-${s.rating}`;
    return `<div class="session-entry">
      <div class="session-date">${formatDate(s.session_date)} · ${s.duration_minutes || '—'} min</div>
      <div class="session-note">${s.notes || '(No notes recorded)'}</div>
      <div class="session-tags">
        <span class="session-tag">${SESSION_TYPE_LABELS[s.session_type] || s.session_type}</span>
        <span class="session-tag ${ratingTag}">${RATING_LABELS[s.rating] || s.rating}</span>
        ${s.session_type === 'flag' ? '<span class="session-tag tag-flag">OT concern</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

function renderOTFlags() {
  const flags = (currentLearner.rs_ot_flags || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  const el = document.getElementById('ot-flags-list');
  if (!flags.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-title">No OT flags</div><div class="empty-sub">No flags have been raised for this learner.</div></div>';
    return;
  }
  el.innerHTML = flags.map(f => `
    <div class="flag-card flag-${f.flag_type}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.25rem">
        <div class="flag-title">${FLAG_CAT_LABELS[f.flag_category] || f.flag_category}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">${f.flag_type}</span>
          ${!f.actioned ? `<button class="btn btn-sm btn-outline" onclick="actionFlag('${f.id}')" style="font-size:11px;padding:2px 8px">Mark actioned</button>` : '<span style="font-size:11px;color:var(--gray-500)">Actioned</span>'}
        </div>
      </div>
      <div class="flag-desc">${f.description}</div>
      <div style="font-size:11px;color:var(--gray-500);margin-top:.4rem">${formatDate(f.created_at?.split('T')[0])}</div>
    </div>
  `).join('');
}

function renderProfileInfo() {
  const l = currentLearner;
  const el = document.getElementById('profile-info-card');
  el.innerHTML = `
    <div class="section-title" style="margin-bottom:1rem">Learner information</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
      <div><div style="font-size:12px;color:var(--gray-500)">Full name</div><div style="font-size:14px;font-weight:500;color:var(--gray-900);margin-top:2px">${l.full_name}</div></div>
      <div><div style="font-size:12px;color:var(--gray-500)">Date of birth</div><div style="font-size:14px;font-weight:500;color:var(--gray-900);margin-top:2px">${l.date_of_birth ? formatDate(l.date_of_birth) : '—'}</div></div>
      <div><div style="font-size:12px;color:var(--gray-500)">Home language</div><div style="font-size:14px;font-weight:500;color:var(--gray-900);margin-top:2px">${l.language_primary || '—'}</div></div>
      <div><div style="font-size:12px;color:var(--gray-500)">EAL status</div><div style="font-size:14px;font-weight:500;color:var(--gray-900);margin-top:2px">${l.eal_flag ? 'Yes — EAL learner' : 'No'}</div></div>
      <div><div style="font-size:12px;color:var(--gray-500)">Current stage</div><div style="font-size:14px;font-weight:500;margin-top:2px"><span class="stage-badge s${l.current_stage}">Stage ${l.current_stage} — ${STAGES[l.current_stage-1]?.name}</span></div></div>
      <div><div style="font-size:12px;color:var(--gray-500)">Entry date</div><div style="font-size:14px;font-weight:500;color:var(--gray-900);margin-top:2px">${l.entry_date ? formatDate(l.entry_date) : '—'}</div></div>
    </div>
    ${l.programme_notes ? `<div class="divider"></div><div style="font-size:12px;color:var(--gray-500);margin-bottom:.4rem">Programme notes</div><div style="font-size:14px;color:var(--gray-700);line-height:1.6">${l.programme_notes}</div>` : ''}
    <div class="divider"></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="promoteStage()">Advance to next stage</button>
    </div>
  `;
}

// ─── Session add ──────────────────────────────
async function addSession() {
  if (!currentLearner) return;
  const date = document.getElementById('sess-date').value;
  const type = document.getElementById('sess-type').value;
  const dur = document.getElementById('sess-dur').value;
  const rating = document.getElementById('sess-rating').value;
  const notes = document.getElementById('sess-notes').value.trim();

  const { error } = await db.from('rs_sessions').insert([{
    learner_id: currentLearner.id,
    tutor_id: currentUser.id,
    stage: currentLearner.current_stage,
    session_date: date,
    session_type: type,
    duration_minutes: dur ? parseInt(dur) : null,
    rating,
    notes: notes || null,
    ot_flags_raised: type === 'flag',
  }]);

  if (error) { toast('Error saving session: ' + error.message, 'error'); return; }

  ['sess-notes','sess-dur'].forEach(id => document.getElementById(id).value = '');
  closeModal('modal-add-session');

  // Reload profile data
  await openProfile(currentLearner.id);
  await loadLearners();
  toast('Session logged.', 'success');
}

// ─── OT flag add ──────────────────────────────
async function addFlag() {
  if (!currentLearner) return;
  const severity = document.getElementById('flag-severity').value;
  const category = document.getElementById('flag-category').value;
  const desc = document.getElementById('flag-desc').value.trim();

  if (!desc) { toast('Please describe what you observed.', 'error'); return; }

  const { error } = await db.from('rs_ot_flags').insert([{
    learner_id: currentLearner.id,
    raised_by: currentUser.id,
    flag_type: severity,
    flag_category: category,
    description: desc,
    actioned: false,
  }]);

  if (error) { toast('Error saving flag: ' + error.message, 'error'); return; }

  document.getElementById('flag-desc').value = '';
  closeModal('modal-add-flag');
  await openProfile(currentLearner.id);
  await loadLearners();
  toast('OT flag saved.', 'success');
}

async function actionFlag(flagId) {
  const { error } = await db.from('rs_ot_flags').update({ actioned: true }).eq('id', flagId);
  if (error) { toast('Error updating flag.', 'error'); return; }
  await openProfile(currentLearner.id);
  await loadLearners();
  toast('Flag marked as actioned.', 'success');
}

// ─── Stage promotion ──────────────────────────
async function promoteStage() {
  if (!currentLearner || currentLearner.current_stage >= 6) return;
  const next = currentLearner.current_stage + 1;
  if (!confirm(`Move ${currentLearner.full_name} to Stage ${next} — ${STAGES[next-1].name}?`)) return;

  const { error } = await db.from('rs_learner_profiles')
    .update({ current_stage: next }).eq('id', currentLearner.id);

  if (error) { toast('Error updating stage.', 'error'); return; }
  await openProfile(currentLearner.id);
  await loadLearners();
  toast(`${currentLearner.full_name} moved to Stage ${next}.`, 'success');
}

// ─── Tab switching ────────────────────────────
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

// ─── Modals ───────────────────────────────────
function openAddLearner() { document.getElementById('modal-add-learner').classList.add('open'); }
function openAddSession() { document.getElementById('modal-add-session').classList.add('open'); }
function openAddFlag() { document.getElementById('modal-add-flag').classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ─── Toast ────────────────────────────────────
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.className = 'toast', 3000);
}

// ─── Helpers ─────────────────────────────────
function initials(name) {
  if (!name) return '?';
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function calcAge(dob) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Activity Library ─────────────────────────
const ACTIVITY_LIBRARY = [
  { stage:1, stageName:'Phonological foundation', stageColor:'#1D9E75', stageCls:'s1',
    activities:[
      { id:'a1_1', title:'Rhyme basket', type:'Phonological awareness', duration:'5 min', format:'Whole group or 1:1',
        objective:'Learner identifies and produces rhyming word pairs. Builds phonological sensitivity to word endings.',
        materials:['Object basket (cat, hat, bat, mat, rat)','Picture cards — rhyme pairs','Puppet (optional)'],
        script:'Say two words and ask: "Do these rhyme?" Use 10 pairs (cat/hat, dog/log, sun/fun, ball/call, ship/dip, red/bed, pan/man, cup/pup, fish/dish, boot/foot).\n\n"Now I\'ll hold up two pictures. Thumbs up for rhyme, thumbs down for not rhyme."\n\n[After recognition]: "Now YOUR turn — can you think of a word that rhymes with CAT?"',
        multisensory:'Auditory: exaggerate the rime (c-AAAAT). Kinaesthetic: thumbs up/down, clap on pairs. Visual: picture cards in two hoops. Tactile: real objects in basket.',
        differentiation:'Support: recognition only (thumbs up/down) before production. Extension: generate 3 words that rhyme with BIG.',
        ot:'If the learner cannot hear rhyme after 3 sessions, flag for auditory processing screening. Check history of ear infections or glue ear.',
        mastery:'8/10 rhyme pairs correctly identified AND 3 correct rhymes generated independently.' },
      { id:'a1_2', title:'Syllable stomp', type:'Phonological awareness', duration:'5–8 min', format:'Whole group opener',
        objective:'Learner segments words into syllables using body movement. Builds syllabic awareness as foundation for phoneme work.',
        materials:['Picture word cards','Open floor space','Drum or tambourine (optional)'],
        script:'"We are going to STOMP words apart! BUT-TER-FLY. [stomp three times] How many? THREE! Butterfly has THREE syllables."\n\n"Ready? I\'ll show a picture. You stomp the syllables."\n\nWords: cat(1), rabbit(2), banana(3), caterpillar(4), dog(1), tiger(2), dinosaur(3)',
        multisensory:'Kinaesthetic: stomp/clap/tap — learner chooses. Auditory: drum beat. Tactile: chin-tap method (chin drops once per syllable).',
        differentiation:'Support: 1–2 syllable words only, chin-tap method. Extension: compound words (sun-flower), then deletion ("Say butterfly without BUTTER").',
        ot:'Motor coordination difficulties may affect stomping rhythm. Substitute tapping knees. Note if rhythm tasks are consistently effortful — flag for sensory-motor assessment.',
        mastery:'Correctly segments 8/10 words (1–3 syllables) using any consistent movement method.' },
      { id:'a1_3', title:'Sound boxes (Elkonin boxes)', type:'OG Multisensory', duration:'8–10 min', format:'1:1 or small group',
        objective:'Learner segments spoken words into individual phonemes by pushing counters into boxes. Foundational for spelling and decoding.',
        materials:['Elkonin box sheet (2–4 boxes)','Counters (coins, buttons, cubes)','Picture cards'],
        script:'"These boxes are SOUND boxes. Each box holds one sound. Watch: C — [push] — A — [push] — T — [push]. Three sounds, three boxes."\n\n"Your turn. The word is SIT. Push a counter for each sound."\n\nProgression: push counters → write letters in boxes → blend back\n2-phoneme: at, up, on · 3-phoneme CVC: sat, pin, hop · CCVC: frog, clap',
        multisensory:'Tactile: physically pushing counters. Visual: boxes make phoneme count concrete. Kinaesthetic: sliding left-to-right reinforces directionality.',
        differentiation:'Support: start with 2-phoneme words. Extension: 4-phoneme CCVC words (frog, clap, best).',
        ot:'Left-to-right consistency issues — check for directionality confusion. Use coloured start dot on left box. May indicate left-right processing difficulty — note for OT review.',
        mastery:'Independently segments 8/10 CVC words with correct phoneme count and left-to-right push.' },
      { id:'a1_4', title:'Sky writing and sand tray', type:'OG Multisensory', duration:'5 min', format:'1:1',
        objective:'Learner forms letter shapes using large-motor sky writing and tactile sand trays, encoding letter form with sound simultaneously.',
        materials:['Sand tray or textured surface','Letter formation cards','Vertical whiteboard'],
        script:'"Watch me: [Say] /s/ — [sky write large S in air] — /s/. Now in the sand: /s/ — [finger trace] — /s/. Sound and shape go TOGETHER."\n\n"Your turn. Say the sound, make the shape: /s/… /s/… /s/."\n\nOG letter order: Group 1: a s t i p n · Group 2: m d g o c k · Group 3: e u r f b l · Group 4: h j w x y z v q',
        multisensory:'Kinaesthetic: large arm encodes directionality. Tactile: sand adds haptic encoding. Auditory: simultaneous verbalisation. Visual: letter card for reference.',
        differentiation:'Support: trace over pre-drawn letters first. Extension: write from sound prompt only, no card.',
        ot:'Sky writing reveals grip tension and directionality issues before pencil work begins. Persistent b/d reversal after 6 sessions — OT referral for visual-spatial processing.',
        mastery:'Correctly forms and names the sound for each introduced letter 9/10 times without prompt.' },
      { id:'a1_5', title:'Robot talk — phoneme blending', type:'Movement-based', duration:'5–8 min', format:'1:1 or small group',
        objective:'Learner blends a sequence of phonemes into a whole word. The oral precursor to decoding printed text.',
        materials:['No materials needed','Optional: robot puppet'],
        script:'"I\'m going to talk like a ROBOT. Figure out what word I\'m saying: /d/ — /ɒ/ — /g/. What\'s the word? DOG!"\n\n"Now YOU be the robot. Say SUN in robot talk: /s/ — /ʌ/ — /n/."\n\nProgression:\nWeek 1–2: 2-phoneme (at, up) · Week 3–4: CVC (sat, hop) · Week 5–6: digraph (ship) · Week 7–8: 4-phoneme (frog, clap)',
        multisensory:'Auditory: slow phoneme production. Kinaesthetic: robot arms — stiff for each phoneme, smooth sweep for blend. Social: role play boosts engagement.',
        differentiation:'Support: tutor models more, learner echoes. Extension: learner creates robot sentences.',
        ot:'Cannot blend 2-phoneme words after 3 weeks of daily practice — PRIMARY OT referral trigger. Do not delay.',
        mastery:'Blends 8/10 CVC words presented as isolated phonemes within 5 seconds per word.' },
      { id:'a1_6', title:'Phoneme deletion — "Say it without"', type:'Advanced Stage 1', duration:'5 min', format:'1:1 — Gate 1 prep',
        objective:'Learner removes a specified phoneme from a word. Most advanced phonological awareness skill — Gate 1 requirement.',
        materials:['No materials needed'],
        script:'"Say STOP. Now say it without the /s/. What\'s left? TOP!"\n\n"Say CLAP without the /l/. What do you hear? CAP!"\n\nProgression:\n1. Compound word deletion (sunshine → shine)\n2. Initial phoneme deletion (cat → at)\n3. Final phoneme deletion (cat → ca)\n4. Cluster deletion (stop → top)\n5. Medial deletion (meat → mat)',
        multisensory:'Auditory: say old word slowly then new word. Kinaesthetic: cover one finger per removed sound.',
        differentiation:'Support: start with compound words. Extension: delete medial phonemes.',
        ot:'Consistent failure despite strong other phonological tasks suggests working memory difficulty rather than phonological deficit. Use digit span check from the diagnostic screener.',
        mastery:'Correctly performs initial phoneme deletion in 7/10 words. This is the Stage 1 → Stage 2 GATE CRITERION.' },
    ]
  },
  { stage:2, stageName:'Decoding and phonics', stageColor:'#534AB7', stageCls:'s2',
    activities:[
      { id:'a2_1', title:'VAK phonics drill', type:'OG Drill', duration:'5 min daily', format:'Every session opener',
        objective:'Build automatic letter–sound correspondences. Three directions: see → say, hear → write, say → find.',
        materials:['Phonics card deck','Whiteboard','Sand tray'],
        script:'"Sound cards — I show, you say as fast as you can. Go!"\n\n[Flash each card. Aim for 2-second response. Mark hesitations.]\n\n"Other way — I say a sound, you write the letter: /s/… /t/… /m/…"\n\n"Last round — I say a word, you find the first sound card: \'Sun\' — which card?"\n\nTarget: all 26 letters automatic under 2 seconds by week 6. Time the deck monthly.',
        multisensory:'Visual → Auditory (decoding). Auditory → Motor (encoding). Oral → Visual search (retrieval). All three channels every session.',
        differentiation:'Support: Group 1–2 letters only until automatic. Extension: add digraph cards (sh, ch, th).',
        ot:'4+ seconds per card after week 4 = retrieval speed concern — RAN-linked issue. Document and flag. Do not simply repeat faster; investigate the underlying cause.',
        mastery:'All 26 letters named correctly under 2 seconds per card. Verified at Gate 2.' },
      { id:'a2_2', title:'Sound-by-sound blending with finger tracking', type:'Decoding', duration:'8 min', format:'1:1',
        objective:'Learner applies letter-sound knowledge to decode printed words left to right, blending into a whole word.',
        materials:['CVC word cards (vowels red, consonants black)','Nonsense word cards','Reading ruler (optional)'],
        script:'"S-A-T. I point to each letter: /s/… /æ/… /t/. Now slide: saaaat — SAT!"\n\n"Your turn. Finger under first letter. Say its sound. Move to next. Then slide."\n\n"This word isn\'t real — that\'s fine! /m/… /ɒ/… /g/. MOG! You proved you are a decoder."\n\nError correction:\n1. Wait 5 seconds. Never say the word.\n2. "Go back. What\'s the first sound?"\n3. Cover all but first letter. Uncover one at a time.\n4. If still wrong: model → echo → try again → return 2–3 items later.',
        multisensory:'Visual: colour-coded cards. Auditory: say each phoneme distinctly. Kinaesthetic: finger tracks left-to-right. Tactile: trace in sand before reading on card.',
        differentiation:'Support: window card revealing one letter at a time. Extension: CCVC and CVCC words.',
        ot:'Skipping letters or starting from middle — directional confusion. May reflect visual tracking or spatial processing. Window card accommodation. Flag for optometric referral.',
        mastery:'Decodes 8/10 CVC real words and 6/8 nonsense words without prompting, using consistent left-to-right tracking.' },
      { id:'a2_3', title:'Simultaneous oral spelling (SOS)', type:'OG Drill', duration:'8 min', format:'1:1',
        objective:'Learner encodes spoken words by segmenting, naming each grapheme, and writing simultaneously.',
        materials:['Whiteboard','Lined paper','Pencil'],
        script:'"Spell the smart way — say every sound AND every letter name as you write."\n\n5 SOS steps:\n1. Tutor says the word: "The word is sat."\n2. Learner repeats: "Sat."\n3. Learner segments: "/s/ /æ/ /t/ — three sounds."\n4. Learner names and writes: "S [writes]. A [writes]. T [writes]."\n5. Learner reads back: "Sat." ✓\n\n"Don\'t erase errors — cross out and write correctly. Crossing out = catching your own mistake."',
        multisensory:'Auditory: hear, say sounds, name letters. Visual: see word being written. Kinaesthetic: hand movement encodes sequence.',
        differentiation:'Support: shorten to 2-sound words if working memory limited. Extension: dictate words with blends and digraphs.',
        ot:'If learner loses the word between steps 2 and 4, working memory is the bottleneck — not phonology. Shorten to 2-sound words and build up.',
        mastery:'Spells 7/10 CVC words correctly using all 5 SOS steps without prompting.' },
      { id:'a2_4', title:'Consonant blend ladders', type:'Decoding', duration:'8 min', format:'Small group — Weeks 4–6',
        objective:'Learner decodes words with initial and final consonant clusters. Each consonant retains its individual sound.',
        materials:['Blend cards (bl,cl,fl,gl,pl,sl,br,cr,dr,fr,gr,pr,tr,sc,sk,sp,st,sw)','Rime cards'],
        script:'"You know AT. Watch: F — AT. FLAT! F and L are glued together — each says its own sound: /fl/."\n\n"Build a ladder: add a blend card to make a real word from the rime."\n\nBlend families:\nL-blends: bl,cl,fl,gl,pl,sl · R-blends: br,cr,dr,fr,gr,pr,tr · S-blends: sc,sk,sp,st,sw · Final: nd,nt,st,sk,mp',
        multisensory:'Tactile: physical blend cards slid onto rime. Auditory: say blend alone before attaching. Visual: colour-code each consonant differently.',
        differentiation:'Support: initial blends before final. Extension: three-letter blends (str, spl, scr).',
        ot:'Consistently merging/dropping one consonant in blend — auditory sequential processing difficulty. Document specific errors, refer if persists beyond 3 weeks.',
        mastery:'Decodes 8/10 words with initial L,R,S-blends and 7/10 with final blends.' },
      { id:'a2_5', title:'Digraph discovery', type:'Decoding', duration:'10 min', format:'1:1 or small group — Weeks 6–8',
        objective:'Learner recognises two-letter combinations representing a single phoneme. This conceptual shift must be explicitly taught.',
        materials:['Digraph word cards (sh,ch,th,wh,ph)','Magnetic letters with paperclips','Minimal pair cards'],
        script:'"S and H together don\'t say /s/ /h/. They make ONE new sound: /ʃ/ — like SHHH to be quiet."\n\n"S-H-I-P: the SH says /ʃ/, I says /ɪ/, P says /p/. SHIP!"\n\nDigraphs: sh/ʃ/: ship,shop,shed,fish · ch/tʃ/: chip,chop,chin · th/θ,ð/: thin,that,this · wh/w/: whip,when\n\nKinaesthetic signal: two fingers = blend (two sounds), one fist = digraph (one sound).',
        multisensory:'Visual: digraphs in different colour. Auditory: minimal pairs (sin/shin). Tactile: letters joined with paperclip. Kinaesthetic: finger signal.',
        differentiation:'Support: sh and ch only first. Extension: distinguish voiced/unvoiced th.',
        ot:'th distinction is auditorially subtle — acceptable at Stage 2 to not differentiate reliably. Do not over-correct.',
        mastery:'Reads sh,ch,th,wh digraph words at 8/10 accuracy in isolation and decodable sentences.' },
      { id:'a2_6', title:'First decodable reader', type:'Connected Text', duration:'10–15 min', format:'1:1 — from Week 3',
        objective:'Learner applies phonics to read connected decodable sentences — first real reading experience.',
        materials:['Stage 2 decodable reader (CVC level)','Running record sheet','Tricky word cards: the,a,I,is,was'],
        script:'"This is a REAL book — every word uses sounds you already know. No guessing. Just decoding."\n\n"Pre-teach tricky words: THE and SAID don\'t follow our rules. Memorise them."\n\n"Read from the beginning. If you get stuck, go back and sound it out."\n\n[Wait 5 seconds before helping. Never supply the word immediately.]\n\nRunning record: ✓=correct · E=error (write what said) · SC=self-corrected · A=told\n\nTarget: 95%+ accuracy. Below 90% = too hard — step back a level.',
        multisensory:'Visual: print on page. Auditory: oral reading. Kinaesthetic: finger under each word. Emotional: treat first book as a milestone.',
        differentiation:'Support: echo read together before solo. Extension: learner reads to a younger sibling or stuffed animal.',
        ot:'First connected text is emotionally significant. Many learners have a history of failure here. Watch for shutdown or self-deprecation. Respond immediately with specific evidence-based praise. Record emotional response in session log — it is clinical data.',
        mastery:'Reads decodable CVC text at 95%+ accuracy with left-to-right tracking and self-correction present.' },
    ]
  },
  { stage:3, stageName:'Word recognition and spelling', stageColor:'#993C1D', stageCls:'s3',
    activities:[
      { id:'a3_1', title:'Sight word LSCWC', type:'Sight Words', duration:'5 min daily', format:'All sessions',
        objective:'Build automatic recognition of high-frequency irregular words.',
        materials:['Sight word card deck (Dolch/Fry)','Whiteboard','Colour highlighters'],
        script:'LSCWC procedure:\nLook: study the word, notice unusual letters, say it\nSay: spell aloud letter by letter\nCover: hide the word\nWrite: write from memory while saying each letter\nCheck: uncover and verify\n\nSets:\nSet 1: the,was,said,are,were,have,give,live,come,some,one,once,two,who,their\nSet 2: there,they,what,where,when,which,could,would,should,every,many,very\nSet 3: because,before,after,again,always,never,both,does,gone,knew,know,laugh',
        multisensory:'Visual: colour-code the irregular part. Auditory: letter-by-letter spelling aloud. Kinaesthetic: writing from memory. Tactile: trace in sand first.',
        differentiation:'Support: 3 words per week maximum. Extension: use sight words in an independently written sentence.',
        ot:'Consistent failure despite repeated LSCWC — visual memory or orthographic processing deficit. Try word-in-context cards. If 10+ weeks yields no retention — flag for specialist assessment.',
        mastery:'Reads 50 high-frequency words automatically (under 1 second) in random order by Gate 3.' },
      { id:'a3_2', title:'Morpheme mapping', type:'Morphology', duration:'10 min', format:'1:1 or small group — Weeks 3–10',
        objective:'Learner recognises that words are built from meaningful parts. One morpheme rule unlocks dozens of words.',
        materials:['Morpheme tile cards (prefix/root/suffix in different colours)','Word family charts'],
        script:'"Every word is like LEGO — pieces that mean something. ROOT = main meaning. PREFIX = changes meaning. SUFFIX = changes usage."\n\n"HAPPY is a root. Add UN = UNHAPPY. UN means NOT."\n\n"If you know UN means NOT: unhappy, unkind, unsafe, unfair, unlock — you unlocked them ALL AT ONCE."\n\nPrefixes: un-,re-,pre-,mis-,dis-,over-,out-,sub-\nSuffixes: -ing,-ed,-er,-est,-ful,-less,-ness,-ment,-tion,-ly',
        multisensory:'Visual: colour-coded tiles. Kinaesthetic: physically slide tiles onto root. Auditory: say old word → add morpheme → say new word.',
        differentiation:'Support: suffixes only first — easier to spot. Extension: generate full word family from one root.',
        ot:'Morpheme work is vocabulary-dependent. EAL learners may struggle because they do not know enough root words. Assess vocabulary depth separately from morphological awareness.',
        mastery:'Identifies root, prefix, suffix in 8/10 multimorphemic words. Generates 3+ members of a word family given a root.' },
      { id:'a3_3', title:'Six syllable types', type:'Syllables', duration:'10 min', format:'1:1 — Weeks 4–8',
        objective:'Learner identifies all six syllable types and uses them to divide and read multisyllabic words.',
        materials:['Syllable type reference cards (colour-coded)','Printed multisyllabic words','Scissors'],
        script:'"Long words are just short words stuck together. Every short part follows one of six rules."\n\nThe six types:\n1. CLOSED (CVC): vowel short — cat, basket\n2. OPEN (CV): vowel long — go, tiger\n3. VCe: vowel long + silent e — make, compete\n4. VOWEL TEAM: two vowels one sound — rain, defeat\n5. R-CONTROLLED: vowel + r — bird, market\n6. CONSONANT-LE: final -le — table, simple\n\n"BASKET: BAS/KET. BAS = closed (short A). KET = closed (short E). BAS·KET!"',
        multisensory:'Visual: colour-code types consistently. Kinaesthetic: physically cut words into syllable segments. Tactile: cutting externalises the cognitive step.',
        differentiation:'Support: closed and open first, then add types in sequence. Extension: colour-code all six types in a paragraph.',
        ot:'Visual processing difficulties make division hard even when concept is understood. Use physical cutting first. If learner consistently divides at wrong point despite instruction — visual sequential processing weakness.',
        mastery:'Names all six syllable types. Correctly divides and reads 8/10 two-syllable words across all six types.' },
      { id:'a3_4', title:'Spelling rules 1–7', type:'Spelling', duration:'8 min', format:'1:1 — Weeks 5–10',
        objective:'Learner acquires the seven most high-utility English spelling rules.',
        materials:['Spelling rule reference cards','Dictation word list','Whiteboard'],
        script:'The seven rules:\n1. Floss: after short vowel at end, double f,l,s → off,fell,miss\n2. CK: after short vowel → back,neck,pick\n3. Silent-E: makes vowel long AND softens C/G → cape,race,page\n4. Drop-E: drop silent-e before vowel suffix → make→making\n5. Double consonant: before vowel suffix if short vowel → run→running\n6. Y rule: Y→I before suffix → happy→happiness\n7. AI/AY position: AI in middle, AY at end → rain/play\n\n"Rules have boundaries — always teach the exceptions too."',
        multisensory:'Visual: rule card always available. Auditory: state the rule then apply it. Kinaesthetic: write while stating the rule.',
        differentiation:'Support: written rule card as accommodation. Extension: find exceptions and explain why they exist.',
        ot:'WM difficulties mean learner may know the rule when asked but cannot apply it spontaneously. Provide written reference card — goal is internalisation over time, not memorisation under pressure.',
        mastery:'Can state all 7 rules. Applies Rules 1–5 in dictation at 80%+. Identifies exceptions without confusion.' },
    ]
  },
  { stage:4, stageName:'Reading fluency', stageColor:'#185FA5', stageCls:'s4',
    activities:[
      { id:'a4_1', title:'Neurological impress method (NIM)', type:'Repeated Reading', duration:'10 min', format:'1:1 — Weeks 1–4',
        objective:'Learner reads simultaneously with tutor at tutor\'s fluent pace. No decoding pressure — pure fluency input.',
        materials:['Instructional-level text (slightly above independent level)','One shared book'],
        script:'"Read together — your voice and my voice at the same time. Don\'t worry about mistakes. Keep up with my finger."\n\n[Sit side-by-side. Both read aloud simultaneously. Tutor voice slightly louder. No stopping for errors.]\n\n[After 10 minutes:] "Now YOUR turn — same passage, you lead."\n\n[Observe: increased speed, improved phrasing, more natural expression compared to before NIM.]',
        multisensory:'Visual: shared text, finger tracking. Auditory: fluent model floods the system. Kinaesthetic: simultaneous tracking. Social: collaborative reading.',
        differentiation:'Support: slow tutor pace slightly. Extension: learner records themselves pre- and post-NIM and listens back.',
        ot:'Requires bimanual tracking and auditory-motor coordination. If learner loses place: use reading ruler. If cannot coordinate speaking and tracking: separate tasks — listen only, then track only, then both.',
        mastery:'Post-NIM solo reading shows measurable WCPM gain. Noticeably more natural phrasing after 2 weeks of daily sessions.' },
      { id:'a4_2', title:'Charted repeated reading', type:'Repeated Reading', duration:'15 min', format:'1:1 — Weeks 3–10',
        objective:'Learner reads same passage three times, charting their own WCPM. Self-monitoring produces intrinsic motivation.',
        materials:['Instructional-level passage (100–200 words)','WCPM bar chart (learner fills in)','Stopwatch'],
        script:'Read 1 — Cold read: timed. Learner charts WCPM.\nRead 2 — Previewed: learner previews 1 min, notes hard words. Reads again. Charts.\nRead 3 — Expression focus: reads naturally. Charts.\n\n"Almost everyone gets faster every read — because your brain is recognising words faster. That\'s AUTOMATICITY."\n\n"You went from [X] to [Y] WCPM. That is [Y-X] more words in the same minute."',
        multisensory:'Visual: WCPM chart shows own improvement. Auditory: hear own fluency improve. Kinaesthetic: filling in the chart is a reward.',
        differentiation:'Support: reduce to 2 reads if frustration is high. Extension: learner selects own passage and runs three reads independently.',
        ot:'Timed reading is high-anxiety for learners with reading failure history. Frame timing as measuring the text, not judging the learner. If dysregulated: switch to untimed repeated reading. Regulation is a prerequisite for performance.',
        mastery:'Consistent WCPM gain across three reads every session. Monthly cold-read WCPM trending upward.' },
      { id:'a4_3', title:'Readers theatre', type:'Prosody', duration:'20–30 min', format:'Small group — Weeks 4–8',
        objective:'Learners read scripted text with expression. Repeated reading built into rehearsal. Authentic audience creates real motivation.',
        materials:['Readers theatre scripts (150–250 words per role)'],
        script:'"You are a reader — not a student. Make the audience FEEL what your character is feeling."\n\n"Read your lines three times alone first. Rehearse together. Then perform."\n\n[During rehearsal:] "\'I will NOT go back.\' How does your character feel? Show me with your voice."\n\nScript selection: dialogue-heavy, 2–4 characters, 150–250 words per role. Strongest readers get narrator roles.',
        multisensory:'Visual: script. Auditory: character voice. Kinaesthetic: performance energy. Social: authentic audience.',
        differentiation:'Support: 15+ minutes individual rehearsal before group. Extension: learner writes an additional scene.',
        ot:'Powerful anxiety reducer for learners with damaged reading self-concept. Performance frame externalises the reading act. If resistant to oral reading in assessments — introduce readers theatre first as lower-stakes entry point.',
        mastery:'Reads script role with consistent expression, appropriate pacing, character voice. MFS prosody rating Level 3 on script text.' },
      { id:'a4_4', title:'Punctuation walk', type:'Prosody', duration:'8 min', format:'1:1 or small group — Weeks 2–6',
        objective:'Learner uses punctuation marks as prosody cues — each mark is an instruction to the voice.',
        materials:['Printed passage','Coloured pens for annotation','Recording device (optional)'],
        script:'"Find every full stop — draw a red line. Breath points. Find every comma — small mark. Question marks — upward arrow. Exclamation marks — star."\n\n"Now read using your markings as a map."\n\nPunctuation signals:\n. = Stop, breathe · , = Short pause · ? = Voice rises · ! = Louder, more energy · "" = Character voice · ... = Slow, build tension · — = Sudden stop or emphasis',
        multisensory:'Visual: physical annotation. Auditory: record before and after to hear difference. Kinaesthetic: marking the text.',
        differentiation:'Support: provide pre-annotated text. Extension: annotate a cold unseen text independently.',
        ot:'Annotation requires fine motor control. For learners with fine motor difficulties, provide pre-annotated text. Do not let annotation become a barrier to the prosody goal.',
        mastery:'Consistently honours full stops, commas, question marks without prompting. MFS prosody rating Level 3.' },
    ]
  },
  { stage:5, stageName:'Reading comprehension', stageColor:'#3B6D11', stageCls:'s5',
    activities:[
      { id:'a5_1', title:'Reciprocal teaching', type:'Comprehension', duration:'20 min', format:'Small group or 1:1 — every week',
        objective:'Learner uses predict, clarify, question, and summarise strategies in rotation. Highest effect size of any comprehension intervention.',
        materials:['Shared text (non-fiction initially)','RT role cards with sentence stems'],
        script:'Four strategies in rotation:\nPREDICT: "I predict... because..."\nQUESTION: "I wonder why... / What does this mean?"\nCLARIFY: "A confusing part is... I think it means... because..."\nSUMMARISE: "The most important idea in this section is..."\n\n[Tutor models all four with first section. Learner takes teacher role for next section.]\n\n[Tutor prompts only: "Now predict. Now question. Now clarify. Now summarise."]',
        multisensory:'Visual: role cards with stems. Auditory: structured dialogue. Kinaesthetic: physically passing the teacher role.',
        differentiation:'Support: sentence stems on role cards. Extension: learner writes a full RT response journal entry after independent reading.',
        ot:'Language-dependent. Learners with language processing difficulties will struggle with question and predict before clarify. Assess language comprehension separately if learner decodes well but struggles with all four RT roles.',
        mastery:'Independently leads a full RT session on unfamiliar text, applying all four strategies with minimal prompting. Summarises main idea in 1–2 sentences.' },
      { id:'a5_2', title:'Inference equation', type:'Inference', duration:'12 min', format:'1:1 or small group — Weeks 2–8',
        objective:'Learner understands that inference = text clue + background knowledge. Inference is detective work, not guessing.',
        materials:['Short narrative passage','Inference table (3 columns)','Whiteboard'],
        script:'"Inference is NOT guessing. It is DETECTIVE work."\n\nThe equation:\nWhat the text says + What I already know = My inference\n\nSample: "Maya walked into the kitchen. The smell — warm, sweet, burnt edges. Grandmother at stove, flour on apron, humming."\nText clue: warm sweet smell + flour + stove\nKnowledge: those things = baking\nInference: grandmother has been baking\n\nLevels:\n1. Facts implied but not stated\n2. Character feelings from actions\n3. Author purpose and viewpoint\n\n"Can you point to the text clue? If not — it may be imagination, not inference."',
        multisensory:'Visual: three-column inference table. Auditory: talk through equation aloud. Kinaesthetic: write in each column.',
        differentiation:'Support: Level 1 only initially. Extension: Level 3 — evaluating author purpose.',
        ot:'Emotion inference requires theory of mind. Learners on autism spectrum may find Level 2 significantly harder than Level 1 — this is not a comprehension failure. Adjust question types accordingly.',
        mastery:'Makes justified Level 1 and Level 2 inferences in 4/5 attempts, citing text evidence.' },
      { id:'a5_3', title:'Text structure mapping', type:'Text Structure', duration:'15 min', format:'1:1 or small group — Weeks 3–9',
        objective:'Learner identifies text structure and uses it to predict, find main ideas, and summarise. Structure recognition significantly improves comprehension.',
        materials:['Short non-fiction passages','Graphic organisers per structure','Signal word cards'],
        script:'"Non-fiction writers choose HOW to organise ideas — and leave clues in signal words."\n\n5 structures:\n1. DESCRIPTION: for example, consists of, appears → Web diagram\n2. SEQUENCE: first, next, then, finally → Timeline\n3. COMPARE/CONTRAST: however, similarly, in contrast → Venn diagram\n4. CAUSE/EFFECT: because, therefore, as a result → Fishbone\n5. PROBLEM/SOLUTION: the problem is, one answer → P-S frame\n\n"Match your notes organiser to the text structure. Then use the structure to write your summary."',
        multisensory:'Visual: graphic organiser matching structure. Auditory: discuss signal words. Kinaesthetic: complete organiser with text information.',
        differentiation:'Support: partially completed organiser template. Extension: write a paragraph using the same text structure.',
        ot:'Graphic organisers require visual-spatial organisation. Provide partially completed templates. The thinking about structure is the goal, not a neat diagram.',
        mastery:'Identifies dominant structure in 4/5 non-fiction texts and selects correct graphic organiser without prompting.' },
      { id:'a5_4', title:'QAR — question-answer relationships', type:'Metacognition', duration:'12 min', format:'Small group — Weeks 3–10',
        objective:'Learner identifies where answers live — in the text (literal), between text and knowledge (inferential), or in the reader (evaluative). Prevents wrong search strategy.',
        materials:['Shared text','QAR category cards'],
        script:'Four QAR categories:\nRIGHT THERE: answer in one place. "Find the words."\nTHINK AND SEARCH: combine information from different parts. "Put it together."\nAUTHOR AND ME: text clues + background knowledge. Inferential.\nON MY OWN: entirely from reader experience/opinion. Evaluative.\n\n"Before you answer — decide WHERE the answer lives. This tells you where to look."\n\n"\'Why do you think the character was reluctant to return home?\' — AUTHOR AND ME. Need text clues + your understanding of human emotion."',
        multisensory:'Visual: QAR category cards. Auditory: verbalise the category before answering. Kinaesthetic: sort question cards by type.',
        differentiation:'Support: label questions before answering. Extension: learner generates one question of each type from a new text.',
        ot:'Many struggling readers fail comprehension because they apply the wrong search strategy — scanning text for an ON MY OWN question. QAR directly addresses this metacognitive mismatch. Especially valuable for learners who have developed avoidance around comprehension tasks.',
        mastery:'Correctly labels 8/10 comprehension questions with QAR category before answering. Uses label to direct search strategy.' },
    ]
  },
  { stage:6, stageName:'Exceptional reader', stageColor:'#854F0B', stageCls:'s6',
    activities:[
      { id:'a6_1', title:"Adler's four levels of reading", type:'Analytical Reading', duration:'Ongoing', format:'Self-directed with guidance',
        objective:'Learner reads with the full analytical repertoire from How to Read a Book. Inspectional, analytical, and syntopical reading applied to all texts.',
        materials:['Any non-fiction text','Annotation system: ★=key idea · ?=unclear · !=agree/disagree · →=connects to other text'],
        script:'Four levels:\n1. ELEMENTARY: Can you read the words? (Stages 1–4 built this)\n2. INSPECTIONAL: Systematic skimming — read TOC, index, first/last paragraphs of each chapter\n3. ANALYTICAL: Deepest single-text reading. Classify the book. Outline structure. Identify arguments. Evaluate evidence. Agree or disagree with reasons.\n4. SYNTOPICAL: Multiple texts on same topic. Compare authors. Build your own framework.\n\nThree analytical questions:\n1. What is the book about as a whole? (One sentence.)\n2. What is being said in detail, and how?\n3. Is it true — wholly, partly, or not at all?\n\n"Star the key idea in each section. ? where uncertain. ! where you strongly agree or disagree."',
        multisensory:'Visual: personal annotation system. Auditory: think-aloud while reading. Kinaesthetic: annotate the text. Metacognitive: reflection journal after each session.',
        differentiation:'Support: Level 2 inspectional only first. Extension: Level 4 syntopical across 3+ texts on the same question.',
        ot:'Sustained attention task — 30–45 min. Learners with attention regulation: use Pomodoro (25 min on, 5 min break). Never frame breaks as reading failure.',
        mastery:'Completes Levels 2 and 3 independently on unfamiliar non-fiction. Produces written analytical summary: main idea, argument structure, evidence evaluation, personal evaluative position.' },
      { id:'a6_2', title:'Socratic seminar', type:'Critical Literacy', duration:'30–45 min', format:'Small group — Weeks 3–12',
        objective:'Structured Socratic dialogue on a shared text. Builds, challenges, and refines interpretations. Treats reading as a social intellectual act.',
        materials:['Shared text with genuine interpretive difficulty','Preparation: one open question + one striking passage + initial position'],
        script:'"Not looking for the right answer — looking for the best-supported interpretation. Every claim must be grounded in the text."\n\nOpening question: interpretive, not factual. "Is the narrator reliable?" "Does the author prove their claim?"\n\nRules: speak to the text. Build on others. Disagree respectfully and specifically. Change your mind if evidence warrants.\n\n"Can you point to the specific text part that supports what you just said?"\n\n"What is the strongest counter-argument?"\n\nClose: each person states how their thinking CHANGED and what question they would pursue next.',
        multisensory:'Auditory: structured dialogue. Visual: text as shared reference. Kinaesthetic: preparation notes. Metacognitive: closing reflection on changed thinking.',
        differentiation:'Support: allow written notes during seminar — scholars use them too. Extension: learner poses the opening question and facilitates.',
        ot:'High cognitive load: read, recall, formulate, listen, respond simultaneously. Processing speed difficulties — allow written notes. Psychological safety is a prerequisite for genuine dialogue.',
        mastery:'Contributes 3+ text-grounded comments per seminar. Changes position based on evidence at least once. Formulates a genuine follow-up question beyond the text.' },
      { id:'a6_3', title:'Mentor text study', type:'Reading-Writing', duration:'20 min', format:'1:1 — Weeks 2–10',
        objective:'Learner reads with a writer\'s eye — noticing how the author achieves effects — then imitates the technique in their own writing.',
        materials:['Mentor text extracts (3–5 sentences each)','Craft notebook'],
        script:'Notice-Name-Try protocol:\nNOTICE: read and mark anything striking — phrase, structure, rhythm, word choice\nNAME: try to name the technique\nTRY: imitate in your own writing — topic is irrelevant, craft is everything\n\nSample techniques:\n• Short sentence contrast: long sentence builds... then drops.\n• Concrete-to-abstract: "She kept everything: a photograph, three letters, and all the years she had never spoken about."\n• Questions as endings: "The question was no longer whether. The question was whether anyone was prepared to act."\n• Personification: "The city held its breath."\n• Juxtaposition: "The ballroom was full of chandeliers and cold."',
        multisensory:'Visual: mentor text with annotations. Auditory: read aloud to hear the rhythm. Kinaesthetic: immediate imitation writing. Tactile: craft notebook.',
        differentiation:'Support: narrow brief ("write using only this one technique"). Extension: learner brings own mentor text from independent reading.',
        ot:'Notice-Name-Try reduces writing anxiety by separating reading-as-reader from reading-as-writer. Narrow constraints paradoxically liberate reluctant writers. The TRY step is essential — analysis without writing is not the goal.',
        mastery:'Identifies and names 10+ craft techniques across 12 weeks. Demonstrates deliberate use of 5+ techniques in independent writing.' },
      { id:'a6_4', title:'Personal reading project', type:'Independent Study', duration:'12 weeks', format:'Self-directed — culminating Stage 6 task',
        objective:'Learner designs and pursues an independent reading project on a self-chosen question, selecting texts, applying all analytical strategies, and producing a synthesis.',
        materials:['Project question card','Reading list (4–6 texts)','Weekly reflection journal','Synthesis template'],
        script:'"Your reading project starts with a QUESTION — not a topic. A question you actually want answered."\n\nTest your question:\n• Answerable from reading?\n• Genuinely open — could reasonable people disagree?\n• Specific enough to know when you\'ve answered it?\n\nProject phases:\nWeeks 1–2: Question formation + text selection\nWeeks 3–10: Systematic reading + weekly journal entries\nWeeks 11–12: Written synthesis (500–800 words) + oral presentation (5–8 min)\n\nSample questions:\n"Does technology make us more or less capable of deep thinking?"\n"Is courage natural or learned?"\n"What makes a story worth telling?"\n\nWeekly check-in: "What did you read? What question did it raise? What did it add to your synthesis?"',
        multisensory:'Visual: project tracker. Auditory: weekly verbal reflection. Kinaesthetic: reading, annotating, writing. Metacognitive: synthesis as explicit thinking.',
        differentiation:'Support: provide structured synthesis template. Extension: learner designs the questions for their own Socratic seminar based on their project.',
        ot:'The personal reading project is the strongest engagement intervention for learners who have historically resisted reading. Autonomy, curiosity, and self-direction are the three most powerful intrinsic motivation drivers. A learner who struggled through Stages 1–5 often flourishes here.',
        mastery:'Completes 12-week project. Presents coherent evidence-based synthesis orally and in writing. Demonstrates intellectual independence. This is the ReadSmart GRADUATION milestone.' },
    ]
  },
];

let actCurrentFilter = 0;

function renderActivityLibrary() {
  const grid = document.getElementById('act-library-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const stagesToShow = actCurrentFilter === 0
    ? ACTIVITY_LIBRARY
    : ACTIVITY_LIBRARY.filter(s => s.stage === actCurrentFilter);

  stagesToShow.forEach(stage => {
    const stageHeader = document.createElement('div');
    stageHeader.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin:1.25rem 0 .75rem">
        <div style="width:32px;height:32px;border-radius:50%;background:${stage.stageColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0">${stage.stage}</div>
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--gray-900)">${stage.stageName}</div>
          <div style="font-size:12px;color:var(--gray-500)">${stage.stageAges}</div>
        </div>
      </div>`;
    grid.appendChild(stageHeader);

    stage.activities.forEach(act => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '.75rem';
      card.innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;cursor:pointer" onclick="toggleActCard('${act.id}')">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:.3rem;flex-wrap:wrap">
              <span style="background:${stage.stageColor}20;color:${stage.stageColor};border:0.5px solid ${stage.stageColor};padding:2px 9px;border-radius:8px;font-size:11px;font-weight:500">${act.type}</span>
              <span style="font-size:12px;color:var(--gray-500)">${act.duration} · ${act.format}</span>
            </div>
            <div style="font-size:15px;font-weight:600;color:var(--gray-900)">${act.title}</div>
          </div>
          <div style="font-size:18px;color:var(--gray-500);transition:transform .2s;flex-shrink:0" id="act-icon-${act.id}">›</div>
        </div>
        <div id="act-body-${act.id}" style="display:none;margin-top:.9rem;padding-top:.9rem;border-top:1px solid var(--gray-100)">
          <div style="font-size:13px;color:var(--gray-700);line-height:1.6;margin-bottom:.85rem">${act.objective}</div>

          <div style="font-size:11px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.35rem">Materials</div>
          <div style="margin-bottom:.85rem">${act.materials.map(m => `<div style="font-size:13px;color:var(--gray-700);padding:.2rem 0;border-bottom:1px solid var(--gray-100)">• ${m}</div>`).join('')}</div>

          <div style="font-size:11px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.35rem">Tutor script</div>
          <div style="background:var(--gray-100);border-left:3px solid ${stage.stageColor};padding:.75rem 1rem;font-size:13px;color:var(--gray-900);line-height:1.75;white-space:pre-wrap;font-style:italic;margin-bottom:.85rem">${act.script}</div>

          <div style="font-size:11px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.35rem">Multisensory channels</div>
          <div style="font-size:13px;color:var(--gray-700);line-height:1.6;margin-bottom:.85rem">${act.multisensory}</div>

          <div style="font-size:11px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.35rem">Differentiation</div>
          <div style="font-size:13px;color:var(--gray-700);line-height:1.6;margin-bottom:.85rem">${act.differentiation}</div>

          <div style="background:var(--amber-light);border:0.5px solid var(--amber);border-radius:var(--radius-sm);padding:.6rem .85rem;font-size:12px;color:#633806;line-height:1.5;margin-bottom:.75rem">
            <strong>OT note:</strong> ${act.ot}
          </div>

          <div style="font-size:11px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.3rem">Mastery criterion</div>
          <div style="font-size:13px;color:var(--gray-700);line-height:1.5;font-weight:500">${act.mastery}</div>
        </div>`;
      grid.appendChild(card);
    });
  });
}

function toggleActCard(id) {
  const body = document.getElementById('act-body-' + id);
  const icon = document.getElementById('act-icon-' + id);
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
}

function filterActivities(stage, btn) {
  actCurrentFilter = stage;
  document.querySelectorAll('.act-tab').forEach(b => {
    b.style.background = 'var(--white)';
    b.style.borderColor = 'var(--gray-300)';
    b.style.color = 'var(--gray-700)';
  });
  btn.style.background = 'var(--teal-light)';
  btn.style.borderColor = 'var(--teal)';
  btn.style.color = 'var(--teal-dark)';
  renderActivityLibrary();
}

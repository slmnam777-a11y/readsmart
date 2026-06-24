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
      storageKey: 'readsmart-auth',
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

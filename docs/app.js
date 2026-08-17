// Web app wrapper for Tauri APIs
const STORAGE_KEY = 'kejian-timer-data';
const TIMER_STATE_KEY = 'kejian-timer-timer-state';
const FLOAT_TASK_KEY = 'kejian-timer-float-task';

const defaultData = {
  entries: [],
  types: ['订单导出','邮件回复','制单发货','评论回复','文档整理'],
  settings: { edgeDock: false }
};

const invoke = async (cmd, args = {}) => {
  switch (cmd) {
    case 'load_data': {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultData));
      try { return JSON.parse(raw); } catch { return JSON.parse(JSON.stringify(defaultData)); }
    }
    case 'save_data': {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(args.data));
      broadcast('data-updated');
      return;
    }
    case 'get_timer_state': {
      const raw = localStorage.getItem(TIMER_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    case 'save_timer_state': {
      if (args.state === null) {
        localStorage.removeItem(TIMER_STATE_KEY);
      } else {
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(args.state));
      }
      broadcast('timer-state-updated');
      return;
    }
    case 'get_float_task': {
      const raw = localStorage.getItem(FLOAT_TASK_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    case 'save_float_task': {
      localStorage.setItem(FLOAT_TASK_KEY, JSON.stringify(args.task));
      return;
    }
    case 'open_float_window': {
      showInlineFloat();
      return;
    }
    case 'close_float_window': {
      hideInlineFloat();
      return;
    }
    case 'set_float_window_properties': {
      return;
    }
    case 'start_float_drag':
    case 'dock_float_window':
    case 'undock_float_window': {
      return;
    }
    default:
      throw new Error('Unknown command: ' + cmd);
  }
};

function broadcast(type) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('kejian-timer');
      bc.postMessage({ type });
      bc.close();
    }
  } catch (e) {}
}

window.__TAURI__ = window.__TAURI__ || {};
window.__TAURI__.core = window.__TAURI__.core || { invoke };
window.__TAURI__.window = window.__TAURI__.window || {};
window.__TAURI__.window.getCurrentWindow = window.__TAURI__.window.getCurrentWindow || function() {
  return {
    onMoved: () => {},
    setPosition: () => {},
    setSize: () => {},
    close: () => {},
    show: () => {},
    setFocus: () => {}
  };
};

function showInlineFloat() {
  const floatApp = document.getElementById('floatApp');
  if (floatApp) floatApp.classList.remove('hidden');
}

function hideInlineFloat() {
  const floatApp = document.getElementById('floatApp');
  if (floatApp) floatApp.classList.add('hidden');
}


// ================= Helpers =================
const todayStr = () => new Date().toISOString().slice(0,10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const fmtTime = (min) => {
  const h = Math.floor(min / 60), m = Math.floor(min % 60);
  return `${h}h ${m}m`;
};
const parseTime = (t) => {
  const [h,m] = t.split(':').map(Number);
  return h * 60 + m;
};
const formatClock = (sec) => {
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return [h,m,s].map(x => String(x).padStart(2,'0')).join(':');
};
const formatShortClock = (sec) => {
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

// ================= State =================
let appData = { entries: [], types: [] };
let timerState = { running: false, startAt: null, originalStartAt: null, elapsed: 0, taskType: '', content: '', interval: null };
const isFloat = new URLSearchParams(window.location.search).has('float');

// ================= Data Layer =================
async function loadData() {
  try {
    const raw = await invoke('load_data');
    appData = {
      ...defaultData,
      ...raw,
      entries: Array.isArray(raw.entries) ? raw.entries : [],
      types: Array.isArray(raw.types) && raw.types.length ? raw.types : defaultData.types,
      settings: { ...defaultData.settings, ...(raw.settings || {}) }
    };
  } catch (e) {
    console.error('load_data failed', e);
    appData = JSON.parse(JSON.stringify(defaultData));
  }
}

async function saveData() {
  try {
    await invoke('save_data', { data: appData });
  } catch (e) {
    console.error('save_data failed', e);
  }
}

// ================= Navigation =================
const pages = ['today','week','report','types','data','about'];
function showPage(page) {
  pages.forEach(p => document.getElementById('page-'+p).classList.add('hidden'));
  document.getElementById('page-'+page).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
  const titles = {today:'今日',week:'本周概览',report:'周五周报',types:'任务类型',data:'数据管理',about:'关于'};
  document.getElementById('pageTitle').textContent = titles[page];
  if (page === 'week') renderWeek();
  if (page === 'report') renderReport();
  if (page === 'types') renderTypes();
  if (page === 'today') renderToday();
}

// ================= Type Management =================
function renderTypeSelect() {
  const sel = document.getElementById('taskType');
  sel.innerHTML = appData.types.map(t => `<option value="${t}">${t}</option>`).join('');
}

function renderTypes() {
  const list = document.getElementById('typeList');
  if (appData.types.length === 0) {
    list.innerHTML = '<span style="color:var(--text-secondary);font-size:13px;">暂无自定义类型</span>';
    return;
  }
  list.innerHTML = appData.types.map(t => `
    <div class="type-chip">
      ${t}
      <button class="remove" data-type="${t}"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
    </div>
  `).join('');
  list.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      appData.types = appData.types.filter(t => t !== btn.dataset.type);
      saveData();
      renderTypes(); renderTypeSelect();
    });
  });
}

function addNewType(v) {
  v = v.trim();
  if (!v || appData.types.includes(v)) return false;
  appData.types = [...appData.types, v];
  saveData();
  renderTypes(); renderTypeSelect();
  return true;
}

// ================= Today List =================
function renderToday() {
  const list = document.getElementById('todayList');
  const entries = appData.entries.filter(e => e.date === todayStr())
    .sort((a,b) => parseTime(a.startTime) - parseTime(b.startTime));
  const totalMin = entries.reduce((sum, e) => sum + (parseTime(e.endTime) - parseTime(e.startTime)), 0);
  document.getElementById('totalHours').textContent = fmtTime(totalMin);

  if (entries.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg></div>
        <div class="empty-title">今天还没有记录</div>
        <div class="empty-desc">点击上方「开始计时」或手动添加第一条。</div>
      </div>`;
    return;
  }

  list.innerHTML = entries.map(e => {
    const dur = parseTime(e.endTime) - parseTime(e.startTime);
    const durText = dur >= 60 ? `${Math.floor(dur/60)}h ${dur%60}m` : `${dur}m`;
    return `
    <div class="entry">
      <div class="entry-time">${e.startTime} – ${e.endTime}<br><span style="font-size:12px;color:var(--text-tertiary);">${durText}</span></div>
      <div class="entry-main">
        <div class="entry-title">${e.content || '无描述'}</div>
        <div class="entry-desc">${e.note || ''}</div>
        <div class="entry-tags">
          <span class="tag tag-type">${e.taskType}</span>
          <span class="tag tag-${e.nature === '突发' ? 'urgent' : 'routine'}">${e.nature}</span>
          ${e.quantity ? `<span class="tag tag-qty">${e.quantity} ${e.unit}</span>` : ''}
        </div>
      </div>
      <div class="entry-actions">
        <button class="icon-btn edit" data-id="${e.id}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
        <button class="icon-btn delete" data-id="${e.id}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', async () => {
    appData.entries = appData.entries.filter(e => e.id !== btn.dataset.id);
    await saveData();
    renderToday();
  }));
  list.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', () => {
    const e = appData.entries.find(x => x.id === btn.dataset.id);
    if (!e) return;
    document.getElementById('entryId').value = e.id;
    document.getElementById('taskType').value = e.taskType;
    document.getElementById('content').value = e.content;
    document.getElementById('startTime').value = e.startTime;
    document.getElementById('endTime').value = e.endTime;
    document.getElementById('quantity').value = e.quantity || '';
    document.getElementById('unit').value = e.unit || '条';
    document.getElementById('note').value = e.note || '';
    document.querySelector(`input[name="nature"][value="${e.nature}"]`).checked = true;
  }));
}

// ================= Form =================
function resetForm() {
  document.getElementById('entryForm').reset();
  document.getElementById('entryId').value = '';
  document.getElementById('unit').value = '条';
}

document.getElementById('resetBtn')?.addEventListener('click', resetForm);
document.getElementById('entryForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('entryId').value;
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  if (!start || !end) return alert('请填写起止时间');
  if (parseTime(end) <= parseTime(start)) return alert('结束时间必须晚于开始时间');

  const entry = {
    id: id || uid(),
    date: todayStr(),
    taskType: document.getElementById('taskType').value,
    nature: document.querySelector('input[name="nature"]:checked').value,
    content: document.getElementById('content').value.trim(),
    startTime: start,
    endTime: end,
    quantity: Number(document.getElementById('quantity').value) || 0,
    unit: document.getElementById('unit').value.trim() || '条',
    note: document.getElementById('note').value.trim(),
    createdAt: id ? appData.entries.find(e=>e.id===id).createdAt : new Date().toISOString()
  };

  if (id) {
    appData.entries = appData.entries.map(e => e.id === id ? entry : e);
  } else {
    appData.entries.push(entry);
  }
  await saveData();
  await invoke('save_timer_state', { state: null });
  resetForm();
  renderToday();
});

// ================= Timer =================

function resetTimerUI() {
  clearInterval(timerState.interval);
  timerState = { running: false, startAt: null, originalStartAt: null, elapsed: 0, taskType: '', content: '', interval: null };
  const activeTimer = document.getElementById('activeTimer');
  if (activeTimer) activeTimer.classList.add('idle');
  const activeTask = document.getElementById('activeTask');
  if (activeTask) activeTask.textContent = '未开始';
  const activeTime = document.getElementById('activeTime');
  if (activeTime) activeTime.textContent = '00:00:00';
  const floatingTask = document.getElementById('floatingTask');
  if (floatingTask) floatingTask.textContent = '未开始';
  const floatingType = document.getElementById('floatingType');
  if (floatingType) floatingType.textContent = '选择任务后点击开始';
  const floatingTime = document.getElementById('floatingTime');
  if (floatingTime) floatingTime.textContent = '00:00:00';
  updateQuickStartLabel();
  updateInlineFloatButtons();
}

function syncTimerFromStorage() {
  const pending = (() => {
    try {
      const raw = localStorage.getItem(TIMER_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  if (!pending) {
    if (timerState.running || (timerState.elapsed || 0) > 0 || timerState.startAt) {
      resetTimerUI();
    }
    return;
  }

  // PiP/浮窗开始或继续计时，主窗口同步跟上
  if (pending.running && !timerState.running) {
    timerState = {
      running: true,
      startAt: pending.startAt,
      originalStartAt: pending.originalStartAt || pending.startAt,
      elapsed: pending.elapsed || 0,
      taskType: pending.taskType,
      content: pending.content,
      interval: setInterval(updateTimerUI, 1000)
    };
    const activeTimer = document.getElementById('activeTimer');
    if (activeTimer) activeTimer.classList.remove('idle');
    const activeTask = document.getElementById('activeTask');
    if (activeTask) activeTask.textContent = pending.content || pending.taskType;
    updateTimerUI();
  }

  // PiP/浮窗暂停或结束，主窗口同步停止
  if (!pending.running && timerState.running) {
    const now = Date.now();
    const session = Math.floor((now - timerState.startAt) / 1000);
    clearInterval(timerState.interval);
    timerState = {
      running: false,
      startAt: null,
      originalStartAt: pending.originalStartAt || timerState.originalStartAt,
      elapsed: (timerState.elapsed || 0) + session,
      taskType: pending.taskType || timerState.taskType,
      content: pending.content || timerState.content,
      interval: null
    };
    const activeTimer = document.getElementById('activeTimer');
    if (activeTimer) activeTimer.classList.add('idle');
    updateTimerUI();
  }

  // 主窗口打开时，浮窗已处于暂停状态
  if (!pending.running && !timerState.running && (pending.elapsed || 0) > 0 && !pending.startTime && !pending.endTime) {
    timerState = {
      running: false,
      startAt: null,
      originalStartAt: pending.originalStartAt,
      elapsed: pending.elapsed,
      taskType: pending.taskType,
      content: pending.content,
      interval: null
    };
    const activeTask = document.getElementById('activeTask');
    if (activeTask) activeTask.textContent = pending.content || pending.taskType;
    updateTimerUI();
  }
}

function updateTimerUI() {
  const session = timerState.running ? Math.floor((Date.now() - timerState.startAt) / 1000) : 0;
  const sec = (timerState.elapsed || 0) + session;
  const activeTime = document.getElementById('activeTime');
  if (activeTime) activeTime.textContent = formatClock(sec);
  const floatingTime = document.getElementById('floatingTime');
  if (floatingTime) floatingTime.textContent = formatClock(sec);
  updateQuickStartLabel();
  updateInlineFloatButtons();
}

async function startTimer(type, content) {
  if (timerState.running) return;
  const now = Date.now();
  const isResume = (timerState.elapsed || 0) > 0;
  timerState = {
    running: true,
    startAt: now,
    originalStartAt: timerState.originalStartAt || now,
    elapsed: timerState.elapsed || 0,
    taskType: type || timerState.taskType,
    content: content || timerState.content,
    interval: null
  };
  const activeTimer = document.getElementById('activeTimer');
  if (activeTimer) activeTimer.classList.remove('idle');
  const activeTask = document.getElementById('activeTask');
  if (activeTask) activeTask.textContent = timerState.content || timerState.taskType;
  const floatingTask = document.getElementById('floatingTask');
  if (floatingTask) floatingTask.textContent = timerState.content || timerState.taskType;
  const floatingType = document.getElementById('floatingType');
  if (floatingType) floatingType.textContent = timerState.taskType;
  updateTimerUI();
  timerState.interval = setInterval(updateTimerUI, 1000);

  await invoke('save_timer_state', {
    state: {
      running: true,
      startAt: timerState.startAt,
      originalStartAt: timerState.originalStartAt,
      elapsed: timerState.elapsed,
      taskType: timerState.taskType || appData.types[0] || '',
      content: timerState.content || timerState.taskType || appData.types[0] || ''
    }
  });
}

async function pauseTimer() {
  if (!timerState.running) return;
  clearInterval(timerState.interval);
  const session = Math.floor((Date.now() - timerState.startAt) / 1000);
  timerState = {
    running: false,
    startAt: null,
    originalStartAt: timerState.originalStartAt,
    elapsed: (timerState.elapsed || 0) + session,
    taskType: timerState.taskType,
    content: timerState.content,
    interval: null
  };
  const activeTimer = document.getElementById('activeTimer');
  if (activeTimer) activeTimer.classList.add('idle');
  updateTimerUI();

  await invoke('save_timer_state', {
    state: {
      running: false,
      startAt: null,
      originalStartAt: timerState.originalStartAt,
      elapsed: timerState.elapsed,
      taskType: timerState.taskType,
      content: timerState.content || timerState.taskType
    }
  });
}

async function resumeTimer() {
  await startTimer(timerState.taskType, timerState.content);
}

async function applyPendingTimerState() {
  try {
    const pending = await invoke('get_timer_state');
    // 只处理已结束、带起止时间且尚未回填过的临时计时结果
    if (!pending || pending.running || !pending.startTime || !pending.endTime || pending.applied) return;

    document.getElementById('taskType').value = pending.taskType || appData.types[0] || '';
    document.getElementById('content').value = pending.content || '';
    document.getElementById('startTime').value = pending.startTime || '';
    document.getElementById('endTime').value = pending.endTime || '';
    if (pending.nature) {
      const radio = document.querySelector(`input[name="nature"][value="${pending.nature}"]`);
      if (radio) radio.checked = true;
    }
    document.getElementById('note').value = pending.note || '';
    showPage('today');

    // 标记已回填，但保留状态给悬浮窗保存；重置计时器显示
    await invoke('save_timer_state', { state: { ...pending, applied: true } });
    timerState = { running: false, startAt: null, originalStartAt: null, elapsed: 0, taskType: '', content: '', interval: null };
    const activeTimer = document.getElementById('activeTimer');
    if (activeTimer) activeTimer.classList.add('idle');
    const activeTask = document.getElementById('activeTask');
    if (activeTask) activeTask.textContent = '未开始';
    const activeTime = document.getElementById('activeTime');
    if (activeTime) activeTime.textContent = '00:00:00';
    const floatingTask = document.getElementById('floatingTask');
    if (floatingTask) floatingTask.textContent = '未开始';
    const floatingType = document.getElementById('floatingType');
    if (floatingType) floatingType.textContent = '选择任务后点击开始';
    const floatingTime = document.getElementById('floatingTime');
    if (floatingTime) floatingTime.textContent = '00:00:00';
    updateQuickStartLabel();
    updateInlineFloatButtons();
  } catch (e) { console.error('get_timer_state failed', e); }
}

async function stopTimer() {
  const wasRunning = timerState.running;
  const hasTime = (timerState.elapsed || 0) > 0 || timerState.running;
  if (!hasTime) return;

  if (timerState.interval) clearInterval(timerState.interval);

  const now = Date.now();
  const session = wasRunning ? Math.floor((now - timerState.startAt) / 1000) : 0;
  const totalElapsed = (timerState.elapsed || 0) + session;
  const endAt = new Date();
  const rawStart = timerState.originalStartAt || (now - totalElapsed * 1000);
  const startAt = new Date(rawStart);
  const pad = n => String(n).padStart(2,'0');
  const startTime = `${pad(startAt.getHours())}:${pad(startAt.getMinutes())}`;
  const endTime = `${pad(endAt.getHours())}:${pad(endAt.getMinutes())}`;

  await invoke('save_timer_state', {
    state: {
      running: false,
      applied: false,
      taskType: timerState.taskType,
      content: timerState.content || timerState.taskType,
      startTime,
      endTime,
      elapsed: totalElapsed,
      nature: '常规',
      note: ''
    }
  });

  // 主窗口结束计时时立即回填表单
  if (!isFloat) {
    await applyPendingTimerState();
  }

  timerState = { running: false, startAt: null, originalStartAt: null, elapsed: 0, taskType: '', content: '', interval: null };
  const activeTimer = document.getElementById('activeTimer');
  if (activeTimer) activeTimer.classList.add('idle');
  const activeTask = document.getElementById('activeTask');
  if (activeTask) activeTask.textContent = '未开始';
  const activeTime = document.getElementById('activeTime');
  if (activeTime) activeTime.textContent = '00:00:00';
  const floatingTask = document.getElementById('floatingTask');
  if (floatingTask) floatingTask.textContent = '未开始';
  const floatingType = document.getElementById('floatingType');
  if (floatingType) floatingType.textContent = '选择任务后点击开始';
  const floatingTime = document.getElementById('floatingTime');
  if (floatingTime) floatingTime.textContent = '00:00:00';
  updateQuickStartLabel();
  updateInlineFloatButtons();
}

function updateQuickStartLabel() {
  const btn = document.getElementById('quickStartBtn');
  if (!btn) return;
  if (timerState.running) {
    btn.textContent = '结束计时';
  } else if ((timerState.elapsed || 0) > 0) {
    btn.textContent = '继续计时';
  } else {
    btn.textContent = '开始计时';
  }
}

function updateInlineFloatButtons() {
  const startBtn = document.getElementById('floatingStart');
  const startText = document.getElementById('floatingStartText');
  const stopBtn = document.getElementById('floatingStop');
  const pauseBtn = document.getElementById('floatingPause');
  if (startBtn) startBtn.disabled = timerState.running;
  if (startText) startText.textContent = (timerState.elapsed || 0) > 0 ? '继续' : '开始';
  if (stopBtn) stopBtn.disabled = !timerState.running && !(timerState.elapsed || 0);
  if (pauseBtn) pauseBtn.disabled = !timerState.running;
}

document.getElementById('quickStartBtn')?.addEventListener('click', () => {
  const type = document.getElementById('taskType').value;
  const content = document.getElementById('content').value.trim();
  if (timerState.running) { stopTimer(); return; }
  if ((timerState.elapsed || 0) > 0) { resumeTimer(); return; }
  startTimer(type, content);
});

// ================= Week View =================
function getWeekDates() {
  const d = new Date();
  const day = d.getDay() || 7;
  const monday = new Date(d); monday.setDate(d.getDate() - day + 1);
  return Array.from({length:7}, (_,i) => {
    const date = new Date(monday); date.setDate(monday.getDate() + i);
    return date.toISOString().slice(0,10);
  });
}

function renderWeek() {
  const grid = document.getElementById('weekGrid');
  const days = ['周一','周二','周三','周四','周五','周六','周日'];
  const dates = getWeekDates();
  grid.innerHTML = dates.map((date, i) => {
    const entries = appData.entries.filter(e => e.date === date);
    const totalMin = entries.reduce((sum, e) => sum + (parseTime(e.endTime) - parseTime(e.startTime)), 0);
    const isToday = date === todayStr();
    const topTasks = entries.slice(0,3).map(e => `<div class="day-task">• ${e.startTime} ${e.content || e.taskType}</div>`).join('');
    return `
    <div class="day-card ${isToday ? 'today' : ''}">
      <div class="day-name">${days[i]}</div>
      <div class="day-date">${date.slice(5)}</div>
      <div class="day-hours">${totalMin ? fmtTime(totalMin) : '无记录'}</div>
      ${topTasks}
    </div>`;
  }).join('');
}

// ================= Report =================
function renderReport() {
  const dates = getWeekDates();
  let report = `【${dates[0]} 至 ${dates[6]} 工作周报】\n`;
  report += `统计口径：时间段 + 任务内容 + 处理数量\n\n`;
  let weekTotal = 0;
  dates.forEach(date => {
    const entries = appData.entries.filter(e => e.date === date)
      .sort((a,b) => parseTime(a.startTime) - parseTime(b.startTime));
    if (entries.length === 0) return;
    const dayTotal = entries.reduce((sum, e) => sum + (parseTime(e.endTime) - parseTime(e.startTime)), 0);
    weekTotal += dayTotal;
    report += `【${date}】总工时 ${fmtTime(dayTotal)}\n`;
    entries.forEach(e => {
      const qty = e.quantity ? `，${e.quantity} ${e.unit}` : '';
      const note = e.note ? `（${e.note}）` : '';
      report += `• ${e.startTime}-${e.endTime} ${e.content || e.taskType}${qty} [${e.taskType}/${e.nature}]${note}\n`;
    });
    report += '\n';
  });
  report += `本周总工时：${fmtTime(weekTotal)}`;
  document.getElementById('reportText').textContent = weekTotal ? report : '本周暂无数据';
}

document.getElementById('copyReportBtn')?.addEventListener('click', () => {
  const text = document.getElementById('reportText').textContent;
  navigator.clipboard.writeText(text).then(() => alert('周报已复制到剪贴板'));
});

// ================= Data Management =================
document.getElementById('exportBtn')?.addEventListener('click', () => {
  const data = JSON.stringify(appData, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `work-timer-backup-${todayStr()}.json`; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn')?.addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile')?.addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data.entries)) throw new Error('格式错误');
    appData = data;
    await saveData();
    renderTypeSelect(); renderToday(); renderTypes();
    alert('导入成功');
  } catch(err) { alert('导入失败：' + err.message); }
  e.target.value = '';
});

document.getElementById('clearBtn')?.addEventListener('click', async () => {
  if (confirm('确定清空所有数据？此操作不可恢复。')) {
    appData = { entries: [], types: ['订单导出','邮件回复','制单发货','评论回复','文档整理'] };
    await saveData();
    renderTypeSelect(); renderToday(); renderTypes();
  }
});

// ================= Float Window =================
async function openFloatWindow() {
  const taskType = document.getElementById('taskType')?.value || '';
  const content = document.getElementById('content')?.value || '';
  await invoke('save_float_task', { task: { taskType, content } });
  if (!await openPipWindow()) {
    showInlineFloat();
  }
}

async function openPipWindow() {
  if (!('documentPictureInPicture' in window)) {
    console.log('PiP not supported');
    return false;
  }
  try {
    const pipWindow = await documentPictureInPicture.requestWindow({
      width: 260,
      height: 180
    });
    // Load pip.html into PiP window
    const response = await fetch('pip.html?v=' + Date.now());
    const html = await response.text();
    pipWindow.document.write(html);
    pipWindow.document.close();
    return true;
  } catch (e) {
    console.error('PiP failed', e);
    return false;
  }
}

async function closeFloatWindow() {
  hideInlineFloat();
}

async function setFloatProperties(alwaysOnTop) {
  // Web app: inline panel is always visible when shown
}

// ================= Init =================

function makeFloatDraggable() {
  const floatApp = document.getElementById('floatApp');
  const header = document.querySelector('.float-header');
  if (!floatApp || !header) return;
  let isDragging = false, startX, startY, startLeft, startTop;
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = floatApp.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    floatApp.style.right = 'auto';
    floatApp.style.bottom = 'auto';
    floatApp.style.left = startLeft + 'px';
    floatApp.style.top = startTop + 'px';
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    floatApp.style.left = (startLeft + e.clientX - startX) + 'px';
    floatApp.style.top = (startTop + e.clientY - startY) + 'px';
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
}

async function init() {
  await loadData();
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('zh-CN', {
    year:'numeric', month:'long', day:'numeric', weekday:'long'
  });

  if (isFloat) {
    document.body.classList.add('float-mode');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('floatApp').classList.remove('hidden');

    // Make whole float window draggable by empty areas
    const floatApp = document.getElementById('floatApp');
    floatApp.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, input, select, textarea, .float-controls, .float-actions, .float-settings')) return;
      if (e.button !== 0) return;
      invoke('start_float_drag').catch(err => console.error('drag failed', err));
    });
    // Ensure interactive controls never trigger window drag
    floatApp.querySelectorAll('button, input, select, textarea').forEach(el => {
      el.addEventListener('mousedown', (e) => e.stopPropagation());
    });

    let floatTask = { taskType: appData.types[0] || '其他', content: '' };
    try {
      const task = await invoke('get_float_task');
      if (task) floatTask = task;
    } catch (e) { console.error('get_float_task failed', e); }
    document.getElementById('floatingTask').textContent = floatTask.content || floatTask.taskType;
    document.getElementById('floatingType').textContent = floatTask.taskType;

    document.getElementById('floatingStart').addEventListener('click', () => {
      console.log('float start clicked', floatTask);
      startTimer(floatTask.taskType, floatTask.content);
    });
    document.getElementById('floatingStop').addEventListener('click', stopTimer);

    let edgeDockEnabled = appData.settings?.edgeDock || false;
    document.getElementById('edgeDockToggleMain').checked = edgeDockEnabled;
    let isHoveringFloat = false;
    const { getCurrentWindow } = window.__TAURI__.window;
    const floatWindow = getCurrentWindow();
    floatWindow.onMoved(() => {
      if (edgeDockEnabled && !isHoveringFloat) {
        invoke('dock_float_window').catch(err => console.error('dock failed', err));
      }
    });
    floatApp.addEventListener('mouseenter', () => {
      isHoveringFloat = true;
      if (edgeDockEnabled) {
        invoke('undock_float_window').catch(err => console.error('undock failed', err));
      }
    });
    floatApp.addEventListener('mouseleave', () => {
      isHoveringFloat = false;
      if (edgeDockEnabled) {
        invoke('dock_float_window').catch(err => console.error('dock failed', err));
      }
    });
    document.getElementById('edgeDockToggleMain').addEventListener('change', (e) => {
      edgeDockEnabled = e.target.checked;
      appData.settings.edgeDock = edgeDockEnabled;
      saveData();
      if (edgeDockEnabled) {
        invoke('dock_float_window').catch(err => console.error('dock failed', err));
      } else {
        invoke('undock_float_window').catch(err => console.error('undock failed', err));
      }
    });

    document.getElementById('floatPinBtn').addEventListener('click', () => {
      const btn = document.getElementById('floatPinBtn');
      const pinned = btn.classList.toggle('active');
      setFloatProperties(pinned);
    });

    document.getElementById('floatCloseBtn').addEventListener('click', closeFloatWindow);
  makeFloatDraggable();

    document.getElementById('opacitySlider').addEventListener('input', (e) => {
      const v = e.target.value;
      document.getElementById('opacityValue').textContent = v + '%';
      document.body.style.opacity = v / 100;
    });
    return;
  }

  // Main window init
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // 内联悬浮面板按钮
  document.getElementById('floatingStart')?.addEventListener('click', () => {
    if (timerState.running) return;
    if ((timerState.elapsed || 0) > 0) { resumeTimer(); return; }
    const type = document.getElementById('taskType')?.value || '';
    const content = document.getElementById('content')?.value.trim() || '';
    startTimer(type, content);
  });
  document.getElementById('floatingPause')?.addEventListener('click', pauseTimer);
  document.getElementById('floatingStop')?.addEventListener('click', stopTimer);
  document.getElementById('floatCloseBtn')?.addEventListener('click', hideInlineFloat);

  const taskTypeSelect = document.getElementById('taskType');
  const inlineTypeInput = document.getElementById('inlineTypeInput');
  document.getElementById('addTypeInlineBtn').addEventListener('click', () => {
    taskTypeSelect.classList.add('hidden');
    inlineTypeInput.classList.remove('hidden');
    inlineTypeInput.value = '';
    inlineTypeInput.focus();
  });
  function saveInlineType() {
    const v = inlineTypeInput.value.trim();
    if (v && addNewType(v)) {
      taskTypeSelect.value = v;
    }
    inlineTypeInput.classList.add('hidden');
    taskTypeSelect.classList.remove('hidden');
  }
  inlineTypeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveInlineType();
  });
  inlineTypeInput.addEventListener('blur', saveInlineType);

  document.getElementById('addTypeBtn').addEventListener('click', () => {
    const input = document.getElementById('newType');
    addNewType(input.value);
    input.value = '';
  });
  document.getElementById('newType').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addTypeBtn').click();
  });

  document.getElementById('openFloatBtn').addEventListener('click', openFloatWindow);

  renderTypeSelect();
  renderToday();

  syncTimerFromStorage();
  await applyPendingTimerState();
  window.addEventListener('focus', () => {
    syncTimerFromStorage();
    applyPendingTimerState();
  });

  // Sync timer state from PiP / other tabs
  setInterval(syncTimerFromStorage, 1000);
  window.addEventListener('storage', async (e) => {
    if (e.key === TIMER_STATE_KEY) syncTimerFromStorage();
    if (e.key === STORAGE_KEY) {
      await loadData();
      renderTypeSelect();
      renderToday();
      renderTypes();
    }
  });
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('kejian-timer');
      bc.onmessage = async (ev) => {
        if (ev.data && ev.data.type === 'timer-state-updated') {
          syncTimerFromStorage();
          applyPendingTimerState();
        }
        if (ev.data && ev.data.type === 'data-updated') {
          await loadData();
          renderTypeSelect();
          renderToday();
          renderTypes();
        }
      };
    }
  } catch (e) {}

  showPage('today');
}

init();

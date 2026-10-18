import { useEffect, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowLeft, ArrowRight, Bell, Check, CheckCheck, CircleHelp,
  Clock3, Heart, Home, Leaf, LineChart, MoreHorizontal,
  Eye, EyeOff, Pause, Pencil, Plus, Settings as SettingsIcon, Sparkles, Trash2, X, CalendarDays,
} from 'lucide-react';

type Habit = {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekdays';
  weekdays: number[];
  reminderTime?: string;
  isActive: boolean;
  completedToday: boolean;
};

const seedHabits: Habit[] = [
  { id: 'water', name: 'Drink a glass of water', description: 'A gentle start before the first coffee.', frequency: 'daily', weekdays: [], reminderTime: '08:00', isActive: true, completedToday: true },
  { id: 'walk', name: 'Take a short walk', description: 'Even ten minutes counts.', frequency: 'daily', weekdays: [], reminderTime: '17:30', isActive: true, completedToday: false },
  { id: 'read', name: 'Read for 15 minutes', frequency: 'daily', weekdays: [], reminderTime: '21:00', isActive: true, completedToday: true },
  { id: 'stretch', name: 'Stretch and reset', description: 'Make a little room in the day.', frequency: 'weekdays', weekdays: [0, 1, 2, 3, 4], reminderTime: '12:30', isActive: true, completedToday: false },
  { id: 'journal', name: 'Write a few lines', frequency: 'daily', weekdays: [], isActive: true, completedToday: false },
];

const navItems = [
  { href: '/', label: 'Today', Icon: Home },
  { href: '/habits', label: 'Habits', Icon: CheckCheck },
  { href: '/progress', label: 'Progress', Icon: LineChart },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
];
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" data-testid="link-logo"><span className="brand-mark"><Leaf size={19} /></span><span>rozgar</span></Link>
      <div className="nav-caption">YOUR SPACE</div>
      <nav className="desktop-nav" aria-label="Main navigation">
        {navItems.map(({ href, label, Icon }) => <Link key={href} href={href} data-testid={`nav-${label.toLowerCase()}`} className={`nav-link ${location === href ? 'active' : ''}`} aria-current={location === href ? 'page' : undefined}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{location === href && <span className="nav-dot" />}</Link>)}
      </nav>
      <div className="sidebar-note"><div className="note-icon"><Heart size={17} /></div><p>Small steps still move you forward.</p><span>Make today yours.</span></div>
      <div className="sidebar-bottom"><span className="avatar">R</span><div><strong>Your space</strong><small>Just for you</small></div><Link href="/settings" className="icon-button mini-setting" aria-label="Open settings" data-testid="button-sidebar-settings"><SettingsIcon size={16} /></Link></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><Link href="/" className="mobile-brand" data-testid="link-mobile-logo"><span className="brand-mark"><Leaf size={18} /></span>rozgar</Link><div className="topbar-meta"><span className="today-label"><span className="status-dot" /> Your personal habit space</span><Link href="/settings" className="top-avatar" aria-label="Settings" data-testid="button-top-settings">R</Link></div></header>
      <div className="page-content">{children}</div>
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(({ href, label, Icon }) => <Link key={href} href={href} data-testid={`mobile-nav-${label.toLowerCase()}`} className={`mobile-nav-item ${location === href ? 'active' : ''}`} aria-current={location === href ? 'page' : undefined}><Icon size={19} strokeWidth={1.9} /><span>{label}</span></Link>)}</nav>
  </div>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function HabitEditor({ initial, onSave, onClose }: { initial?: Habit; onSave: (habit: Habit) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays'>(initial?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [0, 1, 2, 3, 4]);
  const [reminderTime, setReminderTime] = useState(initial?.reminderTime ?? '');
  const [error, setError] = useState('');
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const toggleDay = (day: number) => setWeekdays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) { setError('Add a habit name of at least 2 characters.'); return; }
    if (frequency === 'weekdays' && weekdays.length === 0) { setError('Choose at least one day.'); return; }
    onSave({ id: initial?.id ?? `habit-${Date.now()}`, name: name.trim(), description: description.trim(), frequency, weekdays: frequency === 'daily' ? [] : weekdays, reminderTime: reminderTime || undefined, isActive: initial?.isActive ?? true, completedToday: initial?.completedToday ?? false });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title">
    <div className="dialog-head"><div><div className="eyebrow">{initial ? 'A LITTLE TUNE-UP' : 'MAKE IT YOURS'}</div><h2 id="editor-title">{initial ? 'Edit habit' : 'Add a habit'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog" data-testid="button-close-editor"><X size={19} /></button></div>
    <form onSubmit={submit} noValidate>
      <label className="field-label" htmlFor="habit-name">Habit name</label><input autoFocus id="habit-name" className="form-input" value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="For example, a short morning walk" data-testid="input-habit-name" />
      <label className="field-label" htmlFor="habit-description">A note <span className="optional">Optional</span></label><textarea id="habit-description" className="form-input textarea" value={description} maxLength={140} onChange={(e) => setDescription(e.target.value)} placeholder="What would make this feel easy?" data-testid="input-habit-description" />
      <fieldset className="frequency-field"><legend className="field-label">Repeat</legend><div className="choice-row"><button type="button" className={`choice ${frequency === 'daily' ? 'selected' : ''}`} onClick={() => setFrequency('daily')} data-testid="button-frequency-daily">Every day</button><button type="button" className={`choice ${frequency === 'weekdays' ? 'selected' : ''}`} onClick={() => setFrequency('weekdays')} data-testid="button-frequency-weekdays">Selected days</button></div>
        {frequency === 'weekdays' && <div className="day-picker">{dayOptions.map((day, index) => <button type="button" key={day} onClick={() => toggleDay(index)} className={`day-chip ${weekdays.includes(index) ? 'selected' : ''}`} aria-pressed={weekdays.includes(index)} data-testid={`button-day-${day.toLowerCase()}`}>{day}</button>)}</div>}
      </fieldset>
      <label className="field-label" htmlFor="habit-reminder">Reminder <span className="optional">Optional</span></label><div className="time-input-wrap"><Clock3 size={17} /><input id="habit-reminder" type="time" className="form-input time-input" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} data-testid="input-habit-reminder" /></div>
      {error && <p className="form-error" role="alert" data-testid="error-habit-form">{error}</p>}
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} data-testid="button-cancel-habit">Cancel</button><button type="submit" className="button button-primary" data-testid="button-save-habit">{initial ? 'Save changes' : 'Add habit'}</button></div>
    </form>
  </section></div>;
}

function HabitRow({ habit, onToggle, onEdit, onPause, onDelete, manage = false }: { habit: Habit; onToggle: (id: string) => void; onEdit: (habit: Habit) => void; onPause: (id: string) => void; onDelete: (id: string) => void; manage?: boolean }) {
  const [menu, setMenu] = useState(false);
  return <article className={`habit-row ${habit.completedToday ? 'is-done' : ''}`} data-testid={`habit-row-${habit.id}`}>
    <button id={`habit-check-${habit.id}`} className={`check-button ${habit.completedToday ? 'checked' : ''}`} onClick={() => onToggle(habit.id)} aria-label={`${habit.completedToday ? 'Undo completion of' : 'Mark'} ${habit.name}`} aria-pressed={habit.completedToday} data-testid={`button-check-${habit.id}`}>{habit.completedToday && <Check size={17} strokeWidth={2.6} />}</button>
    <div className="habit-copy"><div className="habit-title-line"><h3>{habit.name}</h3>{!habit.isActive && <span className="tag paused-tag">Paused</span>}</div>{habit.description && <p>{habit.description}</p>}<div className="habit-meta"><span>{habit.frequency === 'daily' ? 'Every day' : habit.weekdays.map((n) => weekdayLabels[n]).join(', ')}</span>{habit.reminderTime && <><span className="meta-dot">·</span><span><Clock3 size={12} /> {formatTime(habit.reminderTime)}</span></>}</div></div>
    <div className="habit-row-actions">{!manage && <span className={`check-state ${habit.completedToday ? 'state-done' : ''}`}>{habit.completedToday ? 'Done for today' : 'A little step'}</span>}
      <div className="menu-wrap"><button className="icon-button more-button" aria-label={`More options for ${habit.name}`} aria-expanded={menu} onClick={() => setMenu(!menu)} data-testid={`button-more-${habit.id}`}><MoreHorizontal size={19} /></button>{menu && <div className="action-menu" role="menu"><button role="menuitem" onClick={() => { onEdit(habit); setMenu(false); }} data-testid={`button-edit-${habit.id}`}><Pencil size={15} /> Edit</button><button role="menuitem" onClick={() => { onPause(habit.id); setMenu(false); }} data-testid={`button-pause-${habit.id}`}><Pause size={15} /> {habit.isActive ? 'Pause' : 'Resume'}</button><button role="menuitem" className="delete-option" onClick={() => { onDelete(habit.id); setMenu(false); }} data-testid={`button-delete-${habit.id}`}><Trash2 size={15} /> Delete</button></div>}</div>
    </div>
  </article>;
}
function formatTime(value: string) { const [h, m] = value.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; }

function TodayPage({ habits, setHabits, editHabit, startAdd }: { habits: Habit[]; setHabits: Dispatch<SetStateAction<Habit[]>>; editHabit: (habit: Habit) => void; startAdd: () => void }) {
  const today = new Date();
  const weekdayIndex = (today.getDay() + 6) % 7;
  const active = habits.filter((habit) => habit.isActive && (habit.frequency === 'daily' || habit.weekdays.includes(weekdayIndex)));
  const complete = active.filter((habit) => habit.completedToday).length;
  const incomplete = active.length - complete;
  const dateLabel = today.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
  const toggle = (id: string) => setHabits((items) => items.map((habit) => habit.id === id ? { ...habit, completedToday: !habit.completedToday } : habit));
  const togglePause = (id: string) => setHabits((items) => items.map((habit) => habit.id === id ? { ...habit, isActive: !habit.isActive } : habit));
  const remove = (id: string) => { if (window.confirm('Delete this habit from your list?')) setHabits((items) => items.filter((habit) => habit.id !== id)); };
  const continueToday = () => {
    const nextHabit = active.find((habit) => !habit.completedToday) ?? active[0];
    const target = (nextHabit && document.getElementById(`habit-check-${nextHabit.id}`))
      ?? document.getElementById('today-empty-action')
      ?? document.getElementById('today-habits');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  };
  return <div className="page-wrap">
    <div className="welcome-line"><div><div className="date-line"><CalendarDays size={15} /> {dateLabel}</div><h1>A fresh day, at your pace.</h1><p>There is no perfect way to begin. Just begin where you are.</p></div><div className="day-mark"><span>YOUR DAY</span><strong>{today.toLocaleDateString('en-IN', { day: '2-digit' })}</strong><small>{today.toLocaleDateString('en-IN', { month: 'short' })}</small></div></div>
    <div className="today-grid">
      <section className="today-main" id="today-habits" tabIndex={-1}>
        {active.length === 0 ? <div className="empty-card"><div className="empty-art"><Leaf size={25} /></div><h2>{habits.length === 0 ? 'Start with one small habit.' : 'Nothing is scheduled for today.'}</h2><p>{habits.length === 0 ? 'Choose a routine that feels kind to your day. You can always add more later.' : 'Your current routines are for other days. Take today as it comes, or add a habit that fits.'}</p><div className="empty-actions">{habits.length > 0 && <Link id="today-empty-action" href="/habits" className="button button-outline" data-testid="link-empty-view-habits">View my habits</Link>}<button id={habits.length === 0 ? 'today-empty-action' : undefined} className="button button-primary" onClick={startAdd} data-testid="button-empty-add">{habits.length === 0 ? 'Add your first habit' : 'Add a habit'} <ArrowRight size={16} /></button></div></div> : <>
          <div className="section-heading"><div><div className="eyebrow">TODAY'S PRACTICE</div><h2>Your habits <span className="count-pill">{active.length}</span></h2></div><button className="button button-outline add-habit" onClick={startAdd} data-testid="button-add-habit"><Plus size={17} /> Add habit</button></div>
          <div className="habit-list">{active.map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={toggle} onEdit={editHabit} onPause={togglePause} onDelete={remove} />)}</div>
          {complete === active.length && active.length > 0 && <div className="all-done" data-testid="status-all-done"><div><Check size={18} /></div><span>That’s everything for today. Let it be enough.</span></div>}
        </>}
      </section>
      <aside className="today-aside">
        <section className="progress-card"><div className="card-title-row"><div><div className="eyebrow">A MOMENT FOR YOU</div><h2>Today's rhythm</h2></div><Sparkles size={18} className="sparkle" /></div>
          <div className="rhythm-number"><strong>{active.length ? complete : '—'}</strong><span>{active.length ? `of ${active.length} habits` : 'none scheduled today'}</span></div>
          <div className="progress-track" role="progressbar" aria-label="Today's completed habits" aria-valuenow={complete} aria-valuemin={0} aria-valuemax={active.length || 1}><span style={{ width: `${active.length ? (complete / active.length) * 100 : 0}%` }} /></div>
          <p className="progress-caption">{active.length === 0 ? 'Your next small step can start here.' : complete === 0 ? 'One small action is a good place to start.' : `${incomplete} ${incomplete === 1 ? 'step' : 'steps'} left, if today has room for them.`}</p>
          <div className="today-divider" /><div className="today-stat"><span>Today’s effort</span><strong>{active.length ? `${Math.round((complete / active.length) * 100)}%` : '—'}</strong></div>
        </section>
        <section className="recovery-card"><div className="recovery-icon"><Heart size={17} /></div><div className="eyebrow">A NOTE TO COME BACK TO</div><h3>Missed a day? You’re still here.</h3><p>Habits are built over time, not in an unbroken line. There’s no catching up to do. Start fresh with the next small thing.</p><button className="text-action" onClick={continueToday} data-testid="button-continue-today">Continue today <ArrowRight size={15} /></button></section>
        <div className="privacy-note"><div className="privacy-lock"><Check size={13} /></div><span>Your progress lives in this session only.<br />Nothing is synced or permanently saved.</span></div>
      </aside>
    </div>
  </div>;
}

function HabitsPage({ habits, setHabits, editHabit, startAdd }: { habits: Habit[]; setHabits: Dispatch<SetStateAction<Habit[]>>; editHabit: (habit: Habit) => void; startAdd: () => void }) {
  const [filter, setFilter] = useState<'active' | 'paused'>('active');
  const displayed = habits.filter((habit) => habit.isActive === (filter === 'active'));
  const changeActive = (id: string) => setHabits((items) => items.map((h) => h.id === id ? { ...h, isActive: !h.isActive } : h));
  const remove = (id: string) => { if (window.confirm('Delete this habit from your list?')) setHabits((items) => items.filter((h) => h.id !== id)); };
  return <div className="page-wrap narrow-wrap"><PageHeading eyebrow="YOUR ROUTINES" title="Habits" subtitle="A few good things, shaped around the life you have." action={<button className="button button-primary" onClick={startAdd} data-testid="button-manage-add"><Plus size={17} /> New habit</button>} />
    <div className="tab-switch" role="tablist" aria-label="Habit status"><button role="tab" aria-selected={filter === 'active'} className={filter === 'active' ? 'selected' : ''} onClick={() => setFilter('active')} data-testid="tab-active">Active <span>{habits.filter(h => h.isActive).length}</span></button><button role="tab" aria-selected={filter === 'paused'} className={filter === 'paused' ? 'selected' : ''} onClick={() => setFilter('paused')} data-testid="tab-paused">Paused <span>{habits.filter(h => !h.isActive).length}</span></button></div>
    {displayed.length ? <div className="habit-list manage-list">{displayed.map(h => <HabitRow key={h.id} habit={h} manage onToggle={(id) => setHabits(items => items.map(item => item.id === id ? { ...item, completedToday: !item.completedToday } : item))} onEdit={editHabit} onPause={changeActive} onDelete={remove} />)}</div> : <div className="empty-card smaller-empty"><div className="empty-art"><CheckCheck size={22} /></div><h2>{filter === 'active' ? 'Nothing active just yet.' : 'No habits on pause.'}</h2><p>{filter === 'active' ? 'Create a small routine that supports the way you want to feel.' : 'Habits you pause will be waiting here whenever you’re ready.'}</p>{filter === 'active' && <button className="button button-primary" onClick={startAdd} data-testid="button-active-empty-add"><Plus size={16} /> Add a habit</button>}</div>}
    <p className="quiet-footnote">Your routines are held in this open session only.</p>
  </div>;
}

function ProgressPage({ habits }: { habits: Habit[] }) {
  const date = new Date();
  const mondayOffset = (date.getDay() + 6) % 7;
  const todayIndex = mondayOffset;
  const active = habits.filter(h => h.isActive && (h.frequency === 'daily' || h.weekdays.includes(todayIndex)));
  const count = active.filter(h => h.completedToday).length;
  const trackedPercent = active.length ? Math.round((count / active.length) * 100) : 0;
  const days = weekdayLabels.map((label, index) => {
    const delta = index - todayIndex;
    const d = new Date(date); d.setDate(date.getDate() + delta);
    const isToday = index === todayIndex;
    return { label, date: d, isToday, recorded: isToday, completed: isToday ? count : 0 };
  });
  const weekLabel = (() => { const start = new Date(date); start.setDate(date.getDate() - todayIndex); const end = new Date(start); end.setDate(start.getDate() + 6); return `${start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`; })();
  return <div className="page-wrap narrow-wrap"><PageHeading eyebrow="A LOOK BACK, GENTLY" title="Progress" subtitle="Notice what you’ve made room for. No streaks, no score to chase." />
    <section className="week-card"><div className="week-card-top"><div><div className="eyebrow">THIS WEEK</div><h2>{weekLabel}</h2></div><div className="week-card-meta"><span className="session-tag"><span className="status-dot" /> Session view</span><div className="week-percent"><strong>{trackedPercent}%</strong><span>tracked<br />this week</span></div></div></div>
      <div className="week-grid">{days.map((day, i) => <div className={`week-day ${day.isToday ? 'current-day' : ''}`} key={day.label} data-testid={`week-day-${day.label.toLowerCase()}`}><span className="week-name">{day.label}</span><span className="week-date">{day.date.getDate()}</span>{day.recorded ? <><span className={`week-mark ${day.completed > 0 ? 'mark-done' : 'mark-today'}`}>{day.completed > 0 ? <Check size={16} /> : <span />}</span><span className="week-status">{day.completed > 0 ? `${day.completed} done` : 'Today'}</span></> : <><span className="week-mark mark-untracked"><span>—</span></span><span className="week-status untracked-label">Not recorded</span></>}</div>)}</div>
      <div className="week-legend"><span><i className="legend-dot recorded" /> Current session data</span><span><i className="legend-dot untracked" /> Not recorded</span><span className="week-metric-note">Percentage reflects today only</span></div>
    </section>
    <div className="progress-summary"><div className="summary-icon"><CheckCheck size={19} /></div><div><div className="eyebrow">TODAY, SO FAR</div><h3>{count} of {active.length} habits checked off</h3><p>{count > 0 ? 'A little consistency, in the middle of real life.' : 'A fresh opportunity is always just one small step away.'}</p></div></div>
    <section className="history-card"><div className="history-heading"><div><div className="eyebrow">YOUR HISTORY</div><h2>Room to begin again</h2></div><Clock3 size={18} /></div><div className="history-empty"><div className="history-line"><span className="history-point filled" /><span className="history-line-segment" /><span className="history-point" /></div><div><strong>Today is the first page.</strong><p>Past activity isn’t recorded in this preview. Your check-offs reflect this session and today only.</p></div></div></section>
    <div className="data-note"><CircleHelp size={16} /><span>Only the current day is tracked in this preview. Other days are marked “Not recorded” rather than estimated.</span></div>
  </div>;
}

function SettingsPage() {
  const [name, setName] = useState('Riya');
  const [reminders, setReminders] = useState(false);
  const [message, setMessage] = useState('');
  return <div className="page-wrap narrow-wrap"><PageHeading eyebrow="MAKE IT FEEL LIKE YOURS" title="Settings" subtitle="A few preferences for your personal space." />
    <section className="settings-section"><div className="settings-section-head"><div className="settings-icon"><span className="avatar big-avatar">R</span></div><div><div className="eyebrow">YOUR PROFILE</div><h2>A name for this space</h2><p>Just for this preview session.</p></div></div>
      <form className="settings-form" onSubmit={(e) => { e.preventDefault(); setMessage('Profile updated for this session.'); }}><label className="field-label" htmlFor="profile-name">Name</label><input id="profile-name" className="form-input" value={name} onChange={(e) => { setName(e.target.value); setMessage(''); }} maxLength={50} data-testid="input-profile-name" /><button className="button button-outline" type="submit" data-testid="button-save-profile">Update name</button></form>
    </section>
    <section className="settings-section reminder-section"><div className="settings-section-head"><div className="settings-icon"><Bell size={20} /></div><div><div className="eyebrow">A GENTLE NUDGE</div><h2>Reminders</h2><p>Set a preference for this session.</p></div></div>
      <div className="setting-toggle-row"><div><strong>Habit reminders</strong><span>Reminders are a preference only in this preview.</span></div><button className={`toggle ${reminders ? 'on' : ''}`} role="switch" aria-checked={reminders} onClick={() => { setReminders(!reminders); setMessage(''); }} aria-label="Toggle habit reminders" data-testid="toggle-reminders"><span /></button></div><div className="settings-info"><Bell size={15} /> No notifications will be sent. Reminder times on habits are for display only.</div>
    </section>
    <section className="settings-section"><div className="settings-section-head"><div><div className="eyebrow">ACCOUNT PREVIEW</div><h2>Authentication is not connected</h2><p>These links open form previews only; no account will be created or signed in.</p></div></div><div className="account-preview-links"><Link className="button button-outline" href="/sign-up" data-testid="link-settings-sign-up">Create account</Link><Link className="button button-quiet" href="/sign-in" data-testid="link-settings-sign-in">Sign in</Link><Link className="account-welcome-link" href="/welcome" data-testid="link-settings-welcome">View welcome screen</Link></div></section>
    {message && <p className="settings-message" role="status" data-testid="status-settings">{message}</p>}
    <div className="settings-callout"><div><div className="eyebrow">A NOTE ABOUT THIS PREVIEW</div><p>Your preferences and habits are held in memory for this session. Refreshing may clear them; nothing is synced or permanently saved.</p></div></div>
    <Link href="/" className="button button-primary return-button" data-testid="link-return-dashboard"><ArrowLeft size={16} /> Return to today</Link>
  </div>;
}

function WelcomePage({ onComplete }: { onComplete: (selectedHabits: string[]) => void }) {
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const ideas = ['Move a little', 'Read something', 'Drink more water', 'Make time to pause', 'Write a few lines'];
  const toggle = (idea: string) => setChosen(current => current.includes(idea) ? current.filter(item => item !== idea) : [...current, idea]);
  return <div className="welcome-page"><Link href="/" className="brand welcome-brand" data-testid="link-welcome-logo"><span className="brand-mark"><Leaf size={19} /></span><span>rozgar</span></Link><div className="welcome-card">
    <div className="welcome-progress"><span style={{ width: step ? '100%' : '50%' }} /></div>
    {step === 0 ? <><div className="welcome-symbol"><Leaf size={25} /></div><div className="eyebrow">A SOFTER WAY TO BUILD ROUTINES</div><h1>Build habits that fit your life.</h1><p>Stay consistent, one day at a time.</p><div className="welcome-points"><span><Check size={15} /> Start small and make it yours</span><span><Check size={15} /> Pick up again whenever you’re ready</span><span><Check size={15} /> Your progress is yours to shape</span></div><button className="button button-primary welcome-next" onClick={() => setStep(1)} data-testid="button-welcome-begin">Get started <ArrowRight size={16} /></button><Link className="welcome-login-link" href="/sign-in" data-testid="link-welcome-sign-in">I already have an account</Link><p className="welcome-session-note">This prototype keeps choices in your current session only.</p></> :
      <><div className="eyebrow">STEP 2 OF 2</div><h1>What would feel good to begin?</h1><p>Pick any that speak to you. You can change your mind later.</p><div className="idea-list">{ideas.map((idea) => <button key={idea} onClick={() => toggle(idea)} className={`idea-item ${chosen.includes(idea) ? 'chosen' : ''}`} aria-pressed={chosen.includes(idea)} data-testid={`button-idea-${idea.toLowerCase().replaceAll(' ', '-')}`}><span className="idea-check">{chosen.includes(idea) && <Check size={15} />}</span>{idea}</button>)}</div><div className="welcome-actions"><button className="button button-quiet" onClick={() => setStep(0)} data-testid="button-welcome-back"><ArrowLeft size={15} /> Back</button><button type="button" className="button button-primary" onClick={() => onComplete(chosen)} data-testid="button-welcome-finish">Continue to habits <ArrowRight size={16} /></button></div><Link className="welcome-login-link" href="/sign-up" data-testid="link-welcome-sign-up">Create an account</Link><p className="welcome-session-note">Selected ideas are added to this session only. You can edit them anytime.</p></>}
    </div><Link href="/" className="welcome-skip" data-testid="link-welcome-skip">Skip for now</Link></div>;
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'sign-up' && name.trim().length < 2) { setError('Please enter your name (at least 2 characters).'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address to continue.'); return; }
    if (password.length < 8) { setError('Enter a password with at least 8 characters.'); return; }
    setIsChecking(true);
    window.setTimeout(() => {
      setIsChecking(false);
      setPassword('');
      setShowPassword(false);
      setError('Preview only: authentication is not connected. Your details were not sent or saved.');
    }, 250);
  }
  const signUp = mode === 'sign-up';
  return <div className="auth-page"><Link href="/" className="brand auth-brand" data-testid="link-auth-logo"><span className="brand-mark"><Leaf size={19} /></span><span>rozgar</span></Link><div className="auth-panel"><div className="auth-visual"><div className="visual-circle circle-one" /><div className="visual-circle circle-two" /><div className="visual-copy"><span className="eyebrow">A SPACE THAT MEETS YOU WHERE YOU ARE</span><h2>Small by design.<br />Steady by choice.</h2><p>A thoughtful place for the routines that make your days feel more like yours.</p><span className="visual-rule" /></div><span className="visual-foot">A GENTLER KIND OF PROGRESS</span></div>
      <div className="auth-form-side"><div className="eyebrow">{signUp ? 'BEGIN WITH A NAME' : 'WELCOME BACK'}</div><h1>{signUp ? 'Create your space' : 'Come on in'}</h1><p className="auth-intro">{signUp ? 'A fresh start, at your own pace.' : 'Your routines are ready when you are.'}</p><div className="preview-warning"><CircleHelp size={16} /><span>Preview only — authentication is not connected. This form will not create an account or sign you in.</span></div>
        <form onSubmit={submit} noValidate>{signUp && <><label className="field-label" htmlFor="auth-name">Your name</label><input id="auth-name" className="form-input" placeholder="How should we call you?" value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setError(''); }} data-testid="input-auth-name" /></>}
          <label className="field-label" htmlFor="auth-email">Email address</label><input id="auth-email" className="form-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} data-testid="input-auth-email" />
          <label className="field-label" htmlFor="auth-password">Password</label><div className="password-field"><input id="auth-password" className="form-input" type={showPassword ? 'text' : 'password'} autoComplete={signUp ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} data-testid="input-auth-password" /><button className="password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} data-testid="button-toggle-password">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><p className="auth-password-hint">At least 8 characters. This preview will not send or save it.</p>
          {isChecking && <p className="form-status" role="status" data-testid="status-auth-checking">Checking the form locally…</p>}
          {error && <p className={`form-error ${error.startsWith('Preview only:') ? 'preview-error' : ''}`} role={error.startsWith('Preview only:') ? 'status' : 'alert'} data-testid="error-auth-form">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={isChecking} data-testid="button-auth-submit">{isChecking ? 'Checking form…' : signUp ? 'Preview sign up' : 'Preview sign in'} {!isChecking && <ArrowRight size={16} />}</button>
        </form><div className="auth-switch">{signUp ? 'Already have a space?' : 'New to Rozgar?'} <Link href={signUp ? '/sign-in' : '/sign-up'} data-testid="link-auth-switch">{signUp ? 'Sign in' : 'Create one'}</Link></div><div className="auth-back"><Link href="/" data-testid="link-auth-dashboard"><ArrowLeft size={14} /> Back to dashboard</Link></div>
      </div></div><p className="auth-footer">A frontend-only prototype. Your form details are not saved.</p></div>;
}

function NotFound() { return <AppShell><div className="page-wrap not-found"><div className="eyebrow">THIS PAGE ISN'T HERE</div><h1>Nothing to see just yet.</h1><p>Let's get you back to today's small steps.</p><Link href="/" className="button button-primary" data-testid="link-not-found-home"><ArrowLeft size={16} /> Back to today</Link></div></AppShell>; }

function AppRouter() {
  const [habits, setHabits] = useState<Habit[]>(seedHabits);
  const [, setLocation] = useLocation();
  const [editor, setEditor] = useState<{ open: boolean; habit?: Habit }>({ open: false });
  const openNew = () => setEditor({ open: true });
  const openEdit = (habit: Habit) => setEditor({ open: true, habit });
  const save = (habit: Habit) => { setHabits(items => editor.habit ? items.map(item => item.id === habit.id ? habit : item) : [...items, habit]); setEditor({ open: false }); };
  const completeWelcome = (selectedHabits: string[]) => {
    const additions: Habit[] = selectedHabits.map((name, index) => ({
      id: `welcome-${Date.now()}-${index}`,
      name,
      frequency: 'daily',
      weekdays: [],
      isActive: true,
      completedToday: false,
    }));
    setHabits((items) => {
      const existingNames = new Set(items.map((habit) => habit.name.trim().toLowerCase()));
      return [...items, ...additions.filter((habit) => !existingNames.has(habit.name.trim().toLowerCase()))];
    });
    setLocation('/habits');
  };
  return <>
    <Switch>
    <Route path="/welcome"><WelcomePage onComplete={completeWelcome} /></Route>
    <Route path="/sign-up"><AuthPage mode="sign-up" /></Route>
    <Route path="/sign-in"><AuthPage mode="sign-in" /></Route>
    <Route path="/"><AppShell><TodayPage habits={habits} setHabits={setHabits} editHabit={openEdit} startAdd={openNew} /></AppShell></Route>
    <Route path="/habits"><AppShell><HabitsPage habits={habits} setHabits={setHabits} editHabit={openEdit} startAdd={openNew} /></AppShell></Route>
    <Route path="/progress"><AppShell><ProgressPage habits={habits} /></AppShell></Route>
    <Route path="/settings"><AppShell><SettingsPage /></AppShell></Route>
    <Route><NotFound /></Route>
    </Switch>
    {editor.open && <HabitEditor initial={editor.habit} onSave={save} onClose={() => setEditor({ open: false })} />}
  </>;
}

function App() {
  return <WouterRouter><AppRouter /></WouterRouter>;
}
export default App;

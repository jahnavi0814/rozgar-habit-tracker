import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth,
  useClerk,
  useUser,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { dark } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  getGetMeQueryKey,
  getGetWeeklyProgressQueryKey,
  getListHabitsQueryKey,
  useCreateHabit,
  useDeleteHabit,
  useGetMe,
  useGetWeeklyProgress,
  useListHabits,
  useSetHabitCheckIn,
  useUpdateHabit,
  useUpdateMe,
} from '@workspace/api-client-react';
import type {
  createHabit as createHabitRequest,
  getMe as getMeRequest,
  getWeeklyProgress as getWeeklyProgressRequest,
  listHabits as listHabitsRequest,
  updateMe as updateMeRequest,
} from '@workspace/api-client-react';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowLeft, ArrowRight, Bell, Check, CheckCheck, CircleHelp,
  Clock3, Heart, Home, Leaf, LineChart, MoreHorizontal,
  LogOut, Pause, Pencil, Plus, Settings as SettingsIcon, Sparkles, Trash2, X, CalendarDays,
} from 'lucide-react';

type Habit = Awaited<ReturnType<typeof listHabitsRequest>>[number];
type HabitInput = Parameters<typeof createHabitRequest>[0];
type Profile = Awaited<ReturnType<typeof getMeRequest>>;
type ProfileInput = Parameters<typeof updateMeRequest>[0];
type WeekProgress = Awaited<ReturnType<typeof getWeeklyProgressRequest>>;

const navItems = [
  { href: '/', label: 'Today', Icon: Home },
  { href: '/habits', label: 'Habits', Icon: CheckCheck },
  { href: '/progress', label: 'Progress', Icon: LineChart },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
];
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const onboardingStorageKey = 'rozgar:onboarding-habits';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkAppearance = {
  theme: dark,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#5b8cff',
    colorForeground: '#eef2f8',
    colorMutedForeground: '#a0a9b9',
    colorDanger: '#f07178',
    colorBackground: '#171b22',
    colorInput: '#11151b',
    colorInputForeground: '#eef2f8',
    colorNeutral: '#394150',
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'clerk-root',
    cardBox: 'clerk-card-box',
    card: 'clerk-card',
    footer: 'clerk-footer',
    headerTitle: 'clerk-title',
    headerSubtitle: 'clerk-muted',
    formFieldLabel: 'clerk-label',
    formFieldInput: 'clerk-input',
    formButtonPrimary: 'clerk-submit',
    socialButtonsBlockButton: 'clerk-social',
    socialButtonsBlockButtonText: 'clerk-social-copy',
    footerActionText: 'clerk-muted',
    footerActionLink: 'clerk-link',
    dividerText: 'clerk-muted',
    alertText: 'clerk-alert',
  },
};

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function AppShell({ children, actionError }: { children: ReactNode; actionError?: string }) {
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
      <div className="page-content">{actionError && <p className="form-error api-action-error" role="alert" data-testid="error-api-action">{actionError}</p>}{children}</div>
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(({ href, label, Icon }) => <Link key={href} href={href} data-testid={`mobile-nav-${label.toLowerCase()}`} className={`mobile-nav-item ${location === href ? 'active' : ''}`} aria-current={location === href ? 'page' : undefined}><Icon size={19} strokeWidth={1.9} /><span>{label}</span></Link>)}</nav>
  </div>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function HabitEditor({ initial, onSave, onClose }: { initial?: Habit; onSave: (habit: HabitInput) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays'>(initial?.frequency ?? 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [0, 1, 2, 3, 4]);
  const [reminderTime, setReminderTime] = useState(initial?.reminderTime ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const toggleDay = (day: number) => setWeekdays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) { setError('Add a habit name of at least 2 characters.'); return; }
    if (frequency === 'weekdays' && weekdays.length === 0) { setError('Choose at least one day.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        frequency,
        weekdays: frequency === 'daily' ? [] : weekdays,
        reminderTime: reminderTime || null,
      });
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
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
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={saving} data-testid="button-cancel-habit">Cancel</button><button type="submit" className="button button-primary" disabled={saving} data-testid="button-save-habit">{saving ? 'Saving…' : initial ? 'Save changes' : 'Add habit'}</button></div>
    </form>
  </section></div>;
}

function HabitRow({ habit, onToggle, onEdit, onPause, onDelete, manage = false }: { habit: Habit; onToggle: (id: string, completed: boolean) => void; onEdit: (habit: Habit) => void; onPause: (id: string, isActive: boolean) => void; onDelete: (id: string) => void; manage?: boolean }) {
  const [menu, setMenu] = useState(false);
  return <article className={`habit-row ${habit.completedToday ? 'is-done' : ''}`} data-testid={`habit-row-${habit.id}`}>
    <button id={`habit-check-${habit.id}`} className={`check-button ${habit.completedToday ? 'checked' : ''}`} onClick={() => onToggle(habit.id, !habit.completedToday)} aria-label={`${habit.completedToday ? 'Undo completion of' : 'Mark'} ${habit.name}`} aria-pressed={habit.completedToday} data-testid={`button-check-${habit.id}`}>{habit.completedToday && <Check size={17} strokeWidth={2.6} />}</button>
    <div className="habit-copy"><div className="habit-title-line"><h3>{habit.name}</h3>{!habit.isActive && <span className="tag paused-tag">Paused</span>}</div>{habit.description && <p>{habit.description}</p>}<div className="habit-meta"><span>{habit.frequency === 'daily' ? 'Every day' : habit.weekdays.map((n) => weekdayLabels[n]).join(', ')}</span>{habit.reminderTime && <><span className="meta-dot">·</span><span><Clock3 size={12} /> {formatTime(habit.reminderTime)}</span></>}</div></div>
    <div className="habit-row-actions">{!manage && <span className={`check-state ${habit.completedToday ? 'state-done' : ''}`}>{habit.completedToday ? 'Done for today' : 'A little step'}</span>}
      <div className="menu-wrap"><button className="icon-button more-button" aria-label={`More options for ${habit.name}`} aria-expanded={menu} onClick={() => setMenu(!menu)} data-testid={`button-more-${habit.id}`}><MoreHorizontal size={19} /></button>{menu && <div className="action-menu" role="menu"><button role="menuitem" onClick={() => { onEdit(habit); setMenu(false); }} data-testid={`button-edit-${habit.id}`}><Pencil size={15} /> Edit</button><button role="menuitem" onClick={() => { onPause(habit.id, !habit.isActive); setMenu(false); }} data-testid={`button-pause-${habit.id}`}><Pause size={15} /> {habit.isActive ? 'Pause' : 'Resume'}</button><button role="menuitem" className="delete-option" onClick={() => { onDelete(habit.id); setMenu(false); }} data-testid={`button-delete-${habit.id}`}><Trash2 size={15} /> Delete</button></div>}</div>
    </div>
  </article>;
}
function formatTime(value: string) { const [h, m] = value.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; }

function TodayPage({ habits, editHabit, startAdd, toggleCheckIn, setHabitActive, deleteHabit }: { habits: Habit[]; editHabit: (habit: Habit) => void; startAdd: () => void; toggleCheckIn: (id: string, completed: boolean) => void; setHabitActive: (id: string, isActive: boolean) => void; deleteHabit: (id: string) => void }) {
  const today = new Date();
  const active = habits.filter((habit) => habit.scheduledToday);
  const complete = active.filter((habit) => habit.completedToday).length;
  const incomplete = active.length - complete;
  const dateLabel = today.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
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
           <div className="habit-list">{active.map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={toggleCheckIn} onEdit={editHabit} onPause={setHabitActive} onDelete={deleteHabit} />)}</div>
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
         <div className="privacy-note"><div className="privacy-lock"><Check size={13} /></div><span>Your progress is saved to your account.<br />Only you can see your routines.</span></div>
      </aside>
    </div>
  </div>;
}

function HabitsPage({ habits, editHabit, startAdd, toggleCheckIn, setHabitActive, deleteHabit }: { habits: Habit[]; editHabit: (habit: Habit) => void; startAdd: () => void; toggleCheckIn: (id: string, completed: boolean) => void; setHabitActive: (id: string, isActive: boolean) => void; deleteHabit: (id: string) => void }) {
  const [filter, setFilter] = useState<'active' | 'paused'>('active');
  const displayed = habits.filter((habit) => habit.isActive === (filter === 'active'));
  return <div className="page-wrap narrow-wrap"><PageHeading eyebrow="YOUR ROUTINES" title="Habits" subtitle="A few good things, shaped around the life you have." action={<button className="button button-primary" onClick={startAdd} data-testid="button-manage-add"><Plus size={17} /> New habit</button>} />
    <div className="tab-switch" role="tablist" aria-label="Habit status"><button role="tab" aria-selected={filter === 'active'} className={filter === 'active' ? 'selected' : ''} onClick={() => setFilter('active')} data-testid="tab-active">Active <span>{habits.filter(h => h.isActive).length}</span></button><button role="tab" aria-selected={filter === 'paused'} className={filter === 'paused' ? 'selected' : ''} onClick={() => setFilter('paused')} data-testid="tab-paused">Paused <span>{habits.filter(h => !h.isActive).length}</span></button></div>
     {displayed.length ? <div className="habit-list manage-list">{displayed.map(h => <HabitRow key={h.id} habit={h} manage onToggle={toggleCheckIn} onEdit={editHabit} onPause={setHabitActive} onDelete={deleteHabit} />)}</div> : <div className="empty-card smaller-empty"><div className="empty-art"><CheckCheck size={22} /></div><h2>{filter === 'active' ? 'Nothing active just yet.' : 'No habits on pause.'}</h2><p>{filter === 'active' ? 'Create a small routine that supports the way you want to feel.' : 'Habits you pause will be waiting here whenever you’re ready.'}</p>{filter === 'active' && <button className="button button-primary" onClick={startAdd} data-testid="button-active-empty-add"><Plus size={16} /> Add a habit</button>}</div>}
     <p className="quiet-footnote">Your routines are saved to your account and stay private to you.</p>
  </div>;
}

function dateFromLocalKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function ProgressPage({ progress }: { progress: WeekProgress }) {
  const days = progress.days.map((day, index) => ({
    label: day.weekday,
    date: dateFromLocalKey(day.localDate),
    isToday: index === progress.days.length - 1,
    recorded: day.recorded,
    completed: day.completedCount,
    scheduled: day.scheduledCount,
    percent: day.percent,
  }));
  const today = days[days.length - 1];
  const weekLabel = `${days[0].date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${today.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  return <div className="page-wrap narrow-wrap"><PageHeading eyebrow="A LOOK BACK, GENTLY" title="Progress" subtitle="Notice what you’ve made room for. No streaks, no score to chase." />
    <section className="week-card"><div className="week-card-top"><div><div className="eyebrow">LAST SEVEN DAYS</div><h2>{weekLabel}</h2></div><div className="week-card-meta"><span className="session-tag"><span className="status-dot" /> Saved check-ins · {progress.recordedDays}/7 days</span><div className="week-percent"><strong>{progress.percent}%</strong><span>complete<br />this week</span></div></div></div>
      <div className="week-grid">{days.map((day, i) => <div className={`week-day ${day.isToday ? 'current-day' : ''}`} key={`${day.label}-${day.date.toISOString()}`} data-testid={`week-day-${day.label.toLowerCase()}-${i}`}><span className="week-name">{day.label}</span><span className="week-date">{day.date.getDate()}</span>{day.recorded ? <><span className={`week-mark ${day.completed > 0 ? 'mark-done' : 'mark-today'}`}>{day.completed > 0 ? <Check size={16} /> : <span />}</span><span className="week-status">{day.completed} done</span></> : <><span className="week-mark mark-untracked"><span>—</span></span><span className="week-status untracked-label">Not recorded</span></>}</div>)}</div>
      <div className="week-legend"><span><i className="legend-dot recorded" /> Saved check-ins</span><span><i className="legend-dot untracked" /> Not recorded</span><span className="week-metric-note">Completion across scheduled habits</span></div>
    </section>
    <div className="progress-summary"><div className="summary-icon"><CheckCheck size={19} /></div><div><div className="eyebrow">TODAY, SO FAR</div><h3>{today.completed} of {today.scheduled} habits checked off</h3><p>{today.completed > 0 ? 'A little consistency, in the middle of real life.' : 'A fresh opportunity is always just one small step away.'}</p></div></div>
    <section className="history-card"><div className="history-heading"><div><div className="eyebrow">YOUR HISTORY</div><h2>Room to begin again</h2></div><Clock3 size={18} /></div><div className="history-empty"><div className="history-line"><span className={`history-point ${progress.recordedDays ? 'filled' : ''}`} /><span className="history-line-segment" /><span className="history-point" /></div><div><strong>{progress.recordedDays ? `${progress.recordedDays} of the last seven days have check-ins.` : 'No check-ins in this week yet.'}</strong><p>Only saved daily records are shown; unrecorded days aren’t estimated.</p></div></div></section>
    <div className="data-note"><CircleHelp size={16} /><span>Progress is calculated from saved check-ins and your local calendar days ({progress.timeZone}).</span></div>
  </div>;
}

function SettingsPage({ profile, clerkName, onUpdateProfile }: { profile: Profile; clerkName?: string | null; onUpdateProfile: (input: ProfileInput) => Promise<void> }) {
  const [name, setName] = useState(profile.displayName ?? clerkName ?? '');
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remindersSaving, setRemindersSaving] = useState(false);
  const { signOut } = useClerk();
  useEffect(() => {
    setName(profile.displayName ?? clerkName ?? '');
  }, [profile.displayName, clerkName]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageIsError(false);
    try {
      await onUpdateProfile({ displayName: name.trim() || null });
      setMessage('Your profile was updated.');
    } catch (error) {
      setMessage(errorMessage(error));
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  async function toggleReminders() {
    setRemindersSaving(true);
    setMessage('');
    setMessageIsError(false);
    try {
      await onUpdateProfile({ remindersEnabled: !profile.remindersEnabled });
      setMessage('Reminder preference saved.');
    } catch (error) {
      setMessage(errorMessage(error));
      setMessageIsError(true);
    } finally {
      setRemindersSaving(false);
    }
  }

  const initial = (profile.displayName ?? clerkName ?? 'R').trim().slice(0, 1).toUpperCase() || 'R';
  return <div className="page-wrap narrow-wrap"><PageHeading eyebrow="MAKE IT FEEL LIKE YOURS" title="Settings" subtitle="A few preferences for your personal space." />
    <section className="settings-section"><div className="settings-section-head"><div className="settings-icon"><span className="avatar big-avatar">{initial}</span></div><div><div className="eyebrow">YOUR PROFILE</div><h2>A name for this space</h2><p>Saved to your account · {profile.timeZone}</p></div></div>
      <form className="settings-form" onSubmit={saveProfile}><label className="field-label" htmlFor="profile-name">Name</label><input id="profile-name" className="form-input" value={name} onChange={(e) => { setName(e.target.value); setMessage(''); }} maxLength={50} data-testid="input-profile-name" /><button className="button button-outline" type="submit" disabled={saving} data-testid="button-save-profile">{saving ? 'Saving…' : 'Update name'}</button></form>
    </section>
    <section className="settings-section reminder-section"><div className="settings-section-head"><div className="settings-icon"><Bell size={20} /></div><div><div className="eyebrow">A GENTLE NUDGE</div><h2>Reminders</h2><p>Your preference is saved with your account.</p></div></div>
      <div className="setting-toggle-row"><div><strong>Habit reminders</strong><span>This preference is saved; notifications are not sent yet.</span></div><button className={`toggle ${profile.remindersEnabled ? 'on' : ''}`} role="switch" aria-checked={profile.remindersEnabled} disabled={remindersSaving} onClick={() => void toggleReminders()} aria-label="Toggle habit reminders" data-testid="toggle-reminders"><span /></button></div><div className="settings-info"><Bell size={15} /> Reminder times on habits are saved for display. No notifications are delivered.</div>
    </section>
    <section className="settings-section"><div className="settings-section-head"><div><div className="eyebrow">ACCOUNT</div><h2>Your account is connected</h2><p>Sign out when you’re finished with your private space.</p></div></div><div className="account-preview-links"><button className="button button-outline" type="button" onClick={() => void signOut({ redirectUrl: basePath || '/' })} data-testid="button-sign-out"><LogOut size={15} /> Sign out</button><Link className="account-welcome-link" href="/welcome" data-testid="link-settings-welcome">View welcome screen</Link></div></section>
    {message && <p className={messageIsError ? 'form-error' : 'settings-message'} role={messageIsError ? 'alert' : 'status'} data-testid="status-settings">{message}</p>}
    <div className="settings-callout"><div><div className="eyebrow">A NOTE ABOUT REMINDERS</div><p>Your account, profile, habits, and check-ins are saved. Reminder toggles are preferences only; notification delivery needs a separate service.</p></div></div>
    <Link href="/" className="button button-primary return-button" data-testid="link-return-dashboard"><ArrowLeft size={16} /> Return to today</Link>
  </div>;
}

function readPendingOnboarding(): string[] {
  try {
    const pending = window.sessionStorage.getItem(onboardingStorageKey);
    const parsed: unknown = pending ? JSON.parse(pending) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function WelcomePage({ onComplete, isSignedIn }: { onComplete: (selectedHabits: string[]) => Promise<void>; isSignedIn: boolean }) {
  const [initialChoices] = useState(readPendingOnboarding);
  const [step, setStep] = useState(initialChoices.length ? 1 : 0);
  const [chosen, setChosen] = useState<string[]>(initialChoices);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const ideas = ['Move a little', 'Read something', 'Drink more water', 'Make time to pause', 'Write a few lines'];
  const toggle = (idea: string) => setChosen(current => current.includes(idea) ? current.filter(item => item !== idea) : [...current, idea]);
  async function finish() {
    setError('');
    setSubmitting(true);
    try {
      await onComplete(chosen);
    } catch (finishError) {
      setError(errorMessage(finishError));
    } finally {
      setSubmitting(false);
    }
  }
  return <div className="welcome-page"><Link href="/" className="brand welcome-brand" data-testid="link-welcome-logo"><span className="brand-mark"><Leaf size={19} /></span><span>rozgar</span></Link><div className="welcome-card">
    <div className="welcome-progress"><span style={{ width: step ? '100%' : '50%' }} /></div>
    {step === 0 ? <><div className="welcome-symbol"><Leaf size={25} /></div><div className="eyebrow">A SOFTER WAY TO BUILD ROUTINES</div><h1>Build habits that fit your life.</h1><p>Stay consistent, one day at a time.</p><div className="welcome-points"><span><Check size={15} /> Start small and make it yours</span><span><Check size={15} /> Pick up again whenever you’re ready</span><span><Check size={15} /> Your progress is yours to shape</span></div><button className="button button-primary welcome-next" onClick={() => setStep(1)} data-testid="button-welcome-begin">Get started <ArrowRight size={16} /></button><Link className="welcome-login-link" href="/sign-in" data-testid="link-welcome-sign-in">I already have an account</Link><p className="welcome-session-note">Create an account to save your choices and routines.</p></> :
      <><div className="eyebrow">STEP 2 OF 2</div><h1>What would feel good to begin?</h1><p>Pick any that speak to you. You can change your mind later.</p><div className="idea-list">{ideas.map((idea) => <button key={idea} onClick={() => toggle(idea)} className={`idea-item ${chosen.includes(idea) ? 'chosen' : ''}`} aria-pressed={chosen.includes(idea)} data-testid={`button-idea-${idea.toLowerCase().replaceAll(' ', '-')}`}><span className="idea-check">{chosen.includes(idea) && <Check size={15} />}</span>{idea}</button>)}</div>{error && <p className="form-error" role="alert" data-testid="error-onboarding">{error}</p>}<div className="welcome-actions"><button className="button button-quiet" onClick={() => setStep(0)} disabled={submitting} data-testid="button-welcome-back"><ArrowLeft size={15} /> Back</button><button type="button" className="button button-primary" onClick={() => void finish()} disabled={submitting} data-testid="button-welcome-finish">{submitting ? 'Saving…' : 'Continue to habits'} <ArrowRight size={16} /></button></div><Link className="welcome-login-link" href="/sign-up" data-testid="link-welcome-sign-up">Create an account</Link><p className="welcome-session-note">{isSignedIn ? 'Your selected habits will be saved to your account.' : 'Sign up to save your selected habits to your account.'}</p></>}
    </div><Link href={isSignedIn ? '/' : '/sign-up'} className="welcome-skip" data-testid="link-welcome-skip">Skip for now</Link></div>;
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const signUp = mode === 'sign-up';
  return <div className="auth-page"><Link href="/" className="brand auth-brand" data-testid="link-auth-logo"><span className="brand-mark"><Leaf size={19} /></span><span>rozgar</span></Link><div className="auth-panel"><div className="auth-visual"><div className="visual-circle circle-one" /><div className="visual-circle circle-two" /><div className="visual-copy"><span className="eyebrow">A SPACE THAT MEETS YOU WHERE YOU ARE</span><h2>Small by design.<br />Steady by choice.</h2><p>A thoughtful place for the routines that make your days feel more like yours.</p><span className="visual-rule" /></div><span className="visual-foot">A GENTLER KIND OF PROGRESS</span></div>
      <div className="auth-form-side">{signUp
        ? <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        : <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />}
        <div className="auth-back"><Link href="/welcome" data-testid="link-auth-dashboard"><ArrowLeft size={14} /> Back to welcome</Link></div>
      </div></div><p className="auth-footer">Your account and routines are private to you.</p></div>;
}

function NotFound() { return <AppShell><div className="page-wrap not-found"><div className="eyebrow">THIS PAGE ISN'T HERE</div><h1>Nothing to see just yet.</h1><p>Let's get you back to today's small steps.</p><Link href="/" className="button button-primary" data-testid="link-not-found-home"><ArrowLeft size={16} /> Back to today</Link></div></AppShell>; }

function AppRouter() {
  const [location, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const currentTimeZone = browserTimeZone();
  const userIsSignedIn = isLoaded && isSignedIn === true;
  const profileQuery = useGetMe(
    { timeZone: currentTimeZone },
    {
      query: {
        queryKey: getGetMeQueryKey({ timeZone: currentTimeZone }),
        enabled: userIsSignedIn,
        staleTime: 60_000,
        retry: false,
      },
    },
  );
  const profileReady = userIsSignedIn && profileQuery.isSuccess;
  const habitsQuery = useListHabits({
    query: {
      queryKey: getListHabitsQueryKey(),
      enabled: profileReady,
      retry: false,
    },
  });
  const progressQuery = useGetWeeklyProgress({
    query: {
      queryKey: getGetWeeklyProgressQueryKey(),
      enabled: profileReady,
      retry: false,
    },
  });
  const queryClient = useQueryClient();
  const updateMeMutation = useUpdateMe();
  const createHabitMutation = useCreateHabit();
  const updateHabitMutation = useUpdateHabit();
  const deleteHabitMutation = useDeleteHabit();
  const checkInMutation = useSetHabitCheckIn();
  const habits = habitsQuery.data ?? [];
  const [actionError, setActionError] = useState('');
  const [editor, setEditor] = useState<{ open: boolean; habit?: Habit }>({ open: false });
  const openNew = () => setEditor({ open: true });
  const openEdit = (habit: Habit) => setEditor({ open: true, habit });
  const invalidateHabitsAndProgress = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetWeeklyProgressQueryKey() }),
    ]);
  };

  useEffect(() => {
    if (!userIsSignedIn) return;
    if (location === '/sign-up' || location.startsWith('/sign-up/')) {
      setLocation(readPendingOnboarding().length ? '/welcome' : '/');
    } else if (location === '/sign-in' || location.startsWith('/sign-in/')) {
      setLocation('/');
    }
  }, [location, setLocation, userIsSignedIn]);

  async function saveHabit(input: HabitInput) {
    setActionError('');
    try {
      if (editor.habit) {
        await updateHabitMutation.mutateAsync({ habitId: editor.habit.id, data: input });
      } else {
        await createHabitMutation.mutateAsync({ data: input });
      }
      await invalidateHabitsAndProgress();
      setEditor({ open: false });
    } catch (error) {
      setActionError(errorMessage(error));
      throw error;
    }
  }

  async function toggleCheckIn(habitId: string, completed: boolean) {
    setActionError('');
    try {
      await checkInMutation.mutateAsync({ habitId, data: { completed } });
      await invalidateHabitsAndProgress();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  async function setHabitActive(habitId: string, isActive: boolean) {
    setActionError('');
    try {
      await updateHabitMutation.mutateAsync({ habitId, data: { isActive } });
      await invalidateHabitsAndProgress();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  async function removeHabit(habitId: string) {
    if (!window.confirm('Delete this habit and its saved check-ins?')) return;
    setActionError('');
    try {
      await deleteHabitMutation.mutateAsync({ habitId });
      await invalidateHabitsAndProgress();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  async function updateProfile(input: ProfileInput) {
    setActionError('');
    try {
      const updated = await updateMeMutation.mutateAsync({ data: input });
      queryClient.setQueryData(getGetMeQueryKey({ timeZone: currentTimeZone }), updated);
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      await invalidateHabitsAndProgress();
    } catch (error) {
      setActionError(errorMessage(error));
      throw error;
    }
  }

  async function completeWelcome(selectedHabits: string[]) {
    if (!userIsSignedIn) {
      window.sessionStorage.setItem(onboardingStorageKey, JSON.stringify(selectedHabits));
      setLocation('/sign-up');
      return;
    }

    setActionError('');
    try {
      const existingNames = new Set(habits.map((habit) => habit.name.trim().toLocaleLowerCase()));
      for (const name of selectedHabits) {
        if (existingNames.has(name.trim().toLocaleLowerCase())) continue;
        await createHabitMutation.mutateAsync({
          data: { name, description: '', frequency: 'daily', weekdays: [], reminderTime: null },
        });
      }
      window.sessionStorage.removeItem(onboardingStorageKey);
      await invalidateHabitsAndProgress();
      setLocation('/habits');
    } catch (error) {
      setActionError(errorMessage(error));
      await queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
      throw error;
    }
  }

  const retryProfileAndHabits = () => {
    void profileQuery.refetch();
    void habitsQuery.refetch();
  };
  const privatePage = (content: ReactNode, isLoading: boolean, error: unknown, retry: () => void) => {
    if (!isLoaded) {
      return <AppShell><div className="page-wrap"><p className="form-status" role="status">Loading your space…</p></div></AppShell>;
    }
    if (!userIsSignedIn) return <Redirect to="/" />;
    if (profileQuery.isLoading || isLoading) {
      return <AppShell><div className="page-wrap"><p className="form-status" role="status">Loading your saved routines…</p></div></AppShell>;
    }
    if (profileQuery.isError || error || !profileQuery.data) {
      const message = errorMessage(profileQuery.error ?? error);
      return <AppShell><div className="page-wrap narrow-wrap"><div className="empty-card smaller-empty" role="alert"><h2>Your space couldn’t be loaded.</h2><p>{message}</p><button className="button button-primary" onClick={retry} data-testid="button-retry-api">Try again</button></div></div></AppShell>;
    }
    return <AppShell actionError={actionError}>{content}</AppShell>;
  };

  return <>
    <Switch>
    <Route path="/sign-up/*?"><AuthPage mode="sign-up" /></Route>
    <Route path="/sign-in/*?"><AuthPage mode="sign-in" /></Route>
    <Route path="/welcome"><WelcomePage onComplete={completeWelcome} isSignedIn={userIsSignedIn} /></Route>
    <Route path="/">{userIsSignedIn
      ? privatePage(<TodayPage habits={habits} editHabit={openEdit} startAdd={openNew} toggleCheckIn={toggleCheckIn} setHabitActive={setHabitActive} deleteHabit={removeHabit} />, habitsQuery.isLoading, habitsQuery.error, retryProfileAndHabits)
      : <WelcomePage onComplete={completeWelcome} isSignedIn={false} />}</Route>
    <Route path="/habits">{privatePage(<HabitsPage habits={habits} editHabit={openEdit} startAdd={openNew} toggleCheckIn={toggleCheckIn} setHabitActive={setHabitActive} deleteHabit={removeHabit} />, habitsQuery.isLoading, habitsQuery.error, retryProfileAndHabits)}</Route>
    <Route path="/progress">{privatePage(<ProgressPage progress={progressQuery.data ?? { timeZone: currentTimeZone, days: [], totalCompleted: 0, totalScheduled: 0, percent: 0, recordedDays: 0 }} />, progressQuery.isLoading, progressQuery.error, () => { void profileQuery.refetch(); void progressQuery.refetch(); })}</Route>
    <Route path="/settings">{privatePage(<SettingsPage profile={profileQuery.data ?? { id: '', displayName: null, timeZone: currentTimeZone, remindersEnabled: false }} clerkName={user?.fullName} onUpdateProfile={updateProfile} />, false, undefined, retryProfileAndHabits)}</Route>
    <Route><NotFound /></Route>
    </Switch>
    {userIsSignedIn && editor.open && <HabitEditor initial={editor.habit} onSave={saveHabit} onClose={() => setEditor({ open: false })} />}
  </>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        queryClient.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Come on in', subtitle: 'Your routines are ready when you are.' } },
      signUp: { start: { title: 'Create your space', subtitle: 'A fresh start, at your own pace.' } },
    }}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator />
      <AppRouter />
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}
export default App;

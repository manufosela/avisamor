import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { auth, functions } from '../lib/firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

interface DashboardData {
  totalGroups: number;
  totalMembers: number;
  totalBeacons: number;
  alertsToday: number;
  alertsWeek: number;
  totalAlerts: number;
}

interface GroupData {
  groupId: string;
  name: string;
  planId: string;
  blocked: boolean;
  membersCount: number;
  beaconsCount: number;
  lastAlertAt: unknown;
}

type View = 'login' | 'dashboard' | 'groups';

@customElement('admin-app')
export class AdminApp extends LitElement {
  static styles = css`
    :host { display: block; min-height: 100dvh; }
    .container { max-width: 1000px; margin: 0 auto; padding: 24px 16px; }
    h1 { font-size: 1.5rem; margin: 0; }
    h2 { font-size: 1.2rem; color: #374151; }

    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; background: #1f2937; color: #fff;
    }
    .header button { background: #dc2626; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }

    .nav { display: flex; gap: 8px; padding: 16px 0; }
    .nav button {
      padding: 8px 16px; border: 1px solid #d1d5db; border-radius: 6px;
      background: #fff; cursor: pointer; font-size: 0.9rem;
    }
    .nav button.active { background: #1f2937; color: #fff; border-color: #1f2937; }

    .login-form {
      max-width: 360px; margin: 80px auto; padding: 32px;
      background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .login-form h2 { text-align: center; margin-bottom: 24px; }
    .login-form input {
      width: 100%; padding: 10px 12px; margin-bottom: 12px;
      border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem;
    }
    .login-form button {
      width: 100%; padding: 12px; background: #1f2937; color: #fff;
      border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;
    }

    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px; margin: 16px 0;
    }
    .stat-card {
      background: #fff; padding: 16px; border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05); text-align: center;
    }
    .stat-value { font-size: 2rem; font-weight: 800; color: #1f2937; }
    .stat-label { font-size: 0.8rem; color: #6b7280; margin-top: 4px; }

    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-size: 0.8rem; color: #6b7280; text-transform: uppercase; }
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;
    }
    .badge-free { background: #e5e7eb; color: #374151; }
    .badge-familia { background: #dbeafe; color: #1e40af; }
    .badge-residencia { background: #d1fae5; color: #065f46; }
    .badge-blocked { background: #fecaca; color: #991b1b; }

    .actions button {
      padding: 4px 10px; border: 1px solid #d1d5db; border-radius: 4px;
      background: #fff; cursor: pointer; font-size: 0.8rem; margin-right: 4px;
    }
    .actions button:hover { background: #f3f4f6; }

    .error { color: #dc2626; font-size: 0.9rem; margin: 8px 0; }
    .loading { text-align: center; padding: 40px; color: #6b7280; }
  `;

  @state() private _view: View = 'login';
  @state() private _email = '';
  @state() private _password = '';
  @state() private _error = '';
  @state() private _loading = false;
  @state() private _dashboard: DashboardData | null = null;
  @state() private _groups: GroupData[] = [];
  @state() private _isAdmin = false;

  connectedCallback() {
    super.connectedCallback();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        if (token.claims['admin'] === true) {
          this._isAdmin = true;
          this._view = 'dashboard';
          this._loadDashboard();
        } else {
          this._error = 'No tienes permisos de administrador';
          await signOut(auth);
        }
      }
    });
  }

  private async _login() {
    this._error = '';
    this._loading = true;
    try {
      await signInWithEmailAndPassword(auth, this._email, this._password);
    } catch (e: unknown) {
      this._error = `Error de login: ${(e as Error).message}`;
    }
    this._loading = false;
  }

  private async _logout() {
    await signOut(auth);
    this._isAdmin = false;
    this._view = 'login';
    this._dashboard = null;
    this._groups = [];
  }

  private async _loadDashboard() {
    this._loading = true;
    try {
      const fn = httpsCallable(functions, 'adminGetDashboard');
      const result = await fn();
      this._dashboard = result.data as DashboardData;
    } catch (e: unknown) {
      this._error = `Error: ${(e as Error).message}`;
    }
    this._loading = false;
  }

  private async _loadGroups() {
    this._loading = true;
    try {
      const fn = httpsCallable(functions, 'adminListGroups');
      const result = await fn();
      this._groups = (result.data as { groups: GroupData[] }).groups;
    } catch (e: unknown) {
      this._error = `Error: ${(e as Error).message}`;
    }
    this._loading = false;
  }

  private async _updateGroup(groupId: string, updates: Record<string, unknown>) {
    try {
      const fn = httpsCallable(functions, 'adminUpdateGroup');
      await fn({ groupId, ...updates });
      this._loadGroups();
    } catch (e: unknown) {
      this._error = `Error: ${(e as Error).message}`;
    }
  }

  private _navigateTo(view: View) {
    this._view = view;
    this._error = '';
    if (view === 'dashboard') this._loadDashboard();
    if (view === 'groups') this._loadGroups();
  }

  render() {
    if (this._view === 'login') return this._renderLogin();
    return html`
      <div class="header">
        <h1>Avisamor Admin</h1>
        <button @click=${this._logout}>Cerrar sesión</button>
      </div>
      <div class="container">
        <div class="nav">
          <button class=${this._view === 'dashboard' ? 'active' : ''} @click=${() => this._navigateTo('dashboard')}>Dashboard</button>
          <button class=${this._view === 'groups' ? 'active' : ''} @click=${() => this._navigateTo('groups')}>Grupos</button>
        </div>
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
        ${this._loading ? html`<div class="loading">Cargando...</div>` : nothing}
        ${this._view === 'dashboard' ? this._renderDashboard() : nothing}
        ${this._view === 'groups' ? this._renderGroups() : nothing}
      </div>
    `;
  }

  private _renderLogin() {
    return html`
      <div class="login-form">
        <h2>Avisamor Admin</h2>
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
        <input type="email" placeholder="Email" .value=${this._email} @input=${(e: Event) => this._email = (e.target as HTMLInputElement).value} />
        <input type="password" placeholder="Contraseña" .value=${this._password} @input=${(e: Event) => this._password = (e.target as HTMLInputElement).value} @keyup=${(e: KeyboardEvent) => e.key === 'Enter' && this._login()} />
        <button @click=${this._login} ?disabled=${this._loading}>${this._loading ? 'Entrando...' : 'Entrar'}</button>
      </div>
    `;
  }

  private _renderDashboard() {
    if (!this._dashboard) return nothing;
    const d = this._dashboard;
    return html`
      <h2>Dashboard</h2>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${d.totalGroups}</div><div class="stat-label">Grupos</div></div>
        <div class="stat-card"><div class="stat-value">${d.totalMembers}</div><div class="stat-label">Miembros</div></div>
        <div class="stat-card"><div class="stat-value">${d.totalBeacons}</div><div class="stat-label">Beacons</div></div>
        <div class="stat-card"><div class="stat-value">${d.alertsToday}</div><div class="stat-label">Alertas hoy</div></div>
        <div class="stat-card"><div class="stat-value">${d.alertsWeek}</div><div class="stat-label">Alertas semana</div></div>
        <div class="stat-card"><div class="stat-value">${d.totalAlerts}</div><div class="stat-label">Alertas total</div></div>
      </div>
    `;
  }

  private _renderGroups() {
    return html`
      <h2>Grupos (${this._groups.length})</h2>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Plan</th><th>Miembros</th><th>Beacons</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          ${this._groups.map(g => html`
            <tr>
              <td>${g.name}</td>
              <td><span class="badge badge-${g.planId}">${g.planId}</span></td>
              <td>${g.membersCount}</td>
              <td>${g.beaconsCount}</td>
              <td>${g.blocked ? html`<span class="badge badge-blocked">Bloqueado</span>` : 'Activo'}</td>
              <td class="actions">
                ${g.blocked
                  ? html`<button @click=${() => this._updateGroup(g.groupId, { blocked: false })}>Desbloquear</button>`
                  : html`<button @click=${() => this._updateGroup(g.groupId, { blocked: true, blockedReason: 'Bloqueado por admin' })}>Bloquear</button>`
                }
                <button @click=${() => this._updateGroup(g.groupId, { planId: 'familia' })}>→ Familia</button>
                <button @click=${() => this._updateGroup(g.groupId, { planId: 'residencia' })}>→ Residencia</button>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-app': AdminApp;
  }
}

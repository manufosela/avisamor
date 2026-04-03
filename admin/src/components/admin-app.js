import { LitElement, html, css, nothing } from 'lit';
import { auth, functions, googleProvider } from '../lib/firebase.js';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

export class AdminApp extends LitElement {
  static properties = {
    _view: { state: true },
    _email: { state: true },
    _password: { state: true },
    _error: { state: true },
    _loading: { state: true },
    _dashboard: { state: true },
    _groups: { state: true },
    _plans: { state: true },
    _setupComplete: { state: true },
    _newPlan: { state: true },
  };

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
    input, select {
      width: 100%; padding: 10px 12px; margin-bottom: 12px;
      border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; box-sizing: border-box;
    }
    .login-form button, .setup-form button.primary {
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
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
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

    .setup-form {
      max-width: 500px; margin: 40px auto; padding: 32px;
      background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .setup-form h2 { margin-top: 0; }
    .plan-card {
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 16px; margin-bottom: 12px;
    }
    .plan-card h3 { margin: 0 0 8px; }
    .plan-card p { margin: 0; font-size: 0.85rem; color: #6b7280; }
    .inline-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    label { display: block; font-size: 0.85rem; color: #374151; margin-bottom: 4px; }
    .checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .checkbox-row input { width: auto; margin: 0; }
    .btn-add {
      padding: 8px 16px; background: #16a34a; color: #fff; border: none;
      border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 8px;
    }
    .btn-secondary {
      padding: 8px 16px; background: #fff; color: #374151; border: 1px solid #d1d5db;
      border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 8px;
    }
  `;

  constructor() {
    super();
    this._view = 'login';
    this._email = '';
    this._password = '';
    this._error = '';
    this._loading = false;
    this._dashboard = null;
    this._groups = [];
    this._plans = [];
    this._setupComplete = null;
    this._newPlan = this._emptyPlan();
  }

  _emptyPlan() {
    return { planId: '', name: '', priceMonthly: 0, order: 0, maxGroups: 1, maxMembers: 5, maxBeacons: 3, supervisionPanel: false, adminPanel: false };
  }

  connectedCallback() {
    super.connectedCallback();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        if (token.claims['admin'] === true) {
          await this._checkSetup();
        } else {
          this._error = 'No tienes permisos de administrador';
          await signOut(auth);
        }
      }
    });
  }

  async _checkSetup() {
    try {
      const fn = httpsCallable(functions, 'adminCheckSetup');
      const result = await fn();
      this._setupComplete = result.data.setupComplete;
      if (this._setupComplete) {
        this._view = 'dashboard';
        this._loadDashboard();
      } else {
        this._view = 'setup';
      }
    } catch (e) {
      this._error = `Error: ${e.message}`;
    }
  }

  async _login() {
    this._error = '';
    this._loading = true;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      this._error = `Error de login: ${e.message}`;
    }
    this._loading = false;
  }

  async _logout() {
    await signOut(auth);
    this._view = 'login';
    this._dashboard = null;
    this._groups = [];
    this._plans = [];
    this._setupComplete = null;
  }

  async _createPlan(planData) {
    this._loading = true;
    this._error = '';
    try {
      const fn = httpsCallable(functions, 'adminCreatePlan');
      await fn({
        planId: planData.planId,
        name: planData.name,
        priceMonthly: planData.priceMonthly,
        order: planData.order,
        limits: {
          maxGroups: planData.maxGroups,
          maxMembers: planData.maxMembers,
          maxBeacons: planData.maxBeacons,
          supervisionPanel: planData.supervisionPanel,
          adminPanel: planData.adminPanel,
        },
      });
      await this._loadPlans();
    } catch (e) {
      this._error = `Error: ${e.message}`;
    }
    this._loading = false;
  }

  async _loadDashboard() {
    this._loading = true;
    try {
      const fn = httpsCallable(functions, 'adminGetDashboard');
      const result = await fn();
      this._dashboard = result.data;
    } catch (e) {
      this._error = `Error: ${e.message}`;
    }
    this._loading = false;
  }

  async _loadGroups() {
    this._loading = true;
    try {
      const fn = httpsCallable(functions, 'adminListGroups');
      const result = await fn();
      this._groups = result.data.groups;
    } catch (e) {
      this._error = `Error: ${e.message}`;
    }
    this._loading = false;
  }

  async _loadPlans() {
    try {
      const fn = httpsCallable(functions, 'getPlans');
      const result = await fn();
      this._plans = result.data.plans;
    } catch (e) {
      this._error = `Error: ${e.message}`;
    }
  }

  async _updateGroup(groupId, updates) {
    try {
      const fn = httpsCallable(functions, 'adminUpdateGroup');
      await fn({ groupId, ...updates });
      this._loadGroups();
    } catch (e) {
      this._error = `Error: ${e.message}`;
    }
  }

  _navigateTo(view) {
    this._view = view;
    this._error = '';
    if (view === 'dashboard') this._loadDashboard();
    if (view === 'groups') this._loadGroups();
    if (view === 'plans') this._loadPlans();
  }

  render() {
    if (this._view === 'login') return this._renderLogin();
    if (this._view === 'setup') return this._renderSetup();
    return html`
      <div class="header">
        <h1>Avisamor Admin</h1>
        <button @click=${this._logout}>Cerrar sesión</button>
      </div>
      <div class="container">
        <div class="nav">
          <button class=${this._view === 'dashboard' ? 'active' : ''} @click=${() => this._navigateTo('dashboard')}>Dashboard</button>
          <button class=${this._view === 'groups' ? 'active' : ''} @click=${() => this._navigateTo('groups')}>Grupos</button>
          <button class=${this._view === 'plans' ? 'active' : ''} @click=${() => this._navigateTo('plans')}>Planes</button>
        </div>
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
        ${this._loading ? html`<div class="loading">Cargando...</div>` : nothing}
        ${this._view === 'dashboard' ? this._renderDashboard() : nothing}
        ${this._view === 'groups' ? this._renderGroups() : nothing}
        ${this._view === 'plans' ? this._renderPlans() : nothing}
      </div>
    `;
  }

  _renderLogin() {
    return html`
      <div class="login-form">
        <h2>AvisaBlue Admin</h2>
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
        <button @click=${this._login} ?disabled=${this._loading} style="display:flex;align-items:center;gap:12px;justify-content:center;">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style="width:24px;height:24px;" />
          ${this._loading ? 'Entrando...' : 'Iniciar sesión con Google'}
        </button>
      </div>
    `;
  }

  _renderSetup() {
    return html`
      <div class="setup-form">
        <h2>Setup inicial</h2>
        <p>Configura los planes de la plataforma. Necesitas al menos un plan para que los usuarios puedan crear grupos.</p>
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}

        ${this._plans.length > 0 ? html`
          <h3>Planes creados:</h3>
          ${this._plans.map(p => html`
            <div class="plan-card">
              <h3>${p.name} (${p.planId})</h3>
              <p>${p.priceMonthly}€/mes — ${p.limits.maxGroups === -1 ? '∞' : p.limits.maxGroups} grupos, ${p.limits.maxMembers} miembros, ${p.limits.maxBeacons === -1 ? '∞' : p.limits.maxBeacons} beacons</p>
            </div>
          `)}
          <button class="primary" @click=${() => { this._setupComplete = true; this._view = 'dashboard'; this._loadDashboard(); }}>Finalizar setup</button>
        ` : nothing}

        <h3 style="margin-top:24px">Crear plan:</h3>
        ${this._renderPlanForm()}
      </div>
    `;
  }

  _renderPlanForm() {
    const p = this._newPlan;
    return html`
      <div class="inline-fields">
        <div>
          <label>ID (sin espacios)</label>
          <input type="text" placeholder="free" .value=${p.planId} @input=${(e) => this._newPlan = {...p, planId: e.target.value}} />
        </div>
        <div>
          <label>Nombre</label>
          <input type="text" placeholder="Gratuito" .value=${p.name} @input=${(e) => this._newPlan = {...p, name: e.target.value}} />
        </div>
      </div>
      <div class="inline-fields">
        <div>
          <label>Precio €/mes</label>
          <input type="number" .value=${p.priceMonthly} @input=${(e) => this._newPlan = {...p, priceMonthly: Number(e.target.value)}} />
        </div>
        <div>
          <label>Orden</label>
          <input type="number" .value=${p.order} @input=${(e) => this._newPlan = {...p, order: Number(e.target.value)}} />
        </div>
      </div>
      <div class="inline-fields">
        <div>
          <label>Máx. grupos (-1 = ilimitado)</label>
          <input type="number" .value=${p.maxGroups} @input=${(e) => this._newPlan = {...p, maxGroups: Number(e.target.value)}} />
        </div>
        <div>
          <label>Máx. miembros</label>
          <input type="number" .value=${p.maxMembers} @input=${(e) => this._newPlan = {...p, maxMembers: Number(e.target.value)}} />
        </div>
      </div>
      <div class="inline-fields">
        <div>
          <label>Máx. beacons (-1 = ilimitado)</label>
          <input type="number" .value=${p.maxBeacons} @input=${(e) => this._newPlan = {...p, maxBeacons: Number(e.target.value)}} />
        </div>
        <div></div>
      </div>
      <div class="checkbox-row">
        <input type="checkbox" .checked=${p.supervisionPanel} @change=${(e) => this._newPlan = {...p, supervisionPanel: e.target.checked}} />
        <label>Panel de supervisión</label>
      </div>
      <div class="checkbox-row">
        <input type="checkbox" .checked=${p.adminPanel} @change=${(e) => this._newPlan = {...p, adminPanel: e.target.checked}} />
        <label>Panel admin</label>
      </div>
      <button class="btn-add" @click=${() => { this._createPlan(this._newPlan); this._newPlan = this._emptyPlan(); }} ?disabled=${this._loading || !p.planId || !p.name}>
        ${this._loading ? 'Creando...' : 'Crear plan'}
      </button>
    `;
  }

  _renderDashboard() {
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

  _renderGroups() {
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
                ${this._plans.map(p => p.planId !== g.planId ? html`<button @click=${() => this._updateGroup(g.groupId, { planId: p.planId })}>→ ${p.name}</button>` : nothing)}
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  _renderPlans() {
    return html`
      <h2>Planes (${this._plans.length})</h2>
      <table>
        <thead>
          <tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Grupos</th><th>Miembros</th><th>Beacons</th><th>Supervisión</th></tr>
        </thead>
        <tbody>
          ${this._plans.map(p => html`
            <tr>
              <td>${p.planId}</td>
              <td>${p.name}</td>
              <td>${p.priceMonthly}€/mes</td>
              <td>${p.limits.maxGroups === -1 ? '∞' : p.limits.maxGroups}</td>
              <td>${p.limits.maxMembers}</td>
              <td>${p.limits.maxBeacons === -1 ? '∞' : p.limits.maxBeacons}</td>
              <td>${p.limits.supervisionPanel ? 'Sí' : 'No'}</td>
            </tr>
          `)}
        </tbody>
      </table>
      <details>
        <summary class="btn-add" style="cursor:pointer; display:inline-block; margin-top:16px;">+ Crear nuevo plan</summary>
        <div style="margin-top:12px;">
          ${this._renderPlanForm()}
        </div>
      </details>
    `;
  }
}

customElements.define('admin-app', AdminApp);

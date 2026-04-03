import { LitElement, html, css, nothing } from 'lit';
import { auth, functions, googleProvider } from '../lib/firebase.js';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

const call = (name) => httpsCallable(functions, name);

export class AdminApp extends LitElement {
  static properties = {
    _view: { state: true },
    _error: { state: true },
    _loading: { state: true },
    _groups: { state: true },
    _plans: { state: true },
    _users: { state: true },
    _selectedGroup: { state: true },
    _setupComplete: { state: true },
    _newPlan: { state: true },
    _createGroupName: { state: true },
    _createGroupPlan: { state: true },
  };

  static styles = css`
    :host { display: block; min-height: 100dvh; font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; color: #1f2937; }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: #1f2937; color: #fff; }
    .header h1 { margin: 0; font-size: 1.3rem; }
    .header button { background: #dc2626; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
    .nav { display: flex; gap: 4px; padding: 12px 24px; background: #fff; border-bottom: 1px solid #e5e7eb; }
    .nav button { padding: 8px 16px; border: none; border-radius: 6px; background: transparent; cursor: pointer; font-size: 0.9rem; color: #6b7280; }
    .nav button.active { background: #1f2937; color: #fff; }
    .container { max-width: 1100px; margin: 0 auto; padding: 20px 16px; }
    h2 { font-size: 1.15rem; color: #374151; margin: 0 0 16px; }
    h3 { font-size: 1rem; color: #374151; margin: 16px 0 8px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-size: 0.9rem; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #f3f4f6; }
    th { background: #f9fafb; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 600; }
    .badge-free { background: #e5e7eb; color: #374151; }
    .badge-familia { background: #dbeafe; color: #1e40af; }
    .badge-residencia { background: #d1fae5; color: #065f46; }
    .badge-blocked { background: #fecaca; color: #991b1b; }
    .badge-admin { background: #fef3c7; color: #92400e; }
    .badge-alerter { background: #fee2e2; color: #991b1b; }
    .badge-responder { background: #d1fae5; color: #065f46; }
    .act button { padding: 3px 8px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; font-size: 0.78rem; margin: 0 2px; }
    .act button:hover { background: #f3f4f6; }
    .act .danger { color: #dc2626; border-color: #fecaca; }
    .act .danger:hover { background: #fef2f2; }
    .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
    .btn-primary { background: #1f2937; color: #fff; }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-sm { padding: 6px 12px; font-size: 0.82rem; }
    .error { color: #dc2626; font-size: 0.9rem; margin: 8px 0; }
    .loading { text-align: center; padding: 32px; color: #6b7280; }
    .back { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 0.9rem; padding: 0; margin-bottom: 12px; }
    .back:hover { color: #374151; }
    .meta { font-size: 0.85rem; color: #6b7280; margin: 4px 0; }
    .mono { font-family: monospace; font-size: 0.9rem; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; font-size: 0.85rem; color: #1e40af; margin: 8px 0; }
    .login-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100dvh; }
    .login-form { max-width: 360px; padding: 32px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .login-form h2 { margin-bottom: 24px; }
    .login-form button { width: 100%; padding: 12px; background: #fff; border: 2px solid #d1d5db; border-radius: 8px; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .login-form button:hover { border-color: #4285f4; }
    input, select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box; }
    .form-row { display: flex; gap: 8px; align-items: end; margin-bottom: 12px; }
    .form-row > * { flex: 1; }
    .form-row label { display: block; font-size: 0.8rem; color: #6b7280; margin-bottom: 4px; }
    .form-row input, .form-row select { width: 100%; }
    details { margin-top: 16px; }
    summary { cursor: pointer; font-weight: 600; font-size: 0.9rem; color: #16a34a; padding: 8px 0; }
    .inline-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .inline-fields label { display: block; font-size: 0.8rem; color: #6b7280; margin-bottom: 4px; }
    .inline-fields input, .inline-fields select { width: 100%; }
    .checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 0.85rem; }
    .checkbox-row input { width: auto; margin: 0; }
    .section { margin-bottom: 24px; }
  `;

  constructor() {
    super();
    this._view = 'login';
    this._error = '';
    this._loading = false;
    this._groups = [];
    this._plans = [];
    this._users = [];
    this._selectedGroup = null;
    this._setupComplete = null;
    this._newPlan = this._emptyPlan();
    this._createGroupName = '';
    this._createGroupPlan = 'free';
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
      const r = await call('adminCheckSetup')();
      this._setupComplete = r.data.setupComplete;
      this._view = this._setupComplete ? 'groups' : 'setup';
      if (this._setupComplete) { this._loadGroups(); this._loadPlans(); }
    } catch (e) { this._error = e.message; }
  }

  async _login() {
    this._error = '';
    try { await signInWithPopup(auth, googleProvider); } catch (e) { this._error = e.message; }
  }

  async _logout() {
    await signOut(auth);
    this._view = 'login';
    this._groups = []; this._plans = []; this._users = []; this._selectedGroup = null;
  }

  async _loadGroups() {
    this._loading = true;
    try { this._groups = (await call('adminListGroups')()).data.groups; } catch (e) { this._error = e.message; }
    this._loading = false;
  }

  async _loadPlans() {
    try { this._plans = (await call('getPlans')()).data.plans; } catch (e) { this._error = e.message; }
  }

  async _loadUsers() {
    this._loading = true;
    try { this._users = (await call('adminListUsers')()).data.users; } catch (e) { this._error = e.message; }
    this._loading = false;
  }

  async _loadGroupDetail(groupId) {
    this._loading = true;
    try {
      this._selectedGroup = (await call('adminGetGroup')({ groupId })).data;
      this._view = 'group-detail';
    } catch (e) { this._error = e.message; }
    this._loading = false;
  }

  async _createGroup() {
    if (!this._createGroupName.trim()) return;
    this._loading = true;
    try {
      await call('adminCreateGroupFromAdmin')({ groupName: this._createGroupName.trim(), planId: this._createGroupPlan });
      this._createGroupName = '';
      this._loadGroups();
    } catch (e) { this._error = e.message; }
    this._loading = false;
  }

  async _updateGroup(groupId, updates) {
    try { await call('adminUpdateGroup')({ groupId, ...updates }); this._loadGroups(); } catch (e) { this._error = e.message; }
  }

  async _deleteGroup(groupId, name) {
    if (!confirm(`¿Eliminar "${name}" y todos sus datos?`)) return;
    try { await call('adminDeleteGroup')({ groupId }); this._loadGroups(); this._view = 'groups'; } catch (e) { this._error = e.message; }
  }

  async _updateMember(memberId, role) {
    try { await call('adminUpdateMember')({ memberId, role }); this._loadGroupDetail(this._selectedGroup.group.groupId); } catch (e) { this._error = e.message; }
  }

  async _deleteMember(memberId) {
    if (!confirm('¿Eliminar este miembro del grupo?')) return;
    try { await call('adminDeleteMember')({ memberId }); this._loadGroupDetail(this._selectedGroup.group.groupId); } catch (e) { this._error = e.message; }
  }

  async _deleteBeacon(beaconId) {
    if (!confirm('¿Eliminar este beacon?')) return;
    try { await call('adminDeleteBeacon')({ beaconId }); this._loadGroupDetail(this._selectedGroup.group.groupId); } catch (e) { this._error = e.message; }
  }

  async _createPlan(p) {
    this._loading = true;
    try {
      await call('adminCreatePlan')({ planId: p.planId, name: p.name, priceMonthly: p.priceMonthly, order: p.order, limits: { maxGroups: p.maxGroups, maxMembers: p.maxMembers, maxBeacons: p.maxBeacons, supervisionPanel: p.supervisionPanel, adminPanel: p.adminPanel } });
      this._loadPlans();
      this._newPlan = this._emptyPlan();
    } catch (e) { this._error = e.message; }
    this._loading = false;
  }

  async _updateUser(uid, isAdmin) {
    try { await call('adminUpdateUser')({ uid, isAdmin }); this._loadUsers(); } catch (e) { this._error = e.message; }
  }

  async _deleteUser(uid, name) {
    if (!confirm(`¿Eliminar usuario "${name}"?`)) return;
    try { await call('adminDeleteUser')({ uid }); this._loadUsers(); } catch (e) { this._error = e.message; }
  }

  _nav(view) {
    this._view = view;
    this._error = '';
    this._selectedGroup = null;
    if (view === 'groups') this._loadGroups();
    if (view === 'plans') this._loadPlans();
    if (view === 'users') this._loadUsers();
  }

  render() {
    if (this._view === 'login') return this._renderLogin();
    if (this._view === 'setup') return this._renderSetup();
    return html`
      <div class="header">
        <h1>AvisaBlue Admin</h1>
        <button @click=${this._logout}>Cerrar sesión</button>
      </div>
      <div class="nav">
        <button class=${this._view === 'groups' || this._view === 'group-detail' ? 'active' : ''} @click=${() => this._nav('groups')}>Grupos</button>
        <button class=${this._view === 'plans' ? 'active' : ''} @click=${() => this._nav('plans')}>Planes</button>
        <button class=${this._view === 'users' ? 'active' : ''} @click=${() => this._nav('users')}>Usuarios</button>
      </div>
      <div class="container">
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
        ${this._loading ? html`<div class="loading">Cargando...</div>` : nothing}
        ${this._view === 'groups' ? this._renderGroups() : nothing}
        ${this._view === 'group-detail' ? this._renderGroupDetail() : nothing}
        ${this._view === 'plans' ? this._renderPlans() : nothing}
        ${this._view === 'users' ? this._renderUsers() : nothing}
      </div>
    `;
  }

  _renderLogin() {
    return html`
      <div class="login-screen">
        <div class="login-form">
          <h2>AvisaBlue Admin</h2>
          ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
          <button @click=${this._login}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="20" />
            Iniciar sesión con Google
          </button>
        </div>
      </div>
    `;
  }

  _renderSetup() {
    return html`
      <div class="container" style="max-width:500px;margin-top:40px;">
        <h2>Setup inicial</h2>
        <p>Crea al menos un plan para que los usuarios puedan crear grupos.</p>
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
        ${this._plans.length > 0 ? html`
          ${this._plans.map(p => html`<div class="info-box">${p.name} — ${p.priceMonthly}€/mes</div>`)}
          <button class="btn btn-primary" @click=${() => { this._setupComplete = true; this._view = 'groups'; this._loadGroups(); }}>Finalizar setup</button>
        ` : nothing}
        <h3>Crear plan:</h3>
        ${this._renderPlanForm()}
      </div>
    `;
  }

  _renderGroups() {
    return html`
      <div class="section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h2 style="margin:0;">Grupos (${this._groups.length})</h2>
        </div>
        <details>
          <summary>+ Crear grupo</summary>
          <div class="form-row" style="margin-top:8px;">
            <div><label>Nombre</label><input type="text" .value=${this._createGroupName} @input=${e => this._createGroupName = e.target.value} placeholder="Familia García" /></div>
            <div><label>Plan</label><select .value=${this._createGroupPlan} @change=${e => this._createGroupPlan = e.target.value}>
              ${this._plans.map(p => html`<option value=${p.planId}>${p.name}</option>`)}
            </select></div>
            <div><label>&nbsp;</label><button class="btn btn-primary btn-sm" ?disabled=${!this._createGroupName.trim()} @click=${this._createGroup}>Crear</button></div>
          </div>
        </details>
        <table>
          <thead><tr><th>Nombre</th><th>Código</th><th>Plan</th><th>Miembros</th><th>Beacons</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            ${this._groups.map(g => html`
              <tr>
                <td><a href="#" @click=${e => { e.preventDefault(); this._loadGroupDetail(g.groupId); }} style="color:#1e40af;text-decoration:none;font-weight:500;">${g.name}</a></td>
                <td><span class="mono">${g.code || '—'}</span></td>
                <td><span class="badge badge-${g.planId}">${g.planId}</span></td>
                <td>${g.membersCount}</td>
                <td>${g.beaconsCount}</td>
                <td>${g.blocked ? html`<span class="badge badge-blocked">Bloqueado</span>` : 'Activo'}</td>
                <td class="act">
                  <button @click=${() => this._loadGroupDetail(g.groupId)}>Ver</button>
                  ${g.blocked
                    ? html`<button @click=${() => this._updateGroup(g.groupId, { blocked: false })}>Desbloquear</button>`
                    : html`<button @click=${() => this._updateGroup(g.groupId, { blocked: true, blockedReason: 'Bloqueado por admin' })}>Bloquear</button>`}
                  <button class="danger" @click=${() => this._deleteGroup(g.groupId, g.name)}>Eliminar</button>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }

  _renderGroupDetail() {
    if (!this._selectedGroup) return nothing;
    const { group: g, members, beacons, alerts } = this._selectedGroup;
    const plan = this._plans.find(p => p.planId === g.planId);
    const maxMembers = plan?.limits?.maxMembers || '?';
    const maxBeacons = plan?.limits?.maxBeacons === -1 ? '∞' : (plan?.limits?.maxBeacons || '?');

    return html`
      <button class="back" @click=${() => this._nav('groups')}>← Volver a grupos</button>
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <h2 style="margin:0;">${g.name}</h2>
          <p class="meta">Código: <span class="mono">${g.code}</span></p>
          <p class="meta">Plan: <span class="badge badge-${g.planId}">${g.planId}</span>
            <select style="margin-left:8px;" @change=${e => { this._updateGroup(g.groupId, { planId: e.target.value }); this._loadGroupDetail(g.groupId); }}>
              ${this._plans.map(p => html`<option value=${p.planId} ?selected=${p.planId === g.planId}>${p.name}</option>`)}
            </select>
          </p>
          <p class="meta">Estado: ${g.blocked ? html`<span class="badge badge-blocked">Bloqueado</span> <button class="btn btn-sm" @click=${() => { this._updateGroup(g.groupId, { blocked: false }); this._loadGroupDetail(g.groupId); }}>Desbloquear</button>` : 'Activo'}</p>
        </div>
        <button class="btn btn-danger btn-sm" @click=${() => this._deleteGroup(g.groupId, g.name)}>Eliminar grupo</button>
      </div>

      <div class="section">
        <h3>Miembros (${members.length}/${maxMembers})</h3>
        <table>
          <thead><tr><th>Nombre</th><th>Rol</th><th>Zona</th><th>Acciones</th></tr></thead>
          <tbody>
            ${members.map(m => html`
              <tr>
                <td>${m.displayName}</td>
                <td>
                  <select .value=${m.role} @change=${e => this._updateMember(m.id, e.target.value)}>
                    <option value="alerter">Pido ayuda</option>
                    <option value="responder">Doy ayuda</option>
                  </select>
                </td>
                <td>${m.currentZone || '—'}</td>
                <td class="act"><button class="danger" @click=${() => this._deleteMember(m.id)}>Eliminar</button></td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>Beacons (${beacons.length}/${maxBeacons})</h3>
        ${beacons.length > 0 ? html`
          <table>
            <thead><tr><th>Zona</th><th>Planta</th><th>UUID</th><th>Acciones</th></tr></thead>
            <tbody>
              ${beacons.map(b => html`
                <tr>
                  <td>${b.zoneName}</td>
                  <td>${b.floor}</td>
                  <td style="font-size:0.8rem;font-family:monospace;">${b.beaconId}</td>
                  <td class="act"><button class="danger" @click=${() => this._deleteBeacon(b.id)}>Eliminar</button></td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : html`<div class="info-box">Los beacons se añaden desde la app Android en Ajustes → Configurar beacons.</div>`}
      </div>

      <div class="section">
        <h3>Alertas recientes</h3>
        ${alerts.length > 0 ? html`
          <table>
            <thead><tr><th>Fecha</th><th>Estado</th><th>Respondió</th></tr></thead>
            <tbody>
              ${alerts.map(a => html`
                <tr>
                  <td style="font-size:0.82rem;">${a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toLocaleString('es-ES') : '—'}</td>
                  <td>${a.status}</td>
                  <td>${a.acceptedBy?.length > 0 ? a.acceptedBy[0].displayName : '—'}</td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : html`<p class="meta">Sin alertas</p>`}
      </div>
    `;
  }

  _renderPlans() {
    return html`
      <div class="section">
        <h2>Planes (${this._plans.length})</h2>
        <table>
          <thead><tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Grupos</th><th>Miembros</th><th>Beacons</th><th>Supervisión</th></tr></thead>
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
        <details><summary>+ Crear nuevo plan</summary><div style="margin-top:8px;">${this._renderPlanForm()}</div></details>
      </div>
    `;
  }

  _renderPlanForm() {
    const p = this._newPlan;
    return html`
      <div class="inline-fields">
        <div><label>ID</label><input type="text" placeholder="free" .value=${p.planId} @input=${e => this._newPlan = { ...p, planId: e.target.value }} /></div>
        <div><label>Nombre</label><input type="text" placeholder="Gratuito" .value=${p.name} @input=${e => this._newPlan = { ...p, name: e.target.value }} /></div>
      </div>
      <div class="inline-fields">
        <div><label>Precio €/mes</label><input type="number" .value=${p.priceMonthly} @input=${e => this._newPlan = { ...p, priceMonthly: Number(e.target.value) }} /></div>
        <div><label>Orden</label><input type="number" .value=${p.order} @input=${e => this._newPlan = { ...p, order: Number(e.target.value) }} /></div>
      </div>
      <div class="inline-fields">
        <div><label>Máx. grupos (-1=∞)</label><input type="number" .value=${p.maxGroups} @input=${e => this._newPlan = { ...p, maxGroups: Number(e.target.value) }} /></div>
        <div><label>Máx. miembros</label><input type="number" .value=${p.maxMembers} @input=${e => this._newPlan = { ...p, maxMembers: Number(e.target.value) }} /></div>
      </div>
      <div class="inline-fields">
        <div><label>Máx. beacons (-1=∞)</label><input type="number" .value=${p.maxBeacons} @input=${e => this._newPlan = { ...p, maxBeacons: Number(e.target.value) }} /></div>
        <div></div>
      </div>
      <div class="checkbox-row"><input type="checkbox" .checked=${p.supervisionPanel} @change=${e => this._newPlan = { ...p, supervisionPanel: e.target.checked }} /><label>Panel supervisión</label></div>
      <div class="checkbox-row"><input type="checkbox" .checked=${p.adminPanel} @change=${e => this._newPlan = { ...p, adminPanel: e.target.checked }} /><label>Panel admin</label></div>
      <button class="btn btn-primary btn-sm" ?disabled=${!p.planId || !p.name} @click=${() => this._createPlan(p)}>Crear plan</button>
    `;
  }

  _renderUsers() {
    return html`
      <div class="section">
        <h2>Usuarios (${this._users.length})</h2>
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Grupos</th><th>Admin</th><th>Último acceso</th><th>Acciones</th></tr></thead>
          <tbody>
            ${this._users.map(u => html`
              <tr>
                <td>${u.displayName || '—'}</td>
                <td style="font-size:0.82rem;">${u.email}</td>
                <td>${u.groupCount}</td>
                <td>
                  <input type="checkbox" .checked=${u.isAdmin} @change=${e => this._updateUser(u.uid, e.target.checked)} />
                </td>
                <td style="font-size:0.82rem;">${u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString('es-ES') : '—'}</td>
                <td class="act"><button class="danger" @click=${() => this._deleteUser(u.uid, u.displayName)}>Eliminar</button></td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define('admin-app', AdminApp);

import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { auth, functions, googleProvider } from '../lib/firebase.js';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import './avisamor-setup.js';
import './avisamor-alerter.js';
import './avisamor-responder.js';
import './avisamor-offline-indicator.js';

interface GroupInfo {
  groupId: string;
  groupName: string;
  code: string;
  role: string;
  blocked: boolean;
}

type AppState = 'loading' | 'login' | 'groups' | 'setup' | 'alerter';

@customElement('avisamor-app')
export class AvisamorApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100dvh;
      background: #fff;
      color: #111827;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      font-size: 1.5rem;
      color: #6b7280;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner {
      width: 48px; height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #dc2626;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .login-screen, .groups-screen {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 100dvh; padding: 24px;
      text-align: center;
    }

    h1 { font-size: 2rem; margin: 0 0 8px; color: #dc2626; }
    p.subtitle { font-size: 1.1rem; color: #6b7280; margin: 0 0 32px; }

    .btn-google {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 24px; font-size: 1.1rem; font-weight: 600;
      background: #fff; color: #374151;
      border: 2px solid #d1d5db; border-radius: 12px;
      cursor: pointer; transition: border-color 0.2s;
    }
    .btn-google:hover { border-color: #4285f4; }
    .btn-google img { width: 24px; height: 24px; }

    .user-header {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; max-width: 400px; margin-bottom: 24px;
    }
    .user-name { font-size: 1rem; color: #374151; }
    .btn-logout {
      background: none; border: none; color: #6b7280;
      cursor: pointer; font-size: 0.9rem; text-decoration: underline;
    }

    .group-list { width: 100%; max-width: 400px; }
    .group-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px; margin-bottom: 12px;
      background: #f9fafb; border: 2px solid #e5e7eb;
      border-radius: 12px; cursor: pointer;
      transition: border-color 0.2s;
    }
    .group-card:hover { border-color: #dc2626; }
    .group-card-info h3 { margin: 0; font-size: 1.1rem; }
    .group-card-info p { margin: 4px 0 0; font-size: 0.85rem; color: #6b7280; }
    .group-card-arrow { font-size: 1.5rem; color: #9ca3af; }

    .buttons { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 400px; margin-top: 16px; }
    .btn-primary {
      padding: 16px 24px; font-size: 1.1rem; font-weight: 700;
      background: #dc2626; color: #fff;
      border: none; border-radius: 12px; cursor: pointer;
    }
    .btn-secondary {
      padding: 16px 24px; font-size: 1.1rem; font-weight: 700;
      background: #e5e7eb; color: #374151;
      border: none; border-radius: 12px; cursor: pointer;
    }

    .app-bar {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 16px; background: #1f2937; color: #fff; font-size: 0.85rem;
    }
    .app-bar-title { font-weight: 600; }
    .app-bar-code { font-family: monospace; opacity: 0.7; font-size: 0.8rem; }
    .app-bar-actions { margin-left: auto; display: flex; gap: 8px; }
    .app-bar-btn {
      background: rgba(255,255,255,0.15); color: #fff; border: none;
      padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;
    }

    .error { color: #dc2626; margin: 12px 0; font-size: 0.95rem; }

    @media (prefers-color-scheme: dark) {
      :host { background: #111827; color: #f9fafb; }
      .loading { color: #9ca3af; }
      .spinner { border-color: #374151; border-top-color: #ef4444; }
      .btn-google { background: #1f2937; color: #e5e7eb; border-color: #4b5563; }
      .user-name { color: #d1d5db; }
      .group-card { background: #1f2937; border-color: #374151; }
      .group-card-info p { color: #9ca3af; }
      .btn-secondary { background: #374151; color: #e5e7eb; }
    }
  `;

  @state() private _appState: AppState = 'loading';
  @state() private _user: User | null = null;
  @state() private _groups: GroupInfo[] = [];
  @state() private _activeGroupId = '';
  @state() private _activeRole = '';
  @state() private _activeGroupCode = '';
  @state() private _activeGroupName = '';
  @state() private _setupMode = '';
  @state() private _error = '';

  @state() private _debug: string[] = [];

  private _log(msg: string): void {
    this._debug = [...this._debug.slice(-9), msg];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._log('init');
    getRedirectResult(auth).then(r => { if (r) this._log('redirect: ' + r.user?.email); }).catch(e => this._log('redirect err: ' + e.message));
    onAuthStateChanged(auth, async (user) => {
      this._log('auth: ' + (user ? user.email : 'null'));
      if (user) {
        this._user = user;
        await this._loadGroups();
      } else {
        this._user = null;
        this._appState = 'login';
      }
    });
  }

  private async _login(): Promise<void> {
    this._error = '';
    this._log('login start');
    try {
      await signInWithPopup(auth, googleProvider);
      this._log('login ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      this._log('login err: ' + msg);
      this._error = msg;
    }
  }

  private async _logout(): Promise<void> {
    await signOut(auth);
    this._groups = [];
    this._activeGroupId = '';
  }

  private async _loadGroups(): Promise<void> {
    try {
      const fn = httpsCallable(functions, 'myGroups');
      const result = await fn();
      const data = result.data as { groups: GroupInfo[] };
      this._groups = data.groups;

      if (this._groups.length === 0) {
        this._appState = 'groups';
      } else if (this._groups.length === 1) {
        this._enterGroup(this._groups[0]);
      } else {
        this._appState = 'groups';
      }
    } catch {
      this._appState = 'groups';
    }
  }

  private _enterGroup(group: GroupInfo): void {
    this._activeGroupId = group.groupId;
    this._activeRole = group.role;
    this._activeGroupCode = group.code;
    this._activeGroupName = group.groupName;
    this._appState = 'alerter';
  }

  private _onGroupJoined(e: CustomEvent<{ groupId: string; role: string }>): void {
    this._loadGroups();
  }

  private _nav(): void {
    this._activeGroupId = '';
    this._activeRole = '';
    this._appState = 'groups';
    this._loadGroups();
  }

  private _showSetup(mode: string = ''): void {
    this._setupMode = mode;
    this._appState = 'setup';
    this._error = '';
  }

  render() {
    return html`
      <avisamor-offline-indicator></avisamor-offline-indicator>

      ${this._appState === 'loading' ? html`
        <div class="loading" role="status">
          <div class="spinner"></div>
        </div>
      ` : nothing}

      ${this._appState === 'login' ? this._renderLogin() : nothing}
      ${this._appState === 'groups' ? this._renderGroups() : nothing}
      ${this._appState === 'setup' ? html`
        <avisamor-setup .initialMode=${this._setupMode} @group-joined=${this._onGroupJoined} @back=${() => this._loadGroups()}></avisamor-setup>
      ` : nothing}
      ${this._appState === 'alerter' && this._activeRole === 'alerter' ? html`
        <avisamor-alerter .groupId=${this._activeGroupId} .groupName=${this._activeGroupName} .groupCode=${this._activeGroupCode} @logout=${this._logout} @switch-group=${() => this._nav()}></avisamor-alerter>
      ` : nothing}
      ${this._appState === 'alerter' && this._activeRole === 'responder' ? html`
        <avisamor-responder .groupId=${this._activeGroupId} .groupCode=${this._activeGroupCode} .groupName=${this._activeGroupName} @logout=${this._logout} @switch-group=${() => this._nav()}></avisamor-responder>
      ` : nothing}
      ${this._debug.length > 0 && new URLSearchParams(window.location.search).has('debug') ? html`
        <div style="position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,0.85);color:#0f0;font-family:monospace;font-size:11px;padding:8px;max-height:30vh;overflow:auto;z-index:9999;">
          ${this._debug.map(d => html`<div>${d}</div>`)}
        </div>
      ` : nothing}
    `;
  }

  private _renderLogin() {
    return html`
      <div class="login-screen">
        <h1>AvisaBlue</h1>
        <p class="subtitle">Alertas para personas dependientes</p>
        <button class="btn-google" @click=${this._login}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Iniciar sesión con Google
        </button>
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
      </div>
    `;
  }

  private _renderGroups() {
    return html`
      <div class="groups-screen">
        <div class="user-header">
          <span class="user-name">Hola, ${this._user?.displayName || 'Usuario'}</span>
          <button class="btn-logout" @click=${this._logout}>Cerrar sesión</button>
        </div>

        ${this._groups.length > 0 ? html`
          <div class="group-list">
            ${this._groups.map(g => html`
              <div class="group-card" @click=${() => this._enterGroup(g)}>
                <div class="group-card-info">
                  <h3>${g.groupName}</h3>
                  <p>${g.role === 'alerter' ? 'Pido ayuda' : 'Doy ayuda'} · ${g.code}</p>
                </div>
                <span class="group-card-arrow">›</span>
              </div>
            `)}
          </div>
        ` : nothing}

        <div class="buttons">
          <button class="btn-primary" @click=${() => this._showSetup('create')}>
            Crear grupo nuevo
          </button>
          <button class="btn-secondary" @click=${() => this._showSetup('join')}>
            Unirse a un grupo
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avisamor-app': AvisamorApp;
  }
}

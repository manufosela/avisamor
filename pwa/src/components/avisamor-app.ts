import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { auth, functions, googleProvider } from '../lib/firebase.js';
import { signInWithRedirect, signOut, onAuthStateChanged, type User } from 'firebase/auth';
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

  connectedCallback(): void {
    super.connectedCallback();
    onAuthStateChanged(auth, async (user) => {
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
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : 'Error al iniciar sesión';
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
    `;
  }

  private _renderLogin() {
    return html`
      <div class="login-screen">
        <h1>AvisaBlue</h1>
        <p class="subtitle">Alertas para personas dependientes</p>
        <button class="btn-google" @click=${this._login}>
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

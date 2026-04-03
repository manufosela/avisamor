import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { functions } from '../lib/firebase.js';
import { httpsCallable } from 'firebase/functions';

type SetupMode = 'choose' | 'create' | 'join' | 'show-code';

@customElement('avisamor-setup')
export class AvisamorSetup extends LitElement {
  static styles = css`
    :host {
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .setup-card {
      width: 100%;
      max-width: 400px;
      text-align: center;
    }

    h1 { font-size: 2rem; margin: 0 0 8px; color: #dc2626; }
    p.subtitle { font-size: 1.1rem; color: #6b7280; margin: 0 0 32px; }

    label {
      display: block; font-size: 1rem; font-weight: 600;
      text-align: left; margin-bottom: 8px; color: #374151;
    }

    input {
      width: 100%; padding: 14px 16px; font-size: 1.1rem;
      border: 2px solid #d1d5db; border-radius: 12px;
      outline: none; box-sizing: border-box;
      transition: border-color 0.2s;
    }
    input:focus-visible { border-color: #dc2626; }

    .field { margin-bottom: 20px; }

    .role-selector {
      display: flex; gap: 12px; margin-bottom: 20px;
    }
    .role-btn {
      flex: 1; padding: 16px 12px; font-size: 0.95rem; font-weight: 700;
      border: 2px solid #d1d5db; border-radius: 12px;
      background: #fff; cursor: pointer; transition: all 0.2s;
      text-align: center;
    }
    .role-btn.selected { border-color: #dc2626; background: #fef2f2; color: #dc2626; }
    .role-btn:hover { border-color: #dc2626; }
    .role-label { font-size: 0.8rem; color: #6b7280; font-weight: 400; margin-top: 4px; }

    .buttons { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }

    button { padding: 16px 24px; font-size: 1.1rem; font-weight: 700; border: none; border-radius: 12px; cursor: pointer; min-height: 48px; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-primary { background: #dc2626; color: #fff; }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    .btn-back { background: transparent; color: #6b7280; font-size: 0.95rem; padding: 8px; }

    .code-display {
      font-size: 1.8rem; font-weight: 800; text-align: center;
      padding: 24px; background: #f3f4f6; border-radius: 12px;
      margin: 16px 0; letter-spacing: 0.05em; word-break: break-all;
    }

    .info { font-size: 0.9rem; color: #6b7280; margin: 12px 0; text-align: left; }
    .info strong { color: #374151; }

    .error {
      background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;
      padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 0.95rem;
    }

    @media (prefers-color-scheme: dark) {
      label { color: #d1d5db; }
      p.subtitle { color: #9ca3af; }
      input { background: #1f2937; border-color: #4b5563; color: #f9fafb; }
      .role-btn { background: #1f2937; border-color: #4b5563; color: #e5e7eb; }
      .role-btn.selected { background: #450a0a; border-color: #ef4444; color: #fca5a5; }
      .role-label { color: #9ca3af; }
      .btn-secondary { background: #374151; color: #e5e7eb; }
      .code-display { background: #1f2937; }
      .info { color: #9ca3af; }
      .info strong { color: #d1d5db; }
    }
  `;

  @property({ type: String }) initialMode = '';

  @state() private _mode: SetupMode = 'choose';
  @state() private _groupName = '';
  @state() private _role = '';
  @state() private _code = '';
  @state() private _createdCode = '';
  @state() private _createdGroupId = '';
  @state() private _loading = false;
  @state() private _error = '';

  connectedCallback(): void {
    super.connectedCallback();
    if (this.initialMode === 'create' || this.initialMode === 'join') {
      this._mode = this.initialMode as SetupMode;
    }
  }

  private _setMode(mode: SetupMode): void {
    this._mode = mode;
    this._error = '';
  }

  private async _createGroup(): Promise<void> {
    this._loading = true;
    this._error = '';
    try {
      const fn = httpsCallable(functions, 'createGroup');
      const result = await fn({ groupName: this._groupName.trim(), role: this._role });
      const data = result.data as { groupId: string; code: string };
      this._createdCode = data.code;
      this._createdGroupId = data.groupId;
      this._mode = 'show-code';
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : 'Error al crear grupo';
    } finally {
      this._loading = false;
    }
  }

  private async _joinGroup(): Promise<void> {
    this._loading = true;
    this._error = '';
    try {
      const fn = httpsCallable(functions, 'joinGroup');
      const result = await fn({ code: this._code.trim().toLowerCase(), role: this._role });
      const data = result.data as { groupId: string };
      this.dispatchEvent(new CustomEvent('group-joined', {
        detail: { groupId: data.groupId, role: this._role },
        bubbles: true, composed: true,
      }));
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : 'Error al unirse';
    } finally {
      this._loading = false;
    }
  }

  render() {
    return html`
      <div class="setup-card">
        <h1>AvisaBlue</h1>
        <p class="subtitle">Alertas para personas dependientes</p>

        ${this._mode === 'choose' ? this._renderChoose() : nothing}
        ${this._mode === 'create' ? this._renderCreate() : nothing}
        ${this._mode === 'join' ? this._renderJoin() : nothing}
        ${this._mode === 'show-code' ? this._renderShowCode() : nothing}

        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : nothing}
      </div>
    `;
  }

  private _renderChoose() {
    return html`
      <div class="buttons">
        <button class="btn-primary" @click=${() => this._setMode('create')}>
          Crear grupo nuevo
        </button>
        <button class="btn-secondary" @click=${() => this._setMode('join')}>
          Unirse a un grupo
        </button>
      </div>
    `;
  }

  private _renderCreate() {
    return html`
      <div class="field">
        <label>Nombre del grupo</label>
        <input type="text" placeholder="Ej: Familia García" .value=${this._groupName}
          @input=${(e: InputEvent) => { this._groupName = (e.target as HTMLInputElement).value; }} />
      </div>
      ${this._renderRoleSelector()}
      <div class="buttons">
        <button class="btn-primary"
          ?disabled=${this._loading || !this._groupName.trim() || !this._role}
          @click=${this._createGroup}>
          ${this._loading ? 'Creando...' : 'Crear grupo'}
        </button>
        <button class="btn-back" @click=${() => this.dispatchEvent(new CustomEvent('back', { bubbles: true, composed: true }))}>Volver</button>
      </div>
    `;
  }

  private _renderJoin() {
    return html`
      <div class="field">
        <label>Código del grupo</label>
        <input type="text" placeholder="Ej: zen-wolf-forge" .value=${this._code}
          @input=${(e: InputEvent) => { this._code = (e.target as HTMLInputElement).value; }} />
      </div>
      ${this._renderRoleSelector()}
      <div class="buttons">
        <button class="btn-primary"
          ?disabled=${this._loading || !this._code.trim() || !this._role}
          @click=${this._joinGroup}>
          ${this._loading ? 'Uniendo...' : 'Unirse al grupo'}
        </button>
        <button class="btn-back" @click=${() => this.dispatchEvent(new CustomEvent('back', { bubbles: true, composed: true }))}>Volver</button>
      </div>
    `;
  }

  private _renderRoleSelector() {
    return html`
      <label>Tu rol en el grupo</label>
      <div class="role-selector">
        <div class="role-btn ${this._role === 'alerter' ? 'selected' : ''}"
          @click=${() => { this._role = 'alerter'; }}>
          Pido ayuda
          <div class="role-label">Persona dependiente</div>
        </div>
        <div class="role-btn ${this._role === 'responder' ? 'selected' : ''}"
          @click=${() => { this._role = 'responder'; }}>
          Doy ayuda
          <div class="role-label">Cuidador/a</div>
        </div>
      </div>
    `;
  }

  private _renderShowCode() {
    return html`
      <p style="font-size:1.1rem; font-weight:600;">Grupo creado</p>
      <div class="code-display">${this._createdCode}</div>
      <div class="info">
        <p><strong>Comparte este código</strong> con las personas de tu grupo para que se unan.</p>
        <p>Los <strong>beacons</strong> (localización por zonas) se configuran desde la app Android en Ajustes → Configurar beacons. Es opcional.</p>
      </div>
      <div class="buttons">
        <button class="btn-primary" @click=${() => {
          this.dispatchEvent(new CustomEvent('group-joined', {
            detail: { groupId: this._createdGroupId, role: this._role },
            bubbles: true, composed: true,
          }));
        }}>Continuar</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avisamor-setup': AvisamorSetup;
  }
}

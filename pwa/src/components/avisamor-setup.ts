import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { app } from '../lib/firebase.js';
import { getFunctions, httpsCallable } from 'firebase/functions';

type SetupMode = 'choose' | 'create' | 'join';

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

    h1 {
      font-size: 2rem;
      margin: 0 0 8px;
      color: var(--color-danger, #dc2626);
    }

    p.subtitle {
      font-size: 1.1rem;
      color: #6b7280;
      margin: 0 0 32px;
    }

    label {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      text-align: left;
      margin-bottom: 8px;
      color: #374151;
    }

    input {
      width: 100%;
      padding: 14px 16px;
      font-size: 1.1rem;
      border: 2px solid #d1d5db;
      border-radius: 12px;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    input:focus-visible {
      border-color: var(--color-danger, #dc2626);
      outline: 2px solid var(--color-danger, #dc2626);
      outline-offset: 2px;
    }

    input.code-input {
      text-align: center;
      font-size: 1.8rem;
      letter-spacing: 0.5em;
      font-weight: 700;
    }

    .field {
      margin-bottom: 20px;
    }

    .buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
    }

    button {
      padding: 16px 24px;
      font-size: 1.1rem;
      font-weight: 700;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      min-height: 48px;
      transition: background-color 0.2s, transform 0.1s;
    }

    button:focus-visible {
      outline: 2px solid var(--color-danger, #dc2626);
      outline-offset: 2px;
    }

    button:active {
      transform: scale(0.97);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary {
      background: var(--color-danger, #dc2626);
      color: #fff;
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .btn-back {
      background: transparent;
      color: #6b7280;
      font-size: 0.95rem;
      padding: 8px;
    }

    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: var(--color-danger, #dc2626);
      padding: 12px;
      border-radius: 8px;
      margin-top: 16px;
      font-size: 0.95rem;
    }

    @media (prefers-color-scheme: dark) {
      label { color: #d1d5db; }
      p.subtitle { color: #9ca3af; }
      input {
        background: #1f2937;
        border-color: #4b5563;
        color: #f9fafb;
      }
      input:focus-visible { border-color: #ef4444; }
      .btn-secondary {
        background: #374151;
        color: #e5e7eb;
      }
      .error {
        background: #450a0a;
        border-color: #7f1d1d;
        color: #fca5a5;
      }
    }
  `;

  @state() private _mode: SetupMode = 'choose';
  @state() private _displayName = '';
  @state() private _groupName = '';
  @state() private _code = '';
  @state() private _loading = false;
  @state() private _error = '';

  private _functions = getFunctions(app, 'europe-west1');

  private _setMode(mode: SetupMode): void {
    this._mode = mode;
    this._error = '';
  }

  private async _createGroup(): Promise<void> {
    if (!this._displayName.trim()) {
      this._error = 'Introduce tu nombre';
      return;
    }

    this._loading = true;
    this._error = '';

    try {
      const createGroupFn = httpsCallable(this._functions, 'createGroup');
      const result = await createGroupFn({
        name: this._displayName.trim(),
        groupName: this._groupName.trim(),
        role: 'alerter',
      });

      const data = result.data as { groupId: string; code: string };
      this.dispatchEvent(new CustomEvent('group-joined', {
        detail: { groupId: data.groupId, code: data.code },
        bubbles: true,
        composed: true,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear grupo';
      this._error = message;
    } finally {
      this._loading = false;
    }
  }

  private async _joinGroup(): Promise<void> {
    if (!this._displayName.trim()) {
      this._error = 'Introduce tu nombre';
      return;
    }
    if (this._code.length !== 6) {
      this._error = 'El codigo debe tener 6 digitos';
      return;
    }

    this._loading = true;
    this._error = '';

    try {
      const joinGroupFn = httpsCallable(this._functions, 'joinGroup');
      const result = await joinGroupFn({
        code: this._code,
        displayName: this._displayName.trim(),
        role: 'alerter',
      });

      const data = result.data as { groupId: string; groupName: string };
      this.dispatchEvent(new CustomEvent('group-joined', {
        detail: { groupId: data.groupId },
        bubbles: true,
        composed: true,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al unirse al grupo';
      this._error = message;
    } finally {
      this._loading = false;
    }
  }

  private _onCodeInput(e: InputEvent): void {
    const input = e.target as HTMLInputElement;
    this._code = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = this._code;
  }

  render() {
    return html`
      <div class="setup-card">
        <h1>Avisamor</h1>
        <p class="subtitle">Alertas para personas dependientes</p>

        ${this._mode === 'choose' ? this._renderChoose() : ''}
        ${this._mode === 'create' ? this._renderCreate() : ''}
        ${this._mode === 'join' ? this._renderJoin() : ''}

        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : ''}
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
        <label for="group-name">Nombre del grupo</label>
        <input
          id="group-name"
          type="text"
          placeholder="Ej: Familia García, Residencia Sol"
          .value=${this._groupName}
          @input=${(e: InputEvent) => { this._groupName = (e.target as HTMLInputElement).value; }}
        />
      </div>
      <div class="field">
        <label for="name-create">Tu nombre</label>
        <input
          id="name-create"
          type="text"
          placeholder="Ej: Abuela Carmen"
          .value=${this._displayName}
          @input=${(e: InputEvent) => { this._displayName = (e.target as HTMLInputElement).value; }}
        />
      </div>
      <div class="buttons">
        <button
          class="btn-primary"
          ?disabled=${this._loading || !this._groupName.trim() || !this._displayName.trim()}
          @click=${this._createGroup}
        >
          ${this._loading ? 'Creando...' : 'Crear grupo'}
        </button>
        <button class="btn-back" @click=${() => this._setMode('choose')} ?disabled=${this._loading}>
          Volver
        </button>
      </div>
    `;
  }

  private _renderJoin() {
    return html`
      <div class="field">
        <label for="name-join">Tu nombre</label>
        <input
          id="name-join"
          type="text"
          placeholder="Ej: María, Carlos"
          .value=${this._displayName}
          @input=${(e: InputEvent) => { this._displayName = (e.target as HTMLInputElement).value; }}
        />
      </div>
      <div class="field">
        <label for="code-input">Código del grupo</label>
        <input
          id="code-input"
          class="code-input"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          .value=${this._code}
          @input=${this._onCodeInput}
        />
      </div>
      <div class="buttons">
        <button
          class="btn-primary"
          ?disabled=${this._loading || !this._displayName.trim() || this._code.length !== 6}
          @click=${this._joinGroup}
        >
          ${this._loading ? 'Uniendo...' : 'Unirse al grupo'}
        </button>
        <button class="btn-back" @click=${() => this._setMode('choose')} ?disabled=${this._loading}>
          Volver
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avisamor-setup': AvisamorSetup;
  }
}

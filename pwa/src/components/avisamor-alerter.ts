import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { app } from '../lib/firebase.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import './avisamor-alert-status.js';

type AlerterState = 'idle' | 'sending' | 'sent' | 'error';

@customElement('avisamor-alerter')
export class AvisamorAlerter extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .button-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .alert-button {
      width: 100%;
      min-height: 60vh;
      max-width: 600px;
      border: none;
      border-radius: 24px;
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      transition: background-color 0.3s ease, transform 0.1s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px;
      line-height: 1.3;
    }

    .alert-button:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 4px;
      box-shadow: 0 0 0 8px rgba(0, 0, 0, 0.3);
    }

    .alert-button:active:not(:disabled) {
      transform: scale(0.97);
    }

    .alert-button:disabled {
      cursor: not-allowed;
    }

    .alert-button.idle {
      background: var(--color-danger, #dc2626);
    }

    .alert-button.sending {
      background: var(--color-warning, #f59e0b);
      animation: pulse 0.8s ease-in-out infinite;
    }

    .alert-button.sent {
      background: var(--color-success, #16a34a);
    }

    .alert-button.error {
      background: #991b1b;
    }

    @media (prefers-reduced-motion: reduce) {
      .alert-button.sending {
        animation: none;
        opacity: 0.8;
      }
      .alert-button:active:not(:disabled) {
        transform: none;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(0.98); }
    }

    .status-area {
      padding: 0 24px 24px;
    }

    .error-message {
      text-align: center;
      padding: 12px;
      color: var(--color-danger, #dc2626);
      font-size: 1rem;
    }

    @media (prefers-color-scheme: dark) {
      .error-message {
        color: #fca5a5;
      }
      .alert-button.idle {
        background: #b91c1c;
      }
    }
  `;

  @property({ type: String }) groupId = '';

  @state() private _state: AlerterState = 'idle';
  @state() private _errorMsg = '';

  private _functions = getFunctions(app, 'europe-west1');
  private _sentTimer?: ReturnType<typeof setTimeout>;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._sentTimer) clearTimeout(this._sentTimer);
  }

  private async _sendAlert(): Promise<void> {
    if (this._state === 'sending' || this._state === 'sent') return;

    this._state = 'sending';
    this._errorMsg = '';

    try {
      const createAlertFn = httpsCallable(this._functions, 'createAlert');
      await createAlertFn({ groupId: this.groupId, source: 'pwa' });

      this._state = 'sent';
      this._sentTimer = setTimeout(() => {
        this._state = 'idle';
      }, 3000);
    } catch (err: unknown) {
      this._state = 'error';
      if (err instanceof Error) {
        if (err.message.includes('resource-exhausted') || err.message.includes('already active')) {
          this._errorMsg = 'Ya hay una alerta activa, espera un momento';
        } else {
          this._errorMsg = 'Error al enviar alerta. Intentalo de nuevo.';
        }
      } else {
        this._errorMsg = 'Error desconocido';
      }

      setTimeout(() => {
        this._state = 'idle';
        this._errorMsg = '';
      }, 5000);
    }
  }

  private _getButtonText(): string {
    switch (this._state) {
      case 'idle': return 'PULSA PARA PEDIR AYUDA';
      case 'sending': return 'ENVIANDO...';
      case 'sent': return 'ALERTA ENVIADA';
      case 'error': return 'ERROR';
    }
  }

  render() {
    return html`
      <div class="button-area">
        <button
          class="alert-button ${this._state}"
          @click=${this._sendAlert}
          ?disabled=${this._state === 'sending' || this._state === 'sent'}
          aria-live="assertive"
        >
          ${this._getButtonText()}
        </button>
      </div>

      <div class="status-area">
        ${this._errorMsg
          ? html`<div class="error-message" role="alert">${this._errorMsg}</div>`
          : ''}
        <avisamor-alert-status .groupId=${this.groupId}></avisamor-alert-status>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avisamor-alerter': AvisamorAlerter;
  }
}

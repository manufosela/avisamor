import { LitElement, html, css } from 'lit';
import { app } from '../lib/firebase.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import './avisamor-alert-status.js';
import './avisamor-zone-map.js';

export class AvisamorAlerter extends LitElement {
  static properties = {
    groupId: { type: String },
    groupName: { type: String },
    groupCode: { type: String },
    _state: { state: true },
    _errorMsg: { state: true },
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .alerter-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: #dc2626; color: #fff; font-size: 0.9rem;
    }
    .header-btn {
      background: rgba(255,255,255,0.2); color: #fff; border: none;
      padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;
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

  constructor() {
    super();
    this.groupId = '';
    this.groupName = '';
    this.groupCode = '';
    this._state = 'idle';
    this._errorMsg = '';
    this._functions = getFunctions(app, 'europe-west1');
    this._sentTimer = undefined;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._sentTimer) clearTimeout(this._sentTimer);
  }

  async _sendAlert() {
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
    } catch (err) {
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

  _getButtonText() {
    switch (this._state) {
      case 'idle': return 'PULSA PARA PEDIR AYUDA';
      case 'sending': return 'ENVIANDO...';
      case 'sent': return 'ALERTA ENVIADA';
      case 'error': return 'ERROR';
    }
  }

  render() {
    return html`
      <div class="alerter-header">
        <div>
          <strong>${this.groupName || 'AvisaBlue'}</strong>
          <span style="font-size:0.75rem; opacity:0.7; margin-left:8px;">${this.groupCode}</span>
        </div>
        <button class="header-btn" @click=${() => this.dispatchEvent(new CustomEvent('logout', { bubbles: true, composed: true }))}>Salir</button>
      </div>
      <div class="status-area">
        ${this._errorMsg
          ? html`<div class="error-message" role="alert">${this._errorMsg}</div>`
          : ''}
        <avisamor-alert-status .groupId=${this.groupId}></avisamor-alert-status>
      </div>

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
    `;
  }
}

customElements.define('avisamor-alerter', AvisamorAlerter);

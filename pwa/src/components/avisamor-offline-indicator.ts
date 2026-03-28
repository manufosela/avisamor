import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('avisamor-offline-indicator')
export class AvisamorOfflineIndicator extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      padding: 8px 16px;
      text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    .banner.offline {
      background: var(--color-danger, #dc2626);
      color: #fff;
      transform: translateY(0);
      opacity: 1;
    }

    .banner.online {
      background: var(--color-success, #16a34a);
      color: #fff;
      transform: translateY(0);
      opacity: 1;
    }

    .banner.hidden {
      transform: translateY(-100%);
      opacity: 0;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .banner {
        transition: none;
      }
    }
  `;

  @state() private _online = navigator.onLine;
  @state() private _showOnline = false;
  private _onlineTimer?: ReturnType<typeof setTimeout>;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('online', this._handleOnline);
    window.addEventListener('offline', this._handleOffline);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('online', this._handleOnline);
    window.removeEventListener('offline', this._handleOffline);
    if (this._onlineTimer) clearTimeout(this._onlineTimer);
  }

  private _handleOnline = (): void => {
    this._online = true;
    this._showOnline = true;
    this._onlineTimer = setTimeout(() => {
      this._showOnline = false;
    }, 3000);
  };

  private _handleOffline = (): void => {
    this._online = false;
    this._showOnline = false;
    if (this._onlineTimer) clearTimeout(this._onlineTimer);
  };

  render() {
    if (this._online && !this._showOnline) {
      return html`<div class="banner hidden" aria-hidden="true"></div>`;
    }

    if (!this._online) {
      return html`
        <div class="banner offline" role="alert">
          Sin conexion - el boton no funcionara
        </div>
      `;
    }

    return html`
      <div class="banner online" role="status">
        Conexion restaurada
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avisamor-offline-indicator': AvisamorOfflineIndicator;
  }
}

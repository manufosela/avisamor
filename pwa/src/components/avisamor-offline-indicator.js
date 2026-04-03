import { LitElement, html, css } from 'lit';

export class AvisamorOfflineIndicator extends LitElement {
  static properties = {
    _online: { state: true },
    _showOnline: { state: true },
  };

  static styles = css`
    :host { display: block; }
    .banner {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      padding: 8px 16px; text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem; font-weight: 600;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    .banner.offline { background: #dc2626; color: #fff; transform: translateY(0); opacity: 1; }
    .banner.online { background: #16a34a; color: #fff; transform: translateY(0); opacity: 1; }
    .banner.hidden { transform: translateY(-100%); opacity: 0; pointer-events: none; }
  `;

  constructor() {
    super();
    this._online = navigator.onLine;
    this._showOnline = false;
    this._onlineTimer = null;
    this._handleOnline = () => {
      this._online = true;
      this._showOnline = true;
      this._onlineTimer = setTimeout(() => { this._showOnline = false; }, 3000);
    };
    this._handleOffline = () => {
      this._online = false;
      this._showOnline = false;
      if (this._onlineTimer) clearTimeout(this._onlineTimer);
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('online', this._handleOnline);
    window.addEventListener('offline', this._handleOffline);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('online', this._handleOnline);
    window.removeEventListener('offline', this._handleOffline);
    if (this._onlineTimer) clearTimeout(this._onlineTimer);
  }

  render() {
    if (this._online && !this._showOnline) return html`<div class="banner hidden" aria-hidden="true"></div>`;
    if (!this._online) return html`<div class="banner offline" role="alert">Sin conexión - el botón no funcionará</div>`;
    return html`<div class="banner online" role="status">Conexión restaurada</div>`;
  }
}

customElements.define('avisamor-offline-indicator', AvisamorOfflineIndicator);

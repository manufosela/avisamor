import { LitElement, html, css, nothing } from 'lit';
import { db, functions } from '../lib/firebase.js';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import './avisamor-zone-map.js';

export class AvisamorResponder extends LitElement {
  static properties = {
    groupId: { type: String },
    groupCode: { type: String },
    groupName: { type: String },
    _alert: { state: true },
    _elapsed: { state: true },
    _accepting: { state: true },
    _error: { state: true },
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; background: #16a34a; color: #fff;
    }
    .header h1 { margin: 0; font-size: 1.2rem; }
    .header-actions { display: flex; gap: 6px; }
    .header button {
      background: rgba(255,255,255,0.2); color: #fff; border: none;
      padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;
    }

    .content { flex: 1; padding: 24px; }

    .waiting {
      text-align: center; padding: 48px 24px; color: #6b7280;
    }
    .waiting-icon { font-size: 4rem; margin-bottom: 16px; }
    .waiting h2 { color: #374151; margin: 0 0 8px; }
    .waiting p { margin: 0; }

    .alert-card {
      background: #dc2626; color: #fff; border-radius: 16px;
      padding: 24px; text-align: center; margin-bottom: 24px;
    }
    .alert-card h2 { margin: 0 0 8px; font-size: 1.5rem; }
    .alert-card p { margin: 0 0 16px; font-size: 1.1rem; }

    .alert-card .timer {
      font-size: 2.5rem; font-weight: 800; font-variant-numeric: tabular-nums;
      margin-bottom: 16px;
    }

    .btn-accept {
      width: 100%; padding: 16px; font-size: 1.2rem; font-weight: 700;
      background: #fff; color: #dc2626; border: none; border-radius: 12px;
      cursor: pointer;
    }
    .btn-accept:disabled { opacity: 0.5; cursor: not-allowed; }

    .accepted-card {
      background: #16a34a; color: #fff; border-radius: 16px;
      padding: 24px; text-align: center; margin-bottom: 24px;
    }
    .accepted-card h2 { margin: 0 0 8px; }
    .accepted-card p { margin: 0; }

    .btn-ok {
      width: 100%; padding: 14px; font-size: 1.1rem; font-weight: 700;
      background: rgba(255,255,255,0.2); color: #fff; border: 2px solid rgba(255,255,255,0.5);
      border-radius: 12px; cursor: pointer; margin-top: 16px;
    }

    .error { color: #dc2626; text-align: center; padding: 12px; }

    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .pulsing { animation: pulse 1.5s ease-in-out infinite; }

    @media (prefers-color-scheme: dark) {
      .waiting { color: #9ca3af; }
      .waiting h2 { color: #e5e7eb; }
    }
  `;

  constructor() {
    super();
    this.groupId = '';
    this.groupCode = '';
    this.groupName = '';
    this._alert = null;
    this._elapsed = 0;
    this._accepting = false;
    this._error = '';
    this._unsubscribe = null;
    this._timerInterval = undefined;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.groupId) this._subscribe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanup();
  }

  updated(changedProps) {
    if (changedProps.has('groupId') && this.groupId) {
      this._cleanup();
      this._subscribe();
    }
  }

  _subscribe() {
    const alertsRef = collection(db, 'alerts');
    const q = query(
      alertsRef,
      where('groupId', '==', this.groupId),
      where('status', 'in', ['active', 'accepted']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    this._unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        this._alert = null;
        this._stopTimer();
        return;
      }
      const doc = snapshot.docs[0];
      this._alert = doc.data();
      this._alert.alertId = doc.id;

      if (this._alert.status === 'active') {
        this._startTimer(this._alert.createdAt);
      } else {
        this._stopTimer();
      }
    });
  }

  _startTimer(createdAt) {
    this._stopTimer();
    const startMs = createdAt ? createdAt.seconds * 1000 : Date.now();
    this._elapsed = Math.floor((Date.now() - startMs) / 1000);
    this._timerInterval = setInterval(() => {
      this._elapsed = Math.floor((Date.now() - startMs) / 1000);
    }, 1000);
  }

  _stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = undefined;
    }
  }

  _cleanup() {
    this._stopTimer();
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async _acceptAlert() {
    if (!this._alert) return;
    this._accepting = true;
    this._error = '';
    try {
      const fn = httpsCallable(functions, 'acceptAlert');
      await fn({ alertId: this._alert.alertId });
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Error al aceptar';
    } finally {
      this._accepting = false;
    }
  }

  async _resolveAlert() {
    if (!this._alert) return;
    try {
      const fn = httpsCallable(functions, 'resolveAlert');
      await fn({ alertId: this._alert.alertId });
    } catch {
      // Alert may already be resolved
    }
  }

  render() {
    return html`
      <div class="header">
        <div>
          <h1>${this.groupName || 'AvisaBlue'}</h1>
          <span style="font-size:0.75rem; opacity:0.7">${this.groupCode}</span>
        </div>
        <div class="header-actions">
          <button @click=${() => this.dispatchEvent(new CustomEvent('logout', { bubbles: true, composed: true }))}>Salir</button>
        </div>
      </div>
      <div class="content">
        ${this._alert ? this._renderAlert() : this._renderWaiting()}
        ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
        <avisamor-zone-map .groupId=${this.groupId}></avisamor-zone-map>
      </div>
    `;
  }

  _renderWaiting() {
    return html`
      <div class="waiting">
        <div class="waiting-icon">🛡️</div>
        <h2>Sin alertas</h2>
        <p>Recibirás una notificación cuando alguien pida ayuda.</p>
      </div>
    `;
  }

  _renderAlert() {
    const a = this._alert;

    if (a.status === 'active') {
      return html`
        <div class="alert-card pulsing">
          <h2>¡ALERTA!</h2>
          <p>${a.alerterName || 'Alguien'} necesita ayuda</p>
          <div class="timer">${this._formatTime(this._elapsed)}</div>
          <button class="btn-accept" ?disabled=${this._accepting} @click=${this._acceptAlert}>
            ${this._accepting ? 'Aceptando...' : '¡VOY YO!'}
          </button>
        </div>
      `;
    }

    if (a.status === 'accepted') {
      const acceptor = a.acceptedBy?.[0];
      const zoneText = acceptor?.zone ? ` desde ${acceptor.zone}` : '';
      return html`
        <div class="accepted-card">
          <h2>Alerta aceptada</h2>
          <p>${acceptor?.displayName || 'Alguien'} va a acudir${zoneText}</p>
          <button class="btn-ok" @click=${this._resolveAlert}>OK, enterado</button>
        </div>
      `;
    }

    return nothing;
  }
}

customElements.define('avisamor-responder', AvisamorResponder);

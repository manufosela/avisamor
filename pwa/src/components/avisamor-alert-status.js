import { LitElement, html, css, nothing } from 'lit';
import { db, functions } from '../lib/firebase.js';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export class AvisamorAlertStatus extends LitElement {
  static properties = {
    groupId: { type: String },
    _alert: { state: true },
    _elapsed: { state: true },
  };

  static styles = css`
    :host { display: block; font-family: system-ui, -apple-system, sans-serif; }
    .status-container { padding: 16px; border-radius: 12px; text-align: center; transition: background-color 0.3s ease; }
    .status-active { background: #f59e0b; color: #000; }
    .status-accepted { background: #16a34a; color: #fff; }
    .status-text { font-size: 1.25rem; font-weight: 700; margin: 0 0 8px; }
    .timer { font-size: 2rem; font-weight: 800; font-variant-numeric: tabular-nums; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .pulsing { animation: pulse 1.5s ease-in-out infinite; }
    .btn-ok { margin-top: 12px; padding: 10px 24px; font-size: 1rem; font-weight: 700; background: rgba(255,255,255,0.25); color: #fff; border: 2px solid rgba(255,255,255,0.5); border-radius: 8px; cursor: pointer; }
    @media (prefers-color-scheme: dark) { .status-active { background: #b45309; color: #fff; } }
  `;

  constructor() {
    super();
    this.groupId = '';
    this._alert = null;
    this._elapsed = 0;
    this._unsubscribe = null;
    this._timerInterval = null;
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
    const q = query(alertsRef, where('groupId', '==', this.groupId), where('status', 'in', ['active', 'accepted']), orderBy('createdAt', 'desc'), limit(1));
    this._unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) { this._alert = null; this._stopTimer(); return; }
      const doc = snapshot.docs[0];
      const data = doc.data();
      data.alertId = doc.id;
      this._alert = data;
      if (data.status === 'active') this._startTimer(data.createdAt);
      else this._stopTimer();
    });
  }

  _startTimer(createdAt) {
    this._stopTimer();
    const startMs = createdAt ? createdAt.seconds * 1000 : Date.now();
    this._elapsed = Math.floor((Date.now() - startMs) / 1000);
    this._timerInterval = setInterval(() => { this._elapsed = Math.floor((Date.now() - startMs) / 1000); }, 1000);
  }

  _stopTimer() { if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; } }
  _cleanup() { this._stopTimer(); if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; } }
  _formatTime(seconds) { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; }

  async _resolveAlert() {
    if (!this._alert) return;
    try { await httpsCallable(functions, 'resolveAlert')({ alertId: this._alert.alertId }); } catch { /* may be resolved */ }
  }

  render() {
    if (!this._alert) return nothing;
    const { status, acceptedBy } = this._alert;
    if (status === 'active') {
      return html`<div class="status-container status-active pulsing" role="alert"><p class="status-text">Alerta enviada...</p><div class="timer">${this._formatTime(this._elapsed)}</div></div>`;
    }
    if (status === 'accepted') {
      const responder = acceptedBy?.length > 0 ? acceptedBy[0] : null;
      const name = responder?.displayName ?? 'Alguien';
      const zone = responder?.zone ? ` desde ${responder.zone}` : '';
      return html`<div class="status-container status-accepted" role="alert"><p class="status-text">${name} va a acudir${zone}</p><button class="btn-ok" @click=${this._resolveAlert}>OK, enterado</button></div>`;
    }
    return nothing;
  }
}

customElements.define('avisamor-alert-status', AvisamorAlertStatus);

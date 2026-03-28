import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { db } from '../lib/firebase.js';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

interface AlertData {
  alertId: string;
  status: string;
  createdAt: { seconds: number } | null;
  firstAcceptedBy: string | null;
  acceptedBy: Array<{ uid: string; displayName: string; acceptedAt: unknown }>;
}

@customElement('avisamor-alert-status')
export class AvisamorAlertStatus extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .status-container {
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      transition: background-color 0.3s ease;
    }

    .status-active {
      background: var(--color-warning, #f59e0b);
      color: #000;
    }

    .status-accepted {
      background: var(--color-success, #16a34a);
      color: #fff;
    }

    .status-resolved,
    .status-expired,
    .status-cancelled {
      background: #6b7280;
      color: #fff;
    }

    .status-text {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .timer {
      font-size: 2rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .responder-name {
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 8px;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .pulsing {
      animation: pulse 1.5s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .pulsing {
        animation: none;
        opacity: 0.8;
      }
    }

    @media (prefers-color-scheme: dark) {
      .status-active {
        background: #b45309;
        color: #fff;
      }
    }
  `;

  @property({ type: String }) groupId = '';

  @state() private _alert: AlertData | null = null;
  @state() private _elapsed = 0;
  private _unsubscribe: Unsubscribe | null = null;
  private _timerInterval?: ReturnType<typeof setInterval>;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.groupId) this._subscribe();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cleanup();
  }

  updated(changedProps: Map<string, unknown>): void {
    if (changedProps.has('groupId') && this.groupId) {
      this._cleanup();
      this._subscribe();
    }
  }

  private _subscribe(): void {
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
      const data = doc.data() as AlertData;
      this._alert = data;

      if (data.status === 'active') {
        this._startTimer(data.createdAt);
      } else {
        this._stopTimer();
      }
    });
  }

  private _startTimer(createdAt: { seconds: number } | null): void {
    this._stopTimer();
    const startMs = createdAt ? createdAt.seconds * 1000 : Date.now();
    this._elapsed = Math.floor((Date.now() - startMs) / 1000);

    this._timerInterval = setInterval(() => {
      this._elapsed = Math.floor((Date.now() - startMs) / 1000);
    }, 1000);
  }

  private _stopTimer(): void {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = undefined;
    }
  }

  private _cleanup(): void {
    this._stopTimer();
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  private _formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  render() {
    if (!this._alert) return nothing;

    const { status, acceptedBy } = this._alert;

    if (status === 'active') {
      return html`
        <div class="status-container status-active pulsing" role="alert" aria-live="polite">
          <p class="status-text">Alerta enviada...</p>
          <div class="timer" aria-label="Tiempo transcurrido desde la alerta">${this._formatTime(this._elapsed)}</div>
        </div>
      `;
    }

    if (status === 'accepted') {
      const responderName = acceptedBy?.length > 0
        ? acceptedBy[0].displayName
        : 'Alguien';

      return html`
        <div class="status-container status-accepted" role="alert" aria-live="polite">
          <p class="status-text">${responderName} va a acudir</p>
        </div>
      `;
    }

    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avisamor-alert-status': AvisamorAlertStatus;
  }
}

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { auth, db } from '../lib/firebase.js';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import './avisamor-setup.js';
import './avisamor-alerter.js';
import './avisamor-offline-indicator.js';

type AppState = 'loading' | 'setup' | 'alerter';

@customElement('avisamor-app')
export class AvisamorApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100dvh;
      background: #fff;
      color: #111827;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 1.5rem;
      color: #6b7280;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: var(--color-danger, #dc2626);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
        border-top-color: var(--color-danger, #dc2626);
        opacity: 0.7;
      }
    }

    @media (prefers-color-scheme: dark) {
      :host {
        background: #111827;
        color: #f9fafb;
      }
      .loading { color: #9ca3af; }
      .spinner {
        border-color: #374151;
        border-top-color: #ef4444;
      }
    }
  `;

  @state() private _appState: AppState = 'loading';
  @state() private _groupId = '';

  connectedCallback(): void {
    super.connectedCallback();
    this._initAuth();
  }

  private async _initAuth(): Promise<void> {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await this._checkGroup(user.uid);
      } else {
        try {
          await signInAnonymously(auth);
        } catch {
          this._appState = 'setup';
        }
      }
    });
  }

  private async _checkGroup(uid: string): Promise<void> {
    try {
      const membersRef = collection(db, 'groupMembers');
      const q = query(membersRef, where('uid', '==', uid), limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const memberData = snapshot.docs[0].data();
        this._groupId = memberData.groupId as string;
        this._appState = 'alerter';
      } else {
        this._appState = 'setup';
      }
    } catch {
      this._appState = 'setup';
    }
  }

  private _onGroupJoined(e: CustomEvent<{ groupId: string }>): void {
    this._groupId = e.detail.groupId;
    this._appState = 'alerter';
  }

  render() {
    return html`
      <avisamor-offline-indicator></avisamor-offline-indicator>

      ${this._appState === 'loading' ? html`
        <div class="loading" role="status">
          <div class="spinner"></div>
          <span class="sr-only">Cargando...</span>
        </div>
      ` : ''}

      ${this._appState === 'setup' ? html`
        <avisamor-setup @group-joined=${this._onGroupJoined}></avisamor-setup>
      ` : ''}

      ${this._appState === 'alerter' ? html`
        <avisamor-alerter .groupId=${this._groupId}></avisamor-alerter>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avisamor-app': AvisamorApp;
  }
}

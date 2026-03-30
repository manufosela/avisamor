import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { db } from '../lib/firebase.js';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

interface ZoneBeacon {
  beaconId: string;
  zoneName: string;
  floor: number;
}

interface MemberLocation {
  displayName: string;
  currentZone: string | null;
  role: string;
}

@customElement('avisamor-zone-map')
export class AvisamorZoneMap extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
    }

    h3 {
      margin: 0 0 12px;
      font-size: 1.1rem;
      color: #374151;
    }

    .zones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .zone-card {
      background: #f3f4f6;
      border-radius: 12px;
      padding: 12px;
      border: 2px solid transparent;
      transition: border-color 0.3s;
    }

    .zone-card.has-members {
      border-color: #3b82f6;
    }

    .zone-name {
      font-weight: 700;
      font-size: 1rem;
      margin: 0 0 4px;
    }

    .zone-floor {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0 0 8px;
    }

    .member {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      padding: 2px 0;
    }

    .member-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
      flex-shrink: 0;
    }

    .no-members {
      font-size: 0.8rem;
      color: #9ca3af;
      font-style: italic;
    }

    .unknown-zone {
      margin-top: 16px;
      padding: 12px;
      background: #fef3c7;
      border-radius: 8px;
    }

    .unknown-zone h4 {
      margin: 0 0 4px;
      font-size: 0.9rem;
      color: #92400e;
    }

    .empty-state {
      text-align: center;
      padding: 24px;
      color: #6b7280;
    }

    @media (prefers-color-scheme: dark) {
      h3 { color: #e5e7eb; }
      .zone-card { background: #1f2937; }
      .zone-floor { color: #9ca3af; }
      .no-members { color: #6b7280; }
      .unknown-zone { background: #78350f; }
      .unknown-zone h4 { color: #fbbf24; }
    }
  `;

  @property({ type: String }) groupId = '';

  @state() private _beacons: ZoneBeacon[] = [];
  @state() private _members: MemberLocation[] = [];

  private _unsubBeacons: Unsubscribe | null = null;
  private _unsubMembers: Unsubscribe | null = null;

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
    // Listen to beacons
    const beaconsRef = collection(db, 'beacons');
    const beaconsQuery = query(
      beaconsRef,
      where('groupId', '==', this.groupId),
      where('active', '==', true)
    );

    this._unsubBeacons = onSnapshot(beaconsQuery, (snapshot) => {
      this._beacons = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          beaconId: d.beaconId,
          zoneName: d.zoneName,
          floor: d.floor ?? 0,
        };
      });
    });

    // Listen to group members with zones
    const membersRef = collection(db, 'groupMembers');
    const membersQuery = query(
      membersRef,
      where('groupId', '==', this.groupId)
    );

    this._unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      this._members = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          displayName: d.displayName ?? '',
          currentZone: d.currentZone ?? null,
          role: d.role ?? '',
        };
      });
    });
  }

  private _cleanup(): void {
    this._unsubBeacons?.();
    this._unsubBeacons = null;
    this._unsubMembers?.();
    this._unsubMembers = null;
  }

  render() {
    if (this._beacons.length === 0) {
      return html`
        <div class="empty-state">
          <p>No hay beacons configurados.</p>
          <p>Configura beacons desde la app Android en Ajustes → Configurar beacons.</p>
        </div>
      `;
    }

    const floors = [...new Set(this._beacons.map((b) => b.floor))].sort();
    const responders = this._members.filter((m) => m.role === 'responder');
    const unknownZoneMembers = responders.filter(
      (m) => !m.currentZone || !this._beacons.some((b) => b.zoneName === m.currentZone)
    );

    return html`
      ${floors.map((floor) => html`
        <h3>Planta ${floor}</h3>
        <div class="zones-grid">
          ${this._beacons
            .filter((b) => b.floor === floor)
            .map((beacon) => {
              const membersInZone = responders.filter((m) => m.currentZone === beacon.zoneName);
              return html`
                <div class="zone-card ${membersInZone.length > 0 ? 'has-members' : ''}">
                  <p class="zone-name">${beacon.zoneName}</p>
                  <p class="zone-floor">Planta ${beacon.floor}</p>
                  ${membersInZone.length > 0
                    ? membersInZone.map(
                        (m) => html`
                          <div class="member">
                            <span class="member-dot"></span>
                            <span>${m.displayName}</span>
                          </div>
                        `
                      )
                    : html`<p class="no-members">Sin cuidadores</p>`}
                </div>
              `;
            })}
        </div>
      `)}

      ${unknownZoneMembers.length > 0
        ? html`
            <div class="unknown-zone">
              <h4>Zona desconocida</h4>
              ${unknownZoneMembers.map(
                (m) => html`
                  <div class="member">
                    <span class="member-dot"></span>
                    <span>${m.displayName}</span>
                  </div>
                `
              )}
            </div>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'avisamor-zone-map': AvisamorZoneMap;
  }
}

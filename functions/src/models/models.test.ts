import { describe, it, expect } from "vitest";
import {
  AlertStatus,
  TriggerSource,
  MemberRole,
} from "./index.js";
import type {
  Alert,
  AlertHistory,
  AcceptedByEntry,
  Group,
  GroupMember,
  ApiKey,
} from "./index.js";
import {
  VALID_TRANSITIONS,
  isValidTransition,
} from "./state-machine.js";
import type { Timestamp } from "firebase-admin/firestore";

const fakeTimestamp = { seconds: 0, nanoseconds: 0 } as unknown as Timestamp;

describe("AlertStatus enum", () => {
  it("should have all required values", () => {
    expect(AlertStatus.ACTIVE).toBe("active");
    expect(AlertStatus.ACCEPTED).toBe("accepted");
    expect(AlertStatus.RESOLVED).toBe("resolved");
    expect(AlertStatus.CANCELLED).toBe("cancelled");
    expect(AlertStatus.EXPIRED).toBe("expired");
  });

  it("should have exactly 5 values", () => {
    expect(Object.keys(AlertStatus)).toHaveLength(5);
  });
});

describe("TriggerSource enum", () => {
  it("should have all required values", () => {
    expect(TriggerSource.FLIC).toBe("flic");
    expect(TriggerSource.PWA).toBe("pwa");
    expect(TriggerSource.ANDROID).toBe("android");
  });

  it("should have exactly 3 values", () => {
    expect(Object.keys(TriggerSource)).toHaveLength(3);
  });
});

describe("MemberRole enum", () => {
  it("should have all required values", () => {
    expect(MemberRole.ALERTER).toBe("alerter");
    expect(MemberRole.RESPONDER).toBe("responder");
  });

  it("should have exactly 2 values", () => {
    expect(Object.keys(MemberRole)).toHaveLength(2);
  });
});

describe("Alert interface", () => {
  it("should accept a valid Alert object", () => {
    const alert: Alert = {
      alertId: "alert-001",
      groupId: "group-001",
      triggeredBy: "user-001",
      triggerSource: TriggerSource.FLIC,
      status: AlertStatus.ACTIVE,
      createdAt: fakeTimestamp,
      expiresAt: fakeTimestamp,
      acceptedBy: [],
    };
    expect(alert.alertId).toBe("alert-001");
    expect(alert.status).toBe(AlertStatus.ACTIVE);
  });

  it("should accept optional fields", () => {
    const entry: AcceptedByEntry = {
      uid: "user-002",
      displayName: "Carer",
      acceptedAt: fakeTimestamp,
    };
    const alert: Alert = {
      alertId: "alert-002",
      groupId: "group-001",
      triggeredBy: "user-001",
      triggerSource: TriggerSource.PWA,
      status: AlertStatus.ACCEPTED,
      createdAt: fakeTimestamp,
      expiresAt: fakeTimestamp,
      acceptedBy: [entry],
      firstAcceptedBy: "user-002",
      firstAcceptedAt: fakeTimestamp,
      resolvedAt: fakeTimestamp,
      resolvedBy: "user-002",
      cancelledAt: fakeTimestamp,
    };
    expect(alert.firstAcceptedBy).toBe("user-002");
    expect(alert.acceptedBy).toHaveLength(1);
  });
});

describe("AlertHistory type", () => {
  it("should extend Alert with archivedAt", () => {
    const history: AlertHistory = {
      alertId: "alert-001",
      groupId: "group-001",
      triggeredBy: "user-001",
      triggerSource: TriggerSource.ANDROID,
      status: AlertStatus.RESOLVED,
      createdAt: fakeTimestamp,
      expiresAt: fakeTimestamp,
      acceptedBy: [],
      archivedAt: fakeTimestamp,
    };
    expect(history.archivedAt).toBe(fakeTimestamp);
  });
});

describe("Group interface", () => {
  it("should accept a valid Group object", () => {
    const group: Group = {
      groupId: "group-001",
      code: "123456",
      name: "Family",
      createdAt: fakeTimestamp,
      createdBy: "user-001",
      alertExpirySeconds: 60,
      escalateTo112: false,
      escalateAfterSeconds: 120,
    };
    expect(group.alertExpirySeconds).toBe(60);
    expect(group.escalateTo112).toBe(false);
  });
});

describe("GroupMember interface", () => {
  it("should accept a valid GroupMember object", () => {
    const member: GroupMember = {
      memberId: "member-001",
      uid: "user-001",
      groupId: "group-001",
      role: MemberRole.RESPONDER,
      displayName: "John",
      fcmToken: "token-123",
      joinedAt: fakeTimestamp,
    };
    expect(member.role).toBe(MemberRole.RESPONDER);
  });
});

describe("ApiKey interface", () => {
  it("should accept a valid ApiKey object", () => {
    const apiKey: ApiKey = {
      keyId: "key-001",
      keyHash: "sha256-abc",
      groupId: "group-001",
      createdAt: fakeTimestamp,
      active: true,
      label: "Flic Hub",
    };
    expect(apiKey.active).toBe(true);
    expect(apiKey.label).toBe("Flic Hub");
  });
});

describe("state-machine", () => {
  describe("VALID_TRANSITIONS", () => {
    it("should define transitions from ACTIVE", () => {
      expect(VALID_TRANSITIONS.get(AlertStatus.ACTIVE)).toContain(AlertStatus.ACCEPTED);
      expect(VALID_TRANSITIONS.get(AlertStatus.ACTIVE)).toContain(AlertStatus.CANCELLED);
      expect(VALID_TRANSITIONS.get(AlertStatus.ACTIVE)).toContain(AlertStatus.EXPIRED);
    });

    it("should define transitions from ACCEPTED", () => {
      expect(VALID_TRANSITIONS.get(AlertStatus.ACCEPTED)).toContain(AlertStatus.RESOLVED);
      expect(VALID_TRANSITIONS.get(AlertStatus.ACCEPTED)).toContain(AlertStatus.CANCELLED);
    });

    it("should not allow transitions from RESOLVED", () => {
      const resolved = VALID_TRANSITIONS.get(AlertStatus.RESOLVED);
      expect(!resolved || resolved.length === 0).toBe(true);
    });

    it("should not allow transitions from EXPIRED", () => {
      const expired = VALID_TRANSITIONS.get(AlertStatus.EXPIRED);
      expect(!expired || expired.length === 0).toBe(true);
    });

    it("should not allow transitions from CANCELLED", () => {
      const cancelled = VALID_TRANSITIONS.get(AlertStatus.CANCELLED);
      expect(!cancelled || cancelled.length === 0).toBe(true);
    });
  });

  describe("isValidTransition", () => {
    it("should return true for valid transitions", () => {
      expect(isValidTransition(AlertStatus.ACTIVE, AlertStatus.ACCEPTED)).toBe(true);
      expect(isValidTransition(AlertStatus.ACTIVE, AlertStatus.CANCELLED)).toBe(true);
      expect(isValidTransition(AlertStatus.ACTIVE, AlertStatus.EXPIRED)).toBe(true);
      expect(isValidTransition(AlertStatus.ACCEPTED, AlertStatus.RESOLVED)).toBe(true);
      expect(isValidTransition(AlertStatus.ACCEPTED, AlertStatus.CANCELLED)).toBe(true);
    });

    it("should return false for invalid transitions", () => {
      expect(isValidTransition(AlertStatus.ACTIVE, AlertStatus.RESOLVED)).toBe(false);
      expect(isValidTransition(AlertStatus.RESOLVED, AlertStatus.ACTIVE)).toBe(false);
      expect(isValidTransition(AlertStatus.EXPIRED, AlertStatus.ACTIVE)).toBe(false);
      expect(isValidTransition(AlertStatus.CANCELLED, AlertStatus.ACTIVE)).toBe(false);
    });
  });
});

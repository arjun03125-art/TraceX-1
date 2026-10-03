import type {
  Case,
  Evidence,
  Artifact,
  AuditEvent,
  TimelineEvent
} from '../types/forensic';

// Clean initial data — no fabricated forensic information.
// Real data is managed by DataService / AppContext.
export const INITIAL_CASES: Case[] = [];
export const INITIAL_EVIDENCE: Evidence[] = [];
export const INITIAL_ARTIFACTS: Artifact[] = [];
export const INITIAL_AUDIT: AuditEvent[] = [];
export const INITIAL_TIMELINE: TimelineEvent[] = [];

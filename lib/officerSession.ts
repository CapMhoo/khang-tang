export type OfficerSession = {
  officerId: string;
  officerName?: string;
};

let officerSession: OfficerSession | null = null;

export function setOfficerSession(session: OfficerSession | null) {
  officerSession = session;
}

export function getOfficerSession() {
  return officerSession;
}


let agentSessionPromise: Promise<void> | null = null;

export function getAgentSessionPromise() {
  return agentSessionPromise;
}

export function setAgentSessionPromise(value: Promise<void> | null) {
  agentSessionPromise = value;
}

export function resetApiAuthCache() {
  agentSessionPromise = null;
}

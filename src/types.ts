export const BASE_URL = 'https://config.ff.harness.io/api/1.0',
  EVENTS_URL = 'https://events.ff.harness.io/api/1.0',
  MINUTE = 60,
  PULL_INTERVAL = 1 * MINUTE,
  PERSIST_INTERVAL = 1 * MINUTE,
  EVENTS_SYNC_INTERVAL = 1 * MINUTE;

export interface Options {
  baseUrl?: string
  eventsUrl?: string
  pullInterval?: number
  persistInterval?: number
  eventsSyncInterval?: number
  enableStream?: boolean
  enableAnalytics?: boolean
}

export const defaultOptions: Options = {
  baseUrl: BASE_URL,
  eventsUrl: EVENTS_URL,
  pullInterval: PULL_INTERVAL,
  persistInterval: PERSIST_INTERVAL,
  eventsSyncInterval: EVENTS_SYNC_INTERVAL,
  enableStream: true,
  enableAnalytics: true,
}

export interface Claims {
  environment: string
  environmentIdentifier: string
  project: string
  projectIdentifier: string
  accountID: string
  organization: string
  organizationIdentifier: string
  clusterIdentifier: string
  key_type: 'Server'
}
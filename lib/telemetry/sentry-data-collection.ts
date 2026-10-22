/**
 * Sentry 11 collects request bodies, cookies, user info, and similar data
 * unless told otherwise. This matches the SDK 10 default (`sendDefaultPii: false`).
 * https://docs.sentry.io/platforms/javascript/migration/v10-to-v11/
 */
export const restrictiveDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
    response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
  },
  httpBodies: [] as Array<
    "incomingRequest" | "outgoingRequest" | "incomingResponse" | "outgoingResponse"
  >,
  urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
};

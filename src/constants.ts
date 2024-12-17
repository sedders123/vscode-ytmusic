export const friendlyErrorMessages = new Map<string, string>([
  [
    "xhr poll error",
    "Could not connect - XHR Poll Error. Is the Youtube Music Desktop Player running?",
  ],
  ["Unauthorized", "Unauthorized. Did you enter the auth code correctly?"],
  ["UNAUTHORIZED", "Unauthorized. Did you enter the auth code correctly?"],
  ["AUTHORIZATION_DISABLED", "Authorization is disabled. Please open settings and head to the Integration tab and enable \"Companion server and\" and \"Enable companion authorization\"."],
  ["AUTHORIZATION_INVALID", "While trying to authorize, the server returned an invalid response. Please try again."],
  ["AUTHORIZATION_DENIED", "Authorization denied. Please while trying to authorize, click on \"Allow\"."],
  ["Too Many Requests", "Youtube Music Desktop App rate limited your requests. Please try again in one minute."],
]);

export const friendlyErrorMessages = new Map<string, string>([
  [
    "xhr poll error",
    "Could not connect - XHR Poll Error. Is the Youtube Music Desktop Player running?",
  ],
  ["Unauthorized", "Unauthorized. Did you enter the auth code correctly?"],
  ["Unathorized", "Unauthorized. Did you enter the auth code correctly?"],
  [
    "Forbidden",
    "Authenticating for the first time? Ensure 'Enable companion authorization' is toggled on in the Youtube Music Desktop Player settings.",
  ],
  [
    "fetch failed",
    "Ensure 'Companion server' is toggled on in the Youtube Music Desktop Player settings.",
  ],
]);

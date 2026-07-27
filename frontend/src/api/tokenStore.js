// The short-lived access token lives only in memory — never localStorage —
// so it isn't readable by an injected script via an XSS bug. Session
// persistence across page reloads instead relies on the httpOnly refresh
// cookie (see client.js's silent-refresh-on-boot flow in AuthContext).
let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => { accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };

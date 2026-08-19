// Short-lived Cache-Control for public, non-personalized GET responses
// (product/category listings) so repeat visits within the window skip the
// DB round trip instead of hitting Mongo on every request.
export const cacheControl = (seconds) => (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache 2xx — an error response (400/404/500) must never get
    // replayed to other users for the next `seconds`.
    if (res.statusCode >= 200 && res.statusCode < 300) {
      res.set("Cache-Control", `public, max-age=${seconds}`);
    }
    return originalJson(body);
  };
  next();
};

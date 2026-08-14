// Builds context-appropriate Cloudinary delivery URLs (thumbnail/card/detail/
// zoom) from a single stored product image URL, instead of always requesting
// whatever size happened to be uploaded. Works for both seed-time images
// (which already carry a transform segment) and raw admin-uploaded images,
// by replacing whatever is between "/upload/" and the rest of the path
// rather than matching one exact legacy transform string.
const UPLOAD_MARKER = "/upload/";

const isCloudinaryUrl = (url) => typeof url === "string" && url.includes(UPLOAD_MARKER);

// Matches an existing transformation segment (comma-separated params like
// "w_400,c_fill,q_auto") immediately after "/upload/", stopping before an
// optional version segment ("v12345") or the public ID itself.
const TRANSFORM_SEGMENT = /^([a-z]_[^/]+\/)+/i;

export const cldUrl = (url, width, { square = true } = {}) => {
  if (!isCloudinaryUrl(url)) return url;
  const idx = url.indexOf(UPLOAD_MARKER);
  const head = url.slice(0, idx + UPLOAD_MARKER.length);
  let rest = url.slice(idx + UPLOAD_MARKER.length);
  rest = rest.replace(TRANSFORM_SEGMENT, "");

  const params = square
    ? `f_auto,q_auto,c_fill,g_auto,w_${width},h_${width}`
    : `f_auto,q_auto,c_limit,w_${width}`;

  return `${head}${params}/${rest}`;
};

export const cldSrcSet = (url, widths, opts) =>
  widths.map((w) => `${cldUrl(url, w, opts)} ${w}w`).join(", ");

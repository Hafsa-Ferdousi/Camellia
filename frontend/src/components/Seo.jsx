import { Helmet } from "react-helmet-async";

const SITE_NAME = "Camellia";
const DEFAULT_DESCRIPTION =
  "Camellia — handcrafted bridal jewelry and wedding accessories: kalira, chura, necklace sets, nath, and more. Delivered across Bangladesh.";

// Per-page <title>/meta so search results and shared links (product pages
// especially) show real content instead of the same homepage text everywhere.
export default function Seo({ title, description = DEFAULT_DESCRIPTION, image, noindex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Jewelry & Wedding Accessories`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}

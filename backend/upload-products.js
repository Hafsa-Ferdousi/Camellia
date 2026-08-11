/**
 * Upload Camellia product images to Cloudinary and emit a seed-ready products file.
 *
 *   cd backend
 *   npm i cloudinary
 *   node upload-products.js ../Productsfor412
 *
 * Requires CLOUDINARY_URL in backend/.env
 *
 * Outputs cloudinaryProducts.json — 70 products, each with an images[] array
 * of delivery URLs, matching the shape of Product.images ([String]).
 *
 * Safe to re-run: overwrite:false skips anything already uploaded.
 */

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

const SRC = process.argv[2] || '../Productsfor412';
const CLOUD_FOLDER = 'camellia/products';
const OUT = './cloudinaryProducts.json';
const IMAGES_PER_PRODUCT = 3;
const CONCURRENCY = 4;

/**
 * Source folder name -> category. Slugs match the ones already in seed.js so
 * existing categories are reused, not duplicated. Spelling corrected here:
 *   "Weeding" -> Wedding, "Earing" -> Earring, "Noth" -> Nath, "Kaalira" -> Kalira
 */
const CATEGORIES = {
  'Bangles': { slug: 'bangles', en: 'Bangles', bn: 'বালা', isNew: false },
  'Bridal chura': { slug: 'chura', en: 'Chura', bn: 'চুড়া', isNew: false },
  'Bridal noth': { slug: 'nath', en: 'Bridal Nath', bn: 'নথ', isNew: true },
  'Diamond cut jewellery': { slug: 'diamond-cut', en: 'Diamond Cut', bn: 'ডায়মন্ড কাট', isNew: false },
  'Earing & Tikli': { slug: 'earrings-tikli', en: 'Earrings & Tikli', bn: 'কানের দুল ও টিকলি', isNew: true },
  'Kaalira': { slug: 'kalira', en: 'Kalira', bn: 'কলিরা', isNew: false },
  'Necklace Set': { slug: 'necklace', en: 'Necklace Set', bn: 'নেকলেস সেট', isNew: false },
  'Weeding Accessories': { slug: 'wedding-accessories', en: 'Wedding Accessories', bn: 'ওয়েডিং এক্সেসরিজ', isNew: false },
};

const url = (publicId, transformation) =>
  cloudinary.url(publicId, { secure: true, transformation });

const deliveryUrls = (publicId) => ({
  thumb: url(publicId, [
    { width: 400, aspect_ratio: '1:1', crop: 'fill', gravity: 'auto' },
    { fetch_format: 'auto', quality: 'auto' },
  ]),
  detail: url(publicId, [
    { width: 800, crop: 'limit' },
    { fetch_format: 'auto', quality: 'auto' },
  ]),
  zoom: url(publicId, [
    { width: 1600, crop: 'limit' },
    { fetch_format: 'auto', quality: 'auto' },
  ]),
});

/** Split items into groups of 3; any remainder joins the final group. */
function groupIntoProducts(items) {
  const count = Math.max(1, Math.floor(items.length / IMAGES_PER_PRODUCT));
  const groups = [];
  for (let i = 0; i < count; i++) {
    const start = i * IMAGES_PER_PRODUCT;
    const end = i === count - 1 ? items.length : start + IMAGES_PER_PRODUCT;
    groups.push(items.slice(start, end));
  }
  return groups;
}

async function buildJobs() {
  const entries = (await fs.readdir(SRC, { withFileTypes: true })).filter((d) => d.isDirectory());
  const jobs = [];
  const unknown = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const cat = CATEGORIES[entry.name.trim()];
    if (!cat) {
      unknown.push(entry.name);
      continue;
    }

    const dir = path.join(SRC, entry.name);
    const files = (await fs.readdir(dir))
      .filter((f) => /\.(webp|jpe?g|png)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    let imageIndex = 0;
    groupIntoProducts(files).forEach((group, p) => {
      const productNo = String(p + 1).padStart(2, '0');
      jobs.push({
        categorySlug: cat.slug,
        productNo,
        images: group.map((file) => {
          imageIndex += 1;
          const n = String(imageIndex).padStart(2, '0');
          return {
            localPath: path.join(dir, file),
            publicId: `${CLOUD_FOLDER}/${cat.slug}/${cat.slug}-${n}`,
            originalFileName: file,
          };
        }),
      });
    });
  }

  if (unknown.length) {
    console.warn(`Skipped unrecognised folders: ${unknown.join(', ')}`);
  }
  return jobs;
}

async function uploadOne(image, categorySlug) {
  const res = await cloudinary.uploader.upload(image.localPath, {
    public_id: image.publicId,
    overwrite: false,
    resource_type: 'image',
    tags: ['camellia', 'product', categorySlug],
  });
  return {
    ...deliveryUrls(res.public_id),
    publicId: res.public_id,
    width: res.width,
    height: res.height,
  };
}

async function main() {
  if (!process.env.CLOUDINARY_URL) {
    console.error('Missing CLOUDINARY_URL in .env');
    process.exit(1);
  }
  cloudinary.config({ secure: true });

  const jobs = await buildJobs();
  const totalImages = jobs.reduce((n, j) => n + j.images.length, 0);
  console.log(`${jobs.length} products / ${totalImages} images\n`);

  const products = [];
  const failures = [];
  let done = 0;

  const queue = [...jobs];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift();
      const uploaded = [];
      for (const image of job.images) {
        try {
          uploaded.push(await uploadOne(image, job.categorySlug));
        } catch (err) {
          failures.push({ publicId: image.publicId, error: err.message });
        }
        done += 1;
        process.stdout.write(`\r  ${done}/${totalImages}`);
      }
      if (uploaded.length) {
        products.push({
          categorySlug: job.categorySlug,
          productNo: job.productNo,
          // TODO: fill these in before seeding
          name: { en: `${job.categorySlug} ${job.productNo}`, bn: '' },
          description: { en: '', bn: '' },
          basePrice: 0,
          totalStock: 0,
          isFeatured: false,
          // Product.images is [String] — thumb first, since ProductCard reads images[0]
          images: uploaded.map((u) => u.thumb),
          gallery: uploaded.map(({ publicId, thumb, detail, zoom }) => ({
            publicId,
            thumb,
            detail,
            zoom,
          })),
        });
      }
    }
  });
  await Promise.all(workers);
  process.stdout.write('\n');

  products.sort(
    (a, b) =>
      a.categorySlug.localeCompare(b.categorySlug) || a.productNo.localeCompare(b.productNo),
  );

  const categories = Object.values(CATEGORIES)
    .filter((c) => products.some((p) => p.categorySlug === c.slug))
    .map(({ slug, en, bn, isNew }) => ({ slug, name: { en, bn }, isNew }));

  await fs.writeFile(OUT, JSON.stringify({ categories, products }, null, 2));

  console.log(`\nDone. ${products.length} products, ${failures.length} failed uploads.`);
  console.log(`Written to ${OUT}`);
  console.log(
    `New categories for seed.js: ${categories.filter((c) => c.isNew).map((c) => c.slug).join(', ')}`,
  );
  if (failures.length) {
    console.log('\nFailures (re-run to retry):');
    failures.forEach((f) => console.log(`  ${f.publicId} — ${f.error}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Guards the contributor-product opt-in flow end to end:
// opt-in flag -> application request -> admin-only, audited license issuance.
// Run: npm run test:contributor-products
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const migration = read('supabase/migrations/20261127000000_add_contributor_product_access.sql')
const schema = read('supabase-schema.sql')
const adminProducts = read('src/components/admin/AdminProducts.jsx')
const adminProductsData = read('src/lib/adminProducts.js')
const productQuery = read('src/lib/products.js')
const applyHandler = read('api/_lib/contributor-application-handler.js')
const adminHandler = read('api/_lib/admin-contributor-handler.js')
const adminPanel = read('src/components/admin/AdminContributorApplications.jsx')
const applicationPanel = read('src/components/offerings/ContributorApplicationPanel.jsx')
const products = read('src/components/offerings/Products.jsx')
const productCard = read('src/components/offerings/ProductCard.jsx')
const productDetail = read('src/components/offerings/ProductDetail.jsx')
const loader = read('src/components/StartingLoader.jsx')
const app = read('src/App.jsx')
const en = JSON.parse(read('src/locales/en.json'))

let passed = 0
let failed = 0

function check(name, condition) {
  if (condition) {
    passed++
    console.log(`ok    ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}`)
  }
}

// --- schema -----------------------------------------------------------------
check('migration adds an opt-in product flag defaulting to false',
  /ADD COLUMN IF NOT EXISTS contributor_access BOOLEAN NOT NULL DEFAULT FALSE/.test(migration))
check('migration links applications to a requested product',
  /requested_product_id BIGINT REFERENCES products\(id\) ON DELETE SET NULL/.test(migration))
check('canonical schema mirrors the product flag and request column',
  schema.includes('contributor_access BOOLEAN NOT NULL DEFAULT FALSE') &&
  schema.includes('requested_product_id BIGINT REFERENCES products(id) ON DELETE SET NULL'))

// --- admin product form -----------------------------------------------------
check('product form exposes the contributor-product option',
  adminProducts.includes("key: 'contributor_access'") &&
  adminProducts.includes("label: 'Contributor product — free for approved contributors'"))
check('product writes carry the flag',
  adminProducts.includes("contributor_access: Boolean(form.contributor_access)") &&
  adminProductsData.includes("'contributor_access'"))
check('catalogue can filter contributor products only',
  productQuery.includes('contributorOnly = false') && productQuery.includes("query.eq('contributor_access', true)"))

// --- application + issuance -------------------------------------------------
check('application validates the requested product server-side',
  applyHandler.includes('resolveRequestedProduct') &&
  applyHandler.includes("product.status !== 'published' || product.contributor_access !== true") &&
  applyHandler.includes('requested_product_id: productId'))
check('issuance refuses products without contributor access',
  adminHandler.includes("product.contributor_access !== true || product.status === 'archived'") &&
  adminHandler.includes('This product is not enabled for contributor access.'))
check('admin review actions reach the review handler',
  adminHandler.includes("['under_review', 'approve', 'reject'].includes(action)") &&
  adminHandler.includes('return await reviewApplication(req, res, supabase, admin)'))
check('admin UI only offers eligible products and shows the request',
  adminPanel.includes('p.contributor_access && p.status !== \'archived\'') &&
  adminPanel.includes('requestedEligible') &&
  applyHandler.includes('products (title, slug)'))
check('applicant UI lets them name an eligible product',
  applicationPanel.includes('getPublishedProducts({ contributorOnly: true, limit: 100 })') &&
  applicationPanel.includes('requested_product_id'))

// --- store + gateway --------------------------------------------------------
check('store exposes a contributor-product filter',
  products.includes("contributorOnly: 'contributor'") &&
  products.includes("t('store.contributorOnly')"))
check('card and detail page mark contributor products',
  productCard.includes('product.contributor_access') &&
  productDetail.includes('store.contributorNote') &&
  productDetail.includes('to="/contributor-apply"'))
check('gateway has partner and contributor access options',
  loader.includes("to: '/affiliate-apply'") &&
  loader.includes("to: '/contributor-apply'") &&
  loader.includes("GATEWAY_ACCESS_IDS") &&
  loader.includes('group="access"') &&
  en.loader.gateway.filters.access === 'Access')
check('contributor application route is registered',
  app.includes("path=\"/contributor-apply\"") && app.includes('ContributorApply'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

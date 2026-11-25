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
const contributorApply = read('src/components/offerings/ContributorApply.jsx')
const login = read('src/components/admin/Login.jsx')
const register = read('src/components/admin/Register.jsx')
const forgot = read('src/components/admin/ForgotPassword.jsx')
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
check('contributor sign-in CTA avoids the portfolio admin login',
  contributorApply.includes('to="/contributor-login"') && !contributorApply.includes('to="/login"'))
check('contributor login route is separate from admin and partner',
  app.includes('path="/contributor-login"') &&
  app.includes('<Login variant="contributor" />') &&
  app.includes("pathname === '/contributor-login'") &&
  app.includes("startsWith('/contributor-login')"))
check('contributor login variant has its own title, badge, accent and redirect',
  login.includes("const isContributor = variant === 'contributor'") &&
  login.includes("isContributor ? 'Contributor Sign In' : portalTitle") &&
  login.includes('Contributor Access') &&
  login.includes("const portalAccent = isContributor ? '#38bdf8' : partnerAccent") &&
  login.includes("isContributor ? '/contributor-apply' : portalHome"))
check('contributor reset and register stay in the contributor auth flow',
  login.includes('/forgot-password?for=contributor') &&
  login.includes('/register?for=contributor') &&
  register.includes("const authSignInPath = isContributor ? '/contributor-login' : signInPath") &&
  register.includes("navigate('/contributor-apply', { replace: true })") &&
  forgot.includes("const authSignInPath = isContributor ? '/contributor-login' : signInPath"))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

// Source guards for the public affiliate application + admin review flow.
// Run: npm run test:affiliate-applications
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')

const migration = read('supabase/migrations/20261125120000_create_affiliate_applications.sql')
const rollback = read('supabase/rollback/20261125120000_create_affiliate_applications.down.sql')
const schema = read('supabase-schema.sql')
const lib = read('src/lib/affiliateApplications.js')
const admin = read('src/components/admin/AdminAffiliates.jsx')
const apply = read('src/components/partner/AffiliateApply.jsx')
const app = read('src/App.jsx')
const footer = read('src/components/ui/footer-section.jsx')
const navbar = read('src/components/Navbar.jsx')
const serviceNavbar = read('src/components/ServiceNavbar.jsx')
const products = read('src/components/offerings/Products.jsx')
const partner = read('src/components/partner/PartnerPortal.jsx')
const login = read('src/components/admin/Login.jsx')
const register = read('src/components/admin/Register.jsx')
const forgot = read('src/components/admin/ForgotPassword.jsx')
const en = JSON.parse(read('src/locales/en.json'))
const pkg = JSON.parse(read('package.json'))

let passed = 0
let failed = 0

function check(name, cond) {
  if (cond) {
    passed++
    console.log(`ok    ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name}`)
  }
}

// --- database contract -------------------------------------------------------
check(
  'migration: applications table exists',
  migration.includes('CREATE TABLE IF NOT EXISTS affiliate_applications')
)
check(
  'migration: applications start pending and carry an audit trail',
  migration.includes("status TEXT NOT NULL DEFAULT 'pending'") &&
    migration.includes('review_notes TEXT NOT NULL DEFAULT') &&
    migration.includes('reviewed_at TIMESTAMPTZ')
)
check(
  'migration: codes and channels are bounded in SQL',
  migration.includes("proposed_code TEXT NOT NULL CHECK") &&
    migration.includes("channels TEXT NOT NULL CHECK") &&
    migration.includes("message TEXT NOT NULL CHECK")
)
check(
  'migration: one pending application per email',
  migration.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_applications_pending_email') &&
    migration.includes("(lower(email)) WHERE status = 'pending'")
)
check(
  'migration: public can insert but never self-approve',
  migration.includes('GRANT INSERT ON TABLE affiliate_applications TO anon') &&
    migration.includes('FOR INSERT TO anon') &&
    migration.includes("WITH CHECK (status = 'pending' AND affiliate_id IS NULL)") &&
    !/GRANT[^\n]*SELECT[^\n]*TO anon/i.test(migration)
)
check(
  'migration: admin-only read and review',
  migration.includes('CREATE POLICY "Admin can manage affiliate applications"') &&
    migration.includes('FOR ALL TO authenticated') &&
    migration.includes('USING (is_admin()) WITH CHECK (is_admin())')
)
check(
  'migration: trigger forces pending even on a direct insert',
  migration.includes('BEFORE INSERT ON affiliate_applications') &&
    migration.includes("NEW.status := 'pending'") &&
    migration.includes('NEW.affiliate_id := NULL') &&
    migration.includes('SET search_path = public, pg_temp')
)
check(
  'rollback: applications table and helper are removed',
  rollback.includes('DROP TRIGGER IF EXISTS affiliate_applications_force_pending') &&
    rollback.includes('DROP FUNCTION IF EXISTS public.force_affiliate_application_pending()') &&
    rollback.includes('DROP TABLE IF EXISTS affiliate_applications')
)
check(
  'schema mirror: applications table and policies are present',
  schema.includes('CREATE TABLE IF NOT EXISTS affiliate_applications') &&
    schema.includes('CREATE POLICY "Anyone can apply as an affiliate"') &&
    schema.includes('CREATE POLICY "Admin can manage affiliate applications"')
)

// --- data helper -------------------------------------------------------------
check(
  'applications: public submit, admin list, approve and reject helpers exist',
  ['submitAffiliateApplication', 'listAffiliateApplications', 'approveAffiliateApplication', 'rejectAffiliateApplication']
    .every((fn) => lib.includes(`export async function ${fn}`))
)
check(
  'applications: duplicate submissions get an honest, translated code',
  lib.includes("const DUPLICATE_CODE = 'AFFILIATE_APPLICATION_DUPLICATE'") &&
    lib.includes('duplicate.code = DUPLICATE_CODE') &&
    apply.includes("err?.code === 'AFFILIATE_APPLICATION_DUPLICATE'")
)
check(
  'applications: approval creates an affiliate, then audits the decision',
  lib.includes(".from('affiliates')") &&
    lib.includes(".from('affiliate_applications')") &&
    lib.includes(".eq('status', 'pending')") &&
    lib.includes("status: 'approved'") &&
    lib.includes('await supabase.from(\'affiliates\').delete().eq(\'id\', created.id)')
)
check(
  'applications: approval refuses an invalid commission rate',
  lib.includes('bps <= 0 || bps > 10000') &&
    lib.includes("throw new Error('Commission must be between 0 and 100%.')")
)
check(
  'applications: no checkout API function was added',
  !fs.readdirSync('api').some((file) => /checkout/i.test(file))
)

// --- public form -------------------------------------------------------------
check('apply: public route is registered', app.includes('path="/affiliate-apply"'))
check('apply: route is code-split', app.includes("import('./components/partner/AffiliateApply')"))
check(
  'apply: form submits only text fields through the shared helper',
  apply.includes('submitAffiliateApplication(form)') &&
    apply.includes('preventDefault()') &&
    apply.includes('full_name') &&
    apply.includes('proposed_code') &&
    apply.includes('channels') &&
    apply.includes('message') &&
    !/commission_percent|commission_bps|affiliates\s*\)/.test(apply)
)
check(
  'apply: success and validation states are accessible',
  apply.includes('role="status"') &&
    apply.includes('role="alert"') &&
    apply.includes('aria-labelledby="affiliate-apply-heading"') &&
    apply.includes('disabled={busy}')
)
check(
  'apply: discovery links exist in site nav, store nav, footer and partner dashboard',
  navbar.includes("label: 'nav.becomePartner', href: '/affiliate-apply'") &&
    serviceNavbar.includes("label: 'services.nav.becomePartner', href: '/affiliate-apply'") &&
    products.includes('to="/affiliate-apply"') &&
    footer.includes("t('footer.affiliateApply')") &&
    partner.includes('to="/affiliate-apply"')
)

// --- admin review ------------------------------------------------------------
check(
  'admin: application queue is mounted on the affiliates page',
  admin.includes('Partner applications') &&
    admin.includes('listAffiliateApplications') &&
    admin.includes('approveAffiliateApplication') &&
    admin.includes('rejectAffiliateApplication')
)
check(
  'admin: review sets the final code and commission',
  admin.includes('Approve & create partner') &&
    admin.includes('commission_percent') &&
    admin.includes("hideStatus = false") &&
    admin.includes('openReview(application)')
)
check(
  'admin: application i18n copy exists',
  [
    'affiliateApplyEyebrow',
    'affiliateApplyTitle',
    'affiliateApplySubtitle',
    'affiliateApplyFormTitle',
    'affiliateApplyFormIntro',
    'affiliateApplyName',
    'affiliateApplyEmail',
    'affiliateApplyCode',
    'affiliateApplyChannels',
    'affiliateApplyMessage',
    'affiliateApplySubmit',
    'affiliateApplySuccessTitle',
    'affiliateApplySuccessBody',
    'affiliateApplyDuplicate',
    'affiliateApplyCta',
  ].every((key) => typeof en.store?.[key] === 'string') &&
    typeof en.footer?.affiliateApply === 'string' &&
    typeof en.nav?.becomePartner === 'string' &&
    typeof en.services?.nav?.becomePartner === 'string'
)
// --- dedicated partner sign-in ----------------------------------------------
check(
  'login: partner route is separate from admin login',
  app.includes('path="/affiliate-login"') &&
    app.includes('<Login variant="partner" />') &&
    app.includes("pathname === '/affiliate-login'") &&
    app.includes("startsWith('/affiliate-login')")
)
check(
  'login: partner variant has its own title, badge, accent and redirect',
  login.includes("export default function Login({ variant = 'admin' })") &&
    login.includes("const isPartner = variant === 'partner'") &&
    login.includes("isPartner ? 'Partner Sign In' : 'Admin Access'") &&
    login.includes('Affiliate / Reseller Portal') &&
    login.includes("isPartner ? '#34d399' : 'var(--accent)'") &&
    login.includes("(isPartner ? '/partner' : '/admin')")
)
check(
  'login: admin screen is unchanged',
  login.includes('Admin Access') &&
    login.includes('Sign in to manage your portfolio') &&
    app.includes('path="/login" element={<Login />}')
)
check(
  'login: partner links point to partner-only auth screens',
  partner.includes('to="/affiliate-login"') &&
    apply.includes('to="/affiliate-login"') &&
    login.includes('/forgot-password?for=partner') &&
    login.includes('/register?for=partner')
)
check(
  'auth: register and reset return to the partner login',
  register.includes("new URLSearchParams(location.search).get('for') === 'partner'") &&
    register.includes("const signInPath = isPartner ? '/affiliate-login' : '/login'") &&
    register.includes("navigate(isPartner ? '/partner' : '/admin', { replace: true })") &&
    forgot.includes("new URLSearchParams(location.search).get('for') === 'partner'") &&
    forgot.includes("const signInPath = isPartner ? '/affiliate-login' : '/login'")
)
check(
  'package: application tests are part of the test chain',
  pkg.scripts?.['test:affiliate-applications'] === 'node scripts/test-affiliate-applications.mjs' &&
    pkg.scripts?.test?.includes('npm run test:affiliate-applications')
)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)

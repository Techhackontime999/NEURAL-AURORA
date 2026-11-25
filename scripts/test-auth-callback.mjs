// Guards the Supabase email-link handoff: no gateway, a clear acknowledgement,
// and a safe final destination for confirm / magic / reset links.
import fs from 'node:fs'
import {
  AUTH_CALLBACK_PATH,
  callbackPathFromLocation,
  destinationForIntent,
  hasAuthCallbackParams,
  normalizeIntent,
  safeAuthDestination,
  verifyOtpType,
  authRedirectUrl,
} from '../src/lib/authCallback.js'

const read = (file) => fs.readFileSync(file, 'utf8')
const app = read('src/App.jsx')
const callback = read('src/components/admin/AuthCallback.jsx')
const reset = read('src/components/admin/ResetPassword.jsx')
const auth = read('src/context/AuthContext.jsx')
const register = read('src/components/admin/Register.jsx')
const forgot = read('src/components/admin/ForgotPassword.jsx')
const library = read('src/components/offerings/Library.jsx')
const checkout = read('src/lib/checkout.js')

let passed = 0
let failed = 0

function check(name, condition) {
  if (condition) {
    passed += 1
    console.log(`ok    ${name}`)
  } else {
    failed += 1
    console.log(`FAIL  ${name}`)
  }
}

// --- callback route and gateway bypass ---------------------------------------
check('callback: dedicated route exists', app.includes(`path={AUTH_CALLBACK_PATH}`) && app.includes('<AuthCallback />'))
check('callback: reset route exists', app.includes('path="/reset-password"') && app.includes('<ResetPassword />'))
check('callback: token arrivals bypass the home gateway', app.includes('isAuthCallbackLocation') && app.includes('setLoaderDone(true)') && app.includes('hasAuthCallbackParams(location)'))
check('callback: root arrivals are rewritten into the acknowledgement route', app.includes('callbackPathFromLocation(location)') && app.includes('<Navigate to='))
check('callback: bottom chrome is hidden during the handoff', app.includes("!location.pathname.startsWith(AUTH_CALLBACK_PATH)") && app.includes("!location.pathname.startsWith('/reset-password')"))
check('callback: route is private', app.includes('pathname === AUTH_CALLBACK_PATH') && app.includes("pathname === '/reset-password'"))

// --- helper behaviour --------------------------------------------------------
check('helper: implicit hash callbacks are detected', hasAuthCallbackParams({ pathname: '/', search: '', hash: '#access_token=abc&type=signup' }))
check('helper: token-hash callbacks are detected', hasAuthCallbackParams({ pathname: '/', search: '?token_hash=abc&type=magiclink', hash: '' }))
check('helper: ordinary URLs are not treated as callbacks', !hasAuthCallbackParams({ pathname: '/', search: '?focus=search', hash: '' }))
check('helper: access tokens are dropped from the acknowledgement URL', (() => {
  const path = callbackPathFromLocation({ search: '', hash: '#access_token=secret&refresh_token=also-secret&type=signup' })
  return path.startsWith(`${AUTH_CALLBACK_PATH}?`) && !path.includes('secret') && path.includes('type=signup')
})())
check('helper: intents map to the right final screens', destinationForIntent('contributor') === '/contributor-apply' && destinationForIntent('partner') === '/partner' && destinationForIntent('admin') === '/admin' && destinationForIntent('library') === '/library' && destinationForIntent('reset') === '/reset-password')
check('helper: open redirects are rejected', safeAuthDestination('https://evil.example') === null && safeAuthDestination('//evil.example') === null && safeAuthDestination('/library') === '/library' && safeAuthDestination('/reset-password?for=contributor') === '/reset-password?for=contributor')
check('helper: intent aliases are normalised', normalizeIntent('Affiliate') === 'partner' && normalizeIntent('contributor') === 'contributor' && normalizeIntent('nonsense') === 'library')
check('helper: OTP types are mapped for verifyOtp', verifyOtpType('emailChange') === 'email_change' && verifyOtpType('recovery') === 'recovery' && verifyOtpType('unknown') === 'magiclink')
check('helper: generated redirect targets the acknowledgement route', authRedirectUrl('contributor').endsWith(`${AUTH_CALLBACK_PATH}?for=contributor`))

// --- acknowledgement component ---------------------------------------------
check('acknowledgement: handles token hash, PKCE and implicit sessions', callback.includes('supabase.auth.verifyOtp') && callback.includes('supabase.auth.exchangeCodeForSession') && callback.includes('waitForSession()'))
check('acknowledgement: marks the gateway complete', callback.includes("quietStorageSet('neural-aurora-verified', 'true')"))
check('acknowledgement: shows success before navigating', callback.includes('setStatus(\'success\')') && callback.includes('navigate(destination, { replace: true })'))
check('acknowledgement: has an honest expired-link recovery', callback.includes('status === \'error\'') && callback.includes('Back to sign in'))
check('acknowledgement: keeps reset intent for the password form', callback.includes("if (!destination.startsWith('/reset-password')) clearAuthIntent()"))

// --- callers pass an intent and destination ---------------------------------
check('auth: signUp forwards emailRedirectTo when supplied', auth.includes('options?.emailRedirectTo') && auth.includes('emailRedirectTo: options.emailRedirectTo'))
check('auth: resetPassword defaults to the acknowledgement route', auth.includes(`${AUTH_CALLBACK_PATH}?next=/reset-password`))
check('register: stores and sends the portal intent', register.includes('storeAuthIntent(intent)') && register.includes('emailRedirectTo: authRedirectUrl(intent)'))
check('forgot: reset links route through acknowledgement to the reset form', forgot.includes('storeAuthIntent(intent)') && forgot.includes("next: '/reset-password'"))
check('library: customer magic links remember library intent', library.includes("storeAuthIntent('library')"))
check('checkout: free-download magic links remember library intent', checkout.includes("storeAuthIntent('library')"))
check('reset: updates the password with Supabase and clears intent', reset.includes('supabase.auth.updateUser') && reset.includes('clearAuthIntent()') && reset.includes('navigate(destination, { replace: true })'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

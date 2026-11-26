// Source guards for the hardened admin user-management screen. These are
// source assertions, not renders: they protect the safety rules that are easy
// to lose during later cleanup (self/last-admin protection, typed deletes,
// honest states, and real role-update confirmation).
// Run: npm run test:admin-users
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')

const users = read('src/components/admin/AdminUsers.jsx')
const searchBar = read('src/components/ui/SearchBar.jsx')
const toast = read('src/context/ToastContext.jsx')
const supabase = read('src/lib/supabase.js')

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

// --- Account protections ----------------------------------------------------
check('users: reads the signed-in account from auth context', users.includes("useAuth()") && users.includes('currentUser?.id || currentProfile?.id'))
check('users: protects your own account', users.includes("profile.id === currentUserId") && users.includes("'Your own account'"))
check('users: protects the last admin', users.includes("profile.role === 'admin' && adminCount <= 1") && users.includes("'Last admin'"))
check('users: protected accounts cannot be selected, edited, or deleted', /disabled=\{Boolean\(reason\)\}/.test(users) && users.includes('if (!profile || protectionReason(profile)) return'))
check('users: bulk delete skips protected accounts and reports the count', users.includes('!protectionReason(profile)') && users.includes('protected account'))

// --- Destructive and privileged actions ------------------------------------
check('users: role changes are confirmed', users.includes("title: promoting ? 'Grant admin access' : 'Remove admin access'") && users.includes('await confirm({'))
check('users: single delete requires typed confirmation', users.includes("requireText: 'DELETE'"))
check('users: bulk delete requires typed confirmation', users.includes("requireText: 'DELETE ALL'"))
check('users: no silent approve/reject buttons remain', !users.includes('handleApprove') && !users.includes('handleReject'))
check('users: role changes use a labelled select', users.includes('<select') && users.includes('Role for {profile.email || profile.id}'))

// --- Honest states and usable layout ---------------------------------------
check('users: loading, error, retry, and empty states exist', users.includes('aria-busy="true"') && users.includes('Try again') && users.includes('No users match these filters.') && users.includes('No accounts yet.'))
check('users: settings failures do not hide the account list', users.includes('Promise.allSettled') && users.includes('profilesResult.status === \'rejected\''))
check('users: role filter, search, and pagination reset selection', users.includes("ROLE_FILTERS = ['all', ...ROLES]") && users.includes('PAGE_SIZE = 10') && users.includes('Showing {rangeStart}–{rangeEnd} of {filtered.length}'))
check('users: previous-page and next-page controls are available', users.includes('aria-label="Previous page"') && users.includes('aria-label="Next page"'))
check('users: admin rows use real 44px controls', users.includes('min-h-11 min-w-11') && users.includes('min-h-11 items-center gap-2 rounded-lg px-3 text-xs'))
check('users: search bar is a 44px search input with a configurable width', searchBar.includes('type="search"') && searchBar.includes('min-h-11 w-full') && searchBar.includes("className = 'w-56'"))

// --- Shared confirmation dialog ---------------------------------------------
check('confirm: supports optional typed text', toast.includes('requireText: null') && toast.includes('typeof options?.requireText ===') && toast.includes('confirmState.inputValue === confirmState.requireText'))
check('confirm: focuses and labels the typed confirmation input', toast.includes('confirmInputRef.current?.focus()') && toast.includes('htmlFor="confirm-required-text"'))
check('confirm: confirm button stays disabled until text matches', toast.includes('confirmState.inputValue !== confirmState.requireText') && toast.includes('disabled:cursor-not-allowed disabled:opacity-40'))

// --- Data layer --------------------------------------------------------------
check('profiles query returns only the fields the admin screen renders', supabase.includes(".select('id, email, full_name, role, created_at')"))
check('role updates reject unsupported roles', supabase.includes("if (!['admin', 'viewer'].includes(role))") && supabase.includes('Unsupported role'))
check('role updates verify a row was actually changed', supabase.includes(".select('id, role')") && supabase.includes('No profile was updated'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

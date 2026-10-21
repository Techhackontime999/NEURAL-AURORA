import {
  DEFAULT_APPEARANCE,
  mergeSiteAppearance,
  sanitiseColor,
  appearanceToCssVars,
  appearanceToDarkCssVars,
  fontStack,
} from '../src/lib/appearanceDefaults.js'

let failures = 0
function check(name, cond, detail = '') {
  if (!cond) {
    failures++
    console.log(`FAIL: ${name} ${detail}`)
  } else {
    console.log(`ok: ${name}`)
  }
}

// --- sanitiseColor: rejects anything that is not a plain hex color ---
check('sanitiseColor accepts #rgb', sanitiseColor('#abc', '#000') === '#abc')
check('sanitiseColor accepts #rrggbb', sanitiseColor('#00f0ff', '#000') === '#00f0ff')
check('sanitiseColor rejects CSS injection', sanitiseColor('red;} body{display:none', '#000') === '#000')
check('sanitiseColor rejects url() payload', sanitiseColor('url(javascript:alert(1))', '#000') === '#000')
check('sanitiseColor rejects non-string', sanitiseColor({}, '#000') === '#000')
check('sanitiseColor rejects null', sanitiseColor(null, '#000') === '#000')

// --- mergeSiteAppearance: empty / garbage input falls back safely ---
const empty = mergeSiteAppearance(null)
check('null merges to defaults', JSON.stringify(empty) === JSON.stringify(DEFAULT_APPEARANCE))
check('empty object merges to defaults', JSON.stringify(mergeSiteAppearance({})) === JSON.stringify(DEFAULT_APPEARANCE))
check('array input merges to defaults', JSON.stringify(mergeSiteAppearance([])) === JSON.stringify(DEFAULT_APPEARANCE))
check('string input merges to defaults', JSON.stringify(mergeSiteAppearance('x')) === JSON.stringify(DEFAULT_APPEARANCE))

// --- unknown font names cannot reach the DOM ---
const badFont = mergeSiteAppearance({ fontBody: 'Comic Sans MS', fontDisplay: '</style><script>' })
check('unknown body font falls back', badFont.fontBody === DEFAULT_APPEARANCE.fontBody)
check('injected display font falls back', badFont.fontDisplay === DEFAULT_APPEARANCE.fontDisplay)

// --- scale clamping ---
check('fontScale above max is clamped', mergeSiteAppearance({ fontScale: 99 }).fontScale === 1.25)
check('fontScale below min is clamped', mergeSiteAppearance({ fontScale: -5 }).fontScale === 0.85)
check('fontScale NaN falls back', mergeSiteAppearance({ fontScale: 'abc' }).fontScale === 1)
check('radiusScale is clamped', mergeSiteAppearance({ radiusScale: 500 }).radiusScale === 2)

// --- theme whitelist ---
check('unknown defaultTheme falls back', mergeSiteAppearance({ defaultTheme: 'neon' }).defaultTheme === 'dark')
check('valid defaultTheme kept', mergeSiteAppearance({ defaultTheme: 'system' }).defaultTheme === 'system')

// --- enabled flag ---
check('enabled defaults false (admin must opt in)', mergeSiteAppearance({}).enabled === false)
check('enabled false honored', mergeSiteAppearance({ enabled: false }).enabled === false)

// --- CSS var output ---
const vars = appearanceToCssVars(mergeSiteAppearance({ accent: '#ff0000', fontScale: 1.25 }))
check('accent var set', vars['--accent'] === '#ff0000')
check('font size scales', vars['--app-font-size'] === '20px')
check('font stack resolved', vars['--font-body'].includes('Satoshi'))
const dark = appearanceToDarkCssVars(mergeSiteAppearance({ accentDark: '#123456' }))
check('dark accent var set', dark['--accent-dark'] === '#123456')
check('dark surface var is namespaced', '--surface-dark' in dark)
check('page background is never themed', !('--bg-primary' in vars) && !('--bg-dark' in dark))
check('old background keys are ignored', !('bgLight' in mergeSiteAppearance({ bgLight: '#ff0000' })))
check('light and dark keys never collide', !Object.keys(vars).some((k) => k in dark))

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

// Unit tests for the pure PostgREST catalogue search expression builder.
// Run: npm run test:product-query
import {
  sanitiseSearchTerm,
  normaliseFormatFilter,
  buildTagFilters,
  buildProductSearchExpression,
} from '../src/lib/productQuery.js'

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

check(
  'search term: PostgREST syntax characters are removed',
  sanitiseSearchTerm('a,b.(c){d}"e\\f') === 'a b c d e f'
)
check('search term: whitespace-only input is empty', sanitiseSearchTerm('   ') === '')
check('search term: null input is empty', sanitiseSearchTerm(null) === '')
check('search term: length is bounded', sanitiseSearchTerm('x'.repeat(200)).length === 60)

check('format filter: case is normalised for URLs', normaliseFormatFilter(' PDF ') === 'pdf')
check('format filter: ilike wildcards are removed', normaliseFormatFilter('p%d_f\\x') === 'pdfx')
check('format filter: length is bounded', normaliseFormatFilter('x'.repeat(200)).length === 80)

check('empty search produces no expression', buildProductSearchExpression(' ') === null)

const react = buildProductSearchExpression('react')
check('search: free-text columns are preserved', [
  'title.ilike.%react%',
  'short_description.ilike.%react%',
  'description.ilike.%react%',
].every((part) => react.includes(part)))
check('search: tags are matched through the GIN index', react.includes('tags.cs.{"react"}'))
check('search: common tag case is covered', react.includes('tags.cs.{"React"}'))

const multi = buildProductSearchExpression('ui kit')
check('search: full multi-word tag is checked', multi.includes('tags.cs.{"ui kit"}'))
check(
  'search: individual tokens are checked',
  multi.includes('tags.cs.{"UI"}') && multi.includes('tags.cs.{"Kit"}')
)
check('search: acronym-style token case is covered', multi.includes('tags.cs.{"UI"}'))

const hostile = buildProductSearchExpression('a,b.(c){d}"e\\f')
check('injection: no operator parentheses survive', !hostile.includes('()'))
check('injection: no backslash survives', !hostile.includes('\\'))
check('injection: braces only wrap the sanitised value', !hostile.includes('{d}'))
check('injection: tag values stay a single array element', hostile.includes('tags.cs.{"a b c d e f"}'))

const many = buildTagFilters('one two three four five six seven')
check('search: tag alternatives are bounded', many.length <= 18)
check(
  'search: tokens beyond the bound are ignored',
  !many.some((f) => f.includes('"seven"') || f.includes('"six"'))
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1

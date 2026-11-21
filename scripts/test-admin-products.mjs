// Guards for ST-U10: category CRUD, product preview and price formatting.
// Run: npm run test:admin-products
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const data = read('src/lib/adminProducts.js')
const admin = read('src/components/admin/AdminProducts.jsx')
const categories = read('src/components/admin/CategoryManager.jsx')
const preview = read('src/components/admin/ProductPreviewDialog.jsx')
const orders = read('src/components/admin/AdminOrders.jsx')

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

check('data: createCategory normalises its payload', /createCategory[\s\S]*?normaliseCategory\(payload\)/.test(data))
check('data: updateCategory normalises its payload', /updateCategory[\s\S]*?normaliseCategory\(payload\)/.test(data))
check('data: category writes are limited to real columns', data.includes("'description', 'icon_name', 'display_order'") && data.includes("const allowed = ['slug', 'label'"))
check('data: display order is coerced to an integer', data.includes('Math.trunc(order)'))
check('data: no new category table is created in source', !data.includes('CREATE TABLE'))

check('admin: shared price formatter is imported', admin.includes('formatBytes, formatPrice'))
check('admin: list prices use formatPrice', admin.includes('formatPrice(product.price_paise, product.currency || \'INR\')'))
check('admin: raw price division is gone from the list', !admin.includes('${product.price_paise / 100}'))
check('admin: form prices round-trip through paiseToInput', admin.includes('price: paiseToInput(p.price_paise)') && admin.includes('function paiseToInput'))
check('admin: price labels are currency-neutral', admin.includes("label: 'Price (0 = free)'") && !admin.includes('rupees'))
check(
  'admin: bulk select has no self-referential callback',
  !/onInvalidate:\s*clearSelection/.test(admin) && !/onInvalidate:\s*clearSelection/.test(orders)
)

check('admin: CategoryManager is mounted once', (admin.match(/<CategoryManager/g) || []).length === 1 && admin.includes('import CategoryManager'))
check('admin: category manager receives live products and categories', admin.includes('<CategoryManager categories={categories} products={products} onChanged={load} />'))
check('categories: all three CRUD actions are wired', ['createCategory', 'updateCategory', 'deleteCategory'].every((fn) => categories.includes(fn)))
check('categories: slug is immutable after creation', categories.includes('disabled={Boolean(editingId)}') && categories.includes('Slug is the product foreign key'))
check('categories: deleting a used category is explained', categories.includes('product(s) will become uncategorised'))
check('categories: duplicate slugs are rejected', categories.includes('That slug is already in use'))

check('admin: ProductPreviewDialog is mounted once', (admin.match(/<ProductPreviewDialog/g) || []).length === 1 && admin.includes('import ProductPreviewDialog'))
check('admin: a Preview action opens the dialog', admin.includes('onClick={() => setPreviewProduct(product)}') && admin.includes('Preview'))
check('preview: dialog is accessible', preview.includes('role="dialog"') && preview.includes('aria-modal="true"') && preview.includes('aria-labelledby="product-preview-title"'))
check('preview: drafts are clearly marked as private', preview.includes('Draft preview — not public yet') && preview.includes('Publish to make this page available'))
check('preview: public link is gated by published status', preview.includes('isPublished ?') && preview.includes('Open public page'))
check('preview: external link has a safe opener', preview.includes('rel="noopener noreferrer"'))
check('preview: displays the shared formatted price', preview.includes("formatPrice(product.price_paise, product.currency || 'INR')"))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1

// ---------------------------------------------------------------------------
// Mithi's site map — the SERVER side of the contract.
//
// This mirrors `src/lib/mithi/siteActions.js`. The assistant is told about these
// destinations and may answer with an `actions` array of ids. The browser then
// converts known ids into navigation buttons. Because the allow-list lives on
// both sides, a model can never invent a link that the UI would honour.
//
// Keep the ids/paths here in sync with the client file when pages change.
// ---------------------------------------------------------------------------

const SITE_ACTIONS = [
  { id: 'home', label: 'Home', path: '/', hint: 'The landing page.' },
  { id: 'projects', label: 'See projects', path: '/#projects', hint: 'Portfolio projects.' },
  {
    id: 'products',
    label: 'Browse products',
    path: '/offerings/products',
    hint: 'Digital products for purchase.',
  },
  { id: 'services', label: 'View services', path: '/offerings', hint: 'Services and collaboration.' },
  { id: 'blog', label: 'Read the blog', path: '/blog', hint: 'Articles and write-ups.' },
  { id: 'more', label: 'More about the work', path: '/more', hint: 'Certificates, experience, gallery.' },
  { id: 'support', label: 'Get support', path: '/support', hint: 'Contact and support.' },
  { id: 'library', label: 'My purchases', path: '/library', hint: 'Past purchases and downloads.' },
]

const SITE_ACTION_IDS = SITE_ACTIONS.map((action) => action.id)

/** A compact, prompt-friendly description of everything Mithi can navigate to. */
function describeActions() {
  return SITE_ACTIONS.map((action) => `- ${action.id}: ${action.label} (${action.hint})`).join('\n')
}

module.exports = { SITE_ACTIONS, SITE_ACTION_IDS, describeActions }

const CRM_URL_KEY = 'neural-crm-url'

export function getCrmUrl() {
  try {
    return localStorage.getItem(CRM_URL_KEY) || ''
  } catch {
    return ''
  }
}

export function setCrmUrl(url) {
  try {
    localStorage.setItem(CRM_URL_KEY, url)
  } catch {}
}

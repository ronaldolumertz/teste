export function setFavicon(url) {
  if (!url) return
  const rels = ['icon', 'shortcut icon', 'apple-touch-icon']
  rels.forEach(rel => {
    let el = document.querySelector(`link[rel="${rel}"]`)
    if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el) }
    el.href = url
  })
}

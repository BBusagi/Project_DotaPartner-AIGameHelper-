const metaElement = document.querySelector('.meta');

if (metaElement && window.dotapartner?.version) {
  metaElement.textContent = `Overlay prototype is running · v${window.dotapartner.version}`;
}

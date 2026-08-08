(() => {
  const BRIDGE_VERSION = 'phase99-cross-brand-attribution';
  const send = (name, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
    else { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: name, ...params }); }
  };
  const sourceArticle = () => document.body?.dataset.articleId || location.pathname;
  const stableHash = (text) => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  };
  const makeBridgeId = (routeId, routeGroup) => `sqb_${stableHash(`${sourceArticle()}|${routeId}|${routeGroup}`)}`;
  const context = () => ({
    source_brand: 'solqvia',
    destination_brand: 'luqevora',
    source_article: sourceArticle(),
    source_path: location.pathname,
    source_content_type: document.body?.dataset.contentType || '',
    language: document.documentElement.lang || 'ja',
    bridge_version: BRIDGE_VERSION
  });
  const prepareLink = (a, base) => {
    const routeId = a.dataset.luqevoraRoute || '';
    const bridgeId = makeBridgeId(routeId, base.route_group || '');
    a.dataset.bridgeId = bridgeId;
    try {
      const url = new URL(a.href, location.href);
      if (/(^|\\.)luqevora\\.com$/i.test(url.hostname)) {
        url.searchParams.set('utm_source', 'solqvia');
        url.searchParams.set('utm_medium', 'referral');
        url.searchParams.set('utm_campaign', 'revenue_bridge');
        if (routeId) url.searchParams.set('utm_content', routeId);
        url.searchParams.set('sq_bridge', bridgeId);
        url.searchParams.set('sq_source', location.pathname);
        a.href = url.toString();
      }
    } catch (_) {}
    return { routeId, bridgeId };
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.solqvia-revenue-bridge').forEach((box) => {
      const base = { ...context(), route_group: box.dataset.routeGroup || '', placement: box.dataset.placement || 'post_solution' };
      if ('IntersectionObserver' in window) {
        let sent = false;
        const ob = new IntersectionObserver((entries) => {
          if (sent || !entries.some((e) => e.isIntersecting)) return;
          sent = true; send('luqevora_bridge_view', base); ob.disconnect();
        }, { threshold: .45 });
        ob.observe(box);
      }
      box.querySelectorAll('a[data-luqevora-route]').forEach((a) => {
        const prepared = prepareLink(a, base);
        a.addEventListener('click', () => {
          let destinationPath = '';
          try { destinationPath = new URL(a.href, location.href).pathname; } catch (_) {}
          send('luqevora_referral', {
            ...base,
            bridge_id: prepared.bridgeId,
            route_id: prepared.routeId,
            destination_path: destinationPath,
            destination_url: a.href,
            link_text: (a.textContent || '').trim().slice(0, 100)
          });
        });
      });
    });
  });
})();

(() => {
  const cfg = window.SOLQVIA_PLATFORM || {};
  const valid = {
    gtm: value => /^GTM-[A-Z0-9]+$/.test(value || ''),
    ga4: value => /^G-[A-Z0-9]+$/.test(value || ''),
    clarity: value => /^[a-z0-9]+$/i.test(value || ''),
    client: value => /^ca-pub-\d{16}$/.test(value || ''),
    slot: value => /^\d{6,20}$/.test(String(value || ''))
  };
  const loadScript = (src, attrs = {}) => new Promise((resolve, reject) => {
    const absolute = new URL(src, location.href).href;
    if ([...document.scripts].some(s => s.src === absolute)) return resolve();
    const s = document.createElement('script'); s.src = src;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
  });
  const track = (name, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
    else if (window.dataLayer) window.dataLayer.push({ event: name, ...params });
  };
  const enableAnalytics = async () => {
    if (valid.gtm(cfg.gtmId)) {
      window.dataLayer = window.dataLayer || []; window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      await loadScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cfg.gtmId)}`, { async: '' });
    } else if (valid.ga4(cfg.ga4MeasurementId)) {
      await loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4MeasurementId)}`, { async: '' });
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', cfg.ga4MeasurementId, { anonymize_ip: true });
    }
    if (valid.clarity(cfg.clarityProjectId)) {
      (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,'clarity','script',cfg.clarityProjectId);
    }
    observeWebVitals();
  };
  const observeWebVitals = () => {
    if (!('PerformanceObserver' in window)) return;
    try {
      let cls = 0;
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => { const es = list.getEntries(); const last = es[es.length - 1]; if (last) track('web_vital', { metric: 'LCP', value: Math.round(last.startTime) }); }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const e of list.getEntries()) track('web_vital', { metric: 'INP', value: Math.round(e.duration) }); }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
      addEventListener('pagehide', () => track('web_vital', { metric: 'CLS', value: Number(cls.toFixed(4)) }), { once: true });
    } catch (_) {}
  };
  const attachEvents = () => {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]'); if (!a) return;
      const href = a.getAttribute('href') || '';
      if (/^https?:\/\//.test(href) && !href.startsWith(location.origin)) {
        track(a.rel.includes('sponsored') ? 'affiliate_click' : 'outbound_click', { link_url: href, link_text: (a.textContent || '').trim().slice(0, 100) });
      }
      if (a.closest('.section-muted') || a.closest('[class*=related]')) track('related_article_click', { link_url: href });
    });
    [25, 50, 75, 90].forEach(mark => {
      let sent = false; addEventListener('scroll', () => { if (sent) return; const d = document.documentElement; const pct = ((scrollY + innerHeight) / Math.max(d.scrollHeight, 1)) * 100; if (pct >= mark) { sent = true; track('scroll_depth', { percent: mark }); } }, { passive: true });
    });
    if (document.querySelector('h1')?.textContent.match(/404|見つかりません/i)) track('page_not_found', { page_path: location.pathname });
  };
  let adsensePromise = null;
  const ensureAdSenseScript = () => {
    if (!valid.client(cfg.adsenseClient)) return Promise.resolve(false);
    if (!adsensePromise) {
      adsensePromise = loadScript(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cfg.adsenseClient)}`, { async: '', crossorigin: 'anonymous' }).then(() => true).catch(() => false);
    }
    return adsensePromise;
  };
  const loadAdSenseForReview = async () => {
    if (!cfg.adsenseSiteReviewEnabled) return false;
    return ensureAdSenseScript();
  };
  const selectedPositions = () => {
    if (cfg.manualAdDensity === 'minimal') return new Set(['articleTop']);
    if (cfg.manualAdDensity === 'full') return new Set(['articleTop', 'articleMid', 'articleBottom']);
    return new Set(['articleTop', 'articleBottom']);
  };
  const enableManualAds = async () => {
    const body = document.body;
    const eligible = body?.dataset.adEligible === 'true';
    const safe = cfg.siteApproved && cfg.manualAdsEnabled && cfg.certifiedCmpConfigured && valid.client(cfg.adsenseClient);
    if (!safe || (cfg.adCoverage === 'eligible-only' && !eligible)) return false;
    if (!(await ensureAdSenseScript())) return false;
    const allowed = selectedPositions();
    let rendered = 0;
    document.querySelectorAll('.ad-slot[data-ad-position]').forEach(container => {
      const position = container.dataset.adPosition;
      const slotId = cfg.adsenseSlots?.[position];
      if (!allowed.has(position) || !valid.slot(slotId)) return;
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle'; ins.style.display = 'block';
      ins.setAttribute('data-ad-client', cfg.adsenseClient);
      ins.setAttribute('data-ad-slot', String(slotId));
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      container.replaceChildren(ins); container.hidden = false; container.removeAttribute('aria-hidden'); container.dataset.adState = 'ready';
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); rendered += 1; } catch (_) { container.hidden = true; container.dataset.adState = 'error'; }
    });
    if (rendered) document.documentElement.classList.add('ads-enabled');
    return rendered > 0;
  };
  const publishStatus = () => {
    const status = Object.freeze({
      analyticsConfigured: valid.gtm(cfg.gtmId) || valid.ga4(cfg.ga4MeasurementId),
      adsenseReviewConfigured: !!cfg.adsenseSiteReviewEnabled && valid.client(cfg.adsenseClient),
      siteApproved: !!cfg.siteApproved,
      cmpConfigured: !!cfg.certifiedCmpConfigured,
      manualAdsConfigured: !!cfg.manualAdsEnabled && Object.values(cfg.adsenseSlots || {}).some(valid.slot),
      autoAdsConfigured: !!cfg.autoAdsEnabled,
      pageEligible: document.body?.dataset.adEligible === 'true'
    });
    window.SOLQVIA_STATUS = status;
    document.dispatchEvent(new CustomEvent('solqvia:platform-status', { detail: status }));
  };
  document.addEventListener('DOMContentLoaded', async () => {
    await enableAnalytics();
    attachEvents();
    await loadAdSenseForReview();
    await enableManualAds();
    publishStatus();
  });
})();

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
        let destination = ''; try { destination = new URL(href, location.href).hostname; } catch (_) {}
        if (/(^|\.)luqevora\.com$/.test(destination) || /(^|\.)luqvia\.com$/.test(destination)) {
          track('cross_brand_click', { source_brand: 'solqvia', destination_brand: destination.includes('luqevora') ? 'luqevora' : 'luqvia', bridge_id: a.dataset.bridgeId || '', route_id: a.dataset.luqevoraRoute || '', source_path: location.pathname, link_url: href, link_text: (a.textContent || '').trim().slice(0, 100) });
        } else {
          track(a.rel.includes('sponsored') ? 'affiliate_click' : 'outbound_click', { link_url: href, link_text: (a.textContent || '').trim().slice(0, 100) });
        }
      }
      if (a.closest('.section-muted') || a.closest('[class*=related]')) track('related_article_click', { link_url: href });
    });
    [25, 50, 75, 90].forEach(mark => {
      let sent = false; addEventListener('scroll', () => { if (sent) return; const d = document.documentElement; const pct = ((scrollY + innerHeight) / Math.max(d.scrollHeight, 1)) * 100; if (pct >= mark) { sent = true; track('scroll_depth', { percent: mark }); } }, { passive: true });
    });
    if (document.querySelector('h1')?.textContent.match(/404|見つかりません/i)) track('page_not_found', { page_path: location.pathname });
  };

  const attachLearningLoop = () => {
    const articleId = document.body?.dataset.articleId || location.pathname;
    const pageContext = { article_id: articleId, content_type: document.body?.dataset.contentType || '', ad_eligible: document.body?.dataset.adEligible === 'true', release: document.body?.dataset.release || '' };
    track('article_context_view', pageContext);
    const decision = document.querySelector('.solqvia-editorial-decision');
    if (decision && 'IntersectionObserver' in window) {
      const ob = new IntersectionObserver(entries => entries.forEach(entry => { if (!entry.isIntersecting) return; track('editorial_decision_view', pageContext); ob.disconnect(); }), { threshold: 0.5 });
      ob.observe(decision);
    }
    document.querySelectorAll('[data-resolution-feedback]').forEach(box => {
      const key = `solqvia-feedback:${box.dataset.articleId || articleId}`;
      const buttons = box.querySelectorAll('[data-resolution]');
      const status = box.querySelector('.resolution-feedback-status');
      let prior = ''; try { prior = sessionStorage.getItem(key) || ''; } catch (_) {}
      if (prior) { buttons.forEach(b => b.disabled = true); if (status) status.textContent = document.documentElement.lang === 'ja' ? '回答済みです。' : 'Response recorded.'; }
      buttons.forEach(button => button.addEventListener('click', () => {
        if (button.disabled) return;
        const outcome = button.dataset.resolution || 'unknown';
        track('article_resolution_feedback', { ...pageContext, outcome });
        try { sessionStorage.setItem(key, outcome); } catch (_) {}
        buttons.forEach(b => b.disabled = true);
        if (status) status.textContent = document.documentElement.lang === 'ja' ? '回答ありがとうございます。今後の改善に反映します。' : 'Thank you. This will inform future improvements.';
      }));
    });
  };

  // Phase98: controlled AdSense placement. The engine intentionally avoids interactive tools,
  // short pages, and critical-action UI. Existing legacy placeholders are rebuilt at runtime.
  const phase98AdPolicy = Object.freeze({
    blockedContentTypes: new Set([
      'interactive-device-variant-database', 'interactive-diagnosis', 'interactive-recovery',
      'interactive-error-lookup', 'smartphone-troubleshooting-hub', 'smartphone-reference-hub',
      'smartphone-sim-migration-auth-hub', 'smartphone-carrier-setup-hub'
    ]),
    sensitivePath: /(lost-smartphone|factory-reset|remote-erase|erase-before|stolen|suspicious-app|malware|browser-popups|security-warning|esim-delete-reissue|initialization)/i
  });
  const effectiveAdProfile = () => {
    const body = document.body;
    if (!body) return 'none';
    if (body.dataset.adEligible === 'false') return 'none';
    const contentType = body.dataset.contentType || '';
    if (phase98AdPolicy.blockedContentTypes.has(contentType) || /^interactive-/.test(contentType)) return 'none';
    if (body.dataset.adProfile === 'none') return 'none';
    const explicitEligible = body.dataset.adEligible === 'true';
    const inferredArticle = /^\/(ja|en)\/technology\/smartphone\//.test(location.pathname) && !!document.querySelector('.article-content');
    if (!explicitEligible && !inferredArticle) return 'none';
    if (body.dataset.adProfile === 'limited' || phase98AdPolicy.sensitivePath.test(location.pathname)) return 'limited';
    return 'standard';
  };
  const makeAdSlot = position => {
    const slot = document.createElement('div');
    const isJa = document.documentElement.lang === 'ja';
    slot.className = 'ad-slot phase98-ad-slot';
    slot.dataset.adPosition = position;
    slot.dataset.adState = 'inactive';
    slot.dataset.label = isJa ? '広告' : 'Advertisement';
    slot.dataset.adLayout = cfg.adLayoutVersion || 'phase98';
    slot.hidden = true;
    slot.setAttribute('aria-hidden', 'true');
    return slot;
  };
  const prepareAdSlots = () => {
    document.querySelectorAll('.ad-slot[data-ad-position]').forEach(el => el.remove());
    const profile = effectiveAdProfile();
    if (profile === 'none') { if (document.body) document.body.dataset.effectiveAdEligible = 'false'; return { profile, inserted: 0, chars: 0, sections: 0, eligible: false }; }
    const content = document.querySelector('.article-content');
    if (!content) { if (document.body) document.body.dataset.effectiveAdEligible = 'false'; return { profile: 'none', inserted: 0, chars: 0, sections: 0, eligible: false }; }
    const chars = (content.textContent || '').replace(/\s+/g, '').length;
    const minChars = Number(cfg.adMinArticleChars || 1800);
    if (chars < minChars) { if (document.body) document.body.dataset.effectiveAdEligible = 'false'; return { profile: 'none', inserted: 0, chars, sections: 0, eligible: false }; }
    const sections = [...content.children].filter(el => el.matches('section.article-section'));
    if (!sections.length) { if (document.body) document.body.dataset.effectiveAdEligible = 'false'; return { profile: 'none', inserted: 0, chars, sections: 0, eligible: false }; }
    let inserted = 0;
    if (profile === 'standard') {
      const topAnchor = sections[Math.min(1, sections.length - 1)];
      topAnchor.insertAdjacentElement('afterend', makeAdSlot('articleTop')); inserted += 1;
      if (chars >= Number(cfg.adMidArticleChars || 5200) && sections.length >= 6) {
        const midIndex = Math.max(2, Math.min(sections.length - 2, Math.floor(sections.length / 2)));
        sections[midIndex].insertAdjacentElement('afterend', makeAdSlot('articleMid')); inserted += 1;
      }
    }
    const source = content.querySelector(':scope > section.sources, :scope > .sources');
    const bottom = makeAdSlot('articleBottom');
    if (source) source.insertAdjacentElement('afterend', bottom);
    else content.appendChild(bottom);
    inserted += 1;
    document.body.dataset.effectiveAdProfile = profile;
    document.body.dataset.effectiveAdEligible = 'true';
    return { profile, inserted, chars, sections: sections.length, eligible: true };
  };
  const allowedPositionsFor = (profile, chars) => {
    if (profile === 'none') return new Set();
    if (profile === 'limited') return new Set(['articleBottom']);
    if (cfg.manualAdDensity === 'minimal') return new Set(['articleBottom']);
    if (cfg.manualAdDensity === 'full' && chars >= Number(cfg.adMidArticleChars || 5200)) return new Set(['articleTop', 'articleMid', 'articleBottom']);
    return new Set(['articleTop', 'articleBottom']);
  };
  const observeAdSlots = () => {
    if (!('IntersectionObserver' in window)) return;
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || seen.has(entry.target)) return;
      seen.add(entry.target);
      track('ad_slot_view', {
        ad_position: entry.target.dataset.adPosition || '',
        ad_profile: document.body?.dataset.effectiveAdProfile || '',
        ad_layout: cfg.adLayoutVersion || 'phase98'
      });
    }), { threshold: 0.5 });
    document.querySelectorAll('.ad-slot[data-ad-state="ready"]').forEach(slot => observer.observe(slot));
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
  const enableManualAds = async placement => {
    const body = document.body;
    const eligible = !!placement?.eligible;
    const safe = cfg.siteApproved && cfg.manualAdsEnabled && cfg.certifiedCmpConfigured && valid.client(cfg.adsenseClient);
    if (!safe || (cfg.adCoverage === 'eligible-only' && !eligible) || !placement || placement.profile === 'none') return false;
    if (!(await ensureAdSenseScript())) return false;
    const allowed = allowedPositionsFor(placement.profile, placement.chars);
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
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({}); rendered += 1;
        track('ad_slot_ready', { ad_position: position, ad_profile: placement.profile, ad_layout: cfg.adLayoutVersion || 'phase98' });
      } catch (_) { container.hidden = true; container.dataset.adState = 'error'; }
    });
    if (rendered) { document.documentElement.classList.add('ads-enabled'); observeAdSlots(); }
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
      pageEligible: document.body?.dataset.effectiveAdEligible === 'true',
      effectiveAdProfile: document.body?.dataset.effectiveAdProfile || 'none',
      adLayoutVersion: cfg.adLayoutVersion || 'legacy'
    });
    window.SOLQVIA_STATUS = status;
    document.dispatchEvent(new CustomEvent('solqvia:platform-status', { detail: status }));
  };
  document.addEventListener('DOMContentLoaded', async () => {
    await enableAnalytics();
    attachEvents();
    attachLearningLoop();
    const adPlacement = prepareAdSlots();
    await loadAdSenseForReview();
    await enableManualAds(adPlacement);
    publishStatus();
  });
})();

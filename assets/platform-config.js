// SolQvia.com Phase120 platform configuration (Phase98 AdSense controls + Phase99 attribution retained).
// AdSense publisher ID is verified, but approval/serving stays OFF until AdSense reports the site as Ready.
// Phase98 adds a controlled, policy-aware placement engine; no ad unit is rendered without real slot IDs.
window.SOLQVIA_PLATFORM = Object.freeze({
  reviewFocusMode: true,
  focusSection: 'smartphone',

  // Analytics: GTM takes precedence over the direct GA4 ID.
  gtmId: 'GTM-WM4K76RF',                      // GTM-XXXXXXX
  ga4MeasurementId: 'G-8QLJEW3TMP',           // G-XXXXXXXXXX
  clarityProjectId: '',           // Optional
  analyticsConsentVersion: '2026-07-23',
  analyticsSchemaVersion: 'phase120-2026-08-11',
  marketEvaluationVersion: 'phase120-2026-08-11',
  consentMode: 'google-cmp-v2',

  // AdSense ownership review and ad serving are deliberately separate.
  adsenseClient: 'ca-pub-1532240366110429',              // AdSense ca-pub ID issued by the account
  adsenseSiteReviewEnabled: true,// true after the site is added in AdSense
  siteApproved: false,            // true only when the site status is Ready
  autoAdsEnabled: false,          // also enable Auto ads in the AdSense account
  manualAdsEnabled: false,        // requires siteApproved and certifiedCmpConfigured
  manualAdDensity: 'balanced',    // minimal | balanced | full
  adCoverage: 'eligible-only',    // eligible-only | all-reviewed
  adLayoutVersion: 'phase98-2026-08-08',
  attributionVersion: 'phase99-2026-08-08',
  adMinArticleChars: 1800,        // short pages stay ad-free
  adMidArticleChars: 5200,        // middle slot only on sufficiently long pages
  adSafeSpacingPx: 48,            // visual separation from editorial/interactive UI
  certifiedCmpConfigured: true,  // true only after a Google-certified CMP is active
  adsenseSlots: {
    articleTop: '',               // numeric AdSense ad unit slot ID
    articleMid: '',
    articleBottom: ''
  },
  advertisingPolicyVersion: '2026-08-08-phase98'
});

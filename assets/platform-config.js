// SolQvia.com Phase35 platform configuration. GTM and GA4 IDs verified on 2026-07-23.
window.SOLQVIA_PLATFORM = Object.freeze({
  reviewFocusMode: true,
  focusSection: 'smartphone',

  // Analytics: GTM takes precedence over the direct GA4 ID.
  gtmId: 'GTM-WM4K76RF',                      // GTM-XXXXXXX
  ga4MeasurementId: 'G-8QLJEW3TMP',           // G-XXXXXXXXXX
  clarityProjectId: '',           // Optional
  analyticsConsentVersion: '2026-07-23',

  // AdSense ownership review and ad serving are deliberately separate.
  adsenseClient: '',              // AdSense ca-pub ID issued by the account
  adsenseSiteReviewEnabled: false,// true after the site is added in AdSense
  siteApproved: false,            // true only when the site status is Ready
  autoAdsEnabled: false,          // also enable Auto ads in the AdSense account
  manualAdsEnabled: false,        // requires siteApproved and certifiedCmpConfigured
  manualAdDensity: 'balanced',    // minimal | balanced | full
  adCoverage: 'eligible-only',    // eligible-only | all-reviewed
  certifiedCmpConfigured: false,  // true only after a Google-certified CMP is active
  adsenseSlots: {
    articleTop: '',               // numeric AdSense ad unit slot ID
    articleMid: '',
    articleBottom: ''
  },
  advertisingPolicyVersion: '2026-07-23'
});

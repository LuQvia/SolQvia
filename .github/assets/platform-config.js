// SolQvia.com Phase37 platform configuration. GTM, GA4, and AdSense publisher ID verified on 2026-07-23.
window.SOLQVIA_PLATFORM = Object.freeze({
  reviewFocusMode: true,
  focusSection: 'smartphone',

  // Analytics: GTM takes precedence over the direct GA4 ID.
  gtmId: 'GTM-WM4K76RF',                      // GTM-XXXXXXX
  ga4MeasurementId: 'G-8QLJEW3TMP',           // G-XXXXXXXXXX
  clarityProjectId: '',           // Optional
  analyticsConsentVersion: '2026-07-23',
  consentMode: 'google-cmp-v2',

  // AdSense ownership review and ad serving are deliberately separate.
  adsenseClient: 'ca-pub-1532240366110429',              // AdSense ca-pub ID issued by the account
  adsenseSiteReviewEnabled: true,// true after the site is added in AdSense
  siteApproved: false,            // true only when the site status is Ready
  autoAdsEnabled: false,          // also enable Auto ads in the AdSense account
  manualAdsEnabled: false,        // requires siteApproved and certifiedCmpConfigured
  manualAdDensity: 'balanced',    // minimal | balanced | full
  adCoverage: 'eligible-only',    // eligible-only | all-reviewed
  certifiedCmpConfigured: true,  // true only after a Google-certified CMP is active
  adsenseSlots: {
    articleTop: '',               // numeric AdSense ad unit slot ID
    articleMid: '',
    articleBottom: ''
  },
  advertisingPolicyVersion: '2026-07-23'
});

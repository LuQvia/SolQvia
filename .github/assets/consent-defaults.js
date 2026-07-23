// SolQvia.com Consent Mode v2 defaults.
// Google CMP updates these values for visitors shown the European regulations message.
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

const SOLQVIA_EEA_UK_CH = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
  'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO',
  'GB','CH'
];

// Hold all Google storage until the Google CMP records a choice in covered regions.
window.gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 2000,
  region: SOLQVIA_EEA_UK_CH
});

// Review-stage defaults outside covered regions: analytics enabled; advertising storage disabled.
window.gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted'
});

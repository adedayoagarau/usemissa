import type { PortalConfiguration } from '../../src/portalConfiguration.js';

export const poetryPrizePortal: PortalConfiguration = {
  name: 'Arole Agarawu African Poetry Prize',
  introduction: 'Submit a poetry manuscript for the current prize cycle.',
  supportEmail: 'prize@example.invalid',
  locale: 'en-NG',
  timeZone: 'Africa/Lagos',
  privacyPolicyUrl: 'https://example.invalid/prize/privacy',
  termsUrl: 'https://example.invalid/prize/terms',
  brand: {
    logoUrl: 'https://example.invalid/prize/logo.svg',
    logoAlt: 'Arole Agarawu African Poetry Prize',
    primaryColor: '#285649',
  },
};

export const residencyPortal: PortalConfiguration = {
  name: 'North River Residency',
  introduction: 'Apply for a supported studio residency beside the river.',
  supportEmail: 'residency@example.invalid',
  locale: 'en-GB',
  timeZone: 'Europe/London',
  privacyPolicyUrl: 'https://example.invalid/residency/privacy',
  termsUrl: 'https://example.invalid/residency/terms',
  accessibilityContactUrl: 'https://example.invalid/residency/accessibility',
  brand: {
    logoUrl: 'https://example.invalid/residency/mark.svg',
    logoAlt: 'North River Residency',
    primaryColor: '#426b7a',
  },
};


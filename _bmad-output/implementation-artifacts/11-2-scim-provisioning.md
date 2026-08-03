# Story 11.2: SCIM member provisioning

Status: review

Missa now exposes a provider-neutral SCIM 2.0 surface for one explicitly
configured organization: list/create users, read/update users, role mapping,
deactivation, revocation, and last-admin protection. Every request requires a
constant-time bearer-token comparison and `SCIM_ORGANIZATION_ID`; the endpoint
never accepts an organization ID from the payload. Provisioned accounts receive
opaque non-login credentials and remain private to the organization.

OIDC/SAML browser SSO remains a separate provider integration. SCIM can be
enabled safely without inventing an identity provider or storing external
passwords.

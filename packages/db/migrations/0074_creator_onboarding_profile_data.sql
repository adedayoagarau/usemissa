alter table creator_profiles
  add column if not exists given_name text,
  add column if not exists family_name text,
  add column if not exists uses_single_name boolean not null default false,
  add column if not exists country_code text,
  add column if not exists city text,
  add column if not exists timezone text;

alter table creator_profiles
  add constraint creator_profiles_country_code_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$') not valid;

alter table creator_profiles
  add constraint creator_profiles_timezone_check
  check (timezone is null or char_length(timezone) between 1 and 80) not valid;

comment on column creator_profiles.given_name is
  'Private name supplied by the account owner. Public surfaces use display_name.';
comment on column creator_profiles.country_code is
  'Private ISO 3166-1 alpha-2 home country used for eligibility and recommendations.';
comment on column creator_profiles.timezone is
  'Private IANA time zone used for deadline and reminder presentation.';

alter table opportunity_preferences
  add column if not exists travel_willingness text not null default 'any';

alter table opportunity_preferences
  add constraint opportunity_preferences_travel_willingness_check
  check (travel_willingness in ('remote-only', 'willing-to-travel', 'local-only', 'any')) not valid;

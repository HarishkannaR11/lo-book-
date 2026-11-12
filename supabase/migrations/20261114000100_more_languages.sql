-- Owners can keep their app language in any of the eleven supported languages.
alter type public.app_locale add value if not exists 'hi';
alter type public.app_locale add value if not exists 'bn';
alter type public.app_locale add value if not exists 'mr';
alter type public.app_locale add value if not exists 'te';
alter type public.app_locale add value if not exists 'gu';
alter type public.app_locale add value if not exists 'kn';
alter type public.app_locale add value if not exists 'ml';
alter type public.app_locale add value if not exists 'or';
alter type public.app_locale add value if not exists 'pa';

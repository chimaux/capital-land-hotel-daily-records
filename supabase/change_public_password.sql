insert into app_settings(key, value)
values ('public_password_hash', crypt('YOUR-NEW-PASSWORD', gen_salt('bf')))
on conflict (key) do update set value = excluded.value;
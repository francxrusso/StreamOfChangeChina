alter table admin_users
  add column if not exists can_edit boolean not null default false,
  add column if not exists last_login_at timestamptz;

update admin_users
set can_edit = true
where role = 'admin'
  and can_edit = false;

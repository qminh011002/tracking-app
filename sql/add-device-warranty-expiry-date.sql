alter table public.devices
add column if not exists warranty_expiry_date date;

-- Fix duplicate phone_number unique constraint issue
-- This migration ensures phone numbers are always unique and handles conflicts gracefully

-- 1. Create a function to generate unique pending phone numbers
create or replace function public.generate_unique_pending_phone(p_user_id uuid)
returns text
language plpgsql
as $$
declare
  v_candidate text;
  v_exists boolean;
  v_attempt integer := 0;
begin
  loop
    v_candidate := concat('pending-', substring(p_user_id::text, 1, 8), case when v_attempt > 0 then concat('-', v_attempt) else '' end);
    
    select exists(
      select 1 from public.users 
      where phone_number = v_candidate 
      and deleted_at is null
    ) into v_exists;
    
    exit when not v_exists;
    
    v_attempt := v_attempt + 1;
    
    if v_attempt > 100 then
      raise exception 'Could not generate unique pending phone number after 100 attempts';
    end if;
  end loop;
  
  return v_candidate;
end;
$$;

-- 2. Update sync function to handle phone number conflicts with ON CONFLICT
create or replace function public.sync_auth_user_to_canonical_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_full_name text;
  v_phone_number text;
  v_raw_phone text;
begin
  v_full_name := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    trim(concat_ws(' ', new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')),
    split_part(coalesce(new.email, 'Wasel User'), '@', 1),
    'Wasel User'
  );

  -- Extract phone from metadata
  v_raw_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_number', new.raw_user_meta_data ->> 'phone', '')), '');
  
  -- If phone is provided and not a duplicate, use it; otherwise generate unique pending
  if v_raw_phone is not null and v_raw_phone != '' then
    -- Check if phone already exists for a different user
    if exists(
      select 1 from public.users 
      where phone_number = v_raw_phone 
      and auth_user_id != new.id 
      and deleted_at is null
    ) then
      -- Phone exists for another user, generate pending
      v_phone_number := public.generate_unique_pending_phone(new.id);
    else
      v_phone_number := v_raw_phone;
    end if;
  else
    v_phone_number := public.generate_unique_pending_phone(new.id);
  end if;

  insert into public.users (auth_user_id, email, full_name, phone_number)
  values (
    new.id,
    coalesce(new.email, concat(left(new.id::text, 12), '@pending.wasel.local')),
    v_full_name,
    v_phone_number
  )
  on conflict (auth_user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    phone_number = case
      -- Only update if current is pending and new is real
      when public.users.phone_number like 'pending-%' and excluded.phone_number not like 'pending-%' then excluded.phone_number
      else public.users.phone_number
    end,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

-- 3. Add a function to safely update phone numbers
create or replace function public.safe_update_user_phone(
  p_user_id uuid,
  p_phone_number text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
  v_normalized_phone text;
begin
  -- Normalize phone number
  v_normalized_phone := trim(p_phone_number);
  
  -- Validate phone format (E.164 or pending pattern)
  if not (v_normalized_phone ~ '^\\+?[1-9]\\d{7,14}$' or v_normalized_phone like 'pending-%') then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid phone number format'
    );
  end if;
  
  -- Check for duplicates
  if exists(
    select 1 from public.users 
    where phone_number = v_normalized_phone 
    and id != p_user_id 
    and deleted_at is null
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'Phone number already in use'
    );
  end if;
  
  -- Update the phone number
  update public.users
  set 
    phone_number = v_normalized_phone,
    phone_verified_at = case 
      when v_normalized_phone like 'pending-%' then null 
      else coalesce(phone_verified_at, timezone('utc', now()))
    end,
    updated_at = timezone('utc', now())
  where id = p_user_id
  returning jsonb_build_object(
    'success', true,
    'phone_number', phone_number
  ) into v_result;
  
  return coalesce(v_result, jsonb_build_object('success', false, 'error', 'User not found'));
end;
$$;

-- 4. Clean up any existing duplicate phone numbers
do $$
declare
  v_duplicate record;
  v_new_phone text;
begin
  -- Find and fix duplicate phone numbers (keeping the oldest)
  for v_duplicate in
    select phone_number, array_agg(id order by created_at) as user_ids
    from public.users
    where deleted_at is null
    and phone_number not like 'pending-%'
    group by phone_number
    having count(*) > 1
  loop
    -- Keep first user with the phone, update others
    for i in 2..array_length(v_duplicate.user_ids, 1) loop
      v_new_phone := public.generate_unique_pending_phone(v_duplicate.user_ids[i]);
      
      update public.users
      set phone_number = v_new_phone,
          phone_verified_at = null,
          updated_at = timezone('utc', now())
      where id = v_duplicate.user_ids[i];
      
      raise notice 'Updated user % phone from % to %', 
        v_duplicate.user_ids[i], 
        v_duplicate.phone_number, 
        v_new_phone;
    end loop;
  end loop;
end $$;

-- 5. Add helpful comment
comment on function public.generate_unique_pending_phone is 
  'Generates a unique pending phone number for users without verified phone numbers';
comment on function public.safe_update_user_phone is 
  'Safely updates user phone number with duplicate detection and validation';

create or replace function public.rpc_sync_warmup_mode()
returns table (previous_mode text, next_mode text, changed boolean)
language plpgsql
security definer
as $$
declare
  v_mode text;
  v_start_date_text text;
  v_start_date date;
  v_elapsed_days int;
  v_target_mode text;
begin
  select value into v_mode
  from public.system_config
  where key = 'mode';

  select value into v_start_date_text
  from public.system_config
  where key in ('warmup_start_date', 'start_date')
  order by case key when 'warmup_start_date' then 0 else 1 end
  limit 1;

  if v_mode is null or v_start_date_text is null then
    return query select v_mode, v_mode, false;
    return;
  end if;

  begin
    v_start_date := v_start_date_text::date;
  exception
    when others then
      return query select v_mode, v_mode, false;
      return;
  end;

  v_elapsed_days := (current_date - v_start_date);

  if v_elapsed_days < 7 then
    v_target_mode := 'warmup_1';
  elsif v_elapsed_days < 14 then
    v_target_mode := 'warmup_2';
  else
    v_target_mode := 'warmup_3';
  end if;

  if v_target_mode <> v_mode then
    update public.system_config
    set value = v_target_mode
    where key = 'mode';

    return query select v_mode, v_target_mode, true;
    return;
  end if;

  return query select v_mode, v_mode, false;
end;
$$;
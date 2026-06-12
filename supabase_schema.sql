-- ============================================================
--  UDLA Call Center — Schema Supabase
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists citas_callcenter (
  id                   bigserial primary key,
  rut                  text,
  asunto               text,
  equipo               text,           -- Marketing5 (Equipo Online VL, etc.)
  cont_llamadas        integer,        -- Cantidad de llamadas
  fecha_creacion       date,
  fecha_compromiso     date,
  primer_sub_origen    text,           -- Canal de captación
  telefono             text,
  propietario          text,           -- Usuario CRM sistema
  campus               text,
  regimen              text,           -- Régimen Interés 1 (DIURNO, ONLINE, etc.)
  carrera              text,
  consultor            text,           -- Llamada a (asesor real)
  propietario_contacto text,
  ultimo_interes_cierre text,          -- Estado final del lead
  seguimiento_cierre   text,           -- Estado de la gestión
  interes              text,
  interes_cierre       text,
  prioridad            text,
  semana               text,
  mes                  text,
  banner               text,
  created_at           timestamptz default now()
);

-- Índices para filtros frecuentes
create index if not exists idx_citas_consultor   on citas_callcenter (consultor);
create index if not exists idx_citas_campus      on citas_callcenter (campus);
create index if not exists idx_citas_carrera     on citas_callcenter (carrera);
create index if not exists idx_citas_estado      on citas_callcenter (ultimo_interes_cierre);
create index if not exists idx_citas_equipo      on citas_callcenter (equipo);
create index if not exists idx_citas_mes         on citas_callcenter (mes);
create index if not exists idx_citas_semana      on citas_callcenter (semana);
create index if not exists idx_citas_fecha       on citas_callcenter (fecha_creacion);

-- RLS: habilitar y permitir lectura pública (ajustar según necesidades)
alter table citas_callcenter enable row level security;

create policy "Lectura pública" on citas_callcenter
  for select using (true);

create policy "Inserción autenticada" on citas_callcenter
  for insert with check (true);

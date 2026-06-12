# 📊 Dashboard CRM UDLA — Next.js + Supabase

Dashboard de admisiones y call center para Universidad de las Américas, construido con **Next.js 14**, **Tailwind CSS**, **Chart.js** y **Supabase**.

## Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Chart.js** — 6 gráficos interactivos
- **SheetJS (xlsx)** — lectura de Excel local
- **Supabase** — base de datos en la nube

---

## 🚀 Desarrollo local

```bash
npm install
npm run dev
# → http://localhost:3000
```

## 🏗️ Build

```bash
npm run build
npm start
```

---

## ☁️ Deploy en Vercel

### Opción A — GitHub + Vercel (recomendado)

```bash
git add . && git commit -m "feat: dashboard udla nextjs"
git push origin main
```
Luego en **vercel.com** → Import Project → selecciona el repo → Deploy.

### Opción B — CLI

```bash
npx vercel
# Framework: Next.js (auto-detectado)
```

---

## 🗄️ Configurar Supabase

### 1. Crear tabla

En Supabase → SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS leads (
  id                BIGSERIAL PRIMARY KEY,
  lead_id           TEXT,
  estado_matricula  TEXT,
  consultor         TEXT,
  carrera           TEXT,
  ultimo_interes    TEXT,
  citas             INTEGER DEFAULT 0,
  fecha_creacion    DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_estado    ON leads(estado_matricula);
CREATE INDEX idx_leads_consultor ON leads(consultor);
CREATE INDEX idx_leads_carrera   ON leads(carrera);
CREATE INDEX idx_leads_fecha     ON leads(fecha_creacion);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública"   ON leads FOR SELECT USING (true);
CREATE POLICY "Inserción pública" ON leads FOR INSERT WITH CHECK (true);
```

### 2. Variables de entorno (opcional)

```bash
cp .env.example .env.local
# Edita .env.local con tu URL y Anon Key
```

O conéctate directamente desde la UI del dashboard (el panel "Supabase" en el header).

---

## 📁 Estructura

```
├── app/
│   ├── layout.tsx       — Layout raíz
│   ├── page.tsx         — Página principal
│   └── globals.css      — Estilos globales
├── components/
│   ├── Dashboard.tsx    — Componente principal (estado global)
│   ├── Header.tsx       — Header + filtros
│   ├── KpiCards.tsx     — 4 tarjetas KPI
│   ├── ChartSection.tsx — 6 gráficos Chart.js
│   ├── DataTables.tsx   — Tablas de carrera y consultor
│   ├── SupabasePanel.tsx— Panel de conexión Supabase
│   ├── UploadZone.tsx   — Carga de Excel local
│   └── Toast.tsx        — Notificaciones
├── lib/
│   ├── supabase.ts      — Cliente Supabase singleton
│   └── dataUtils.ts     — Utilidades de datos y detección de columnas
└── vercel.json
```

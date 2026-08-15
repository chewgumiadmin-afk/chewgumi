-- QA Kit 표 두 개
create table if not exists public.qa_reports (
  id bigint generated always as identity primary key,
  project text not null default 'default',
  page text not null default '',
  kind text not null default '',
  note text not null default '',
  device text not null default '',
  viewport text not null default '',
  shot_url text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists qa_idx on public.qa_reports (project, status, created_at desc);

create table if not exists public.qa_guides (
  project text not null default 'default',
  page text not null,
  guide jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (project, page)
);

alter table public.qa_reports enable row level security;
alter table public.qa_guides  enable row level security;
-- 서버(service_role)만 접근하므로 정책은 두지 않습니다.

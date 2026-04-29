create extension if not exists "pgcrypto";

create type visibility_level as enum ('public', 'restricted', 'private');
create type distribution_model as enum ('linear_tv', 'streaming', 'hybrid', 'unknown');
create type asset_type as enum ('video', 'audio', 'image', 'subtitle', 'transcript', 'document', 'external_link', 'other');
create type target_type as enum ('series', 'episode', 'segment', 'utterance', 'danmu_comment', 'media_asset', 'interview', 'bibliographic_source');
create type person_role_type as enum ('researcher', 'pi', 'collaborator', 'director', 'producer', 'writer', 'actor', 'interviewee', 'partner', 'other');

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table rights_statements (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  description text,
  license_url text,
  can_publish_metadata boolean not null default true,
  can_publish_excerpt boolean not null default false,
  can_publish_media boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_original text,
  country_code char(2),
  distribution distribution_model not null default 'unknown',
  website_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table series (
  id uuid primary key default gen_random_uuid(),
  title_original text not null,
  title_pinyin text,
  title_en text,
  title_it text,
  synopsis text,
  original_language text not null default 'zh',
  production_country_code char(2) default 'CN',
  release_year integer check (release_year between 1900 and 2100),
  start_date date,
  end_date date,
  platform_id uuid references platforms(id) on delete set null,
  distribution distribution_model not null default 'unknown',
  case_study boolean not null default false,
  is_bl_gl_or_dangai boolean not null default false,
  rights_statement_id uuid references rights_statements(id) on delete set null,
  visibility visibility_level not null default 'restricted',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table episodes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  season_number integer not null default 1 check (season_number > 0),
  episode_number integer not null check (episode_number > 0),
  title_original text,
  title_pinyin text,
  title_en text,
  title_it text,
  synopsis text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  release_date date,
  visibility visibility_level not null default 'restricted',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, season_number, episode_number)
);

create table segments (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episodes(id) on delete cascade,
  segment_number integer not null check (segment_number > 0),
  start_time_seconds numeric(10,3) not null check (start_time_seconds >= 0),
  end_time_seconds numeric(10,3) check (end_time_seconds is null or end_time_seconds >= start_time_seconds),
  title text,
  description text,
  setting text,
  narrative_function text,
  visibility visibility_level not null default 'restricted',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episode_id, segment_number)
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references series(id) on delete cascade,
  episode_id uuid references episodes(id) on delete cascade,
  segment_id uuid references segments(id) on delete cascade,
  asset_type asset_type not null,
  label text not null,
  uri text not null,
  mime_type text,
  start_time_seconds numeric(10,3) check (start_time_seconds is null or start_time_seconds >= 0),
  end_time_seconds numeric(10,3) check (end_time_seconds is null or end_time_seconds >= start_time_seconds),
  rights_statement_id uuid references rights_statements(id) on delete set null,
  visibility visibility_level not null default 'private',
  checksum text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table characters (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  name_original text not null,
  name_pinyin text,
  name_en text,
  description text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, name_original)
);

create table utterances (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references segments(id) on delete cascade,
  character_id uuid references characters(id) on delete set null,
  sequence_number integer not null check (sequence_number > 0),
  start_time_seconds numeric(10,3) check (start_time_seconds is null or start_time_seconds >= 0),
  end_time_seconds numeric(10,3) check (end_time_seconds is null or end_time_seconds >= start_time_seconds),
  language_code text not null default 'zh',
  text_original text not null,
  text_pinyin text,
  text_it text,
  text_en text,
  speech_act text,
  emotion_label text,
  visibility visibility_level not null default 'restricted',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(text_original, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(text_pinyin, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(text_it, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(text_en, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (segment_id, sequence_number)
);

create table tag_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references tag_categories(id) on delete cascade,
  label text not null,
  label_original text,
  description text,
  color_hex char(7),
  parent_tag_id uuid references tags(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, label)
);

create table annotations (
  id uuid primary key default gen_random_uuid(),
  target_type target_type not null,
  target_id uuid not null,
  title text,
  body text,
  coding_scheme text,
  atlas_ti_code text,
  confidence numeric(3,2) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_by uuid,
  visibility visibility_level not null default 'restricted',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table annotation_tags (
  annotation_id uuid not null references annotations(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (annotation_id, tag_id)
);

create table lexical_items (
  id uuid primary key default gen_random_uuid(),
  expression_original text not null,
  expression_pinyin text,
  translation_it text,
  translation_en text,
  pragmatic_function text,
  emotion_label text,
  register_label text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table utterance_lexical_items (
  utterance_id uuid not null references utterances(id) on delete cascade,
  lexical_item_id uuid not null references lexical_items(id) on delete cascade,
  notes text,
  primary key (utterance_id, lexical_item_id)
);

create table danmu_comments (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  episode_id uuid references episodes(id) on delete cascade,
  segment_id uuid references segments(id) on delete set null,
  platform_id uuid references platforms(id) on delete set null,
  video_time_seconds numeric(10,3) check (video_time_seconds is null or video_time_seconds >= 0),
  posted_at timestamptz,
  author_hash text,
  language_code text not null default 'zh',
  text_original text not null,
  text_pinyin text,
  text_it text,
  text_en text,
  sentiment_label text,
  visibility visibility_level not null default 'restricted',
  source_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(text_original, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(text_pinyin, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(text_it, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(text_en, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table popularity_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  source_type text,
  website_url text,
  reliability_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table popularity_metrics (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  episode_id uuid references episodes(id) on delete cascade,
  source_id uuid not null references popularity_sources(id) on delete restrict,
  metric_name text not null,
  metric_value numeric,
  metric_text text,
  rank_position integer check (rank_position is null or rank_position > 0),
  measured_at date,
  source_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table audience_events (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  episode_id uuid references episodes(id) on delete cascade,
  event_date date,
  title text not null,
  description text,
  event_type text,
  source_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table people (
  id uuid primary key default gen_random_uuid(),
  family_name text,
  given_name text,
  display_name text not null,
  name_original text,
  affiliation text,
  country_code char(2),
  email text,
  website_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table annotations
  add constraint fk_annotations_created_by
  foreign key (created_by) references people(id) on delete set null;

create table person_roles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  role person_role_type not null,
  series_id uuid references series(id) on delete cascade,
  episode_id uuid references episodes(id) on delete cascade,
  description text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table interviews (
  id uuid primary key default gen_random_uuid(),
  interviewee_id uuid references people(id) on delete set null,
  interviewer_id uuid references people(id) on delete set null,
  series_id uuid references series(id) on delete set null,
  interview_date date,
  location text,
  language_code text,
  title text,
  abstract text,
  transcript_uri text,
  consent_status text,
  rights_statement_id uuid references rights_statements(id) on delete set null,
  visibility visibility_level not null default 'private',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bibliographic_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text,
  title text not null,
  authors text,
  publication_year integer check (publication_year is null or publication_year between 1800 and 2200),
  publisher text,
  journal_or_container text,
  doi text,
  url text,
  citation text,
  abstract text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table series_bibliographic_sources (
  series_id uuid not null references series(id) on delete cascade,
  bibliographic_source_id uuid not null references bibliographic_sources(id) on delete cascade,
  relation_label text,
  notes text,
  primary key (series_id, bibliographic_source_id)
);

create table research_outputs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  output_type text not null,
  output_date date,
  url text,
  description text,
  visibility visibility_level not null default 'public',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  changed_by uuid references people(id) on delete set null,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index idx_series_platform_id on series(platform_id);
create index idx_series_distribution on series(distribution);
create index idx_series_case_study on series(case_study);
create index idx_episodes_series_id on episodes(series_id);
create index idx_segments_episode_id on segments(episode_id);
create index idx_media_assets_series_id on media_assets(series_id);
create index idx_media_assets_episode_id on media_assets(episode_id);
create index idx_media_assets_segment_id on media_assets(segment_id);
create index idx_utterances_segment_id on utterances(segment_id);
create index idx_utterances_character_id on utterances(character_id);
create index idx_utterances_search_vector on utterances using gin(search_vector);
create index idx_danmu_comments_series_id on danmu_comments(series_id);
create index idx_danmu_comments_episode_id on danmu_comments(episode_id);
create index idx_danmu_comments_video_time on danmu_comments(video_time_seconds);
create index idx_danmu_comments_search_vector on danmu_comments using gin(search_vector);
create index idx_annotations_target on annotations(target_type, target_id);
create index idx_tags_category_id on tags(category_id);
create unique index idx_lexical_items_expression_unique on lexical_items(expression_original, coalesce(expression_pinyin, ''));
create index idx_popularity_metrics_series_id on popularity_metrics(series_id);
create index idx_popularity_metrics_source_id on popularity_metrics(source_id);

create trigger trg_rights_statements_updated_at before update on rights_statements for each row execute function set_updated_at();
create trigger trg_platforms_updated_at before update on platforms for each row execute function set_updated_at();
create trigger trg_series_updated_at before update on series for each row execute function set_updated_at();
create trigger trg_episodes_updated_at before update on episodes for each row execute function set_updated_at();
create trigger trg_segments_updated_at before update on segments for each row execute function set_updated_at();
create trigger trg_media_assets_updated_at before update on media_assets for each row execute function set_updated_at();
create trigger trg_characters_updated_at before update on characters for each row execute function set_updated_at();
create trigger trg_utterances_updated_at before update on utterances for each row execute function set_updated_at();
create trigger trg_tag_categories_updated_at before update on tag_categories for each row execute function set_updated_at();
create trigger trg_tags_updated_at before update on tags for each row execute function set_updated_at();
create trigger trg_annotations_updated_at before update on annotations for each row execute function set_updated_at();
create trigger trg_lexical_items_updated_at before update on lexical_items for each row execute function set_updated_at();
create trigger trg_danmu_comments_updated_at before update on danmu_comments for each row execute function set_updated_at();
create trigger trg_popularity_sources_updated_at before update on popularity_sources for each row execute function set_updated_at();
create trigger trg_audience_events_updated_at before update on audience_events for each row execute function set_updated_at();
create trigger trg_people_updated_at before update on people for each row execute function set_updated_at();
create trigger trg_person_roles_updated_at before update on person_roles for each row execute function set_updated_at();
create trigger trg_interviews_updated_at before update on interviews for each row execute function set_updated_at();
create trigger trg_bibliographic_sources_updated_at before update on bibliographic_sources for each row execute function set_updated_at();
create trigger trg_research_outputs_updated_at before update on research_outputs for each row execute function set_updated_at();

create view public_series_catalog as
select
  series.id,
  series.title_original,
  series.title_pinyin,
  series.title_en,
  series.title_it,
  series.synopsis,
  series.release_year,
  series.distribution,
  series.case_study,
  series.is_bl_gl_or_dangai,
  platforms.name as platform_name,
  platforms.name_original as platform_name_original
from series
left join platforms on platforms.id = series.platform_id
where series.visibility = 'public';

create view public_utterance_search as
select
  utterances.id,
  series.id as series_id,
  series.title_original as series_title_original,
  episodes.episode_number,
  segments.segment_number,
  utterances.sequence_number,
  utterances.start_time_seconds,
  utterances.end_time_seconds,
  characters.name_original as character_name_original,
  utterances.language_code,
  utterances.text_original,
  utterances.text_pinyin,
  utterances.text_it,
  utterances.text_en,
  utterances.speech_act,
  utterances.emotion_label
from utterances
join segments on segments.id = utterances.segment_id
join episodes on episodes.id = segments.episode_id
join series on series.id = episodes.series_id
left join characters on characters.id = utterances.character_id
where utterances.visibility = 'public'
  and segments.visibility = 'public'
  and episodes.visibility = 'public'
  and series.visibility = 'public';

create view public_danmu_search as
select
  danmu_comments.id,
  series.id as series_id,
  series.title_original as series_title_original,
  episodes.episode_number,
  segments.segment_number,
  platforms.name as platform_name,
  danmu_comments.video_time_seconds,
  danmu_comments.posted_at,
  danmu_comments.language_code,
  danmu_comments.text_original,
  danmu_comments.text_pinyin,
  danmu_comments.text_it,
  danmu_comments.text_en,
  danmu_comments.sentiment_label
from danmu_comments
join series on series.id = danmu_comments.series_id
left join episodes on episodes.id = danmu_comments.episode_id
left join segments on segments.id = danmu_comments.segment_id
left join platforms on platforms.id = danmu_comments.platform_id
where danmu_comments.visibility = 'public'
  and series.visibility = 'public'
  and (episodes.id is null or episodes.visibility = 'public')
  and (segments.id is null or segments.visibility = 'public');

insert into rights_statements (label, description, can_publish_metadata, can_publish_excerpt, can_publish_media)
values
  ('Public metadata only', 'Only descriptive metadata can be published online.', true, false, false),
  ('Short excerpt allowed', 'Metadata and short textual excerpts can be published online.', true, true, false),
  ('Internal research use', 'Material is restricted to the research team.', false, false, false);

insert into platforms (name, name_original, country_code, distribution, website_url)
values
  ('CCTV', '中国中央电视台', 'CN', 'linear_tv', 'https://www.cctv.com/'),
  ('Tencent Video', '腾讯视频', 'CN', 'streaming', 'https://v.qq.com/');

insert into tag_categories (name, description)
values
  ('theme', 'Recurring themes and topics.'),
  ('emotion', 'Emotional tags connected to scripts, dialogue, gestures or scene construction.'),
  ('gesture', 'Gestural and embodied expressions.'),
  ('narrative_code', 'Narrative functions, codes and structures.'),
  ('media_form', 'Intermedial, platform and seriality features.'),
  ('queer_desire', 'Tags for BL, GL, dangai and queer desire representation.'),
  ('production_context', 'Production, censorship, circulation and platform context.');

insert into tags (category_id, label, description)
select tag_categories.id, seed.label, seed.description
from (
  values
    ('emotion', 'anger', 'Emotional expression of anger.'),
    ('theme', 'desire', 'Representation or regulation of desire.'),
    ('theme', 'family', 'Family relations and kinship structures.'),
    ('production_context', 'censorship', 'Explicit or implicit regulation of content.'),
    ('production_context', 'fandom', 'Audience and fan practices.'),
    ('media_form', 'streaming_seriality', 'Serial form shaped by streaming distribution.')
) as seed(category_name, label, description)
join tag_categories on tag_categories.name = seed.category_name;

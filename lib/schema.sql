CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,              -- fintech | bank | payments | remittance | bnpl | adjacent-tech | other
  composite_score INTEGER,           -- NULL if insufficient data across all categories
  previous_score INTEGER,            -- for 7-day trend arrow
  previous_rank INTEGER,             -- for Slack "entered top 10" detection
  layoff_score INTEGER,              -- NULL = insufficient data, else 0-100 contribution
  leadership_exit_score INTEGER,
  press_score INTEGER,
  glassdoor_score INTEGER,
  funding_score INTEGER,
  why_summary TEXT,                  -- one-line league-table summary
  sourcing_angle TEXT,               -- AI-generated 1-2 sentence recruiter hook
  last_scanned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,          -- layoff | leadership_exit | negative_press | glassdoor | funding_distress
  event_date DATE,
  description TEXT NOT NULL,
  source_url TEXT,
  points_contributed INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_company ON events(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_score ON companies(composite_score DESC NULLS LAST);

-- Scans run 3x/week and will keep re-finding the same still-recent news
-- article; without this, the timeline fills up with near-identical repeats
-- of the same event. Only dedupes dated events (undated ones are rarer).
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_dedupe
  ON events(company_id, event_type, event_date)
  WHERE event_date IS NOT NULL;

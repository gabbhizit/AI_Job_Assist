-- ============================================
-- H1B + E-Verify badge support
-- ============================================

-- Add is_everify flag to sponsor_friendly_companies
ALTER TABLE public.sponsor_friendly_companies
  ADD COLUMN IF NOT EXISTS is_everify BOOLEAN DEFAULT FALSE;

-- Mark known E-Verify participants among existing sponsors
UPDATE public.sponsor_friendly_companies
SET is_everify = TRUE
WHERE company_name IN (
  'google', 'amazon', 'microsoft', 'apple', 'meta', 'netflix',
  'salesforce', 'oracle', 'ibm', 'intel', 'qualcomm', 'nvidia',
  'adobe', 'linkedin', 'twitter', 'uber', 'lyft', 'airbnb',
  'stripe', 'square', 'paypal', 'intuit', 'workday', 'servicenow',
  'snowflake', 'databricks', 'palantir', 'crowdstrike', 'okta',
  'zoom', 'slack', 'atlassian', 'dropbox', 'box', 'twilio',
  'mongodb', 'elastic', 'splunk', 'pagerduty', 'datadog',
  'cloudflare', 'fastly', 'akamai', 'vmware', 'cisco',
  'dell', 'hp', 'samsung', 'lg', 'sony', 'toshiba',
  'jpmorgan chase', 'goldman sachs', 'morgan stanley', 'bank of america',
  'wells fargo', 'citigroup', 'capital one', 'american express',
  'deloitte', 'accenture', 'cognizant', 'infosys', 'wipro', 'tcs',
  'hcl technologies', 'capgemini', 'epam systems',
  'general electric', 'boeing', 'lockheed martin', 'raytheon',
  'johnson & johnson', 'pfizer', 'medtronic', 'abbott',
  'tesla', 'ford', 'general motors'
);

-- Insert additional well-known E-Verify companies not already in sponsors list
INSERT INTO public.sponsor_friendly_companies (company_name, source, is_everify)
VALUES
  ('walmart', 'everify_2024', TRUE),
  ('target', 'everify_2024', TRUE),
  ('costco', 'everify_2024', TRUE),
  ('home depot', 'everify_2024', TRUE),
  ('fedex', 'everify_2024', TRUE),
  ('ups', 'everify_2024', TRUE),
  ('fedex corporation', 'everify_2024', TRUE),
  ('american airlines', 'everify_2024', TRUE),
  ('delta air lines', 'everify_2024', TRUE),
  ('united airlines', 'everify_2024', TRUE),
  ('lockheed martin', 'everify_2024', TRUE),
  ('northrop grumman', 'everify_2024', TRUE)
ON CONFLICT (company_name) DO UPDATE
  SET is_everify = TRUE;

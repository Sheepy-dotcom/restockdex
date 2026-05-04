import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sgwecoojuxsqctxlaqfh.supabase.co";

const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnd2Vjb29qdXhzcWN0eGxhcWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODM5NTQsImV4cCI6MjA5MzQ1OTk1NH0.ToWRVgoywSHk6RBSjXSqy-ruPIH27keyzM-Ddajxiu4";

export const supabase = createClient(supabaseUrl, supabaseKey);

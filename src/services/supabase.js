import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://iqvjpinanqsdhlggfvfd.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdmpwaW5hbnFzZGhsZ2dmdmZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY0MDk5NywiZXhwIjoyMDcyMjE2OTk3fQ.7d3z37ut4Qhvytz5m8OCutr_oEqpn7frJFSXYCMeNq0'

export const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase

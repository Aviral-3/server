const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function inspect() {
  console.log('--- ADMINS (users_admin) ---');
  const { data: admins } = await supabase.from('users_admin').select('*');
  console.log(admins);

  console.log('\n--- CLIENTS/MRs (users_client) ---');
  const { data: clients } = await supabase.from('users_client').select('*');
  console.log(clients);
}

inspect();

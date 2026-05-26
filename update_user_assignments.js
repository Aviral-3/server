const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function run() {
  console.log('Updating assigned_areas for testUser1 (Aviral)...');
  const res1 = await supabase
    .from('users_client')
    .update({ assigned_areas: ['koramangala', 'indiranagar', 'hsr_layout'] })
    .eq('id', 1)
    .select();
  
  if (res1.error) {
    console.error('Error updating testUser1:', res1.error);
  } else {
    console.log('Successfully updated testUser1:', res1.data);
  }

  console.log('\nUpdating assigned_areas for testUser2...');
  const res2 = await supabase
    .from('users_client')
    .update({ assigned_areas: ['bandra_west', 'dadar', 'kurla'] })
    .eq('id', 2)
    .select();

  if (res2.error) {
    console.error('Error updating testUser2:', res2.error);
  } else {
    console.log('Successfully updated testUser2:', res2.data);
  }
}

run();

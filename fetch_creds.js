require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fetchCreds() {
  console.log('Fetching users from Supabase...');
  const { data, error } = await supabase
    .from('users')
    .select('username, password, name');

  if (error) {
    console.error('Error fetching users:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.table(data);
  } else {
    console.log('No users found in the database. You might need to insert some test data.');
  }
}

fetchCreds();

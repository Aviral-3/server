const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function runTest() {
  const testOrderId = 'TEST-ORD-' + Date.now();
  console.log('Testing insert of order ID:', testOrderId);
  
  // 1. Try to insert order
  const { data: insertData, error: insertError } = await supabase
    .from('orders')
    .insert([{
      id: testOrderId,
      company_id: '11111111-1111-1111-1111-111111111111',
      user_id: 1,
      doctor_name: 'Dr. Test Gupta',
      area_name: 'Bandra West',
      amount: 1500,
      status: 'submitted',
      items: [
        { productId: 1, productName: 'Cardiomax 5mg', quantity: 2, price: 120 }
      ],
      created_at: new Date().toISOString()
    }])
    .select('*')
    .single();

  if (insertError) {
    console.error('Insert error details:', insertError);
  } else {
    console.log('Insert successful:', insertData);
  }

  // 2. Try to fetch orders for company
  console.log('\nTesting retrieval of orders...');
  const { data: selectData, error: selectError } = await supabase
    .from('orders')
    .select('*, users_client (name)')
    .eq('company_id', '11111111-1111-1111-1111-111111111111');

  if (selectError) {
    console.error('Select error details:', selectError);
  } else {
    console.log(`Fetched ${selectData.length} orders successfully.`);
    if (selectData.length > 0) {
      console.log('First order returned:', selectData[0]);
    }
  }
}

runTest();

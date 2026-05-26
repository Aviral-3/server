const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Harshil/Downloads/MediKL/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function seed() {
  const company1 = '11111111-1111-1111-1111-111111111111'; // PharmaCorp (pharmacorp)
  const userId = 1; // Aviral (testUser1)

  // Get current date strings for yesterday, today, and tomorrow
  const getDStr = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const yesterday = getDStr(-1);
  const today = getDStr(0);
  const tomorrow = getDStr(1);

  console.log(`Generating seeds for yesterday: ${yesterday}, today: ${today}, tomorrow: ${tomorrow}`);

  // 1. Delete existing orders for user 1 to avoid clutter
  console.log('Deleting old orders for user 1...');
  await supabase.from('orders').delete().eq('user_id', userId);

  // 2. Insert orders
  console.log('Inserting seed orders...');
  const orders = [
    {
      id: 'ORD-SEED-001',
      company_id: company1,
      user_id: userId,
      doctor_name: 'Dr. Sarah Wilson',
      area_name: 'Koramangala',
      amount: 1500.00,
      status: 'approved',
      created_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString() // yesterday
    },
    {
      id: 'ORD-SEED-002',
      company_id: company1,
      user_id: userId,
      doctor_name: 'Dr. Sarah Wilson',
      area_name: 'Koramangala',
      amount: 2500.00,
      status: 'submitted',
      created_at: new Date().toISOString() // today
    },
    {
      id: 'ORD-SEED-003',
      company_id: company1,
      user_id: userId,
      doctor_name: 'Dr. Michael Chen',
      area_name: 'Indiranagar',
      amount: 1800.00,
      status: 'approved',
      created_at: new Date().toISOString() // today
    }
  ];

  const { data: oData, error: oError } = await supabase.from('orders').insert(orders).select();
  if (oError) {
    console.error('Error inserting orders:', oError);
  } else {
    console.log('Orders inserted:', oData.length);
  }

  // 3. Delete existing schedules for today/yesterday/tomorrow for user 1 to avoid primary key/unique constraint conflict
  console.log('Deleting old schedules for user 1...');
  await supabase.from('visit_schedules').delete().eq('user_id', userId);

  // 4. Insert schedules
  console.log('Inserting seed visit_schedules...');
  const schedules = [
    {
      company_id: company1,
      user_id: userId,
      doctor_id: 'd1',
      doctor_name: 'Dr. Sarah Wilson',
      clinic: 'Koramangala Heart Clinic',
      specialty: 'Cardiologist',
      visit_date: yesterday,
      source: 'admin',
      created_by: 0
    },
    {
      company_id: company1,
      user_id: userId,
      doctor_id: 'd1',
      doctor_name: 'Dr. Sarah Wilson',
      clinic: 'Koramangala Heart Clinic',
      specialty: 'Cardiologist',
      visit_date: today,
      source: 'admin',
      created_by: 0
    },
    {
      company_id: company1,
      user_id: userId,
      doctor_id: 'd2',
      doctor_name: 'Dr. Michael Chen',
      clinic: 'Indiranagar Brain Clinic',
      specialty: 'Neurologist',
      visit_date: today,
      source: 'admin',
      created_by: 0
    },
    {
      company_id: company1,
      user_id: userId,
      doctor_id: 'd2',
      doctor_name: 'Dr. Michael Chen',
      clinic: 'Indiranagar Brain Clinic',
      specialty: 'Neurologist',
      visit_date: tomorrow,
      source: 'admin',
      created_by: 0
    }
  ];

  const { data: sData, error: sError } = await supabase.from('visit_schedules').insert(schedules).select();
  if (sError) {
    console.error('Error inserting schedules:', sError);
  } else {
    console.log('Schedules inserted:', sData.length);
  }

  console.log('Seed completed successfully!');
}

seed();

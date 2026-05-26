const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Harshil/Downloads/MediKL/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function seed() {
  const company1 = '11111111-1111-1111-1111-111111111111'; // PharmaCorp (pharmacorp)
  const userId = 1; // Aviral (testUser1)

  // Clear existing orders and schedules for user 1
  console.log('Clearing old orders and schedules for user 1...');
  await supabase.from('orders').delete().eq('user_id', userId);
  await supabase.from('visit_schedules').delete().eq('user_id', userId);

  // We will insert schedules and orders for both May 25 and May 26 to cover UTC and India local timezones.
  const dates = ['2026-05-25', '2026-05-26'];

  console.log('Inserting schedules for both dates:', dates);
  const schedules = [];
  const orders = [];

  for (const date of dates) {
    // Schedule Dr. Sarah Wilson (d1)
    schedules.push({
      company_id: company1,
      user_id: userId,
      doctor_id: 'd1',
      doctor_name: 'Dr. Sarah Wilson',
      clinic: 'Koramangala Heart Clinic',
      specialty: 'Cardiologist',
      visit_date: date,
      source: 'admin',
      created_by: 0
    });

    // Schedule Dr. Michael Chen (d2)
    schedules.push({
      company_id: company1,
      user_id: userId,
      doctor_id: 'd2',
      doctor_name: 'Dr. Michael Chen',
      clinic: 'Indiranagar Brain Clinic',
      specialty: 'Neurologist',
      visit_date: date,
      source: 'admin',
      created_by: 0
    });

    // Let's create an order for Dr. Sarah Wilson (d1) on this date to mark it as completed.
    orders.push({
      id: `ORD-SEED-${date}-1`,
      company_id: company1,
      user_id: userId,
      doctor_name: 'Dr. Sarah Wilson',
      area_name: 'Koramangala',
      amount: 4500.00,
      status: 'approved',
      created_at: `${date}T10:30:00Z`
    });

    // Let's create another order for Dr. Michael Chen (d2) on this date.
    orders.push({
      id: `ORD-SEED-${date}-2`,
      company_id: company1,
      user_id: userId,
      doctor_name: 'Dr. Michael Chen',
      area_name: 'Indiranagar',
      amount: 1800.00,
      status: 'submitted',
      created_at: `${date}T14:45:00Z`
    });
  }

  // Insert schedules
  const { data: sData, error: sError } = await supabase.from('visit_schedules').insert(schedules).select();
  if (sError) {
    console.error('Error inserting schedules:', sError);
  } else {
    console.log('Schedules inserted successfully:', sData.length);
  }

  // Insert orders
  const { data: oData, error: oError } = await supabase.from('orders').insert(orders).select();
  if (oError) {
    console.error('Error inserting orders:', oError);
  } else {
    console.log('Orders inserted successfully:', oData.length);
  }

  console.log('Database seeding for both dates completed successfully!');
}

seed();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Harshil/Downloads/MediKL/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function seedProducts() {
  const company1 = '11111111-1111-1111-1111-111111111111'; // PharmaCorp (pharmacorp)
  const company2 = '22222222-2222-2222-2222-222222222222'; // MediLife (medilife)

  console.log('Seeding products table in Supabase...');

  const products = [
    // Company 1 (PharmaCorp India / MediKL Pharma)
    { id: 1, company_id: company1, name: 'Cardiomax 5mg', category: 'Cardiac', unit: 'Strip of 10', price: 120.00, icon: '❤️' },
    { id: 2, company_id: company1, name: 'DermoClear Cream', category: 'Dermatology', unit: '30g Tube', price: 250.00, icon: '🧴' },
    { id: 3, company_id: company1, name: 'OmniVit Capsules', category: 'Vitamins', unit: 'Box of 30', price: 180.00, icon: '💊' },
    { id: 4, company_id: company1, name: 'GlucoShield 500mg', category: 'Anti-diabetic', unit: 'Strip of 15', price: 95.00, icon: '💉' },
    { id: 5, company_id: company1, name: 'PediCold Syrup', category: 'Pediatric', unit: '100ml Bottle', price: 65.00, icon: '🍼' },
    { id: 6, company_id: company1, name: 'BoneCalc Plus', category: 'Calcium', unit: 'Box of 60', price: 320.00, icon: '🦴' },
    
    // Company 2 (MediLife Solutions / PharmaNova Inc.)
    { id: 101, company_id: company2, name: 'NeuroCalm 10mg', category: 'Neurology', unit: 'Strip of 10', price: 185.00, icon: '🧠' },
    { id: 102, company_id: company2, name: 'ImmunoBoost Plus', category: 'Immunity', unit: 'Box of 30', price: 340.00, icon: '🛡️' },
    { id: 103, company_id: company2, name: 'GastroEase 20mg', category: 'Gastro', unit: 'Strip of 15', price: 110.00, icon: '🫃' },
    { id: 104, company_id: company2, name: 'FemCare Iron', category: 'Women Health', unit: 'Box of 60', price: 275.00, icon: '🌸' },
    { id: 105, company_id: company2, name: 'VisionPlus Drops', category: 'Ophthalmology', unit: '10ml Bottle', price: 195.00, icon: '👁️' }
  ];

  const { data, error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Error seeding products:', error);
  } else {
    console.log('Products seeded successfully. Total rows:', data.length);
  }
}

seedProducts();

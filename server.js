require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_LOCATION_FREQUENCY_SECONDS = 30;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.use((req, res, next) => {
  const start = Date.now();
  const method = req.method;
  const url = req.url;

  // Clone body to prevent side-effects, sensitive data redacting can be omitted for debug
  let bodyStr = '';
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    bodyStr = `Body: ${JSON.stringify(req.body)}`;
  }

  console.log(`[REQ] ${new Date().toISOString()} - ${method} ${url} ${bodyStr}`);

  // Intercept response methods to log status and output
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    console.log(`[RES] ${new Date().toISOString()} - ${method} ${url} -> Status ${res.statusCode} (${duration}ms) Response: ${JSON.stringify(data)}`);
    return originalJson.apply(this, arguments);
  };

  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`[RES] ${new Date().toISOString()} - ${method} ${url} -> Status ${res.statusCode} (${duration}ms)`);
    return originalSend.apply(this, arguments);
  };

  next();
});

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

function compactObject(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

const DEFAULT_USER_SETTINGS = Object.freeze({
  locationTrackingEnabled: true,
  locationFrequencySeconds: DEFAULT_LOCATION_FREQUENCY_SECONDS,
  locationRequiredForOrders: false,
});

async function fetchUserSettings(userId, companyId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('tracking_enabled, frequency_seconds, location_required_for_orders')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_USER_SETTINGS;
  }

  return {
    locationTrackingEnabled: Boolean(data.tracking_enabled),
    locationFrequencySeconds: Number(data.frequency_seconds) || DEFAULT_LOCATION_FREQUENCY_SECONDS,
    locationRequiredForOrders: Boolean(data.location_required_for_orders),
  };
}

async function fetchSettingsMap(userIds, companyId) {
  if (!Array.isArray(userIds) || userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('user_settings')
    .select('user_id, tracking_enabled, frequency_seconds, location_required_for_orders')
    .eq('company_id', companyId)
    .in('user_id', userIds);

  if (error || !Array.isArray(data)) return new Map();

  const map = new Map();
  for (const row of data) {
    map.set(row.user_id, {
      locationTrackingEnabled: Boolean(row.tracking_enabled),
      locationFrequencySeconds: Number(row.frequency_seconds) || DEFAULT_LOCATION_FREQUENCY_SECONDS,
      locationRequiredForOrders: Boolean(row.location_required_for_orders),
    });
  }
  return map;
}

function normalizeUser(row, company = {}, settings = DEFAULT_USER_SETTINGS) {
  const companyName = company.name || row.company_name || row.companyName || 'MediKL Platform';
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    company_id: row.company_id,
    role: row.role || 'employee',
    companyName: companyName,
    companyCode: company.code || row.company_id,
    locationTrackingEnabled: Boolean(settings.locationTrackingEnabled),
    locationFrequencySeconds: settings.locationFrequencySeconds || DEFAULT_LOCATION_FREQUENCY_SECONDS,
    locationRequiredForOrders: Boolean(settings.locationRequiredForOrders),
    assigned_areas: row.assigned_areas || [],
  };
}

async function resolveCompany(companyCode) {
  if (!companyCode) return { id: '', name: 'Your Company', code: '' };

  const byCode = await supabase
    .from('companies')
    .select('*')
    .or(`subdomain.eq.${companyCode},code.eq.${companyCode}`)
    .maybeSingle();

  if (byCode.data) {
    return {
      id: byCode.data.id,
      name: byCode.data.name,
      code: byCode.data.subdomain || companyCode,
    };
  }

  if (isUuid(companyCode)) {
    const byId = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyCode)
      .maybeSingle();

    if (byId.data) {
      return {
        id: byId.data.id,
        name: byId.data.name || byId.data.company_name || byId.data.title || byId.data.subdomain || byId.data.id,
        code: byId.data.subdomain || byId.data.code || byId.data.id,
      };
    }
  }

  if (companyCode === '11111111-1111-1111-1111-111111111111' || companyCode === 'MEDIKL') {
    return { id: '11111111-1111-1111-1111-111111111111', name: 'MediKL Pharma', code: 'MEDIKL' };
  }

  return { id: companyCode, name: 'Your Company', code: companyCode };
}

function buildSettingsUpdate(body) {
  const updates = compactObject({
    tracking_enabled: body.locationTrackingEnabled,
    frequency_seconds: body.locationFrequencySeconds,
    location_required_for_orders: body.locationRequiredForOrders,
  });

  if (updates.frequency_seconds !== undefined) {
    const frequency = Number(updates.frequency_seconds);
    if (!Number.isFinite(frequency) || frequency < 15) {
      const err = new Error('locationFrequencySeconds must be at least 15');
      err.statusCode = 400;
      throw err;
    }
    updates.frequency_seconds = Math.round(frequency);
  }

  return updates;
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'MediKL API is running' });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password, companyCode } = req.body;
  if (!username || !password || !companyCode) {
    return res.status(400).json({ error: 'username, password, and companyCode required' });
  }

  const company = await resolveCompany(companyCode);
  let userResult = await supabase
    .from('users_admin')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .eq('company_id', company.id)
    .maybeSingle();

  let data = userResult.data;
  let error = userResult.error;
  let userRole = 'admin';

  if (!data) {
    userResult = await supabase
      .from('users_client')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('company_id', company.id)
      .maybeSingle();
    data = userResult.data;
    error = userResult.error;
    userRole = 'user';
  }

  if (error || !data) {
    console.log(`Login failed for ${username} at company ${companyCode}: ${error ? error.message : 'User not found'}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Force the correct role in the returned data object
  data.role = userRole;

  // Use the actual company data from the join if available
  let joinedCompany = data.companies;
  if (Array.isArray(joinedCompany)) joinedCompany = joinedCompany[0];

  const actualCompany = joinedCompany ? {
    id: joinedCompany.id,
    name: joinedCompany.name || joinedCompany.company_name || joinedCompany.title || joinedCompany.id,
    code: joinedCompany.subdomain || joinedCompany.code || joinedCompany.id,
  } : company;

  const settings = await fetchUserSettings(data.id, data.company_id);
  console.log(`Login successful for ${username} (${data.name})`);
  res.json({ success: true, user: normalizeUser(data, actualCompany, settings) });
});

app.put('/api/profile', async (req, res) => {
  const { username, name, email, companyId } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });

  // Try updating in users_admin first
  let query = supabase
    .from('users_admin')
    .update({ name, email })
    .eq('username', username);

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error, count } = await query.select('id');
  
  if (error) return res.status(500).json({ error: error.message });

  if (!data || data.length === 0) {
    // If not found in admin, update users_client
    let clientQuery = supabase
      .from('users_client')
      .update({ name, email })
      .eq('username', username);

    if (companyId) clientQuery = clientQuery.eq('company_id', companyId);

    const clientRes = await clientQuery;
    if (clientRes.error) return res.status(500).json({ error: clientRes.error.message });
  }

  res.json({ success: true });
});

app.get('/api/users', async (req, res) => {
  const { companyId, role } = req.query;
  if (!companyId) return res.status(400).json({ error: 'companyId required' });

  const isQueryingAdmin = role === 'admin';
  const tableName = isQueryingAdmin ? 'users_admin' : 'users_client';

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  const rows = data || [];

  if (isQueryingAdmin) {
    res.json(rows.map(user => normalizeUser({ ...user, role: 'admin' }, {}, DEFAULT_USER_SETTINGS)));
  } else {
    const settingsMap = await fetchSettingsMap(rows.map((row) => row.id), companyId);
    res.json(rows.map(user => normalizeUser({ ...user, role: 'user' }, {}, settingsMap.get(user.id) || DEFAULT_USER_SETTINGS)));
  }
});

app.post('/api/users', async (req, res) => {
  const { employee_id, name, email, username, password, company_id } = req.body;
  if (!employee_id || !name || !email || !username || !password || !company_id) {
    return res.status(400).json({ error: 'All fields (employee_id, name, email, username, password, company_id) are required' });
  }

  // Get max ID to avoid primary key sequence constraint conflict
  const { data: maxIdResult, error: maxIdError } = await supabase
    .from('users_client')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  let nextId = 100;
  if (!maxIdError && maxIdResult && maxIdResult.length > 0) {
    nextId = maxIdResult[0].id + 1;
  }

  const { data, error } = await supabase
    .from('users_client')
    .insert([{
      id: nextId,
      employee_id,
      name,
      email,
      username,
      password,
      company_id,
      role: 'user',
      is_active: true,
      tracking_enabled: false,
      frequency_seconds: 60,
      location_required_for_orders: false,
      assigned_areas: []
    }])
    .select('*')
    .single();

  if (error) {
    console.error('Create User Error:', error);
    return res.status(500).json({ error: error.message });
  }

  const settings = await fetchUserSettings(data.id, data.company_id);
  res.json({
    success: true,
    user: normalizeUser(data, {}, settings)
  });
});

app.put('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const { employee_id, name, email, username, password, is_active } = req.body;

  const updates = compactObject({
    employee_id,
    name,
    email,
    username,
    password,
    is_active: is_active !== undefined ? Boolean(is_active) : undefined,
    updated_at: new Date().toISOString()
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data, error } = await supabase
    .from('users_client')
    .update(updates)
    .eq('id', Number(userId))
    .select('*')
    .single();

  if (error) {
    console.error('Update User Error:', error);
    return res.status(500).json({ error: error.message });
  }

  const settings = await fetchUserSettings(data.id, data.company_id);
  res.json({
    success: true,
    user: normalizeUser(data, {}, settings)
  });
});

app.delete('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;

  const { error } = await supabase
    .from('users_client')
    .delete()
    .eq('id', Number(userId));

  if (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

app.get('/api/users/:userId/settings', async (req, res) => {
  const { userId } = req.params;
  const { companyId } = req.query;

  let query = supabase
    .from('users_client')
    .select('*')
    .eq('id', userId);

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query.single();
  if (error || !data) return res.status(404).json({ error: 'User settings not found' });
  
  const company = data.companies ? {
    id: data.companies.id,
    name: data.companies.name,
    code: data.companies.subdomain || data.companies.id,
  } : await resolveCompany(data.company_id);
  const settings = await fetchUserSettings(data.id, data.company_id);
  res.json({ success: true, user: normalizeUser(data, company, settings) });
});

app.patch('/api/users/:userId/settings', async (req, res) => {
  const { userId } = req.params;
  const { companyId } = req.body;

  let updates;
  try {
    updates = buildSettingsUpdate(req.body);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'At least one setting is required' });
  }

  const existingUser = await supabase
    .from('users_client')
    .select('id, company_id')
    .eq('id', userId)
    .maybeSingle();

  if (existingUser.error || !existingUser.data) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (companyId && existingUser.data.company_id !== companyId) {
    return res.status(403).json({ error: 'User does not belong to this company' });
  }

  const upsertPayload = {
    user_id: Number(userId),
    company_id: existingUser.data.company_id,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const settingsWrite = await supabase
    .from('user_settings')
    .upsert(upsertPayload, { onConflict: 'user_id,company_id' });

  if (settingsWrite.error) {
    return res.status(500).json({ error: settingsWrite.error.message });
  }

  let query = supabase
    .from('users_client')
    .select('*')
    .eq('id', userId);

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query
    .single();

  if (error) return res.status(500).json({ error: error.message });
  const settings = await fetchUserSettings(data.id, data.company_id);
  res.json({ success: true, user: normalizeUser(data, {}, settings) });
});

app.put('/api/users/:userId/areas', async (req, res) => {
  const { userId } = req.params;
  const { companyId, assigned_areas } = req.body;

  if (!companyId || !Array.isArray(assigned_areas)) {
    return res.status(400).json({ error: 'companyId and assigned_areas array are required' });
  }

  const { data, error } = await supabase
    .from('users_client')
    .update({ assigned_areas })
    .eq('id', Number(userId))
    .eq('company_id', companyId)
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'User not found in company' });
  }

  const settings = await fetchUserSettings(userId, companyId);
  res.json({ success: true, user: normalizeUser(data[0], {}, settings) });
});

app.post('/api/location/log', async (req, res) => {
  const { userId, companyId, latitude, longitude, accuracy, employeeName } = req.body;
  const lat = Number(latitude);
  const lng = Number(longitude);
  const acc = Number(accuracy);

  if (!userId || !companyId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'userId, companyId, latitude, and longitude are required' });
  }

  const userResult = await supabase
    .from('users_client')
    .select('id, company_id, name')
    .eq('id', userId)
    .eq('company_id', companyId)
    .single();

  if (userResult.error || !userResult.data) {
    return res.status(403).json({ error: 'User does not belong to this company' });
  }

  const settings = await fetchUserSettings(userResult.data.id, userResult.data.company_id);
  if (!settings.locationTrackingEnabled) {
    return res.status(403).json({ error: 'Location tracking disabled for this user by admin' });
  }

  const { error } = await supabase
    .from('location_logs')
    .insert([{
      user_id: userId,
      company_id: companyId,
      latitude: lat,
      longitude: lng,
      accuracy: Number.isFinite(acc) ? acc : null,
      employee_name: employeeName || userResult.data.name || '',
      timestamp: new Date().toISOString(),
    }]);

  if (error) {
    console.error('Location Log Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

app.get('/api/areas', async (req, res) => {
  const { companyId, userId } = req.query;
  if (!companyId) return res.status(400).json({ error: 'companyId required' });

  const { data: areasData, error: areasError } = await supabase
    .from('areas')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (areasError) return res.status(500).json({ error: areasError.message });

  // If userId is provided, filter based on users_client.assigned_areas
  let assignedAreaIds = null;
  if (userId) {
    const { data: userData } = await supabase
      .from('users_client')
      .select('assigned_areas')
      .eq('id', Number(userId))
      .maybeSingle();
    if (userData && Array.isArray(userData.assigned_areas)) {
      assignedAreaIds = userData.assigned_areas;
    } else {
      assignedAreaIds = [];
    }
  }

  // Fetch all doctors for the company to count them
  const { data: doctorsData, error: doctorsError } = await supabase
    .from('doctors')
    .select('area_id')
    .eq('company_id', companyId);

  const doctorCounts = {};
  if (!doctorsError && doctorsData) {
    for (const doc of doctorsData) {
      const aid = doc.area_id;
      if (aid) {
        doctorCounts[aid] = (doctorCounts[aid] || 0) + 1;
      }
    }
  }

  // Pre-defined rich metadata (emoji, gradient colors) for areas to keep UI beautiful and premium
  const areaMetadata = {
    'bandra_west': { emoji: '🏙️', colors: ['#4F8EF7', '#7C5EF7'] },
    'andheri_east': { emoji: '🌆', colors: ['#22C55E', '#4F8EF7'] },
    'dadar': { emoji: '🏘️', colors: ['#F59E0B', '#EF4444'] },
    'kurla': { emoji: '🌃', colors: ['#EC4899', '#8B5CF6'] },
    'borivali': { emoji: '🌳', colors: ['#14B8A6', '#22C55E'] },
    'mulund': { emoji: '🏗️', colors: ['#F97316', '#F59E0B'] },
    'koramangala': { emoji: '☕', colors: ['#3B82F6', '#2DD4BF'] },
    'indiranagar': { emoji: '🌳', colors: ['#8B5CF6', '#D946EF'] },
    'hsr_layout': { emoji: '🏢', colors: ['#10B981', '#3B82F6'] },
    'whitefield': { emoji: '💻', colors: ['#F43F5E', '#F59E0B'] },
    'jayanagar': { emoji: '🏛️', colors: ['#14B8A6', '#4ADE80'] },
  };

  const areas = (areasData || [])
    .filter(a => !assignedAreaIds || assignedAreaIds.includes(a.id))
    .map(a => {
      const meta = areaMetadata[a.id] || areaMetadata[a.id.toLowerCase()] || { emoji: '📍', colors: ['#4F8EF7', '#7C5EF7'] };
      return {
        id: a.id,
        name: a.name,
        emoji: meta.emoji,
        doctor_count: doctorCounts[a.id] || 0,
        colors: meta.colors,
      };
    });

  res.json(areas);
});

app.get('/api/doctors', async (req, res) => {
  const { areaId, companyId, userId } = req.query;
  if (!companyId) return res.status(400).json({ error: 'companyId required' });

  // Get assigned areas if userId is provided
  let assignedAreaIds = null;
  if (userId) {
    const { data: userData } = await supabase
      .from('users_client')
      .select('assigned_areas')
      .eq('id', Number(userId))
      .maybeSingle();
    if (userData && Array.isArray(userData.assigned_areas)) {
      assignedAreaIds = userData.assigned_areas;
    } else {
      assignedAreaIds = [];
    }
  }

  let query = supabase
    .from('doctors')
    .select('*')
    .eq('company_id', companyId);

  if (areaId) {
    if (assignedAreaIds && !assignedAreaIds.includes(areaId)) {
      return res.json([]);
    }
    query = query.eq('area_id', areaId);
  } else if (assignedAreaIds) {
    query = query.in('area_id', assignedAreaIds);
  }

  const { data, error } = await query.order('name');
  if (error) return res.status(500).json({ error: error.message });

  const doctors = (data || []).map(d => ({
    id: d.id,
    name: d.name,
    specialty: d.specialty || d.specialization || 'Medical Professional',
    clinic_name: d.clinic_name || d.clinic || 'Unknown Clinic',
    latitude: d.latitude ? Number(d.latitude) : 0.0,
    longitude: d.longitude ? Number(d.longitude) : 0.0,
    initials: d.initials || String(d.name || 'DR').split(' ').map(w => w[0]).join(''),
    color: d.color || '#4F8EF7',
    area_id: d.area_id,
    is_favorite: Boolean(d.is_favorite),
  }));

  res.json(doctors);
});

// POST route to add a new doctor
app.post('/api/doctors', async (req, res) => {
  const { companyId, name, specialty, area_id, clinic_name, lat, lng } = req.body;
  // Validate area_id exists; if not, set to null to avoid FK violation
  let validAreaId = null;
  if (area_id) {
    const { data: areaData, error: areaErr } = await supabase
      .from('areas')
      .select('id')
      .eq('id', area_id)
      .maybeSingle();
    if (!areaErr && areaData) {
      validAreaId = area_id;
    }
  }
  if (!companyId || !name) {
    return res.status(400).json({ error: 'companyId and name are required' });
  }
  const { data, error } = await supabase
    .from('doctors')
    .insert([
        {
          company_id: companyId,
          name,
          specialty: specialty || '',
          ...(validAreaId && { area_id: validAreaId }),
          clinic_name: clinic_name || '',
          latitude: lat !== undefined ? Number(lat) : null,
          longitude: lng !== undefined ? Number(lng) : null,
        }
    ])
    .select('*')
    .single();
  if (error) {
    console.error('Create Doctor Error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, doctor: data });
});

app.get('/api/products', async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ error: 'companyId required' });

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });

  const products = (data || []).map(p => ({
    id: p.id,
    name: p.name,
    category: p.category || '',
    unit: p.unit || '',
    price: Number(p.price) || 0,
    icon: p.icon || '💊',
  }));

  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const { companyId, name, category, unit, price, icon } = req.body;
  if (!companyId || !name || price === undefined) {
    return res.status(400).json({ error: 'companyId, name, and price are required' });
  }

  const { data, error } = await supabase
    .from('products')
    .insert([{
      company_id: companyId,
      name,
      category: category || '',
      unit: unit || '',
      price: Number(price),
      icon: icon || '💊'
    }])
    .select('*')
    .single();

  if (error) {
    console.error('Create Product Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({
    success: true,
    product: {
      id: data.id,
      name: data.name,
      category: data.category || '',
      unit: data.unit || '',
      price: Number(data.price) || 0,
      icon: data.icon || '💊',
    }
  });
});

app.get('/api/attendance', async (req, res) => {
  const { companyId, userId, date } = req.query;
  if (!companyId) return res.status(400).json({ error: 'companyId required' });

  let query = supabase
    .from('attendances')
    .select('*')
    .eq('company_id', companyId);

  if (userId) query = query.eq('user_id', Number(userId));
  if (date) query = query.eq('visit_date', date);

  const { data, error } = await query.order('check_in_time', { ascending: false });

  if (error) {
    console.error('Get Attendance Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data || []);
});

app.post('/api/attendance', async (req, res) => {
  const { companyId, userId, userName, doctorId, doctorName, latitude, longitude, photo } = req.body;

  if (!companyId || !userId || !doctorId || !doctorName || latitude === undefined || longitude === undefined || !photo) {
    return res.status(400).json({ error: 'Missing required attendance check-in fields' });
  }

  const visitDate = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendances')
    .insert([{
      company_id: companyId,
      user_id: Number(userId),
      user_name: userName || '',
      doctor_id: doctorId,
      doctor_name: doctorName,
      visit_date: visitDate,
      latitude: Number(latitude),
      longitude: Number(longitude),
      photo: photo,
      check_in_time: new Date().toISOString()
    }])
    .select('*')
    .single();

  if (error) {
    console.error('Create Attendance Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({
    success: true,
    attendance: data
  });
});


app.get('/api/orders', async (req, res) => {
  const { companyId, userId } = req.query;
  if (!companyId) return res.status(400).json({ error: 'companyId required' });

  let query = supabase
    .from('orders')
    .select('*, users_client (name)')
    .eq('company_id', companyId);

  if (userId) {
    query = query.eq('user_id', Number(userId));
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const orders = (data || []).map(o => ({
    id: o.id,
    doctorName: o.doctor_name,
    areaName: o.area_name,
    amount: Number(o.amount) || 0,
    status: o.status || 'submitted',
    time: o.created_at,
    items: o.items || [],
    userName: o.users_client ? o.users_client.name : 'Unknown MR',
  }));

  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const { id, companyId, userId, doctorName, areaName, amount, status, time, items } = req.body;

  if (!id || !companyId || !userId || !doctorName || !areaName || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const baseRecord = {
    id,
    company_id: companyId,
    user_id: Number(userId),
    doctor_name: doctorName,
    area_name: areaName,
    amount: Number(amount),
    status: status || 'submitted',
    created_at: time || new Date().toISOString(),
  };

  // Try inserting WITH items column first
  let result = await supabase
    .from('orders')
    .insert([{ ...baseRecord, items: items || [] }])
    .select('*')
    .single();

  // If that failed (e.g. items column doesn't exist yet), retry WITHOUT items
  if (result.error) {
    console.warn('Insert with items failed, retrying without items column:', result.error.message);
    result = await supabase
      .from('orders')
      .insert([baseRecord])
      .select('*')
      .single();
  }

  if (result.error) {
    console.error('Create Order Error:', result.error);
    return res.status(500).json({ error: result.error.message });
  }

  const data = result.data;
  res.json({
    success: true,
    order: {
      id: data.id,
      doctorName: data.doctor_name,
      areaName: data.area_name,
      amount: Number(data.amount) || 0,
      status: data.status || 'submitted',
      time: data.created_at,
      items: data.items || [],
    }
  });
});

app.patch('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Update Order Status Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({
    success: true,
    order: {
      id: data.id,
      doctorName: data.doctor_name,
      areaName: data.area_name,
      amount: Number(data.amount) || 0,
      status: data.status || 'submitted',
      time: data.created_at,
      items: data.items || [],
    }
  });
});

// ─── Visit Schedules ───────────────────────────────────────────────────────
// GET    /api/visit-schedules?companyId=&userId=&date=   employee sees own; admin sees all
// POST   /api/visit-schedules                            any user creates (source in body)
// POST   /api/visit-schedules/bulk                       bulk create
// DELETE /api/visit-schedules/:id?companyId=&userId=     owner or admin can delete

app.get('/api/visit-schedules', async (req, res) => {
  const { companyId, userId, date } = req.query;
  if (!companyId) return res.status(400).json({ error: 'companyId required' });

  let query = supabase
    .from('visit_schedules')
    .select('*')
    .eq('company_id', companyId)
    .order('visit_date', { ascending: true })
    .order('source', { ascending: true }); // admin entries first, then employee

  if (userId) query = query.eq('user_id', Number(userId));
  if (date) query = query.eq('visit_date', date);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(data || []);
});

app.post('/api/visit-schedules', async (req, res) => {
  const {
    companyId, userId, doctorId, doctorName, clinic, specialty,
    visitDate, notes, source, createdBy
  } = req.body;

  if (!companyId || !userId || !doctorId || !doctorName || !visitDate) {
    return res.status(400).json({ error: 'companyId, userId, doctorId, doctorName, visitDate required' });
  }

  const resolvedSource = source === 'employee' ? 'employee' : 'admin';
  const resolvedCreatedBy = Number(createdBy) || Number(userId);

  // Prevent duplicate for same user+doctor+date+source
  const { data: existing } = await supabase
    .from('visit_schedules')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', Number(userId))
    .eq('doctor_id', String(doctorId))
    .eq('visit_date', visitDate)
    .eq('source', resolvedSource)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'Visit already scheduled for this doctor on this date' });
  }

  const { data, error } = await supabase
    .from('visit_schedules')
    .insert([{
      company_id: companyId,
      user_id: Number(userId),
      doctor_id: String(doctorId),
      doctor_name: doctorName,
      clinic: clinic || '',
      specialty: specialty || '',
      visit_date: visitDate,
      notes: notes || '',
      source: resolvedSource,
      created_by: resolvedCreatedBy,
      created_at: new Date().toISOString(),
    }])
    .select('*')
    .single();

  if (error) {
    console.error('Visit Schedule Create Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, schedule: data });
});

app.delete('/api/visit-schedules/:id', async (req, res) => {
  const { id } = req.params;
  const { companyId, userId } = req.query;

  if (!companyId) return res.status(400).json({ error: 'companyId required' });

  let query = supabase
    .from('visit_schedules')
    .delete()
    .eq('id', Number(id))
    .eq('company_id', companyId);

  // Non-admin users can only delete their own entries
  if (userId) query = query.eq('user_id', Number(userId));

  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// Bulk create — supports source and createdBy per entry
app.post('/api/visit-schedules/bulk', async (req, res) => {
  console.log('Bulk Visit Schedule Request Body:', JSON.stringify(req.body, null, 2));
  const { companyId, schedules, source, createdBy } = req.body;

  if (!companyId || !Array.isArray(schedules) || schedules.length === 0) {
    console.log('Bulk Visit Schedule: Validation failed (missing companyId or empty/invalid schedules)');
    return res.status(400).json({ error: 'companyId and schedules array required' });
  }

  const resolvedSource = source === 'employee' ? 'employee' : 'admin';

  const rows = schedules.map(s => ({
    company_id: companyId,
    user_id: Number(s.userId),
    doctor_id: String(s.doctorId),
    doctor_name: s.doctorName,
    clinic: s.clinic || '',
    specialty: s.specialty || '',
    visit_date: s.visitDate,
    notes: s.notes || '',
    source: s.source || resolvedSource,
    created_by: Number(s.createdBy || createdBy || s.userId),
    created_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('visit_schedules')
    .upsert(rows, { onConflict: 'company_id,user_id,doctor_id,visit_date,source', ignoreDuplicates: true })
    .select('*');

  if (error) {
    console.error('Bulk Visit Schedule Supabase Error:', error);
    return res.status(500).json({ error: error.message });
  }

  console.log(`Bulk Visit Schedule Success: Created ${data ? data.length : 0} new rows`);
  res.json({ success: true, created: (data || []).length });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MediKL API running on http://0.0.0.0:${PORT}`);
});

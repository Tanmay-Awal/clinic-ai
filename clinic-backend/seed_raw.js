const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'Tanawal@09',
  database: process.env.DB_DATABASE || 'clinic_db',
});

async function runSeed() {
  try {
    await client.connect();

    // Clear previous data if needed (optional, just in case)
    await client.query(`
      TRUNCATE TABLE users CASCADE;
      TRUNCATE TABLE roles CASCADE;
      TRUNCATE TABLE organisation_settings CASCADE;
      TRUNCATE TABLE doctors CASCADE;
      TRUNCATE TABLE appointments CASCADE;
      TRUNCATE TABLE calls CASCADE;
      TRUNCATE TABLE call_analyses CASCADE;
    `);

    // 1. Role
    const roleRes = await client.query(`
      INSERT INTO roles (name, description) VALUES ('admin', 'Administrator') RETURNING id;
    `);
    const roleId = roleRes.rows[0].id;

    // 2. Organisation Settings
    const orgRes = await client.query(`
      INSERT INTO organisation_settings (organisation_name, default_timezone) VALUES ('City Health Clinic', 'UTC') RETURNING id;
    `);
    const orgId = orgRes.rows[0].id;

    // 3. User
    const userRes = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role_id, organisation_id, status)
      VALUES ('test@gmail.com', '$2b$10$k67M1CAwZDqygqjn25dpn.wqZfNAHpEq9f43QKZkGmdHBdcb1C0sq', 'Test', 'User', $1, $2, 'active')
      RETURNING id;
    `, [roleId, orgId]);
    const userId = userRes.rows[0].id;

    // 4. Doctor
    const docRes = await client.query(`
      INSERT INTO doctors (name, specialization, email) VALUES ('Dr. Jane Smith', 'General Practice', 'jane.smith@clinic.local') RETURNING id;
    `);
    const docId = docRes.rows[0].id;

    // 5. Appointment
    const apptRes = await client.query(`
      INSERT INTO appointments (patient_name, patient_phone, date, time, doctor_id, status)
      VALUES ('John Doe', '+1234567890', CURRENT_DATE + INTERVAL '1 day', '10:00:00', $1, 'scheduled')
      RETURNING id;
    `, [docId]);
    const apptId = apptRes.rows[0].id;

    // 6. Calls
    const callRes1 = await client.query(`
      INSERT INTO calls (call_id, from_number, call_direction, call_duration_ms, call_start_time, call_end_time, category, appointment_id)
      VALUES ('mock-call-1', '+1987654321', 'inbound', 120000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '2 minutes', 'Appointment', $1)
      RETURNING id;
    `, [apptId]);
    const callId1 = callRes1.rows[0].id;

    // 7. Call Analysis
    await client.query(`
      INSERT INTO call_analyses (call_id, call_summary, user_sentiment)
      VALUES ($1, 'Patient called to book an appointment for tomorrow.', 'Positive');
    `, [callId1]);

    const callRes2 = await client.query(`
      INSERT INTO calls (call_id, from_number, call_direction, call_duration_ms, call_start_time, call_end_time, category)
      VALUES ('mock-call-2', '+1122334455', 'inbound', 45000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '45 seconds', 'Inquiry')
      RETURNING id;
    `);
    const callId2 = callRes2.rows[0].id;

    await client.query(`
      INSERT INTO call_analyses (call_id, call_summary, user_sentiment)
      VALUES ($1, 'Patient asked about clinic hours.', 'Neutral');
    `, [callId2]);

    console.log('Seeding completed successfully via SQL!');
  } catch (err) {
    console.error('Error seeding DB:', err);
  } finally {
    await client.end();
  }
}

runSeed();

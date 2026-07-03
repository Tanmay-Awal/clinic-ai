const { Client } = require('pg');
const client = new Client({ user: 'postgres', host: '127.0.0.1', database: 'clinic_db', password: 'Tanawal@09', port: 5432 });
client.connect().then(() => {
  return client.query('ALTER TABLE calls DROP CONSTRAINT "FK_7dff68875348b42518ded2e967a"; ALTER TABLE calls ADD CONSTRAINT "FK_7dff68875348b42518ded2e967a" FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;');
}).then(() => {
  console.log('success');
  client.end();
}).catch(e => {
  console.error(e);
  client.end();
});

const { v4: uuidv4 } = require('uuid');
const pool = require('../models/database');

function log(user, action, entityType, entityId, detail = '') {
  pool.query(
    'INSERT INTO audit_logs (id,user_id,user_name,action,entity_type,entity_id,detail) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [uuidv4(), user.id, user.name, action, entityType, entityId||'', detail]
  ).catch(console.error);
}

module.exports = { log };

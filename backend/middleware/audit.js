const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');

function log(user, action, entityType, entityId, detail = '') {
  db.run(
    'INSERT INTO audit_logs (id,user_id,user_name,action,entity_type,entity_id,detail) VALUES (?,?,?,?,?,?,?)',
    [uuidv4(), user.id, user.name, action, entityType, entityId || '', detail]
  );
}

module.exports = { log };

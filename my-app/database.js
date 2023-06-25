const { Pool } = require('pg');

const pool = new Pool({
  user: 'citus',
  host: 'c-clustnamepkfp.dsjym2j6e5ye7i.postgres.cosmos.azure.com',
  database: 'citus',
  password: 'Lato2018',
  port: 5432,
  ssl: { rejectUnauthorized: false }, // Opcjonalnie, jeśli używasz samopodpisanego certyfikatu SSL
});

module.exports = pool;
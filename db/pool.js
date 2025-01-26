// dotenv
require("dotenv").config();

// pg
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// create pool
// const pool = new Pool({
//   // url: process.env.DATABASE_URL,
//   host: "ep-snowy-term-a2l62ffx-pooler.eu-central-1.aws.neon.tech",
//   user: "kizzylion_owner",
//   password: "6MR7toaGyiwq",
//   database: "kizzylion",
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });
// const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });

// export pool
module.exports = pool;

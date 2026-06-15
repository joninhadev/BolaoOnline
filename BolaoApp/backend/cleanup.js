require('dotenv').config();
const pool = require('./db');

async function cleanup() {
  try {
    const [result] = await pool.query("DELETE FROM bets WHERE status_pagamento = 'pendente'");
    console.log('Deletados:', result.affectedRows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();

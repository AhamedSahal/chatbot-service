// db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const db = await mysql.createPool({
  port: process.env.DB_PORT,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
});

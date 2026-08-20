const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Endpoint untuk cek server jalan atau tidak
app.get('/', (req, res) => {
  res.send('Server SIA SMK MU4RA Berjalan!');
});

// Endpoint Anti-Sleep untuk Bot (cron-job.org)
app.get('/ping', async (req, res) => {
  try {
    // Lakukan query super ringan ke database
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ message: 'Pong! Database is awake.' });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

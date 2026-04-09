const express = require('express');
const cors = require('cors');
const compression = require("compression");
const authRoutes = require('./routes/authRoutes');
const posbinduRoutes = require('./routes/posbinduRoutes');
const jadwalRoutes = require('./routes/jadwalRoutes');
const notifikasiRoutes = require('./routes/notifikasiRoutes');
const pemeriksaanRoutes = require('./routes/pemeriksaanRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const edukasiRoutes = require('./routes/edukasiRoutes');
const statistikRoutes = require('./routes/statistikRoutes');
const profileRoutes = require('./routes/profileRoutes');
const helmet = require('helmet');
const { globalLimiter } = require('./middleware/rateLimiters');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.use(helmet());

app.use((req, res, next) => {
  if (req.path === "/health") return next();
  globalLimiter(req, res, next);
});

app.use(cors());
app.use(express.json());
app.use(compression());
app.use('/api/auth', authRoutes);
app.use('/api/posbindu', posbinduRoutes);
app.use('/api/jadwal', jadwalRoutes);
app.use('/api/notifikasi', notifikasiRoutes);
app.use('/api/pemeriksaan', pemeriksaanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/edukasi', edukasiRoutes);
app.use('/api/statistik', statistikRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('API is running 🚀');
});
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});


module.exports = app;

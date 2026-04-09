const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const getIpFallbackKey = (req) => ipKeyGenerator(req.ip);

const getUserOrIpKey = (req) => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  const authHeader = req.headers.authorization;

  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');

    if (scheme === 'Bearer' && token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded?.id) {
          return `user:${decoded.id}`;
        }
      } catch (_error) {
        // Fallback ke IP bila token tidak valid.
      }
    }
  }

  return getIpFallbackKey(req);
};

const getEmailOrIpKey = (req) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (email) {
    return `email:${email}`;
  }

  return getIpFallbackKey(req);
};

const createLimiter = ({ windowMs, max, keyGenerator, message }) => rateLimit({
  windowMs,
  max,
  keyGenerator,
  message: { message }
});

const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  keyGenerator: getUserOrIpKey,
  message: "Terlalu banyak request, coba lagi nanti, mohon tunggu 15 menit."
});

const loginLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  keyGenerator: getEmailOrIpKey,
  message: "Terlalu banyak percobaan login, coba lagi nanti. Mohon tunggu 5 menit."
});

const resetLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: getEmailOrIpKey,
  message: "Terlalu banyak permintaan reset password. Coba lagi 10 menit lagi."
});

const changePasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: getUserOrIpKey,
  message: "Terlalu banyak percobaan ubah password. Coba lagi 15 menit lagi."
});

module.exports = {
  globalLimiter,
  loginLimiter,
  resetLimiter,
  changePasswordLimiter,
  getUserOrIpKey,
  getEmailOrIpKey
};

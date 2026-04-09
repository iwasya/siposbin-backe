const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const routeSpecs = [
  { name: 'GET /', method: 'GET', path: '/', type: 'public' },
  { name: 'GET /health', method: 'GET', path: '/health', type: 'public' },
  { name: 'POST /api/auth/register', method: 'POST', path: '/api/auth/register', type: 'public' },
  { name: 'POST /api/auth/login', method: 'POST', path: '/api/auth/login', type: 'public' },
  { name: 'POST /api/auth/request-reset', method: 'POST', path: '/api/auth/request-reset', type: 'public' },
  { name: 'POST /api/auth/reset-password', method: 'POST', path: '/api/auth/reset-password', type: 'public' },
  { name: 'GET /api/dashboard', method: 'GET', path: '/api/dashboard', type: 'auth' },
  { name: 'GET /api/edukasi', method: 'GET', path: '/api/edukasi', type: 'auth' },
  { name: 'POST /api/edukasi', method: 'POST', path: '/api/edukasi', type: 'role12' },
  { name: 'PUT /api/edukasi/:id', method: 'PUT', path: '/api/edukasi/1', type: 'role12' },
  { name: 'DELETE /api/edukasi/:id', method: 'DELETE', path: '/api/edukasi/1', type: 'role12' },
  { name: 'GET /api/jadwal', method: 'GET', path: '/api/jadwal', type: 'auth' },
  { name: 'GET /api/jadwal/:id', method: 'GET', path: '/api/jadwal/1', type: 'auth' },
  { name: 'POST /api/jadwal', method: 'POST', path: '/api/jadwal', type: 'role12' },
  { name: 'PUT /api/jadwal/:id', method: 'PUT', path: '/api/jadwal/1', type: 'role12' },
  { name: 'DELETE /api/jadwal/:id', method: 'DELETE', path: '/api/jadwal/1', type: 'role1' },
  { name: 'GET /api/notifikasi', method: 'GET', path: '/api/notifikasi', type: 'auth' },
  { name: 'PATCH /api/notifikasi/:id/read', method: 'PATCH', path: '/api/notifikasi/1/read', type: 'auth' },
  { name: 'GET /api/notifikasi/unread-count', method: 'GET', path: '/api/notifikasi/unread-count', type: 'auth' },
  { name: 'GET /api/pemeriksaan', method: 'GET', path: '/api/pemeriksaan', type: 'role23' },
  { name: 'GET /api/pemeriksaan/:id', method: 'GET', path: '/api/pemeriksaan/1', type: 'role23' },
  { name: 'POST /api/pemeriksaan', method: 'POST', path: '/api/pemeriksaan', type: 'role23' },
  { name: 'PUT /api/pemeriksaan/:id', method: 'PUT', path: '/api/pemeriksaan/1', type: 'role23' },
  { name: 'DELETE /api/pemeriksaan/:id', method: 'DELETE', path: '/api/pemeriksaan/1', type: 'role23' },
  { name: 'GET /api/posbindu', method: 'GET', path: '/api/posbindu', type: 'public' },
  { name: 'GET /api/posbindu/:id', method: 'GET', path: '/api/posbindu/1', type: 'public' },
  { name: 'POST /api/posbindu', method: 'POST', path: '/api/posbindu', type: 'role1' },
  { name: 'PUT /api/posbindu/:id', method: 'PUT', path: '/api/posbindu/1', type: 'role1' },
  { name: 'DELETE /api/posbindu/:id', method: 'DELETE', path: '/api/posbindu/1', type: 'role1' },
  { name: 'GET /api/profile', method: 'GET', path: '/api/profile', type: 'auth' },
  { name: 'PUT /api/profile', method: 'PUT', path: '/api/profile', type: 'auth' },
  { name: 'POST /api/profile/upload-photo', method: 'POST', path: '/api/profile/upload-photo', type: 'auth' },
  { name: 'PUT /api/profile/change-password', method: 'PUT', path: '/api/profile/change-password', type: 'auth' },
  { name: 'GET /api/statistik', method: 'GET', path: '/api/statistik', type: 'auth' },
  { name: 'POST /api/users', method: 'POST', path: '/api/users', type: 'role1' },
  { name: 'GET /api/users', method: 'GET', path: '/api/users', type: 'role1' },
  { name: 'DELETE /api/users/:id', method: 'DELETE', path: '/api/users/1', type: 'role1' },
  { name: 'PUT /api/users/:id/reset-password', method: 'PUT', path: '/api/users/1/reset-password', type: 'role1' },
  { name: 'PUT /api/users/:id', method: 'PUT', path: '/api/users/1', type: 'role1' },
  { name: 'POST /api/users/save-fcm-token', method: 'POST', path: '/api/users/save-fcm-token', type: 'auth' },
  { name: 'POST /api/users/test-notif', method: 'POST', path: '/api/users/test-notif', type: 'role1' },
  { name: 'GET /api/admin/reset-logs', method: 'GET', path: '/api/admin/reset-logs', type: 'role1' },
  { name: 'GET /api/admin/reset-logs/stats', method: 'GET', path: '/api/admin/reset-logs/stats', type: 'role1' }
];

const controllerMethods = {
  '../../src/controllers/adminController.js': ['getResetLogs', 'getResetStats'],
  '../../src/controllers/authController.js': ['register', 'login', 'requestReset', 'resetPassword'],
  '../../src/controllers/dashboardController.js': ['getDashboardSummary'],
  '../../src/controllers/edukasiController.js': ['getEdukasi', 'createEdukasi', 'updateEdukasi', 'deleteEdukasi'],
  '../../src/controllers/jadwalController.js': ['getJadwal', 'getJadwalById', 'createJadwal', 'updateJadwal', 'deleteJadwal'],
  '../../src/controllers/notifikasiController.js': ['getMyNotifications', 'markAsRead', 'getUnreadCount'],
  '../../src/controllers/pemeriksaanController.js': ['createPemeriksaan', 'getPemeriksaan', 'getPemeriksaanById', 'updatePemeriksaan', 'deletePemeriksaan'],
  '../../src/controllers/posbinduController.js': ['createPosbindu', 'getAllPosbindu', 'getPosbinduById', 'updatePosbindu', 'deletePosbindu'],
  '../../src/controllers/profileController.js': ['getProfile', 'updateProfile', 'uploadProfilePhoto', 'changePassword'],
  '../../src/controllers/statistikController.js': ['getStatistik'],
  '../../src/controllers/userController.js': ['createKader', 'getAllUsers', 'deleteUser', 'resetUserPassword', 'updateUser', 'saveFcmToken', 'testNotif']
};

const routeModules = [
  { mount: '/api/auth', path: '../../src/routes/authRoutes.js' },
  { mount: '/api/posbindu', path: '../../src/routes/posbinduRoutes.js' },
  { mount: '/api/jadwal', path: '../../src/routes/jadwalRoutes.js' },
  { mount: '/api/notifikasi', path: '../../src/routes/notifikasiRoutes.js' },
  { mount: '/api/pemeriksaan', path: '../../src/routes/pemeriksaanRoutes.js' },
  { mount: '/api/dashboard', path: '../../src/routes/dashboardRoutes.js' },
  { mount: '/api/edukasi', path: '../../src/routes/edukasiRoutes.js' },
  { mount: '/api/statistik', path: '../../src/routes/statistikRoutes.js' },
  { mount: '/api/profile', path: '../../src/routes/profileRoutes.js' },
  { mount: '/api/users', path: '../../src/routes/userRoutes.js' },
  { mount: '/api/admin', path: '../../src/routes/adminRoutes.js' }
];

const makeStubHandler = (name) => (req, res) => {
  res.status(200).json({
    ok: true,
    handler: name,
    method: req.method,
    path: req.path,
    user: req.user || null
  });
};

const injectControllerStubs = () => {
  for (const [relativePath, methods] of Object.entries(controllerMethods)) {
    const modulePath = require.resolve(relativePath);
    delete require.cache[modulePath];

    const stub = {};
    for (const method of methods) {
      stub[method] = makeStubHandler(method);
    }

    require.cache[modulePath] = {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      exports: stub
    };
  }
};

const clearRouteCache = () => {
  for (const routeModule of routeModules) {
    const routePath = require.resolve(routeModule.path);
    delete require.cache[routePath];
  }
};

const createApp = () => {
  injectControllerStubs();
  clearRouteCache();

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(compression());

  for (const routeModule of routeModules) {
    app.use(routeModule.mount, require(routeModule.path));
  }

  app.get('/', (_req, res) => {
    res.send('API is running');
  });

  app.get('/health', (_req, res) => {
    res.status(200).send('OK');
  });

  return app;
};

const signToken = (role) => jwt.sign(
  { id: 123, role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const buildRequestOptions = (spec, token) => {
  const options = { method: spec.method, headers: {} };

  if (token) {
    options.headers.authorization = `Bearer ${token}`;
  }

  if (['POST', 'PUT', 'PATCH'].includes(spec.method) && spec.path !== '/api/profile/upload-photo') {
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify({ sample: true });
  }

  return options;
};

const exerciseRoute = async (context, spec, token) => {
  const response = await fetch(
    `${context.baseUrl}${spec.path}`,
    buildRequestOptions(spec, token)
  );

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return { response, body };
};

const assertAccess = async (context, spec) => {
  if (spec.type === 'public') {
    const { response, body } = await exerciseRoute(context, spec);
    assert.equal(response.status, 200, `${spec.name} harus bisa diakses publik`);
    if (spec.path === '/health') {
      assert.equal(body, 'OK');
    } else if (spec.path === '/') {
      assert.equal(body, 'API is running');
    } else {
      assert.equal(body.ok, true);
    }
    return;
  }

  const { response: unauthorizedResponse, body: unauthorizedBody } = await exerciseRoute(context, spec);
  assert.equal(unauthorizedResponse.status, 401, `${spec.name} harus menolak tanpa token`);
  assert.equal(unauthorizedBody.message, 'No token provided');

  if (spec.type === 'auth') {
    const { response, body } = await exerciseRoute(context, spec, signToken(3));
    assert.equal(response.status, 200, `${spec.name} harus lolos dengan token valid`);
    assert.equal(body.ok, true);
    return;
  }

  const roleByType = {
    role1: { denied: 3, allowed: 1 },
    role12: { denied: 3, allowed: 2 },
    role23: { denied: 1, allowed: 3 }
  };

  const access = roleByType[spec.type];
  const { response: forbiddenResponse, body: forbiddenBody } = await exerciseRoute(
    context,
    spec,
    signToken(access.denied)
  );

  assert.equal(forbiddenResponse.status, 403, `${spec.name} harus menolak role yang salah`);
  assert.equal(forbiddenBody.message, 'Akses ditolak');

  const { response: okResponse, body: okBody } = await exerciseRoute(
    context,
    spec,
    signToken(access.allowed)
  );

  assert.equal(okResponse.status, 200, `${spec.name} harus lolos untuk role yang benar`);
  assert.equal(okBody.ok, true);
};

const tests = routeSpecs.map((spec) => ({
  name: `Smoke ${spec.name}`,
  async run(context) {
    await assertAccess(context, spec);
  }
}));

tests.push({
  name: 'Auth middleware menolak header Authorization yang bukan Bearer',
  async run(context) {
    const response = await fetch(`${context.baseUrl}/api/dashboard`, {
      headers: {
        authorization: `Token ${signToken(3)}`
      }
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.message, 'Invalid authorization header');
  }
});

module.exports = tests;

module.exports.setup = async () => {
  const app = createApp();
  const server = app.listen(0);

  await new Promise((resolve) => {
    server.once('listening', resolve);
  });

  const { port } = server.address();

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`
  };
};

module.exports.teardown = async (context) => {
  if (!context?.server) {
    return;
  }

  await new Promise((resolve, reject) => {
    context.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

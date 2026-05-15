const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = require('../../src/app');

const request = async (context, path, options = {}) => {
  const response = await fetch(`${context.baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return { response, body };
};

const jsonRequest = (method, body, token = null) => {
  const headers = {
    'content-type': 'application/json'
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return {
    method,
    headers,
    body: JSON.stringify(body)
  };
};

const signToken = (payload) => {
  assert.ok(process.env.JWT_SECRET, 'JWT_SECRET wajib tersedia untuk blackbox test');
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

module.exports = [
  {
    name: 'GET /health mengembalikan status hidup server',
    async run(context) {
      const { response, body } = await request(context, '/health');

      assert.equal(response.status, 200);
      assert.equal(body, 'OK');
    }
  },
  {
    name: 'GET / mengembalikan pesan API running',
    async run(context) {
      const { response, body } = await request(context, '/');

      assert.equal(response.status, 200);
      assert.match(body, /^API is running/);
    }
  },
  {
    name: 'Endpoint protected menolak request tanpa token',
    async run(context) {
      const { response, body } = await request(context, '/api/statistik');

      assert.equal(response.status, 401);
      assert.equal(body.message, 'No token provided');
    }
  },
  {
    name: 'Endpoint protected menolak Authorization non-Bearer',
    async run(context) {
      const token = signToken({ id: 10, role: 3 });
      const { response, body } = await request(context, '/api/dashboard', {
        headers: {
          authorization: `Token ${token}`
        }
      });

      assert.equal(response.status, 401);
      assert.equal(body.message, 'Invalid authorization header');
    }
  },
  {
    name: 'Endpoint protected menolak token invalid',
    async run(context) {
      const { response, body } = await request(context, '/api/dashboard', {
        headers: {
          authorization: 'Bearer token-invalid'
        }
      });

      assert.equal(response.status, 401);
      assert.equal(body.message, 'Invalid token');
    }
  },
  {
    name: 'Endpoint admin menolak role non-admin',
    async run(context) {
      const token = signToken({ id: 10, role: 3 });
      const { response, body } = await request(context, '/api/admin/reset-logs', {
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      assert.equal(response.status, 403);
      assert.equal(body.message, 'Akses ditolak');
    }
  },
  {
    name: 'POST /api/auth/register menolak payload kosong',
    async run(context) {
      const { response, body } = await request(
        context,
        '/api/auth/register',
        jsonRequest('POST', {})
      );

      assert.equal(response.status, 400);
      assert.equal(body.message, 'Data tidak lengkap');
    }
  },
  {
    name: 'POST /api/auth/login menolak email/password kosong',
    async run(context) {
      const { response, body } = await request(
        context,
        '/api/auth/login',
        jsonRequest('POST', {})
      );

      assert.equal(response.status, 400);
      assert.equal(body.message, 'Email/No HP dan password wajib diisi');
    }
  },
  {
    name: 'POST /api/auth/request-reset menolak email kosong',
    async run(context) {
      const { response, body } = await request(
        context,
        '/api/auth/request-reset',
        jsonRequest('POST', {})
      );

      assert.equal(response.status, 400);
      assert.equal(body.message, 'Email wajib diisi');
    }
  },
  {
    name: 'POST /api/auth/reset-password menolak data tidak lengkap',
    async run(context) {
      const { response, body } = await request(
        context,
        '/api/auth/reset-password',
        jsonRequest('POST', {})
      );

      assert.equal(response.status, 400);
      assert.equal(body.message, 'Data tidak lengkap');
    }
  },
  {
    name: 'POST /api/pemeriksaan menolak tinggi badan tidak valid',
    async run(context) {
      const token = signToken({ id: 10, role: 3 });
      const { response, body } = await request(
        context,
        '/api/pemeriksaan',
        jsonRequest('POST', {
          berat_badan: 60,
          tinggi_badan: 0
        }, token)
      );

      assert.equal(response.status, 400);
      assert.equal(body.message, 'Berat & tinggi badan wajib valid');
    }
  },
  {
    name: 'POST /api/pemeriksaan menolak metrik non-angka',
    async run(context) {
      const token = signToken({ id: 10, role: 3 });
      const { response, body } = await request(
        context,
        '/api/pemeriksaan',
        jsonRequest('POST', {
          sistolik: 'abc',
          berat_badan: 60,
          tinggi_badan: 170
        }, token)
      );

      assert.equal(response.status, 400);
      assert.equal(body.message, 'Data harus angka valid');
    }
  },
  {
    name: 'Route tidak dikenal mengembalikan 404',
    async run(context) {
      const { response } = await request(context, '/api/tidak-ada');

      assert.equal(response.status, 404);
    }
  }
];

module.exports.setup = async () => {
  const externalBaseUrl = process.env.BLACKBOX_BASE_URL || process.argv[2];

  if (externalBaseUrl) {
    return {
      server: null,
      baseUrl: externalBaseUrl.replace(/\/+$/, '')
    };
  }

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

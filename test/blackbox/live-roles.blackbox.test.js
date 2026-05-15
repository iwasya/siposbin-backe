const assert = require('node:assert/strict');

const baseUrl = (process.env.BLACKBOX_BASE_URL || process.argv[2] || '')
  .replace(/\/+$/, '');

const required = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'KADER_EMAIL',
  'KADER_PASSWORD',
  'USER_EMAIL',
  'USER_PASSWORD'
];

const unique = `BLACKBOX_TEST_${Date.now()}`;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return { response, body };
};

const json = (method, body, token = null) => {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;

  return {
    method,
    headers,
    body: JSON.stringify(body)
  };
};

const auth = (token) => ({
  headers: {
    authorization: `Bearer ${token}`
  }
});

const assertStatus = (result, status, label) => {
  assert.equal(
    result.response.status,
    status,
    `${label} expected ${status}, got ${result.response.status}: ${JSON.stringify(result.body)}`
  );
};

const login = async (email, password, expectedRole) => {
  const result = await request('/api/auth/login', json('POST', { email, password }));
  assertStatus(result, 200, `login role ${expectedRole}`);
  assert.ok(result.body.token, 'response login wajib punya token');
  assert.equal(result.body.user.id_role, expectedRole);
  return result.body.token;
};

const cleanup = [];

const cleanupAll = async () => {
  while (cleanup.length > 0) {
    const task = cleanup.pop();
    try {
      await task();
    } catch (error) {
      console.error(`WARN cleanup gagal: ${error.message}`);
    }
  }
};

module.exports = [
  {
    name: 'Konfigurasi live blackbox tersedia',
    async run(context) {
      assert.ok(baseUrl, 'BLACKBOX_BASE_URL atau argumen URL wajib diisi');

      const missing = required.filter((key) => !process.env[key]);
      assert.deepEqual(missing, []);

      context.baseUrl = baseUrl;
    }
  },
  {
    name: 'Server production merespons health dan root',
    async run() {
      assertStatus(await request('/health'), 200, 'GET /health');
      assertStatus(await request('/'), 200, 'GET /');
    }
  },
  {
    name: 'Token yang diberikan masih valid untuk masing-masing role',
    async run() {
      if (process.env.ADMIN_TOKEN) {
        assertStatus(await request('/api/admin/reset-logs?page=1&limit=1', auth(process.env.ADMIN_TOKEN)), 200, 'token admin');
      }

      if (process.env.KADER_TOKEN) {
        assertStatus(await request('/api/pemeriksaan', auth(process.env.KADER_TOKEN)), 200, 'token kader');
      }

      if (process.env.USER_TOKEN) {
        assertStatus(await request('/api/profile', auth(process.env.USER_TOKEN)), 200, 'token pengguna');
      }
    }
  },
  {
    name: 'Login email/password berhasil untuk admin, kader, dan pengguna',
    async run(context) {
      context.adminToken = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, 1);
      context.kaderToken = await login(process.env.KADER_EMAIL, process.env.KADER_PASSWORD, 2);
      context.userToken = await login(process.env.USER_EMAIL, process.env.USER_PASSWORD, 3);
    }
  },
  {
    name: 'Auth dan role middleware membatasi akses sesuai role',
    async run(context) {
      assertStatus(await request('/api/statistik'), 401, 'statistik tanpa token');
      assertStatus(await request('/api/admin/reset-logs', auth(context.userToken)), 403, 'admin endpoint dengan peserta');
      assertStatus(await request('/api/users', auth(context.kaderToken)), 403, 'users endpoint dengan kader');
      assertStatus(await request('/api/pemeriksaan', auth(context.adminToken)), 403, 'pemeriksaan endpoint dengan admin');
    }
  },
  {
    name: 'Endpoint baca utama dapat diakses role yang sesuai',
    async run(context) {
      assertStatus(await request('/api/profile', auth(context.userToken)), 200, 'profile peserta');
      assertStatus(await request('/api/dashboard', auth(context.userToken)), 200, 'dashboard peserta');
      assertStatus(await request('/api/statistik', auth(context.userToken)), 200, 'statistik peserta');
      assertStatus(await request('/api/edukasi', auth(context.userToken)), 200, 'edukasi peserta');
      assertStatus(await request('/api/jadwal', auth(context.userToken)), 200, 'jadwal peserta');
      assertStatus(await request('/api/notifikasi', auth(context.userToken)), 200, 'notifikasi peserta');
      assertStatus(await request('/api/notifikasi/unread-count', auth(context.userToken)), 200, 'unread count peserta');
      assertStatus(await request('/api/posbindu'), 200, 'posbindu public');
      assertStatus(await request('/api/users?page=1&limit=5', auth(context.adminToken)), 200, 'users admin');
      assertStatus(await request('/api/admin/reset-logs?page=1&limit=5', auth(context.adminToken)), 200, 'reset logs admin');
      assertStatus(await request('/api/admin/reset-logs/stats', auth(context.adminToken)), 200, 'reset log stats admin');
    }
  },
  {
    name: 'Validasi input menolak payload tidak lengkap tanpa mengubah data',
    async run(context) {
      assertStatus(await request('/api/auth/register', json('POST', {})), 400, 'register kosong');
      assertStatus(await request('/api/auth/request-reset', json('POST', {})), 400, 'request reset kosong');
      assertStatus(await request('/api/profile', json('PUT', {}, context.userToken)), 400, 'profile kosong');
      assertStatus(await request('/api/profile/change-password', json('PUT', {}, context.userToken)), 400, 'change password kosong');
      assertStatus(await request('/api/users/save-fcm-token', json('POST', {}, context.userToken)), 400, 'save fcm kosong');
      assertStatus(await request('/api/notifikasi/0/read', { method: 'PATCH', ...auth(context.userToken) }), 404, 'mark notif tidak ada');
    }
  },
  {
    name: 'CRUD pemeriksaan peserta berjalan dan dibersihkan',
    async run(context) {
      const createResult = await request('/api/pemeriksaan', json('POST', {
        sistolik: 118,
        diastolik: 78,
        gula_darah: 110,
        kolesterol: 180,
        asam_urat: 6,
        berat_badan: 70,
        tinggi_badan: 170,
        jenis_kelamin: 'pria'
      }, context.userToken));

      assertStatus(createResult, 201, 'create pemeriksaan');
      const id = createResult.body.pemeriksaan.id_pemeriksaan;
      assert.ok(id, 'create pemeriksaan wajib mengembalikan id');

      cleanup.push(async () => {
        await request(`/api/pemeriksaan/${id}`, { method: 'DELETE', ...auth(context.userToken) });
      });

      assertStatus(await request('/api/pemeriksaan', auth(context.userToken)), 200, 'get pemeriksaan');
      assertStatus(await request(`/api/pemeriksaan/${id}`, auth(context.userToken)), 200, 'get pemeriksaan detail');
      assertStatus(await request('/api/statistik', auth(context.userToken)), 200, 'statistik setelah pemeriksaan');

      const updateResult = await request(`/api/pemeriksaan/${id}`, json('PUT', {
        sistolik: 130,
        diastolik: 85,
        gula_darah: 150,
        kolesterol: 205,
        berat_badan: 72,
        tinggi_badan: 170
      }, context.userToken));

      assertStatus(updateResult, 200, 'update pemeriksaan');

      const deleteResult = await request(`/api/pemeriksaan/${id}`, {
        method: 'DELETE',
        ...auth(context.userToken)
      });
      assertStatus(deleteResult, 200, 'delete pemeriksaan');
      cleanup.pop();
    }
  },
  {
    name: 'CRUD edukasi oleh kader berjalan dan dibersihkan',
    async run(context) {
      const createResult = await request('/api/edukasi', json('POST', {
        kategori: 'Blackbox',
        judul: unique,
        deskripsi: 'Data sementara untuk uji blackbox backend',
        target_status: 'Normal'
      }, context.kaderToken));

      assertStatus(createResult, 200, 'create edukasi');
      const id = createResult.body.data?.[0]?.id_edukasi;
      assert.ok(id, 'create edukasi wajib mengembalikan id');

      cleanup.push(async () => {
        await request(`/api/edukasi/${id}`, { method: 'DELETE', ...auth(context.kaderToken) });
      });

      assertStatus(await request(`/api/edukasi/${id}`, json('PUT', {
        kategori: 'Blackbox',
        judul: `${unique}_UPDATED`,
        deskripsi: 'Data sementara diperbarui untuk uji blackbox backend',
        target_status: 'Waspada'
      }, context.kaderToken)), 200, 'update edukasi');

      const deleteResult = await request(`/api/edukasi/${id}`, {
        method: 'DELETE',
        ...auth(context.kaderToken)
      });
      assertStatus(deleteResult, 200, 'delete edukasi');
      cleanup.pop();
    }
  },
  {
    name: 'CRUD posbindu dan jadwal oleh admin berjalan dan dibersihkan',
    async run(context) {
      const posbinduResult = await request('/api/posbindu', json('POST', {
        nama_posbindu: unique,
        alamat: 'Alamat uji blackbox',
        desa: 'Desa Uji',
        kecamatan: 'Kecamatan Uji',
        kabupaten: 'Kabupaten Uji'
      }, context.adminToken));

      assertStatus(posbinduResult, 201, 'create posbindu');
      const posbinduId = posbinduResult.body?.[0]?.id_posbindu;
      assert.ok(posbinduId, 'create posbindu wajib mengembalikan id');

      cleanup.push(async () => {
        await request(`/api/posbindu/${posbinduId}`, { method: 'DELETE', ...auth(context.adminToken) });
      });

      assertStatus(await request(`/api/posbindu/${posbinduId}`), 200, 'get detail posbindu');
      assertStatus(await request(`/api/posbindu/${posbinduId}`, json('PUT', {
        nama_posbindu: `${unique}_UPDATED`,
        alamat: 'Alamat uji blackbox update',
        desa: 'Desa Uji',
        kecamatan: 'Kecamatan Uji',
        kabupaten: 'Kabupaten Uji'
      }, context.adminToken)), 200, 'update posbindu');

      const jadwalResult = await request('/api/jadwal', json('POST', {
        id_posbindu: posbinduId,
        tanggal: '2026-12-31',
        waktu: '09:00',
        lokasi: 'Lokasi uji blackbox',
        keterangan: unique
      }, context.adminToken));

      assertStatus(jadwalResult, 201, 'create jadwal');
      const jadwalId = jadwalResult.body.jadwal?.[0]?.id_jadwal;
      assert.ok(jadwalId, 'create jadwal wajib mengembalikan id');

      cleanup.push(async () => {
        await request(`/api/jadwal/${jadwalId}`, { method: 'DELETE', ...auth(context.adminToken) });
      });

      assertStatus(await request(`/api/jadwal/${jadwalId}`, auth(context.userToken)), 200, 'get detail jadwal');
      assertStatus(await request(`/api/jadwal/${jadwalId}`, json('PUT', {
        tanggal: '2026-12-31',
        waktu: '10:00',
        lokasi: 'Lokasi uji blackbox update',
        keterangan: `${unique}_UPDATED`
      }, context.adminToken)), 200, 'update jadwal');

      const deleteJadwal = await request(`/api/jadwal/${jadwalId}`, {
        method: 'DELETE',
        ...auth(context.adminToken)
      });
      assertStatus(deleteJadwal, 200, 'delete jadwal');
      cleanup.pop();

      const deletePosbindu = await request(`/api/posbindu/${posbinduId}`, {
        method: 'DELETE',
        ...auth(context.adminToken)
      });
      assertStatus(deletePosbindu, 200, 'delete posbindu');
      cleanup.pop();
    }
  },
  {
    name: 'CRUD user oleh admin berjalan dan dibersihkan',
    async run(context) {
      const email = `${unique.toLowerCase()}@example.com`;
      const createResult = await request('/api/users', json('POST', {
        nama: unique,
        email,
        password: 'Blackbox12345',
        id_role: 3
      }, context.adminToken));

      assertStatus(createResult, 201, 'create user');
      const id = createResult.body.data?.[0]?.id_user;
      assert.ok(id, 'create user wajib mengembalikan id');

      cleanup.push(async () => {
        await request(`/api/users/${id}`, { method: 'DELETE', ...auth(context.adminToken) });
      });

      assertStatus(await request(`/api/users/${id}`, json('PUT', {
        nama: `${unique}_UPDATED`,
        email,
        password: 'BlackboxEdited12345',
        id_role: 3
      }, context.adminToken)), 200, 'update user');

      assertStatus(await request(`/api/users/${id}/reset-password`, json('PUT', {
        new_password: 'Blackbox123456'
      }, context.adminToken)), 200, 'reset password user');

      const deleteResult = await request(`/api/users/${id}`, {
        method: 'DELETE',
        ...auth(context.adminToken)
      });
      assertStatus(deleteResult, 200, 'delete user');
      cleanup.pop();
    }
  }
];

module.exports.teardown = async () => {
  await cleanupAll();
};

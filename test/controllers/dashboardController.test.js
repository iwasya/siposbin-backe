const assert = require('node:assert/strict');

const controllerPath = require.resolve('../../src/controllers/dashboardController');
const pemeriksaanControllerPath = require.resolve('../../src/controllers/pemeriksaanController');
const supabasePath = require.resolve('../../src/config/supabase');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  }
});

const loadControllerWithSupabaseMock = (supabaseMock) => {
  delete require.cache[controllerPath];
  delete require.cache[pemeriksaanControllerPath];
  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: supabaseMock
  };

  return require(controllerPath);
};

const createDashboardSupabaseMock = (statusKesehatan, rowOverride = {}) => {
  const row = {
    id_pemeriksaan: 10,
    id_user: 7,
    tanggal_pemeriksaan: '2026-06-04T01:30:00.000Z',
    created_at: '2026-06-04T01:31:00.000Z',
    interpretasi: {
      status_kesehatan: statusKesehatan
    },
    ...rowOverride
  };

  return {
    from(table) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return this;
        },
        async single() {
          assert.equal(table, 'pemeriksaan');
          return { data: row, error: null };
        },
        then(resolve) {
          return Promise.resolve({ count: 0 }).then(resolve);
        }
      };
    }
  };
};

module.exports = [
  {
    name: 'getDashboardSummary menampilkan Risiko sebagai Beresiko',
    async run() {
      const { getDashboardSummary } = loadControllerWithSupabaseMock(
        createDashboardSupabaseMock('Risiko')
      );
      const res = createResponse();

      await getDashboardSummary({ user: { id: 7 } }, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.last_check.interpretasi.status_kesehatan, 'Beresiko');
    }
  },
  {
    name: 'getDashboardSummary menampilkan Waspada sebagai Perlu Perhatian',
    async run() {
      const { getDashboardSummary } = loadControllerWithSupabaseMock(
        createDashboardSupabaseMock('Waspada')
      );
      const res = createResponse();

      await getDashboardSummary({ user: { id: 7 } }, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.last_check.interpretasi.status_kesehatan, 'Perlu Perhatian');
    }
  },
  {
    name: 'getDashboardSummary menghitung status beranda dari BMI terakhir',
    async run() {
      const { getDashboardSummary } = loadControllerWithSupabaseMock(
        createDashboardSupabaseMock('Normal', {
          bmi: 39.0625,
          interpretasi: {
            status_kesehatan: 'Normal',
            bmi_status: 'Obesitas'
          }
        })
      );
      const res = createResponse();

      await getDashboardSummary({ user: { id: 7 } }, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.last_check.interpretasi.status_kesehatan, 'Beresiko');
    }
  }
];

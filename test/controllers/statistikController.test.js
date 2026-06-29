const assert = require('node:assert/strict');

const controllerPath = require.resolve('../../src/controllers/statistikController');
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

const createStatistikSupabaseMock = () => {
  const calls = {
    select: null,
    filters: []
  };

  const rows = [{
    tanggal_pemeriksaan: '2026-06-04T01:30:00.000Z',
    created_at: '2026-06-04T01:31:00.000Z',
    sistolik: 120,
    diastolik: 80,
    gula_darah: null,
    kolesterol: 205,
    asam_urat: null,
    bmi: 27.7777777778,
    interpretasi: {
      status_kesehatan: 'Waspada',
      tekanan_darah: 'Normal',
      gula_darah: null,
      kolesterol: 'Waspada',
      asam_urat: null,
      bmi_status: 'Obesitas 1'
    }
  }];

  const supabase = {
    from(table) {
      assert.equal(table, 'pemeriksaan');

      return {
        select(value) {
          calls.select = value;
          return this;
        },
        eq(column, value) {
          calls.filters.push([column, value]);
          return this;
        },
        order() {
          return this;
        },
        then(resolve) {
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        }
      };
    }
  };

  return { supabase, calls };
};

module.exports = [
  {
    name: 'getStatistik memakai keterangan riwayat dan tiga status beranda',
    async run() {
      const { supabase, calls } = createStatistikSupabaseMock();
      const { getStatistik } = loadControllerWithSupabaseMock(supabase);

      const req = {
        user: { id: 7 }
      };
      const res = createResponse();

      await getStatistik(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(calls.filters[0][0], 'id_user');
      assert.equal(calls.filters[0][1], 7);
      assert.match(calls.select, /interpretasi/);
      assert.equal(res.body.pengecekan.status_kesehatan, 'Perlu Perhatian');
      assert.equal(res.body.pengecekan.status.kolesterol, 'Waspada');
      assert.equal(res.body.pengecekan.status.bmi_status, 'Kelebihan BB');
      assert.deepEqual(Object.keys(res.body.pengecekan.detail), [
        'tekanan_darah',
        'kolesterol',
        'bmi_status'
      ]);
    }
  }
];

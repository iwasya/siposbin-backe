const assert = require('node:assert/strict');

const controllerPath = require.resolve('../../src/controllers/pemeriksaanController');
const supabasePath = require.resolve('../../src/config/supabase');

const createResponse = () => {
  const res = {
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
  };

  return res;
};

const loadControllerWithSupabaseMock = (supabaseMock) => {
  delete require.cache[controllerPath];
  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: supabaseMock
  };

  return require(controllerPath);
};

const createCreatePemeriksaanSupabaseMock = () => {
  const calls = {
    pemeriksaanInsert: null,
    interpretasiInsert: null
  };

  const supabase = {
    from(table) {
      if (table === 'pemeriksaan') {
        return {
          insert(payload) {
            calls.pemeriksaanInsert = payload;

            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id_pemeriksaan: 99,
                        ...payload[0]
                      },
                      error: null
                    };
                  }
                };
              }
            };
          }
        };
      }

      if (table === 'interpretasi') {
        return {
          async insert(payload) {
            calls.interpretasiInsert = payload;
            return { error: null };
          }
        };
      }

      if (table === 'edukasi') {
        return {
          async select() {
            return {
              data: [
                {
                  id_edukasi: 1,
                  target_status: 'Risiko Tinggi',
                  kategori: 'Diabetes',
                  judul: 'Edukasi Diabetes',
                  deskripsi: 'Segera konsultasi tenaga medis'
                },
                {
                  id_edukasi: 2,
                  target_status: 'Normal',
                  kategori: 'Pola hidup sehat',
                  judul: 'Edukasi Umum',
                  deskripsi: 'Olahraga dan nutrisi'
                }
              ],
              error: null
            };
          }
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    }
  };

  return { supabase, calls };
};

const createUpdatePemeriksaanSupabaseMock = () => {
  const calls = {
    pemeriksaanUpdate: null,
    interpretasiUpdate: null
  };

  let pemeriksaanStage = 'fetch';

  const existing = {
    id_pemeriksaan: 10,
    id_user: 7,
    sistolik: 118,
    diastolik: 79,
    gula_darah: 110,
    kolesterol: 180,
    asam_urat: 6,
    berat_badan: 70,
    tinggi_badan: 170,
    interpretasi: {
      status_kesehatan: 'Normal'
    }
  };

  const supabase = {
    from(table) {
      if (table === 'pemeriksaan') {
        return {
          select() {
            return {
              eq() {
                return this;
              },
              async single() {
                if (pemeriksaanStage !== 'fetch') {
                  throw new Error('Unexpected select().single() call order');
                }

                pemeriksaanStage = 'update';
                return { data: existing, error: null };
              }
            };
          },
          update(payload) {
            calls.pemeriksaanUpdate = payload;

            return {
              eq() {
                return this;
              },
              select() {
                return {
                  async single() {
                    if (pemeriksaanStage !== 'update') {
                      throw new Error('Unexpected update().select().single() call order');
                    }

                    return {
                      data: {
                        id_pemeriksaan: existing.id_pemeriksaan,
                        id_user: existing.id_user,
                        ...payload
                      },
                      error: null
                    };
                  }
                };
              }
            };
          }
        };
      }

      if (table === 'interpretasi') {
        return {
          update(payload) {
            calls.interpretasiUpdate = payload;
            return {
              async eq() {
                return { error: null };
              }
            };
          }
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    }
  };

  return { supabase, calls };
};

module.exports = [
  {
    name: 'createPemeriksaan menolak tinggi badan 0 agar BMI tidak invalid',
    async run() {
      const { createPemeriksaan } = loadControllerWithSupabaseMock({
        from() {
          throw new Error('Supabase should not be called for invalid payload');
        }
      });

      const req = {
        user: { id: 7 },
        body: {
          berat_badan: 60,
          tinggi_badan: 0
        }
      };
      const res = createResponse();

      await createPemeriksaan(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(
        res.body.message,
        'Berat & tinggi badan wajib valid'
      );
    }
  },
  {
    name: 'createPemeriksaan menghitung BMI dan menyimpan interpretasi sesuai status',
    async run() {
      const { supabase, calls } = createCreatePemeriksaanSupabaseMock();
      const { createPemeriksaan } = loadControllerWithSupabaseMock(supabase);

      const req = {
        user: { id: 7 },
        body: {
          sistolik: 145,
          diastolik: 92,
          gula_darah: 210,
          kolesterol: 250,
          asam_urat: 7,
          berat_badan: 81,
          tinggi_badan: 180
        }
      };
      const res = createResponse();

      await createPemeriksaan(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.status, 'Risiko Tinggi');
      assert.ok(calls.pemeriksaanInsert);
      assert.ok(calls.interpretasiInsert);
      assert.equal(calls.interpretasiInsert[0].status_kesehatan, 'Risiko Tinggi');
      assert.equal(res.body.rekomendasi[0].id_edukasi, 1);
      assert.equal(calls.pemeriksaanInsert[0].berat_badan, 81);
      assert.equal(calls.pemeriksaanInsert[0].tinggi_badan, 180);
      assert.ok(Math.abs(calls.pemeriksaanInsert[0].bmi - 25) < 0.0001);
    }
  },
  {
    name: 'updatePemeriksaan menghitung ulang BMI dan mengubah interpretasi',
    async run() {
      const { supabase, calls } = createUpdatePemeriksaanSupabaseMock();
      const { updatePemeriksaan } = loadControllerWithSupabaseMock(supabase);

      const req = {
        params: { id: '10' },
        user: { id: 7 },
        body: {
          sistolik: 130,
          diastolik: 85,
          gula_darah: 150,
          kolesterol: 205,
          berat_badan: 90,
          tinggi_badan: 180
        }
      };
      const res = createResponse();

      await updatePemeriksaan(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(calls.pemeriksaanUpdate);
      assert.ok(Math.abs(calls.pemeriksaanUpdate.bmi - 27.7777777778) < 0.0001);
      assert.deepEqual(calls.interpretasiUpdate, {
        status_kesehatan: 'Risiko',
        tekanan_darah: 'Normal Tinggi',
        gula_darah: 'Prediabetes',
        kolesterol: 'Waspada',
        asam_urat: 'Normal',
        bmi_status: 'Obesitas 1'
      });
      assert.equal(res.body.data.interpretasi.status_kesehatan, 'Risiko');
    }
  }
];

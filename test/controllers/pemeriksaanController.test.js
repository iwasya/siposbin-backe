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
                },
                {
                  id_edukasi: 3,
                  target_status: 'Normal',
                  kategori: 'Hipertensi',
                  judul: 'Cara Mengontrol Tekanan Darah',
                  deskripsi: 'Kontrol sistolik dan diastolik secara berkala'
                },
                {
                  id_edukasi: 4,
                  target_status: 'Normal',
                  kategori: 'Diabetes',
                  judul: 'Cara Mengontrol Gula Darah',
                  deskripsi: 'Pantau gula darah dan glukosa'
                },
                {
                  id_edukasi: 5,
                  target_status: 'Normal',
                  kategori: 'Umum',
                  judul: 'Cara Mengontrol Asam Urat',
                  deskripsi: 'Kurangi purin untuk menjaga asam urat'
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

const createUpdatePemeriksaanSupabaseMock = (existingOverride = {}) => {
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
    },
    ...existingOverride
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

const createGetPemeriksaanByIdSupabaseMock = (pemeriksaanOverride = {}) => {
  const calls = {
    pemeriksaanFilters: []
  };

  const interpretasi = {
    status_kesehatan: 'Risiko',
    tekanan_darah: 'Normal Tinggi',
    gula_darah: 'Prediabetes',
    kolesterol: 'Waspada',
    asam_urat: 'Normal',
    bmi_status: 'Obesitas 1',
    ...(pemeriksaanOverride.interpretasi || {})
  };

  const pemeriksaan = {
    id_pemeriksaan: 10,
    id_user: 7,
    tanggal_pemeriksaan: '2026-06-04T01:30:00.000Z',
    created_at: '2026-06-04T01:31:00.000Z',
    sistolik: 130,
    diastolik: 85,
    gula_darah: 150,
    kolesterol: 205,
    asam_urat: 6,
    berat_badan: 90,
    tinggi_badan: 180,
    bmi: 27.7777777778,
    ...pemeriksaanOverride,
    interpretasi
  };

  const supabase = {
    from(table) {
      if (table === 'pemeriksaan') {
        return {
          select() {
            return {
              eq(column, value) {
                calls.pemeriksaanFilters.push([column, value]);
                return this;
              },
              async single() {
                return { data: pemeriksaan, error: null };
              }
            };
          }
        };
      }

      if (table === 'edukasi') {
        return {
          async select() {
            return {
              data: [
                {
                  id_edukasi: 4,
                  target_status: 'Perlu Perhatian',
                  kategori: 'Diabetes',
                  judul: 'Cara Mengontrol Gula Darah',
                  deskripsi: 'Pantau gula darah dan glukosa'
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
        'Data harus angka valid dan lebih dari 0'
      );
    }
  },
  {
    name: 'getPemeriksaanById mengembalikan detail ringkas dan pengecekan lengkap',
    async run() {
      const { supabase, calls } = createGetPemeriksaanByIdSupabaseMock();
      const { getPemeriksaanById } = loadControllerWithSupabaseMock(supabase);

      const req = {
        params: { id: '10' },
        user: { id: 7 }
      };
      const res = createResponse();

      await getPemeriksaanById(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(calls.pemeriksaanFilters, [
        ['id_pemeriksaan', '10'],
        ['id_user', 7]
      ]);
      assert.equal(res.body.penjelasan, 'Beberapa indikator menunjukkan risiko kesehatan. Disarankan konsultasi dan perbaikan gaya hidup.');
      assert.deepEqual(res.body.detail, {
        tekananDarah: 'Normal Tinggi',
        gula: 'Prediabetes',
        kol: 'Waspada',
        asam: 'Normal',
        bmiStatus: 'Kelebihan BB'
      });
      assert.equal(res.body.status_kesehatan, 'Perlu Perhatian');
      assert.equal(res.body.pengecekan.status_kesehatan, 'Perlu Perhatian');
      assert.equal(res.body.pengecekan.detail.gula_darah.status, 'Prediabetes');
      assert.equal(res.body.pengecekan.detail.bmi_status.nilai, 27.8);
      assert.equal(res.body.pengecekan.detail.bmi_status.status, 'Kelebihan BB');
      assert.equal(res.body.recommended[0].id_edukasi, 4);
    }
  },
  {
    name: 'getPemeriksaanById tidak mengembalikan detail pemeriksaan yang nilainya kosong',
    async run() {
      const { supabase } = createGetPemeriksaanByIdSupabaseMock({
        gula_darah: null,
        kolesterol: null,
        asam_urat: null,
        berat_badan: null,
        tinggi_badan: null,
        bmi: null,
        interpretasi: {
          status_kesehatan: 'Normal',
          tekanan_darah: 'Normal',
          gula_darah: null,
          kolesterol: null,
          asam_urat: null,
          bmi_status: null
        }
      });
      const { getPemeriksaanById } = loadControllerWithSupabaseMock(supabase);

      const req = {
        params: { id: '10' },
        user: { id: 7 }
      };
      const res = createResponse();

      await getPemeriksaanById(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(Object.keys(res.body.pengecekan.detail), ['tekanan_darah']);
      assert.deepEqual(Object.keys(res.body.pengecekan.status), ['tekanan_darah']);
      assert.equal(res.body.pengecekan.detail.tekanan_darah.nilai, '130/85');
      assert.equal(res.body.pengecekan.detail.tekanan_darah.status, 'Normal');
    }
  },
  {
    name: 'createPemeriksaan menolak semua kolom pemeriksaan kosong',
    async run() {
      const { createPemeriksaan } = loadControllerWithSupabaseMock({
        from() {
          throw new Error('Supabase should not be called for invalid payload');
        }
      });

      const req = {
        user: { id: 7 },
        body: {}
      };
      const res = createResponse();

      await createPemeriksaan(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(
        res.body.message,
        'Minimal satu data pemeriksaan wajib diisi'
      );
    }
  },
  {
    name: 'createPemeriksaan menolak metrik pemeriksaan bernilai 0',
    async run() {
      const { createPemeriksaan } = loadControllerWithSupabaseMock({
        from() {
          throw new Error('Supabase should not be called for invalid payload');
        }
      });

      const req = {
        user: { id: 7 },
        body: {
          sistolik: 120,
          diastolik: 80,
          gula_darah: 0,
          kolesterol: 180,
          asam_urat: 6,
          berat_badan: 60,
          tinggi_badan: 165
        }
      };
      const res = createResponse();

      await createPemeriksaan(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(
        res.body.message,
        'Data harus angka valid dan lebih dari 0'
      );
    }
  },
  {
    name: 'createPemeriksaan mengizinkan sebagian kolom pemeriksaan terisi',
    async run() {
      const { supabase, calls } = createCreatePemeriksaanSupabaseMock();
      const { createPemeriksaan } = loadControllerWithSupabaseMock(supabase);

      const req = {
        user: { id: 7 },
        body: {
          gula_darah: 110
        }
      };
      const res = createResponse();

      await createPemeriksaan(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.status, 'Normal');
      assert.equal(calls.pemeriksaanInsert[0].gula_darah, 110);
      assert.equal(calls.pemeriksaanInsert[0].sistolik, null);
      assert.equal(calls.pemeriksaanInsert[0].bmi, null);
      assert.equal(calls.interpretasiInsert[0].gula_darah, 'Normal');
      assert.equal(calls.interpretasiInsert[0].tekanan_darah, null);
      assert.equal(calls.interpretasiInsert[0].bmi_status, null);
    }
  },
  {
    name: 'createPemeriksaan hanya merekomendasikan edukasi sesuai kolom yang diisi',
    async run() {
      const { supabase } = createCreatePemeriksaanSupabaseMock();
      const { createPemeriksaan } = loadControllerWithSupabaseMock(supabase);

      const req = {
        user: { id: 7 },
        body: {
          sistolik: 120,
          diastolik: 80
        }
      };
      const res = createResponse();

      await createPemeriksaan(req, res);

      assert.equal(res.statusCode, 201);
      assert.deepEqual(
        res.body.rekomendasi.map((item) => item.id_edukasi),
        [3]
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
      assert.equal(res.body.status, 'Beresiko');
      assert.ok(calls.pemeriksaanInsert);
      assert.ok(calls.interpretasiInsert);
      assert.equal(calls.interpretasiInsert[0].status_kesehatan, 'Beresiko');
      assert.equal(res.body.rekomendasi[0].id_edukasi, 1);
      assert.equal(calls.pemeriksaanInsert[0].berat_badan, 81);
      assert.equal(calls.pemeriksaanInsert[0].tinggi_badan, 180);
      assert.ok(Math.abs(calls.pemeriksaanInsert[0].bmi - 25) < 0.0001);
    }
  },
  {
    name: 'createPemeriksaan menandai kolesterol perempuan format P waspada jika HDL rendah',
    async run() {
      const { supabase, calls } = createCreatePemeriksaanSupabaseMock();
      const { createPemeriksaan } = loadControllerWithSupabaseMock(supabase);

      const req = {
        user: { id: 7 },
        body: {
          sistolik: 118,
          diastolik: 78,
          gula_darah: 110,
          kolesterol: 180,
          hdl: 45,
          asam_urat: 5,
          berat_badan: 55,
          tinggi_badan: 160,
          jenis_kelamin: 'P'
        }
      };
      const res = createResponse();

      await createPemeriksaan(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(calls.interpretasiInsert[0].kolesterol, 'Waspada');
      assert.equal(calls.interpretasiInsert[0].status_kesehatan, 'Perlu Perhatian');
      assert.equal(res.body.detail.kol, 'Waspada');
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
        status_kesehatan: 'Perlu Perhatian',
        tekanan_darah: 'Normal Tinggi',
        gula_darah: 'Prediabetes',
        kolesterol: 'Waspada',
        asam_urat: 'Normal',
        bmi_status: 'Kelebihan BB'
      });
      assert.equal(res.body.data.interpretasi.status_kesehatan, 'Perlu Perhatian');
    }
  },
  {
    name: 'updatePemeriksaan mengizinkan satu metrik tanpa berat badan',
    async run() {
      const { supabase, calls } = createUpdatePemeriksaanSupabaseMock({
        sistolik: null,
        diastolik: null,
        gula_darah: null,
        kolesterol: null,
        asam_urat: null,
        berat_badan: null,
        tinggi_badan: null
      });
      const { updatePemeriksaan } = loadControllerWithSupabaseMock(supabase);

      const req = {
        params: { id: '10' },
        user: { id: 7 },
        body: {
          gula_darah: 110
        }
      };
      const res = createResponse();

      await updatePemeriksaan(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(calls.pemeriksaanUpdate.gula_darah, 110);
      assert.equal(calls.pemeriksaanUpdate.berat_badan, null);
      assert.equal(calls.pemeriksaanUpdate.tinggi_badan, null);
      assert.equal(calls.pemeriksaanUpdate.bmi, null);
      assert.deepEqual(calls.interpretasiUpdate, {
        status_kesehatan: 'Normal',
        tekanan_darah: null,
        gula_darah: 'Normal',
        kolesterol: null,
        asam_urat: null,
        bmi_status: null
      });
    }
  }
];

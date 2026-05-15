const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');

const controllerPath = require.resolve('../../src/controllers/userController');
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
  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: supabaseMock
  };

  return require(controllerPath);
};

const createUpdateUserSupabaseMock = () => {
  const calls = {
    update: null
  };

  const supabase = {
    from(table) {
      assert.equal(table, 'users');

      return {
        select() {
          return {
            eq() {
              return this;
            },
            async maybeSingle() {
              return {
                data: { id_user: 77 },
                error: null
              };
            }
          };
        },
        update(payload) {
          calls.update = payload;

          return {
            eq() {
              return this;
            },
            async select() {
              return {
                data: [{
                  id_user: 77,
                  ...payload
                }],
                error: null
              };
            }
          };
        }
      };
    }
  };

  return { supabase, calls };
};

module.exports = [
  {
    name: 'updateUser mengizinkan admin mengubah password saja',
    async run() {
      const { supabase, calls } = createUpdateUserSupabaseMock();
      const { updateUser } = loadControllerWithSupabaseMock(supabase);

      const req = {
        params: { id: '77' },
        body: {
          password: 'PasswordBaru123'
        }
      };
      const res = createResponse();

      await updateUser(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, 'User berhasil diperbarui');
      assert.ok(calls.update.password);
      assert.notEqual(calls.update.password, 'PasswordBaru123');
      assert.equal(await bcrypt.compare('PasswordBaru123', calls.update.password), true);
      assert.equal(calls.update.nama, undefined);
      assert.equal(calls.update.email, undefined);
    }
  },
  {
    name: 'updateUser menolak request tanpa field perubahan',
    async run() {
      const { updateUser } = loadControllerWithSupabaseMock({
        from() {
          throw new Error('Supabase should not be called for empty update');
        }
      });

      const req = {
        params: { id: '77' },
        body: {}
      };
      const res = createResponse();

      await updateUser(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, 'Tidak ada data yang diupdate');
    }
  },
  {
    name: 'updateUser menolak password kosong',
    async run() {
      const { updateUser } = loadControllerWithSupabaseMock({
        from() {
          throw new Error('Supabase should not be called for blank password');
        }
      });

      const req = {
        params: { id: '77' },
        body: {
          password: ''
        }
      };
      const res = createResponse();

      await updateUser(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.message, 'Password tidak boleh kosong');
    }
  }
];

const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');
const admin = require('../config/firebase');


exports.createKader = async (req, res) => {
  try {
    const { nama, email, password, id_posbindu } = req.body;

    if (!nama || !email || !password) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          nama,
          email,
          password: hashedPassword,
          id_role, // 🔥 KADER
          id_posbindu
        }
      ])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({
      message: "Kader berhasil dibuat",
      data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getAllUsers = async (req, res) => {
  try {

    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('users')
      .select(`
        id_user,
        nama,
        email,
        id_role,
        id_posbindu,
        posbindu (
          nama_posbindu
        )
      `, { count: 'exact' })
      .range(from, to);

    if (search) {
      query = query.ilike('nama', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      page,
      limit,
      total: count,
      total_pages: Math.ceil(count / limit),
      data
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id_user', id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "User berhasil dihapus" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ message: "Password baru wajib diisi" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const { error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id_user', id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: "Password berhasil direset" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.saveFcmToken = async (req, res) => {
  try {

    const userId = req.user.id;
    const { fcm_token } = req.body;

    if (!fcm_token || typeof fcm_token !== "string") {
      return res.status(400).json({
        message: "FCM token tidak valid"
      });
    }

    // cek token lama
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id_user", userId)
      .single();

    if (fetchError) throw fetchError;

    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    // jika token sama tidak perlu update
    if (user.fcm_token === fcm_token) {

      return res.json({
        message: "Token tidak berubah"
      });

    }

    const { error } = await supabase
      .from("users")
      .update({ fcm_token })
      .eq("id_user", userId);

    if (error) throw error;

    res.json({
      message: "FCM token berhasil diperbarui"
    });

  } catch (error) {

    console.error("Save FCM Token Error:", error);

    res.status(500).json({
      message: error.message
    });

  }
};

exports.testNotif = async (req, res) => {

  try {

    const token = req.body.token;

    await admin.messaging().send({
      token: token,
      notification: {
        title: "Test Notifikasi",
        body: "Firebase berhasil"
      }
    });

    res.json({
      message: "Notifikasi berhasil dikirim"
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};


const supabase = require('../config/supabase');

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unread } = req.query; // optional filter

    let query = supabase
      .from('notifikasi')
      .select(`
        id_notifikasi,
        judul,
        pesan,
        is_read,
        created_at,
        jadwal_posbindu (
          tanggal,
          waktu,
          posbindu (
            nama_posbindu
          )
        )
      `)
      .eq('id_user', userId)
      .order('created_at', { ascending: false })
      .limit(20); // 🔥 batasi 20 terbaru

    // Optional: hanya notif belum dibaca
    if (unread === "true") {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('id_notifikasi', id)
      .eq('id_user', userId)
      .select();

    if (error) return res.status(400).json({ error });

    res.json({ message: "Notifikasi ditandai sudah dibaca", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

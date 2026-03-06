const supabase = require('../config/supabase');

/*
========================================
GET NOTIFIKASI USER
========================================
*/
exports.getMyNotifications = async (req, res) => {
  try {

    const userId = req.user.id;
    const { unread } = req.query;

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
          lokasi,
          keterangan,
          posbindu (
            nama_posbindu
          )
        )
      `)
      .eq('id_user', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // filter notif belum dibaca
    if (unread === "true") {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json(data);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
};


/*
========================================
MARK NOTIFIKASI SEBAGAI SUDAH DIBACA
========================================
*/
exports.markAsRead = async (req, res) => {

  try {

    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('notifikasi')
      .update({
        is_read: true
      })
      .eq('id_notifikasi', id)
      .eq('id_user', userId)
      .select();

    if (error) {

      return res.status(400).json({
        error: error.message
      });

    }

    // jika tidak ada data berarti notif tidak ditemukan
    if (!data || data.length === 0) {

      return res.status(404).json({
        message: "Notifikasi tidak ditemukan atau bukan milik user"
      });

    }

    res.json({
      message: "Notifikasi berhasil ditandai sudah dibaca",
      data
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

};


/*
========================================
HITUNG JUMLAH NOTIFIKASI BELUM DIBACA
UNTUK BADGE LONCENG
========================================
*/
exports.getUnreadCount = async (req, res) => {

  try {

    const userId = req.user.id;

    const { count, error } = await supabase
      .from('notifikasi')
      .select('*', { count: 'exact', head: true })
      .eq('id_user', userId)
      .eq('is_read', false);

    if (error) {

      return res.status(400).json({
        error: error.message
      });

    }

    res.json({
      unread: count
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

};
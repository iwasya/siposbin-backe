const supabase = require('../config/supabase');

/* ================================
   GET SEMUA JADWAL
================================ */
exports.getJadwal = async (req, res) => {
  try {

    const { data, error } = await supabase
      .from('jadwal_posbindu')
      .select('*')
      .order('tanggal', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ================================
   GET JADWAL BY ID
================================ */
exports.getJadwalById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('jadwal_posbindu')
      .select('*')
      .eq('id_jadwal', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Jadwal tidak ditemukan" });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ================================
   CREATE JADWAL
================================ */
exports.createJadwal = async (req, res) => {
  try {
    const { id_posbindu, tanggal, waktu, lokasi, keterangan } = req.body;

    if (!id_posbindu || !tanggal) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const { data: jadwal, error: jadwalError } = await supabase
      .from('jadwal_posbindu')
      .insert([{
        id_posbindu,
        tanggal,
        waktu,
        lokasi,
        keterangan,
        dibuat_oleh: req.user.id
      }])
      .select()
      .single();

    if (jadwalError) {
      return res.status(400).json({ error: jadwalError.message });
    }

    // Ambil role peserta
    const { data: rolePeserta } = await supabase
      .from('roles')
      .select('id_role')
      .eq('nama_role', 'peserta')
      .single();

    if (!rolePeserta) {
      return res.status(400).json({ message: "Role peserta tidak ditemukan" });
    }

    // Ambil peserta
    const { data: users } = await supabase
      .from('users')
      .select('id_user')
      .eq('id_posbindu', id_posbindu)
      .eq('id_role', rolePeserta.id_role);

    if (users && users.length > 0) {

      const notifications = users.map(user => ({
        id_user: user.id_user,
        id_jadwal: jadwal.id_jadwal,
        judul: "Jadwal Posbindu Baru",
        pesan: `Ada jadwal Posbindu pada ${tanggal} pukul ${waktu}`,
        is_read: false
      }));

      await supabase.from('notifikasi').insert(notifications);
    }

    res.status(201).json({
      message: "Jadwal berhasil dibuat",
      total_notifikasi: users?.length || 0,
      jadwal
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ================================
   UPDATE JADWAL
================================ */
exports.updateJadwal = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal, waktu, lokasi, keterangan } = req.body;

    const { data, error } = await supabase
      .from('jadwal_posbindu')
      .update({
        tanggal,
        waktu,
        lokasi,
        keterangan
      })
      .eq('id_jadwal', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Jadwal berhasil diupdate",
      data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ================================
   DELETE JADWAL
================================ */
exports.deleteJadwal = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('jadwal_posbindu')
      .delete()
      .eq('id_jadwal', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Jadwal berhasil dihapus" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
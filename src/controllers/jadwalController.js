const supabase = require('../config/supabase');

exports.createJadwal = async (req, res) => {
  try {
    const { id_posbindu, tanggal, waktu, lokasi, keterangan } = req.body;

    if (!id_posbindu || !tanggal) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    // 1️⃣ Simpan jadwal
    const { data: jadwal, error: jadwalError } = await supabase
      .from('jadwal_posbindu')
      .insert([
        {
          id_posbindu,
          tanggal,
          waktu,
          lokasi,
          keterangan,
          dibuat_oleh: req.user.id
        }
      ])
      .select()
      .single();

    if (jadwalError) {
      console.log("Error insert jadwal:", jadwalError);
      return res.status(400).json({ error: jadwalError.message });
    }

    console.log("Jadwal berhasil dibuat:", jadwal.id_jadwal);

    // 2️⃣ Ambil ID role peserta (tidak hardcode)
    const { data: rolePeserta, error: roleError } = await supabase
      .from('roles')
      .select('id_role')
      .eq('nama_role', 'peserta')
      .single();

    if (roleError || !rolePeserta) {
      console.log("Role peserta tidak ditemukan");
      return res.status(400).json({ message: "Role peserta tidak ditemukan" });
    }

    // 3️⃣ Ambil semua peserta dalam posbindu tersebut
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id_user')
      .eq('id_posbindu', id_posbindu)
      .eq('id_role', rolePeserta.id_role);

    if (userError) {
      console.log("Error ambil users:", userError);
      return res.status(400).json({ error: userError.message });
    }

    console.log("Peserta ditemukan:", users.length);

    // 4️⃣ Buat notifikasi massal jika ada peserta
    if (users.length > 0) {
      const notifications = users.map(user => ({
        id_user: user.id_user,
        id_jadwal: jadwal.id_jadwal,
        judul: "Jadwal Posbindu Baru",
        pesan: `Ada jadwal Posbindu pada ${tanggal} pukul ${waktu}`,
        is_read: false
      }));

      const { error: notifError } = await supabase
        .from('notifikasi')
        .insert(notifications);

      if (notifError) {
        console.log("Error insert notifikasi:", notifError);
        return res.status(400).json({ error: notifError.message });
      }

      console.log("Notifikasi berhasil dibuat:", notifications.length);
    } else {
      console.log("Tidak ada peserta untuk dikirim notifikasi");
    }

    res.status(201).json({
      message: "Jadwal berhasil dibuat",
      total_notifikasi: users.length,
      jadwal
    });

  } catch (err) {
    console.log("Server Error:", err);
    res.status(500).json({ error: err.message });
  }
};

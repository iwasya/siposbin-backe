const supabase = require('../config/supabase');
const admin = require('../config/firebase');


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
   CREATE JADWAL + NOTIFIKASI + PUSH
================================ */
exports.createJadwal = async (req, res) => {

  try {

    const { id_posbindu, tanggal, waktu, lokasi, keterangan } = req.body;

    if (!tanggal || !id_posbindu) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    let daftarPosbindu = [];


    /* ================================
       MODE SEMUA POSBINDU
    ================================= */
    if (id_posbindu === "all") {

      const { data, error } = await supabase
        .from('posbindu')
        .select('id_posbindu, nama_posbindu');

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "Data posbindu tidak ditemukan" });
      }

      daftarPosbindu = data;

    }


    /* ================================
       MODE SATU POSBINDU
    ================================= */
    else {

      const { data, error } = await supabase
        .from('posbindu')
        .select('id_posbindu, nama_posbindu')
        .eq('id_posbindu', id_posbindu)
        .single();

      if (error || !data) {
        return res.status(400).json({ message: "Posbindu tidak ditemukan" });
      }

      daftarPosbindu = [data];

    }


    /* ================================
       AMBIL ROLE PESERTA
    ================================= */
    const { data: rolePeserta } = await supabase
      .from('roles')
      .select('id_role')
      .eq('nama_role', 'peserta')
      .single();

    if (!rolePeserta) {
      return res.status(400).json({ message: "Role peserta tidak ditemukan" });
    }


    let totalNotifikasi = 0;
    let hasilJadwal = [];


    /* ================================
       LOOP POSBINDU
    ================================= */
    for (const pos of daftarPosbindu) {


      /* ================================
         INSERT JADWAL
      ================================= */
      const { data: jadwal, error: jadwalError } = await supabase
        .from('jadwal_posbindu')
        .insert([{
          id_posbindu: pos.id_posbindu,
          tanggal,
          waktu,
          lokasi,
          keterangan,
          dibuat_oleh: req.user.id
        }])
        .select()
        .single();

      if (jadwalError) {
        console.log("ERROR INSERT JADWAL:", jadwalError.message);
        continue;
      }


      /* ================================
         AMBIL USER PESERTA
      ================================= */
      const { data: users } = await supabase
        .from('users')
        .select('id_user, fcm_token')
        .eq('id_posbindu', pos.id_posbindu)
        .eq('id_role', rolePeserta.id_role);


      if (users && users.length > 0) {


        /* ================================
           INSERT NOTIFIKASI DATABASE
        ================================= */
        const notifications = users.map(user => ({
          id_user: user.id_user,
          id_jadwal: jadwal.id_jadwal,
          judul: "Jadwal Posbindu Baru",
          pesan: `Ada jadwal Posbindu di ${pos.nama_posbindu} pada ${tanggal} pukul ${waktu}`,
          is_read: false
        }));

        await supabase.from('notifikasi').insert(notifications);

        totalNotifikasi += users.length;


        /* ================================
           PUSH NOTIFICATION
        ================================= */
        const tokens = users
          .map(user => user.fcm_token)
          .filter(token => token && token !== null && token !== "");

        if (tokens.length > 0) {

          try {

            const response = await admin.messaging().sendEachForMulticast({

              tokens: tokens,

              notification: {
                title: "Jadwal Posbindu Baru",
                body: `Ada jadwal Posbindu di ${pos.nama_posbindu} pada ${tanggal} pukul ${waktu}`
              },

              android: {
                priority: "high"
              }

            });

            console.log("Push success:", response.successCount);
            console.log("Push failed:", response.failureCount);

          } catch (err) {

            console.log("ERROR PUSH FCM:", err.message);

          }

        }

      }


      hasilJadwal.push({
        id_jadwal: jadwal.id_jadwal,
        nama_posbindu: pos.nama_posbindu,
        tanggal: jadwal.tanggal,
        waktu: jadwal.waktu
      });

    }


    res.status(201).json({

      message: "Jadwal berhasil dibuat",

      total_posbindu: daftarPosbindu.length,

      total_notifikasi: totalNotifikasi,

      jadwal: hasilJadwal

    });

  }

  catch (err) {

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

  }

  catch (err) {

    res.status(500).json({ error: err.message });

  }

};
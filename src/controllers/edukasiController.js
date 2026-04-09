const supabase = require('../config/supabase');

exports.getEdukasi = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Cek apakah user pernah pemeriksaan
    const { data: lastCheck, error: checkError } = await supabase
      .from('pemeriksaan')
      .select(`
        interpretasi (
          status_kesehatan
        )
      `)
      .eq('id_user', userId)
      .order('tanggal_pemeriksaan', { ascending: false })
      .limit(1)
      .maybeSingle(); // 🔥 pakai maybeSingle biar tidak error kalau kosong

    if (checkError) {
      return res.status(400).json({ error: checkError.message });
    }

    // ===============================
    // 🔥 KALAU BELUM ADA PEMERIKSAAN
    // ===============================
    if (!lastCheck || !lastCheck.interpretasi) {

      const { data: allEdukasi, error } = await supabase
        .from('edukasi')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({
        status_user: null,
        recommended: [],
        all_edukasi: allEdukasi || []
      });
    }

    // ===============================
    // 🔥 KALAU SUDAH ADA PEMERIKSAAN
    // ===============================
    const status = lastCheck.interpretasi.status_kesehatan;

    // Ambil recommended
    const { data: recommended, error: recError } = await supabase
      .from('edukasi')
      .select('*')
      .eq('target_status', status)
      .order('created_at', { ascending: false });

    if (recError) {
      return res.status(400).json({ error: recError.message });
    }

    const recommendedIds = recommended.map(item => item.id_edukasi);

    let allQuery = supabase
      .from('edukasi')
      .select('*')
      .order('created_at', { ascending: false });

    if (recommendedIds.length > 0) {
      allQuery = allQuery.not('id_edukasi', 'in', `(${recommendedIds.join(',')})`);
    }

    const { data: allEdukasi, error: allError } = await allQuery;

    if (allError) {
      return res.status(400).json({ error: allError.message });
    }

    res.json({
      status_user: status,
      recommended: recommended || [],
      all_edukasi: allEdukasi || []
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEdukasi = async (req, res) => {
  try {

    const {
      kategori,
      judul,
      deskripsi,
      target_status
    } = req.body;

    const { data, error } = await supabase
      .from('edukasi')
      .insert([
        {
          kategori: kategori,
          judul: judul,
          deskripsi: deskripsi,
          target_status: target_status
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Edukasi berhasil ditambahkan",
      data: data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ===============================
// UPDATE EDUKASI
// ===============================
exports.updateEdukasi = async (req, res) => {
  try {

    const id = req.params.id;

    const {
      kategori,
      judul,
      deskripsi,
      target_status
    } = req.body;

    const { data, error } = await supabase
      .from('edukasi')
      .update({
        kategori,
        judul,
        deskripsi,
        target_status
      })
      .eq('id_edukasi', id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Edukasi berhasil diperbarui",
      data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ===============================
// DELETE EDUKASI
// ===============================
exports.deleteEdukasi = async (req, res) => {
  try {

    const id = req.params.id;

    const { error } = await supabase
      .from('edukasi')
      .delete()
      .eq('id_edukasi', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Edukasi berhasil dihapus"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


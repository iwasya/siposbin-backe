const supabase = require('../config/supabase');

/* =================================
   CREATE PEMERIKSAAN
================================= */
exports.createPemeriksaan = async (req, res) => {
  try {
    const {
      sistolik = 0,
      diastolik = 0,
      gula_darah = 0,
      kolesterol = 0,
      asam_urat = 0,
      berat_badan,
      tinggi_badan
    } = req.body;

    const id_user = req.user.id;

    if (!berat_badan || !tinggi_badan) {
      return res.status(400).json({
        message: "Berat & tinggi badan wajib diisi"
      });
    }

    // ==============================
    // Hitung BMI
    // ==============================
    const tinggiMeter = tinggi_badan / 100;
    const bmi = berat_badan / (tinggiMeter * tinggiMeter);

    // ==============================
    // Tentukan Status
    // ==============================
    let status = "Normal";

    if (
      sistolik >= 140 ||
      diastolik >= 90 ||
      gula_darah >= 200 ||
      kolesterol >= 240
    ) {
      status = "Risiko";
    } else if (
      sistolik >= 120 ||
      diastolik >= 80 ||
      gula_darah >= 140 ||
      kolesterol >= 200
    ) {
      status = "Waspada";
    }

    const cleanStatus = status.trim();

    // ==============================
    // Simpan Pemeriksaan
    // ==============================
    const { data: pemeriksaan, error: periksaError } = await supabase
      .from('pemeriksaan')
      .insert([{
        id_user,
        tanggal_pemeriksaan: new Date(),
        sistolik,
        diastolik,
        gula_darah,
        kolesterol,
        asam_urat,
        berat_badan,
        tinggi_badan,
        bmi,
        created_by: id_user
      }])
      .select()
      .single();

    if (periksaError) {
      return res.status(400).json({
        error: periksaError.message
      });
    }

    // ==============================
    // Simpan Interpretasi
    // ==============================
    await supabase
      .from('interpretasi')
      .insert([{
        id_pemeriksaan: pemeriksaan.id_pemeriksaan,
        status_kesehatan: cleanStatus
      }]);

    // ==============================
    // Ambil Edukasi Recommended
    // ==============================
    const { data: recommended, error: recError } = await supabase
      .from('edukasi')
      .select('*')
      .ilike('target_status', cleanStatus);

    if (recError) {
      return res.status(400).json({
        error: recError.message
      });
    }

    // ==============================
    // Ambil Edukasi Lainnya
    // ==============================
    const { data: allEdukasi, error: allError } = await supabase
      .from('edukasi')
      .select('*')
      .not('target_status', 'ilike', cleanStatus);

    if (allError) {
      return res.status(400).json({
        error: allError.message
      });
    }

    // ==============================
    // RESPONSE FINAL
    // ==============================
    res.status(201).json({
      message: "Pemeriksaan berhasil disimpan",
      status_user: cleanStatus,
      recommended: recommended || [],
      all_edukasi: allEdukasi || [],
      pemeriksaan
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};



/* =================================
   GET RIWAYAT PEMERIKSAAN
================================= */
exports.getPemeriksaan = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Ambil pemeriksaan + status
    const { data: pemeriksaan, error } = await supabase
      .from('pemeriksaan')
      .select(`
        *,
        interpretasi (
          status_kesehatan
        )
      `)
      .eq('id_user', userId)
      .order('tanggal_pemeriksaan', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // 2️⃣ Loop setiap pemeriksaan dan tambahkan edukasi
    const result = await Promise.all(
      pemeriksaan.map(async (item) => {
        const status = item.interpretasi?.status_kesehatan;

        // Ambil recommended
        const { data: recommended } = await supabase
          .from('edukasi')
          .select('*')
          .ilike('target_status', status);

        return {
          ...item,
          recommended: recommended || []
        };
      })
    );

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



/* =================================
   UPDATE PEMERIKSAAN
================================= */
exports.updatePemeriksaan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sistolik,
      diastolik,
      gula_darah,
      kolesterol,
      asam_urat,
      berat_badan,
      tinggi_badan
    } = req.body;

    const { data, error } = await supabase
      .from('pemeriksaan')
      .update({
        sistolik,
        diastolik,
        gula_darah,
        kolesterol,
        asam_urat,
        berat_badan,
        tinggi_badan
      })
      .eq('id_pemeriksaan', id)
      .eq('id_user', req.user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({
        message: "Pemeriksaan tidak ditemukan"
      });
    }

    res.json({
      message: "Pemeriksaan berhasil diupdate",
      data
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};



/* =================================
   DELETE PEMERIKSAAN
================================= */
exports.deletePemeriksaan = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('pemeriksaan')
      .delete()
      .eq('id_pemeriksaan', id)
      .eq('id_user', req.user.id);

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json({
      message: "Pemeriksaan berhasil dihapus"
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};
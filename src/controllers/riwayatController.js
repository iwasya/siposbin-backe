const supabase = require('../config/supabase');

/* =========================
   VALIDATION
========================= */
const STATUS_PENYAKIT = ['Masih dalam pengobatan', 'Kontrol rutin', 'Sudah sembuh'];
const TINGKAT_KEPATUHAN = ['Patuh', 'Kadang lupa', 'Tidak patuh'];

const validateStatusPenyakit = (value) => {
  const normalized = String(value || '').trim();
  return STATUS_PENYAKIT.includes(normalized) ? normalized : null;
};

const validateTingkatKepatuhan = (value) => {
  const normalized = String(value || '').trim();
  return TINGKAT_KEPATUHAN.includes(normalized) ? normalized : null;
};

/* =========================
   CREATE PENYAKIT + PENOGERATAN
========================= */
exports.createRiwayatPenyakit = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      nama_penyakit,
      tanggal_diagnosis,
      status_penyakit,
      pengobatan = []
    } = req.body;

    if (!nama_penyakit?.trim()) {
      return res.status(400).json({ message: 'Nama penyakit wajib diisi' });
    }

    const validatedStatus = validateStatusPenyakit(status_penyakit);
    if (!validatedStatus) {
      return res.status(400).json({
        message: `Status penyakit tidak valid. Pilih: ${STATUS_PENYAKIT.join(', ')}`
      });
    }

    // Simpan penyakit dulu
    const { data: penyakit, error: penyakitError } = await supabase
      .from('riwayat_penyakit')
      .insert([{
        id_user: userId,
        nama_penyakit: nama_penyakit.trim(),
        tanggal_diagnosis: tanggal_diagnosis || null,
        status_penyakit: validatedStatus
      }])
      .select()
      .single();

    if (penyakitError) {
      return res.status(400).json({ error: penyakitError.message });
    }

    // Simpan pengobatan jika ada
    let obatData = [];
    if (Array.isArray(pengobatan) && pengobatan.length > 0) {
      for (const obat of pengobatan) {
        const masihMengonsumsi = obat.masih_mengonsumsi_obat === true || obat.masih_mengonsumsi_obat === 'true';
        const tingkatKepatuhan = validateTingkatKepatuhan(obat.tingkat_kepatuhan);
        const alasan = obat.alasan_tidak_patuh?.trim() || null;

        // Alasan wajib jika kepatuhan "Kadang lupa" atau "Tidak patuh"
        if ((tingkatKepatuhan === 'Kadang lupa' || tingkatKepatuhan === 'Tidak patuh') && !alasan) {
          return res.status(400).json({
            message: 'Alasan tidak patuh wajib diisi jika kepatuhan "Kadang lupa" atau "Tidak patuh"'
          });
        }

        obatData.push({
          id_user: userId,
          id_penyakit: penyakit.id,
          nama_obat: obat.nama_obat?.trim(),
          masih_mengonsumsi_obat: masihMengonsumsi,
          tingkat_kepatuhan: masihMengonsumsi && tingkatKepatuhan ? tingkatKepatuhan : null,
          alasan_tidak_patuh: masihMengonsumsi && alasan ? alasan : null
        });
      }
    }

    if (obatData.length > 0) {
      const { error: obatError } = await supabase
        .from('riwayat_pengobatan')
        .insert(obatData);

      if (obatError) {
        return res.status(400).json({ error: obatError.message });
      }
    }

    // Ambil kembali lengkap
    const { data: lengkap, error: fetchError } = await supabase
      .from('riwayat_penyakit')
      .select('*, riwayat_pengobatan(*)')
      .eq('id', penyakit.id)
      .single();

    if (fetchError) {
      return res.status(400).json({ error: fetchError.message });
    }

    res.status(201).json({
      message: 'Riwayat penyakit berhasil disimpan',
      data: lengkap
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================
   GET SEMUA RIWAYAT USER
========================= */
exports.getRiwayatPenyakit = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('riwayat_penyakit')
      .select('*, riwayat_pengobatan(*)')
      .eq('id_user', userId)
      .order('tanggal_diagnosis', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================
   UPDATE PENYAKIT
========================= */
exports.updateRiwayatPenyakit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      nama_penyakit,
      tanggal_diagnosis,
      status_penyakit,
      pengobatan = []
    } = req.body;

    // Cek ownership
    const { data: existing, error: fetchError } = await supabase
      .from('riwayat_penyakit')
      .select('id')
      .eq('id', id)
      .eq('id_user', userId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: 'Riwayat penyakit tidak ditemukan' });
    }

    const updateFields = {};
    if (nama_penyakit !== undefined) updateFields.nama_penyakit = nama_penyakit.trim();
    if (tanggal_diagnosis !== undefined) updateFields.tanggal_diagnosis = tanggal_diagnosis || null;

    if (status_penyakit !== undefined) {
      const validated = validateStatusPenyakit(status_penyakit);
      if (!validated) {
        return res.status(400).json({
          message: `Status penyakit tidak valid. Pilih: ${STATUS_PENYAKIT.join(', ')}`
        });
      }
      updateFields.status_penyakit = validated;
    }

    if (Object.keys(updateFields).length > 0) {
      const { error: updateError } = await supabase
        .from('riwayat_penyakit')
        .update(updateFields)
        .eq('id', id);

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }
    }

    // Replace pengobatan: hapus lama, simpan baru
    if (Array.isArray(pengobatan)) {
      await supabase
        .from('riwayat_pengobatan')
        .delete()
        .eq('id_penyakit', id);

      const obatData = pengobatan
        .filter(o => o.nama_obat?.trim())
        .map(o => {
          const masihMengonsumsi = o.masih_mengonsumsi_obat === true || o.masih_mengonsumsi_obat === 'true';
          const tingkatKepatuhan = validateTingkatKepatuhan(o.tingkat_kepatuhan);
          const alasan = o.alasan_tidak_patuh?.trim() || null;

          if ((tingkatKepatuhan === 'Kadang lupa' || tingkatKepatuhan === 'Tidak patuh') && !alasan) {
            throw new Error(`Alasan tidak patuh wajib diisi untuk obat: ${o.nama_obat}`);
          }

          return {
            id_user: userId,
            id_penyakit: id,
            nama_obat: o.nama_obat.trim(),
            masih_mengonsumsi_obat: masihMengonsumsi,
            tingkat_kepatuhan: masihMengonsumsi && tingkatKepatuhan ? tingkatKepatuhan : null,
            alasan_tidak_patuh: masihMengonsumsi && alasan ? alasan : null
          };
        });

      if (obatData.length > 0) {
        const { error: obatError } = await supabase
          .from('riwayat_pengobatan')
          .insert(obatData);

        if (obatError) {
          return res.status(400).json({ error: obatError.message });
        }
      }
    }

    // Ambil hasil akhir
    const { data: result, error: fetchResultError } = await supabase
      .from('riwayat_penyakit')
      .select('*, riwayat_pengobatan(*)')
      .eq('id', id)
      .single();

    if (fetchResultError) {
      return res.status(400).json({ error: fetchResultError.message });
    }

    res.json({
      message: 'Riwayat penyakit berhasil diperbarui',
      data: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* =========================
   DELETE PENYAKIT
========================= */
exports.deleteRiwayatPenyakit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('riwayat_penyakit')
      .delete()
      .eq('id', id)
      .eq('id_user', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Riwayat penyakit berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

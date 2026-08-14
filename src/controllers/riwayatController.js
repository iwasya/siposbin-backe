const supabase = require('../config/supabase');

/* =========================
   VALIDATION
========================= */
const STATUS_PENYAKIT = ['Masih dalam pengobatan', 'Kontrol rutin', 'Sudah sembuh'];
const TINGKAT_KEPATUHAN = ['Patuh', 'Kadang lupa', 'Tidak patuh'];

const validationError = (message) => Object.assign(new Error(message), { statusCode: 400 });

const validateStatusPenyakit = (value) => {
  const normalized = String(value || '').trim();
  return STATUS_PENYAKIT.includes(normalized) ? normalized : null;
};

const validateTingkatKepatuhan = (value) => {
  const normalized = String(value || '').trim();
  return TINGKAT_KEPATUHAN.includes(normalized) ? normalized : null;
};

const normalizePengobatanInput = (pengobatan = []) => {
  if (!Array.isArray(pengobatan)) return [];

  return pengobatan
    .filter(obat => obat?.nama_obat?.trim())
    .map(obat => {
      const masihMengonsumsi = obat.masih_mengonsumsi_obat === true || obat.masih_mengonsumsi_obat === 'true';
      const tingkatKepatuhan = validateTingkatKepatuhan(obat.tingkat_kepatuhan);
      const alasan = obat.alasan_tidak_patuh?.trim() || null;

      if (masihMengonsumsi && !tingkatKepatuhan) {
        throw validationError(`Tingkat kepatuhan tidak valid. Pilih: ${TINGKAT_KEPATUHAN.join(', ')}`);
      }

      if ((tingkatKepatuhan === 'Kadang lupa' || tingkatKepatuhan === 'Tidak patuh') && !alasan) {
        throw validationError('Alasan tidak patuh wajib diisi jika kepatuhan "Kadang lupa" atau "Tidak patuh"');
      }

      return {
        nama_obat: obat.nama_obat.trim(),
        masih_mengonsumsi_obat: masihMengonsumsi,
        tingkat_kepatuhan: masihMengonsumsi ? tingkatKepatuhan : null,
        alasan_tidak_patuh: masihMengonsumsi ? alasan : null
      };
    });
};

const normalizeRiwayatPenyakitInput = (input = {}) => {
  const {
    nama_penyakit,
    tanggal_diagnosis,
    status_penyakit,
    pengobatan = []
  } = input;

  if (!nama_penyakit?.trim()) {
    throw validationError('Nama penyakit wajib diisi');
  }

  const validatedStatus = validateStatusPenyakit(status_penyakit);
  if (!validatedStatus) {
    throw validationError(`Status penyakit tidak valid. Pilih: ${STATUS_PENYAKIT.join(', ')}`);
  }

  return {
    penyakit: {
      nama_penyakit: nama_penyakit.trim(),
      tanggal_diagnosis: tanggal_diagnosis || null,
      status_penyakit: validatedStatus
    },
    pengobatan: normalizePengobatanInput(pengobatan)
  };
};

const createRiwayatPenyakitRecord = async (userId, input) => {
  const normalized = normalizeRiwayatPenyakitInput(input);

  const { data: penyakit, error: penyakitError } = await supabase
    .from('riwayat_penyakit')
    .insert([{
      id_user: userId,
      ...normalized.penyakit
    }])
    .select()
    .single();

  if (penyakitError) {
    throw Object.assign(penyakitError, { statusCode: 400 });
  }

  const obatData = normalized.pengobatan.map(obat => ({
    id_user: userId,
    id_penyakit: penyakit.id,
    ...obat
  }));

  if (obatData.length > 0) {
    const { error: obatError } = await supabase
      .from('riwayat_pengobatan')
      .insert(obatData);

    if (obatError) {
      throw Object.assign(obatError, { statusCode: 400 });
    }
  }

  const { data: lengkap, error: fetchError } = await supabase
    .from('riwayat_penyakit')
    .select('*, riwayat_pengobatan(*)')
    .eq('id', penyakit.id)
    .single();

  if (fetchError) {
    throw Object.assign(fetchError, { statusCode: 400 });
  }

  return lengkap;
};

/* =========================
   CREATE PENYAKIT + PENGOBATAN
========================= */
exports.createRiwayatPenyakit = async (req, res) => {
  try {
    const lengkap = await createRiwayatPenyakitRecord(req.user.id, req.body);

    res.status(201).json({
      message: 'Riwayat penyakit berhasil disimpan',
      data: lengkap
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json(status === 400 ? { message: err.message } : { error: err.message });
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
    if (nama_penyakit !== undefined) {
      if (!nama_penyakit?.trim()) {
        return res.status(400).json({ message: 'Nama penyakit wajib diisi' });
      }
      updateFields.nama_penyakit = nama_penyakit.trim();
    }
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
      const obatData = normalizePengobatanInput(pengobatan).map(obat => ({
        id_user: userId,
        id_penyakit: id,
        ...obat
      }));

      await supabase
        .from('riwayat_pengobatan')
        .delete()
        .eq('id_penyakit', id);

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
    const status = err.statusCode || 500;
    res.status(status).json(status === 400 ? { message: err.message } : { error: err.message });
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

exports._helpers = {
  createRiwayatPenyakitRecord,
  normalizeRiwayatPenyakitInput
};

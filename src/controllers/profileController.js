const supabase = require('../config/supabase');
const sharp = require('sharp');
const bcrypt = require('bcrypt');

const normalizeJenisKelamin = (value) => {
  const normalized = String(value || '').toLowerCase().trim();

  if (['l', 'laki-laki', 'laki laki', 'pria'].includes(normalized)) {
    return 'L';
  }

  if (['p', 'perempuan', 'wanita'].includes(normalized)) {
    return 'P';
  }

  return null;
};

const getJenisKelaminLabel = (value) => {
  const normalized = normalizeJenisKelamin(value);

  if (normalized === 'L') return 'Laki-laki';
  if (normalized === 'P') return 'Perempuan';

  return null;
};

const buildProfileResponse = (data) => ({
  id_user: data.id_user,
  nama: data.nama,
  email: data.email,
  usia: data.usia,
  jenis_kelamin: normalizeJenisKelamin(data.jenis_kelamin) || data.jenis_kelamin,
  jenis_kelamin_label: getJenisKelaminLabel(data.jenis_kelamin),
  no_hp: data.no_hp,
  alamat: data.alamat,
  foto_profil: data.foto_profil,
  id_role: data.id_role,
  id_posbindu: data.id_posbindu,
  nama_posbindu: data.posbindu?.nama_posbindu || null
});


// ======================
// GET PROFILE
// ======================
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('users')
      .select(`
        id_user,
        nama,
        email,
        usia,
        jenis_kelamin,
        no_hp,
        alamat,
        foto_profil,
        id_role,
        id_posbindu,
        posbindu (
          nama_posbindu
        )
      `)
      .eq('id_user', userId)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(buildProfileResponse(data));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ======================
// UPDATE PROFILE
// ======================
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      nama,
      usia,
      jenis_kelamin,
      no_hp,
      alamat,
      id_posbindu,
      foto_profil
    } = req.body;

    let updateData = {};

    if (nama !== undefined) updateData.nama = nama;
    if (usia !== undefined) updateData.usia = usia;
    if (jenis_kelamin !== undefined) {
      const normalizedJenisKelamin = normalizeJenisKelamin(jenis_kelamin);

      if (!normalizedJenisKelamin) {
        return res.status(400).json({
          message: "Jenis kelamin harus L atau P"
        });
      }

      updateData.jenis_kelamin = normalizedJenisKelamin;
    }
    if (no_hp !== undefined) updateData.no_hp = no_hp;
    if (alamat !== undefined) updateData.alamat = alamat;
    if (id_posbindu !== undefined) updateData.id_posbindu = id_posbindu;
    if (foto_profil !== undefined) updateData.foto_profil = foto_profil;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Tidak ada data yang diupdate" });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id_user', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Profile berhasil diperbarui",
      data: buildProfileResponse(data)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ======================
// UPLOAD FOTO
// ======================
exports.uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "File tidak ditemukan" });
    }

    const compressedImage = await sharp(req.file.buffer)
      .resize(400, 400, { fit: "cover" })
      .jpeg({ quality: 70 })
      .toBuffer();

    const fileName = `user-${userId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('PROFILE-IMAGES')
      .upload(fileName, compressedImage, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      return res.status(400).json({ error: uploadError.message });
    }

    const { data: publicUrlData } = supabase.storage
      .from('PROFILE-IMAGES')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from('users')
      .update({ foto_profil: publicUrl })
      .eq('id_user', userId);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({
      message: "Foto berhasil diupload & dikompres",
      foto_profil: publicUrl
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ======================
// CHANGE PASSWORD
// ======================
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('password')
      .eq('id_user', userId)
      .single();

    if (error || !user) {
      return res.status(400).json({ message: "User tidak ditemukan" });
    }

    const isMatch = await bcrypt.compare(old_password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Password lama salah" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id_user', userId);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ message: "Password berhasil diubah" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const supabase = require('../config/supabase');
const sharp = require('sharp');
const bcrypt = require('bcrypt');


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
        posbindu (
          nama_posbindu
        )
      `)
      .eq('id_user', userId)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Format ulang response supaya lebih rapi
    res.json({
      id_user: data.id_user,
      nama: data.nama,
      email: data.email,
      usia: data.usia,
      jenis_kelamin: data.jenis_kelamin,
      no_hp: data.no_hp,
      alamat: data.alamat,
      foto_profil: data.foto_profil,
      id_role: data.id_role,
      nama_posbindu: data.posbindu?.nama_posbindu || null
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { nama, usia, jenis_kelamin, no_hp, alamat } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({
        nama,
        usia,
        jenis_kelamin,
        no_hp,
        alamat
      })
      .eq('id_user', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: "Profile berhasil diperbarui",
      data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: "File tidak ditemukan" });
    }

    // Kompres & resize
    const compressedImage = await sharp(req.file.buffer)
      .resize(400, 400, { fit: "cover" }) // resize jadi 400x400
      .jpeg({ quality: 70 }) // compress kualitas 70%
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

    await supabase
      .from('users')
      .update({ foto_profil: publicUrl })
      .eq('id_user', userId);

    res.json({
      message: "Foto berhasil diupload & dikompres",
      foto_profil: publicUrl
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const { data: user } = await supabase
      .from('users')
      .select('password')
      .eq('id_user', userId)
      .single();

    const isMatch = await bcrypt.compare(old_password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Password lama salah" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id_user', userId);

    res.json({ message: "Password berhasil diubah" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const supabase = require('../config/supabase');

// ===============================
// CREATE POSBINDU
// ===============================
exports.createPosbindu = async (req, res) => {

  const { nama_posbindu, alamat, desa, kecamatan, kabupaten } = req.body;

  const { data, error } = await supabase
    .from('posbindu')
    .insert([
      {
        nama_posbindu,
        alamat,
        desa,
        kecamatan,
        kabupaten
      }
    ])
    .select();

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json(data);
};


// ===============================
// GET ALL POSBINDU
// ===============================
exports.getAllPosbindu = async (req, res) => {

  const { data, error } = await supabase
    .from('posbindu')
    .select('*')
    .order('id_posbindu', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
};


// ===============================
// GET POSBINDU BY ID
// ===============================
exports.getPosbinduById = async (req, res) => {

  const id = req.params.id;

  const { data, error } = await supabase
    .from('posbindu')
    .select('*')
    .eq('id_posbindu', id)
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json(data);
};


// ===============================
// UPDATE POSBINDU
// ===============================
exports.updatePosbindu = async (req, res) => {

  const id = req.params.id;

  const { nama_posbindu, alamat, desa, kecamatan, kabupaten } = req.body;

  const { data, error } = await supabase
    .from('posbindu')
    .update({
      nama_posbindu,
      alamat,
      desa,
      kecamatan,
      kabupaten
    })
    .eq('id_posbindu', id)
    .select();

  if (error) return res.status(400).json({ error: error.message });

  res.json({
    message: "Posbindu berhasil diperbarui",
    data
  });
};


// ===============================
// DELETE POSBINDU
// ===============================
exports.deletePosbindu = async (req, res) => {

  const id = req.params.id;

  const { error } = await supabase
    .from('posbindu')
    .delete()
    .eq('id_posbindu', id);

  if (error) return res.status(400).json({ error: error.message });

  res.json({
    message: "Posbindu berhasil dihapus"
  });
};
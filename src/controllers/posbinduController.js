const supabase = require('../config/supabase');

exports.createPosbindu = async (req, res) => {
  const { nama_posbindu, desa, kecamatan, kabupaten } = req.body;

  const { data, error } = await supabase
    .from('posbindu')
    .insert([{ nama_posbindu, desa, kecamatan, kabupaten }])
    .select();

  if (error) return res.status(400).json({ error });

  res.status(201).json(data);
};

exports.getAllPosbindu = async (req, res) => {
  const { data, error } = await supabase
    .from('posbindu')
    .select('*');

  if (error) return res.status(400).json({ error });

  res.json(data);
};

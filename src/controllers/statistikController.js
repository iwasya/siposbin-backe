const supabase = require('../config/supabase');

exports.getStatistik = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('pemeriksaan')
      .select('tanggal_pemeriksaan, sistolik, diastolik, gula_darah, kolesterol, bmi')
      .eq('id_user', userId)
      .order('tanggal_pemeriksaan', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Format untuk grafik
    const labels = data.map(item => item.tanggal_pemeriksaan);
    const sistolik = data.map(item => item.sistolik);
    const diastolik = data.map(item => item.diastolik);
    const gula_darah = data.map(item => item.gula_darah);
    const kolesterol = data.map(item => item.kolesterol);
    const bmi = data.map(item => item.bmi);

    res.json({
      labels,
      sistolik,
      diastolik,
      gula_darah,
      kolesterol,
      bmi
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

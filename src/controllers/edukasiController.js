const supabase = require('../config/supabase');

exports.getEdukasi = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Ambil status terakhir user
    const { data: lastCheck } = await supabase
      .from('pemeriksaan')
      .select(`
        interpretasi (
          status_kesehatan
        )
      `)
      .eq('id_user', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let status = "Normal";

    if (lastCheck && lastCheck.interpretasi) {
      status = lastCheck.interpretasi.status_kesehatan;
    }

    // 2️⃣ Ambil recommended
    const { data: recommended, error: recError } = await supabase
      .from('edukasi')
      .select('*')
      .eq('target_status', status)
      .order('created_at', { ascending: false });

    if (recError) {
      return res.status(400).json({ error: recError.message });
    }

    // Ambil ID yang sudah direkomendasikan
    const recommendedIds = recommended.map(item => item.id_edukasi);

    // 3️⃣ Ambil semua edukasi KECUALI recommended
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

const supabase = require('../config/supabase');

exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1️⃣ Ambil pemeriksaan terakhir
    const { data: lastCheck, error: checkError } = await supabase
      .from('pemeriksaan')
      .select(`
        *,
        interpretasi (
          status_kesehatan
        )
      `)
      .eq('id_user', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(400).json({ error: checkError.message });
    }

    // 2️⃣ Hitung total pemeriksaan
    const { count: totalPemeriksaan } = await supabase
      .from('pemeriksaan')
      .select('*', { count: 'exact', head: true })
      .eq('id_user', userId);

    // 3️⃣ Hitung notifikasi belum dibaca
    const { count: unreadNotif } = await supabase
      .from('notifikasi')
      .select('*', { count: 'exact', head: true })
      .eq('id_user', userId)
      .eq('is_read', false);

    res.json({
      last_check: lastCheck || null,
      total_pemeriksaan: totalPemeriksaan || 0,
      unread_notifikasi: unreadNotif || 0
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

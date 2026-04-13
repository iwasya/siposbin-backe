const supabase = require('../config/supabase');
const { formatToJakartaDateTime } = require('../utils/dateTime');

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
      .order('tanggal_pemeriksaan', { ascending: false })
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

    const formattedLastCheck = lastCheck
      ? {
          ...lastCheck,
          created_at: formatToJakartaDateTime(lastCheck.created_at),
          tanggal_pemeriksaan: formatToJakartaDateTime(lastCheck.tanggal_pemeriksaan)
        }
      : null;

    res.json({
      last_check: formattedLastCheck,
      total_pemeriksaan: totalPemeriksaan || 0,
      unread_notifikasi: unreadNotif || 0
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

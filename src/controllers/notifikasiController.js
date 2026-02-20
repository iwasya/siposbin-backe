const supabase = require('../config/supabase');

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('notifikasi')
      .select('*')
      .eq('id_user', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('id_notifikasi', id)
      .eq('id_user', userId)
      .select();

    if (error) return res.status(400).json({ error });

    res.json({ message: "Notifikasi ditandai sudah dibaca", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

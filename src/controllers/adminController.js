const supabase = require('../config/supabase');


// ==============================
// 📜 GET RESET LOGS (With Filter & Pagination)
// ==============================
exports.getResetLogs = async (req, res) => {
  try {
    let { page = 1, limit = 10, status, start_date, end_date } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('password_reset_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }

    if (start_date && end_date) {
      query = query
        .gte('created_at', start_date)
        .lte('created_at', end_date);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      page,
      limit,
      total: count,
      total_pages: Math.ceil(count / limit),
      data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==============================
// 📊 GET RESET STATISTICS
// ==============================
exports.getResetStats = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('password_reset_logs')
      .select('status');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const stats = {
      total: data.length,
      otp_sent: 0,
      otp_failed: 0,
      expired: 0,
      blocked: 0,
      success: 0
    };

    data.forEach(log => {
      if (stats.hasOwnProperty(log.status)) {
        stats[log.status]++;
      }
    });

    res.json(stats);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

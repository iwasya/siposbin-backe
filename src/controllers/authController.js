const supabase = require('../config/supabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const transporter = require('../config/mailer');

exports.register = async (req, res) => {
  try {
    const { nama, email, password, id_posbindu } = req.body;

    if (!nama || !email || !password) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          nama,
          email,
          password: hashedPassword,
          id_role: 3, // 
          id_posbindu: 1
        }
      ])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({
      message: 'User berhasil didaftarkan sebagai Peserta',
      data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user)
      return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id_user, role: user.id_role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email wajib diisi" });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id_user, nama, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "Email tidak ditemukan" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expired = new Date(Date.now() + 10 * 60 * 1000);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_otp: otp,
        reset_otp_expired: expired,
        reset_otp_attempt: 0
      })
      .eq('id_user', user.id_user);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    const userIP =
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      "Unknown";

    await transporter.sendMail({
      from: `"SIPOSBIN" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Password SIPOSBIN",
      html: `
      <div style="font-family: Arial; background:#f4f6f8; padding:30px;">
        <div style="max-width:500px;margin:auto;background:#fff;padding:30px;border-radius:10px;">
          <div style="text-align:center;">
            <img src="https://via.placeholder.com/120x50?text=SIPOSBIN" />
          </div>
          <h2 style="text-align:center;">Reset Password</h2>
          <p>Halo <strong>${user.nama}</strong>,</p>
          <p>Permintaan reset dari IP:</p>
          <p style="color:#888;">${userIP}</p>
          <div style="text-align:center;margin:25px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:5px;color:#1abc9c;">
              ${otp}
            </span>
          </div>
          <p>Kode berlaku 10 menit.</p>
        </div>
      </div>
      `
    });

    // 🔐 AUDIT LOG
    await supabase.from('password_reset_logs').insert([{
      user_id: user.id_user,
      email: email,
      ip_address: userIP,
      status: 'otp_sent'
    }]);

    res.json({ message: "OTP dikirim ke email" });

  } catch (err) {
    console.log("Request Reset Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const userIP =
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      "Unknown";

    // 🔐 Limit 3 kali
    if ((user.reset_otp_attempt || 0) >= 3) {

      await supabase.from('password_reset_logs').insert([{
        user_id: user.id_user,
        email: email,
        ip_address: userIP,
        status: 'blocked'
      }]);

      return res.status(400).json({
        message: "Terlalu banyak percobaan OTP. Silakan request ulang."
      });
    }

    // 🔐 OTP Salah
    if (!user.reset_otp || user.reset_otp !== otp) {

      await supabase
        .from('users')
        .update({
          reset_otp_attempt: (user.reset_otp_attempt || 0) + 1
        })
        .eq('id_user', user.id_user);

      await supabase.from('password_reset_logs').insert([{
        user_id: user.id_user,
        email: email,
        ip_address: userIP,
        status: 'otp_failed'
      }]);

      return res.status(400).json({ message: "OTP salah" });
    }

    // 🔐 Expired Check
    if (!user.reset_otp_expired) {
      return res.status(400).json({ message: "OTP tidak valid" });
    }

    const now = Date.now();
    const expiredTime = new Date(user.reset_otp_expired).getTime();

    if (now > expiredTime) {

      await supabase.from('password_reset_logs').insert([{
        user_id: user.id_user,
        email: email,
        ip_address: userIP,
        status: 'expired'
      }]);

      return res.status(400).json({ message: "OTP sudah expired" });
    }

    // 🔐 Hash password baru
    const hashedPassword = await bcrypt.hash(new_password, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        reset_otp: null,
        reset_otp_expired: null,
        reset_otp_attempt: 0
      })
      .eq('id_user', user.id_user);

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // 🔐 Log Success
    await supabase.from('password_reset_logs').insert([{
      user_id: user.id_user,
      email: email,
      ip_address: userIP,
      status: 'success'
    }]);

    res.json({ message: "Password berhasil direset" });

  } catch (err) {
    console.log("Reset Password Error:", err);
    res.status(500).json({ error: err.message });
  }
};

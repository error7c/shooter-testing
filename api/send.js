const nodemailer = require('nodemailer');
const { SocksProxyAgent } = require('socks-proxy-agent');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { smtpConfig, mailData, proxyConfig, customHeaders } = req.body;

  let agent = null;
  if (proxyConfig.host && proxyConfig.port) {
    const proxyAuth = proxyConfig.user ? `${proxyConfig.user}:${proxyConfig.pass}@` : '';
    agent = new SocksProxyAgent(`socks5://${proxyAuth}${proxyConfig.host}:${proxyConfig.port}`);
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: parseInt(smtpConfig.port),
    secure: smtpConfig.port == 465, 
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    pool: true,
    maxConnections: 10,
    ...(agent && { agent }) 
  });

  try {
    await transporter.sendMail({
      from: `"${mailData.fromName}" <${smtpConfig.user}>`,
      to: mailData.to,
      subject: mailData.subject,
      html: mailData.html,
      headers: {
        'User-Agent': customHeaders.userAgent || 'Mozilla/5.0',
        'X-Mailer': 'P7M-Ultra-V2'
      }
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

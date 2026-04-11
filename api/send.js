const nodemailer = require('nodemailer');
const { SocksProxyAgent } = require('socks-proxy-agent');

export default async function handler(req, res) {
  // Ensure we always return JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  // FIXED: Changed proxyConfig to proxy to match your frontend payload
  const { smtpConfig, mailData, proxy, customHeaders } = req.body;

  let agent = null;
  // SAFETY CHECK: Only create agent if proxy data actually exists
  if (proxy && proxy.host && proxy.port) {
    const proxyAuth = proxy.user ? `${proxy.user}:${proxy.pass}@` : '';
    agent = new SocksProxyAgent(`socks5://${proxyAuth}${proxy.host}:${proxy.port}`);
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: parseInt(smtpConfig.port),
    secure: parseInt(smtpConfig.port) === 465, 
    auth: { 
      user: smtpConfig.user, 
      pass: smtpConfig.pass 
    },
    // Serverless optimization
    pool: false, 
    timeout: 10000,
    connectionTimeout: 10000,
    ...(agent && { agent }) 
  });

  try {
    await transporter.sendMail({
      from: `"${mailData.fromName}" <${smtpConfig.user}>`,
      to: mailData.to,
      subject: mailData.subject,
      html: mailData.html,
      headers: {
        'User-Agent': (customHeaders && customHeaders.userAgent) || 'Mozilla/5.0 P7M-Ultra',
        'X-Mailer': 'P7M-Ultra-Enterprise'
      }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("SMTP Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

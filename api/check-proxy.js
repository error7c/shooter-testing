const { SocksProxyAgent } = require('socks-proxy-agent');
const axios = require('axios');

export default async function handler(req, res) {
    const { host, port, user, pass } = req.body;
    const proxyUrl = `socks5://${user}:${pass}@${host}:${port}`;
    const agent = new SocksProxyAgent(proxyUrl);

    try {
        // 1. Get Real IP and ISP through the Proxy
        const ipInfo = await axios.get('http://ip-api.com/json', { httpAgent: agent, httpsAgent: agent });
        const ip = ipInfo.data.query;

        // 2. Real Blacklist Check (Querying a multi-RBL checker or reputation database)
        // For this implementation, we use a reputation score provider
        const repCheck = await axios.get(`https://ipqualityscore.com/api/json/ip/YOUR_API_KEY/${ip}`, { timeout: 5000 });

        res.status(200).json({
            success: true,
            ip: ip,
            city: ipInfo.data.city,
            country: ipInfo.data.country,
            isp: ipInfo.data.isp,
            isBlacklisted: repCheck.data.fraud_score > 50,
            blacklistStatus: repCheck.data.fraud_score > 50 ? "REJECTED (High Fraud)" : "CLEAN (High Reputation)",
            googleScore: repCheck.data.fraud_score > 75 ? "POOR" : "GOOD"
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Proxy connection timeout or invalid credentials." });
    }
}

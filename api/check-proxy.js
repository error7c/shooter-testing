const { SocksProxyAgent } = require('socks-proxy-agent');
const axios = require('axios');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { host, port, user, pass } = req.body;
    const proxyUrl = `socks5://${user}:${pass}@${host}:${port}`;
    const agent = new SocksProxyAgent(proxyUrl);

    try {
        // 1. Identify the Exit IP through the Proxy Tunnel
        const ipInfo = await axios.get('http://ip-api.com/json', { 
            httpAgent: agent, 
            httpsAgent: agent,
            timeout: 8000 
        });
        const ip = ipInfo.data.query;

        // 2. Parallel Reputation Check (IPQS + AbuseIPDB)
        const [ipqs, abuse] = await Promise.all([
            axios.get(`https://ipqualityscore.com/api/json/ip/5J2xtETPiWGyYrPxLsjoeECXmii2BPWE/${ip}`),
            axios.get(`https://api.abuseipdb.com/api/v2/check`, {
                params: { ipAddress: ip, maxAgeInDays: 90 },
                headers: { 'Key': '8ec051f099d16521565e90e8799cace4fa371ac6f54bb1234463c3622ef8384eb20a69218557920a', 'Accept': 'application/json' }
            })
        ]);

        const fraudScore = ipqs.data.fraud_score || 0;
        const abuseScore = abuse.data.data.abuseConfidenceScore || 0;

        // Determination Logic
        const isBad = fraudScore > 50 || abuseScore > 25;
        const isExtremelyBad = fraudScore > 80 || abuseScore > 75;

        res.status(200).json({
            success: true,
            ip: ip,
            city: ipInfo.data.city,
            country: ipInfo.data.country,
            isp: ipInfo.data.isp,
            isBlacklisted: isBad,
            blacklistStatus: isBad ? `FLAGGED (${fraudScore}% Fraud / ${abuseScore}% Abuse)` : "CLEAN / HIGH REPUTATION",
            googleScore: isExtremelyBad ? "POOR (High Risk)" : (isBad ? "NEUTRAL" : "EXCELLENT")
        });

    } catch (error) {
        console.error("Proxy Intel Error:", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Proxy Tunnel Failed. Check if your IP is whitelisted or credentials are correct." 
        });
    }
}

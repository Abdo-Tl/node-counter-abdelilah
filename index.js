const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const FILE = path.join(__dirname, "visits.json");

// Mutex simple
let lock = false;

// Lire compteur
function readCounter() {
  try {
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, JSON.stringify({ count: 0 }));
    }
    const data = fs.readFileSync(FILE);
    return JSON.parse(data).count;
  } catch (err) {
    console.error("Erreur lecture JSON:", err);
    return 0;
  }
}

// Écrire compteur
function writeCounter(count) {
  try {
    fs.writeFileSync(FILE, JSON.stringify({ count }, null, 2));
  } catch (err) {
    console.error("Erreur écriture JSON:", err);
  }
}

// Route principale
app.get("/", async (req, res) => {
  // Attente si une écriture est en cours
  while (lock) {
    await new Promise(r => setTimeout(r, 10));
  }

  lock = true;

  try {
    let count = readCounter();
    count++;
    writeCounter(count);

    // Infos serveur
    const hostname = req.hostname;
    const port = req.socket.localPort;
    const serverIP = req.socket.localAddress;

    // IP client (utile derrière proxy Azure)
    const clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Compteur de visites</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }

          .container {
            max-width: 700px;
            width: 100%;
          }

          .card {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            transition: transform 0.3s ease;
          }

          .card:hover {
            transform: translateY(-5px);
          }

          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }

          .header h1 {
            font-size: 2em;
            margin-bottom: 10px;
          }

          .header i {
            font-size: 50px;
            margin-bottom: 15px;
          }

          .content {
            padding: 30px;
          }

          .counter-box {
            text-align: center;
            background: #f0f0f8;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 25px;
          }

          .counter-number {
            font-size: 4em;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
          }

          .counter-label {
            font-size: 1.2em;
            color: #555;
          }

          .section {
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
            padding-left: 15px;
          }

          .section h3 {
            color: #667eea;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .section h3 i {
            font-size: 1.2em;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }

          .info-label {
            font-weight: bold;
            color: #555;
          }

          .info-value {
            color: #333;
            font-family: monospace;
            word-break: break-all;
            text-align: right;
          }

          .footer {
            background: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 0.8em;
            color: #888;
            border-top: 1px solid #eee;
          }

          @media (max-width: 600px) {
            .info-row {
              flex-direction: column;
              gap: 5px;
            }
            .info-value {
              text-align: left;
            }
            .counter-number {
              font-size: 2.5em;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <i class="fas fa-chart-line"></i>
              <h1>Compteur de visites</h1>
              <p>Application Node.js déployée sur Azure</p>
            </div>
            <div class="content">
              <div class="counter-box">
                <div class="counter-label">
                  <i class="fas fa-eye"></i> Nombre total de visites
                </div>
                <div class="counter-number">${count}</div>
                <div class="counter-label">
                  <i class="fas fa-smile"></i> Merci de votre visite !
                </div>
              </div>

              <div class="section">
                <h3><i class="fas fa-server"></i> Informations serveur</h3>
                <div class="info-row">
                  <span class="info-label"><i class="fas fa-globe"></i> Hostname :</span>
                  <span class="info-value">${hostname}</span>
                </div>
                <div class="info-row">
                  <span class="info-label"><i class="fas fa-plug"></i> Port :</span>
                  <span class="info-value">${port}</span>
                </div>
                <div class="info-row">
                  <span class="info-label"><i class="fas fa-network-wired"></i> IP serveur :</span>
                  <span class="info-value">${serverIP}</span>
                </div>
              </div>

              <div class="section">
                <h3><i class="fas fa-user"></i> Informations client</h3>
                <div class="info-row">
                  <span class="info-label"><i class="fas fa-ip"></i> IP client :</span>
                  <span class="info-value">${clientIP}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <i class="fas fa-cloud-upload-alt"></i> Déployé avec GitHub Actions & Azure
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } finally {
    lock = false;
  }
});

// Démarrage serveur
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
# ?? Running Agri-Guard in GitHub Codespaces

You can run the Agri-Guard web app, database, and AI server in the cloud using **GitHub Codespaces** without installing anything locally!

---

## ?? How to Launch in Codespaces (1-Click Setup)

1. Go to the repository on GitHub: `https://github.com/vmbundalian1776pam-ai/Agri-Guard`
2. Click the green **Code** button.
3. Select the **Codespaces** tab.
4. Click **Create codespace on main**.
5. Wait 2-3 minutes while GitHub builds your cloud environment automatically.

---

## ?? How to Start the App

Once your Codespace opens:

1. Open the terminal inside Codespaces and run:
   ```bash
   chmod +x start_codespaces.sh
   ./start_codespaces.sh
   ```
2. The script will automatically start:
   - ?? **PHP Backend & MySQL Database** (Port 8000)
   - ?? **AI Model Server** (Port 5000)
   - ?? **Expo Web App** (Port 8081)

3. Under the **Ports** tab at the bottom of VS Code, click the **Web Address link** for Port `8081` to view and test the live app directly in your browser!

---

## ?? Important Note on Hardware Simulation

- **Included in Cloud Demo:** Database, Admin Audit Trail, AI Scan Classification, Scan History, Filters, Irrigation Controls UI.
- **Hardware Limitations:** Physical microcontrollers (ESP32 Rover & Water Pump) communicate over local Wi-Fi networks (`192.168.x.x`). Cloud environments cannot connect to local hardware pins. For physical hardware testing, deploy via local network as outlined in `transfer_guide.md`.


# OSLA - Technical Resume

## Project Overview

**OSLA Desktop adalah aplikasi desktop berbasis Electron untuk manajemen linen menggunakan teknologi RFID. Dikembangkan oleh **PT. Nuansa Cerah Informasi** dengan Lead Developer **Faisal Rahman\*\*.

**Version:** 1.1.6
**Base API:** https://api.oslarf.id/api

---

## Tech Stack

### Frontend Framework

| Technology      | Version | Purpose                 |
| --------------- | ------- | ----------------------- |
| React           | 18.0.0  | UI Framework            |
| Vite            | 5.0.0   | Build Tool & Dev Server |
| Tailwind CSS    | 3.4.17  | Styling                 |
| Lucide React    | 0.542.0 | Icons                   |
| React Select    | 5.10.2  | Dropdown Components     |
| React Hot Toast | 2.6.0   | Notifications           |

### Desktop Framework

| Technology       | Version | Purpose                     |
| ---------------- | ------- | --------------------------- |
| Electron         | 37.3.1  | Desktop Application Wrapper |
| Electron Builder | 26.0.12 | Application Packager        |
| Concurrently     | 9.1.2   | Concurrent Process Runner   |

### Hardware Integration

| Technology                       | Purpose                     |
| -------------------------------- | --------------------------- |
| electron-edge-js (24.0.4)        | .NET Interop untuk RFID     |
| ZebraLib.dll                     | Zebra RFID Reader Library   |
| Symbol.RFID3.Host.dll            | RFID Host Support           |
| Zebra Browser Print SDK          | Zebra Printer Communication |
| ZPL (Zebra Programming Language) | Label Printing              |

### Utilities

| Technology     | Purpose                         |
| -------------- | ------------------------------- |
| electron-store | Local Configuration Storage     |
| keytar         | Secure Credential Storage       |
| dotenv         | Environment Variable Management |

---

## Zebra Printer Integration

### Architecture Overview

Aplikasi menggunakan **dual approach** untuk printing Zebra:

```
┌─────────────────────────────────────────────────────────────┐
│                     PRINTING LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐      ┌──────────────────────┐   │
│  │  BrowserPrint SDK    │      │   Raw ZPL Fallback   │   │
│  │   (Primary Method)   │      │   (PowerShell)       │   │
│  └──────────────────────┘      └──────────────────────┘   │
│             │                             │                │
│             ▼                             ▼                │
│  ┌──────────────────────────────────────────────────┐     │
│  │         ZDesigner ZD888-203dpi ZPL               │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. BrowserPrint SDK (Primary)

**Location:** `zebra-browser-print-js-v31250/`

**Usage Flow:**

```javascript
// 1. Check if BrowserPrint is loaded
if (window.BrowserPrint) {
  // 2. Get default printer device
  window.BrowserPrint.getDefaultDevice("printer", (device) => {
    selectedDevice = device;
  });

  // 3. Discover available devices
  window.BrowserPrint.getLocalDevices((deviceList) => {
    devices = deviceList;
  });
}

// 4. Send ZPL command to printer
selectedDevice.send(zplCommand, onSuccess, onError);
```

**Key Methods:**

- `BrowserPrint.getDefaultDevice(type, callback, error)` - Get default printer
- `BrowserPrint.getLocalDevices(callback, error, type)` - List all available printers
- `device.send(command, callback, error)` - Send ZPL to printer
- `BrowserPrint.getApplicationConfiguration(callback, error)` - Get SDK info

### 2. Raw ZPL Fallback (PowerShell)

**Location:** `electron/main.js`

**Implementation:**

```javascript
// Fallback via PowerShell when BrowserPrint fails
const { exec } = require("child_process");

exec(
  `powershell -command "Get-Content '${zplFile}' | Out-Printer -Name '${printerName}'"`,
);
```

### ZPL Command Structure

**Function:** `generateDeliveryZPL(deliveryData)`

**ZPL Commands Used:**
| Command | Purpose |
|---------|---------|
| `^XA` | Start Label Format |
| `^LL{height}` | Label Length (dynamic) |
| `^FO{x},{y}` | Field Origin (position) |
| `^A0N,width,height` | Font (0=Scalable, N=Normal) |
| `^FD{text}` | Field Data (text content) |
| `^FS` | Field Separator |
| `^GB{width},{height},{thickness}` | Graphic Box (lines) |
| `^XZ` | End Label Format |

**Generated Label Layout:**

```
┌────────────────────────────────────────────────────────┐
│           PT JALIN MITRA NUSANTARA (OSLA)              │
│                    DELIVERY                             │
│                  DO251024000090                         │
│                  10/02/2026 14:30                       │
│  ────────────────────────────────────────────────────  │
│  Detail Pengiriman:                                    │
│  ────────────────────────────────────────────────────  │
│  Klien: RSUD                                         │
│  Ruangan: ICU 001                                    │
│  Total Linen: 45                                     │
│                    Operator: John Doe                 │
│  ────────────────────────────────────────────────────  │
│  QTY     Linen                                         │
│  ────────────────────────────────────────────────────  │
│  10      Bed Sheet Large                               │
│  15      Pillow Case Standard                          │
│  10      Patient Gown                                  │
│  10      Blanket Thermal                               │
│  ────────────────────────────────────────────────────  │
│                  Terima kasih                           │
└────────────────────────────────────────────────────────┘
```

---

## RFID Integration

### Hardware Requirements

- Zebra RFID Reader (network-enabled)
- .NET Framework 4.5+
- Windows 10+ (primary target)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RFID LAYER                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  React Renderer Process          Main Process              │
│  ┌──────────────────┐          ┌──────────────────┐       │
│  │  IPC Renderer    │◄────────►│  IPC Main        │       │
│  │  (preload.js)    │          │  (main.js)       │       │
│  └──────────────────┘          └────────┬─────────┘       │
│                                         │                  │
│                                         ▼                  │
│  ┌──────────────────────────────────────────────────┐     │
│  │              Edge.js + .NET Libraries            │     │
│  │  ┌────────────────┐    ┌────────────────────┐   │     │
│  │  │  ZebraLib.dll  │    │ Symbol.RFID3.Host  │   │     │
│  │  └────────────────┘    │       .dll         │   │     │
│  │                        └────────────────────┘   │     │
│  └──────────────────────────────────────────────────┘     │
│                                         │                  │
│                                         ▼                  │
│  ┌──────────────────────────────────────────────────┐     │
│  │           Zebra RFID Reader (Network)            │     │
│  │           IP: 192.168.1.100:5084                 │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### IPC Handlers Available

| Handler                 | Parameters            | Description                  |
| ----------------------- | --------------------- | ---------------------------- |
| `rfid:connect`          | ipAddress, port       | Connect to RFID reader       |
| `rfid:disconnect`       | -                     | Disconnect from reader       |
| `rfid:start`            | -                     | Start inventory scanning     |
| `rfid:stop`             | -                     | Stop inventory scanning      |
| `rfid:getTags`          | -                     | Get scanned tags             |
| `rfid:setPower`         | antennaIndex, power   | Set antenna power (0-30 dBm) |
| `rfid:setAntennaEnable` | antennaIndex, enabled | Enable/disable antenna       |
| `rfid:isConnected`      | -                     | Check connection status      |

### Antenna Configuration

```javascript
// Power settings per antenna (0-30 dBm)
const antennaPowers = [20, 20, 20, 20];

// Enable/disable antennas
const antennaEnables = [true, true, true, true];
```

### Scanning Modes

| Mode         | Description              |
| ------------ | ------------------------ |
| Register     | New linen registration   |
| Grouping     | Group by customer/room   |
| Sorting      | Sort by type/destination |
| Delivery     | Prepare for delivery     |
| Linen Bersih | Clean linen tracking     |

---

## API Integration

### Base Configuration

```javascript
const BASE_URL = "https://api.oslarf.id/api";
```

### Key Endpoints

| Endpoint                  | Method | Purpose                    |
| ------------------------- | ------ | -------------------------- |
| `/Process/print_delivery` | GET    | Fetch delivery report data |
| Authentication            | POST   | User login                 |
| Customer Data             | GET    | Fetch customer list        |
| Room Data                 | GET    | Fetch room list            |

### Authentication Pattern

```javascript
// Bearer Token Authentication
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## Project Structure

```
linen-desktop/
├── electron/
│   ├── main.js              # Main process entry point
│   ├── preload.js           # IPC bridge to renderer
│   ├── config.js            # Runtime configuration
│   ├── lib/
│   │   ├── ZebraLib.dll     # RFID library
│   │   └── Symbol.RFID3.Host.dll
│   └── app.config           # App settings template
│
├── src/
│   ├── pages/
│   │   ├── Scanning.jsx     # RFID scanning interface
│   │   ├── DeliveryPage.jsx # Delivery management
│   │   ├── Cetak.jsx        # Print interface
│   │   └── ...
│   ├── hooks/
│   │   ├── usePrint.js      # Zebra printing hook
│   │   ├── usePrintCetak.js # Alternative print hook
│   │   └── useRFID.js       # RFID operations hook
│   ├── components/          # Reusable components
│   └── utils/               # Helper functions
│
├── public/
│   └── zebra-browser-print-js-v31250/  # Zebra SDK
│
├── assets/
│   └── icons/               # Application icons
│
├── .env                     # Environment variables
├── package.json             # Dependencies & scripts
├── vite.config.js           # Vite configuration
└── README.md                # Project documentation
```

---

## Environment Variables

```bash
# .env file
VITE_BASE_URL=https://api.oslarf.id/api
VITE_APP_VERSION=1.1.6
```

---

## Build Configuration

### Development Scripts

```bash
npm run dev          # Start Vite + Electron concurrently
npm start            # Start Electron only (Vite must be running)
npm run build        # Build for production
npm run electron:build  # Build and package application
```

### Build Targets

| Platform | Format         | Architectures |
| -------- | -------------- | ------------- |
| Windows  | NSIS Installer | x64           |
| macOS    | DMG            | Universal     |
| Linux    | AppImage       | x64           |

### Extra Resources (Packaged)

- `ZebraLib.dll` - RFID library
- `Symbol.RFID3.Host.dll` - RFID host library
- `assets/icons/` - Application icons
- `app.config` - Configuration template

---

## Application Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Login    │───►│   Menu      │───►│   Select    │
│             │    │ Selection   │    │   Mode      │
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
                                             ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Connect    │◄───│  Configure  │◄───│   RFID      │
│  RFID       │    │  Antennas   │    │   Setup     │
└─────────────┘    └─────────────┘    └─────────────┘
      │
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Scan Tags  │───►│  Process    │───►│  Print      │
│             │    │  Data       │    │  Labels     │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## Key Features by Module

### 1. Authentication

- Bearer token based
- Secure credential storage via keytar
- Role-based menu access

### 2. RFID Management

- Real-time tag scanning
- 4-antenna support with individual power control
- Connection status monitoring
- Configurable reader IP and port

### 3. Linen Operations

- **Register**: Assign RFID to new linen
- **Scanning**: Identify linen by RFID
- **Sorting**: Sort by type/destination
- **Grouping**: Group by customer/room
- **Linen Bersih**: Track clean linen

### 4. Delivery Management

- Delivery order creation
- Room-based grouping
- Driver assignment
- Label printing with ZPL

### 5. Reporting

- Delivery reports
- Scan history
- Transaction logs

---

## Security Considerations

1. **Credential Storage**: Uses keytar for secure token storage
2. **API Communication**: HTTPS with Bearer token authentication
3. **Local Data**: Stored in `app.getPath('userData')`
4. **Cleanup**: Sensitive data cleared on app close
5. **Configuration**: Device settings stored locally (not in source)

---

## Troubleshooting

### Zebra Printer Issues

**Problem:** BrowserPrint not loaded

```javascript
Solution: Install Zebra Browser Print from Zebra website
Check: window.BrowserPrint availability in console
```

**Problem:** No printer detected

```javascript
Solution:
1. Check printer is powered on and connected
2. Verify Zebra Browser Print service is running
3. Use refreshDevices() to re-scan
4. Check firewall settings
```

### RFID Issues

**Problem:** Cannot connect to RFID reader

```javascript
Solution:
1. Verify reader is on same network
2. Check IP address and port (default: 5084)
3. Ping the reader IP
4. Check .NET Framework 4.5+ is installed
```

**Problem:** No tags detected

```javascript
Solution:
1. Increase antenna power (try 25-30 dBm)
2. Check antenna is enabled
3. Verify tags are within range
4. Check antenna connections
```

---

## Developer Notes

### Hot Reload

- Vite dev server runs on `http://localhost:5173`
- Electron waits for Vite to be ready before launching
- Changes to React code auto-reload

### IPC Communication Pattern

```javascript
// Renderer (React)
window.electronAPI.rfidConnect(ip, port);

// Main (Electron)
ipcMain.handle("rfid:connect", async (event, ip, port) => {
  // Handle connection
});

// Preload (Bridge)
contextBridge.exposeInMainWorld("electronAPI", {
  rfidConnect: (ip, port) => ipcRenderer.invoke("rfid:connect", ip, port),
});
```

---

## License & Credits

- **Developer:** PT. Nuansa Cerah Informasi
- **Lead Developer:** Faisal Rahman
- **License:** MIT
- **Version:** 1.1.6

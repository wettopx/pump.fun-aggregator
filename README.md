# pump.fun Aggregator

`pump.fun-aggregator` is an open-source web-based tool designed to track and analyze memecoin launches on [pump.fun](https://pump.fun), a popular token launch platform on Solana. This project aggregates real-time token data and surfaces useful insights such as token metadata, launch information, and detection of potentially "infected" or suspicious launches.

It serves as a community resource for degens, meme token hunters, and Solana enthusiasts looking to stay ahead of the chaos in the pump.fun ecosystem.

---

## Key Features

- **Token Aggregation**: Collects token metadata (name, symbol, image, creator, etc.) from pump.fun.
- **Infected Launch Detection**: Flags tokens launched by suspicious or known addresses using customizable logic.
- **Frontend Dashboard**: A lightweight web interface showing aggregated token launches in real time.
- **Modular Codebase**: Easily extendable with new rules, data sources, or visual themes.

---

## Technology Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Scripts**: Custom logic for processing and detecting infected tokens
- **Data Source**: Public pump.fun token metadata endpoints (JSON)

---

## Project Structure

```
pump.fun-aggregator/
├── public/             # Static web assets
│   ├── index.html      # Main HTML file
│   ├── style.css       # Stylesheet for frontend
│   └── script.js       # JS for frontend behavior
├── scripts/            # Background and data processing logic
│   └── launch.js       # Infected token detection and token processing logic
├── server/             # Backend helpers and data fetching
│   └── fetch.js        # Pump.fun API data collector
├── server.js           # Main Express server
├── package.json        # Project dependencies and metadata
└── README.md           # Project documentation
```

---

## Installation

### Prerequisites

- Node.js v14 or higher
- npm (comes with Node.js)

### Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/wettopx/pump.fun-aggregator.git
   cd pump.fun-aggregator
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start the Server**

   ```bash
   node server.js
   ```

   This will launch the site on:  
   `http://localhost:3000`

---

## Web Interface

After launching the server, open your browser and go to `http://localhost:3000`. The frontend will display a list of token launches from pump.fun.

Each token entry may include:

- Token name and symbol
- Token image
- Creator address
- Launch time
- Status (e.g., flagged as infected)

---

## Infected Token Detection

To detect suspicious or malicious tokens, the project uses the `scripts/launch.js` file. This file contains logic to analyze token launches and flag those created by known malicious addresses or matching specific behavioral patterns.

### How to Run Infected Token Detection

```bash
node scripts/launch.js
```

The script will fetch the latest token data and print information about any launches that match infection criteria.

### How It Works

- The script compares each token's creator or metadata against a list of known traits (e.g., wallet blacklists, exploit signatures).
- If a token meets the criteria, it is flagged as `infected`.
- This information can be used in the frontend for display or filtering.

You can customize this logic in `scripts/launch.js` to improve detection based on your own risk signals or add support for automatic alerts.

---

## Customization

This repo is designed to be easily hackable and extendable:

- You can add additional data sources in `server/fetch.js`
- Add filters or UI improvements to `public/script.js`
- Improve infected detection logic in `scripts/launch.js`
- Deploy the app publicly via [Railway](https://railway.app), [Vercel](https://vercel.com), or any static host

---

## Deployment (Optional)

To deploy the project on a public server, you can use any Node.js-compatible host:

### With Railway (Recommended for free tier):

1. Push your project to GitHub
2. Connect your GitHub repo to [Railway](https://railway.app/)
3. Set your start command to:  
   ```bash
   node server.js
   ```
4. Railway will build and host the app automatically

---

## Roadmap

Planned or suggested enhancements:

- Wallet tagging and scoring system
- Sort tokens by time, market cap, volume
- Telegram or Discord notifications for infected launches
- Frontend filters (by status, time, symbol)
- Export token logs as CSV or JSON

---

## Contributing

Contributions are welcome and encouraged. You can:

- Open issues for bugs or feature requests
- Fork the repo and submit a pull request
- Add more detection rules or improve the UI

To contribute:

```bash
git checkout -b feature/your-feature-name
# Make your changes
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

---

## License

This project is licensed under the MIT License.  
See the [LICENSE](LICENSE) file for details.

---

## Disclaimer

This project is not affiliated with pump.fun or its developers.  
It is provided as-is for research, educational, and community tracking purposes only.

Use at your own risk. Flagging of “infected” tokens is heuristic-based and may not be 100% accurate.

---

## Author

Developed and maintained by [wettopx](https://github.com/wettopx).

---


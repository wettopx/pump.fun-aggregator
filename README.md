# pump.fun aggregator

An open-source aggregator for the pump.fun launchpad platform on Solana blockchain. This tool provides comprehensive data aggregation, analytics, and monitoring capabilities for tokens launched on pump.fun.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

## Overview

Pump.fun Aggregator is designed to help traders, developers, and analysts track and analyze tokens launched on the pump.fun platform. It aggregates data from multiple sources to provide real-time insights into token performance, market trends, and trading opportunities.

### What is Pump.fun?

Pump.fun is a Solana-based platform that allows users to create and trade memecoins without coding knowledge. Tokens can be traded immediately after creation and can "graduate" to decentralized exchanges like Raydium once they reach certain milestones.

## Features

### Core Functionality

- **Real-time Token Tracking**: Monitor new token launches as they happen
- **Market Data Aggregation**: Collect and display comprehensive market statistics
- **Advanced Filtering**: Filter tokens by various parameters including:
  - Market capitalization
  - Volume
  - Age
  - Creator address
  - Token name/symbol
- **Sorting Options**: Sort tokens by multiple criteria for easy analysis
- **Historical Data**: Track token performance over time
- **Graduation Monitoring**: Track tokens that migrate to Raydium/other DEXs

### Analytics

- **Price Charts**: Visual representation of token price movements
- **Volume Analysis**: Trading volume trends and patterns
- **Holder Distribution**: Analysis of token holder concentration
- **Liquidity Metrics**: Track available liquidity and bonding curve progress
- **Success Rate Tracking**: Monitor which tokens successfully graduate

### Additional Features

- **WebSocket Support**: Real-time data updates via WebSocket connections
- **RESTful API**: Access aggregated data programmatically
- **Export Functionality**: Export data in CSV/JSON formats
- **Alert System**: Set up custom alerts for specific events
- **Multi-wallet Support**: Track performance across multiple wallets

## Installation

### Prerequisites

- Node.js v16.0.0 or higher
- npm or yarn package manager
- Solana CLI tools (optional, for advanced features)
- A Solana RPC endpoint (Helius, QuickNode, or similar)

### Clone the Repository

```bash
git clone https://github.com/wettopx/pump.fun-aggregator.git
cd pump.fun-aggregator
```

### Install Dependencies

```bash
npm install
# or
yarn install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# RPC Configuration
SOLANA_RPC_URL=https://your-rpc-endpoint.com
SOLANA_WS_URL=wss://your-websocket-endpoint.com

# API Configuration
API_PORT=3000
API_KEY=your-api-key

# Database Configuration (if applicable)
DATABASE_URL=your-database-url

# Optional: Analytics
ENABLE_ANALYTICS=true
ANALYTICS_INTERVAL=60000

# Optional: Alerts
ENABLE_ALERTS=true
ALERT_WEBHOOK_URL=your-webhook-url
```

## Usage

### Starting the Aggregator

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Basic Usage Examples

#### Fetching Recent Tokens

```javascript
const aggregator = require('pump.fun-aggregator');

// Get recently launched tokens
const recentTokens = await aggregator.getRecentTokens({
  limit: 50,
  timeframe: '1h'
});
```

#### Filtering Tokens

```javascript
// Filter tokens by market cap
const filteredTokens = await aggregator.filterTokens({
  minMarketCap: 10000,
  maxMarketCap: 1000000,
  sortBy: 'marketCap',
  order: 'desc'
});
```

#### Setting Up Real-time Monitoring

```javascript
// Subscribe to new token launches
aggregator.subscribeToNewTokens((token) => {
  console.log('New token launched:', token);
});

// Subscribe to graduation events
aggregator.subscribeToGraduations((event) => {
  console.log('Token graduated:', event);
});
```

## Configuration

### Aggregator Settings

Configuration options can be set in `config.json`:

```json
{
  "aggregator": {
    "updateInterval": 5000,
    "batchSize": 100,
    "retryAttempts": 3,
    "cacheEnabled": true,
    "cacheTTL": 300000
  },
  "filters": {
    "minMarketCap": 1000,
    "excludeRugged": true,
    "onlyVerified": false
  },
  "alerts": {
    "newTokenThreshold": 50000,
    "volumeSpike": 10,
    "priceChange": 50
  }
}
```

## API Reference

### REST Endpoints

#### GET /api/tokens
Retrieve a list of tokens with optional filtering

**Query Parameters:**
- `limit` (number): Maximum number of results
- `offset` (number): Pagination offset
- `sortBy` (string): Field to sort by
- `order` (string): Sort order (asc/desc)
- `minMarketCap` (number): Minimum market cap filter
- `maxMarketCap` (number): Maximum market cap filter

#### GET /api/tokens/:address
Get detailed information about a specific token

#### GET /api/stats
Retrieve platform-wide statistics

#### GET /api/trending
Get trending tokens based on various metrics

### WebSocket Events

Connect to `ws://localhost:3000` for real-time updates:

- `newToken`: Emitted when a new token is created
- `tokenUpdate`: Emitted when token data is updated
- `graduation`: Emitted when a token graduates to a DEX
- `alert`: Custom alerts based on configured criteria

## Architecture

### System Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Solana RPC     │────▶│   Aggregator    │────▶│   Database      │
│                 │     │     Engine      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │                 │
                        │   API Server    │
                        │                 │
                        └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │                 │
                        │    Clients      │
                        │                 │
                        └─────────────────┘
```

### Data Flow

1. **Data Collection**: Continuously monitors Solana blockchain for pump.fun events
2. **Processing**: Parses and normalizes transaction data
3. **Storage**: Stores processed data in database (if configured)
4. **API Layer**: Serves data through REST and WebSocket endpoints
5. **Client Access**: Applications can consume data via API

## Contributing

We welcome contributions to the Pump.fun Aggregator project! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

### Code of Conduct

Please read our Code of Conduct before contributing to ensure a welcoming environment for all contributors.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

**Important Notice**: This software is provided for educational and informational purposes only. 

- Not Financial Advice: This tool does not provide financial advice. Always do your own research.
- Risk Warning: Trading cryptocurrencies and memecoins carries significant risk. You may lose all invested capital.
- No Guarantees: We make no guarantees about the accuracy or completeness of the data provided.
- Third-party Dependency: This tool depends on pump.fun and Solana network availability.

Use this software at your own risk. The developers are not responsible for any losses incurred through the use of this tool.

## Support

For support, please:
- Check the [Issues](https://github.com/wettopx/pump.fun-aggregator/issues) page for known problems
- Join our community discussions
- Contact the maintainers

## Acknowledgments

- Pump.fun team for creating the platform
- Solana community for blockchain infrastructure
- Contributors who have helped improve this project

---

Built with passion for the Solana ecosystem.

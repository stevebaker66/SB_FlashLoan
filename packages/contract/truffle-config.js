require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
	contracts_build_directory: "./output",
	networks: {
		main: {
			provider: () => new HDWalletProvider(
				process.env.MNEMONIC,
				`wss://mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY}`
			),
			network_id: 1
		},
		rinkeby: {
			provider: () => new HDWalletProvider(
				process.env.MNEMONIC,
				`wss://rinkeby.infura.io/ws/v3/${process.env.INFURA_API_KEY}`
			),
			network_id: 4
		},
		ganache: {
			host: "127.0.0.1",
			port: 8545,
			network_id: "*"
		}
	},
	plugins: ["truffle-contract-size"],
	compilers: {
		solc: {
			version: "0.8.10"
		}
	}
};

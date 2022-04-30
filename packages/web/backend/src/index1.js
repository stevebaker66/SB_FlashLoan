require('dotenv').config()
const express = require('express')
const http = require('http')
const moment = require('moment-timezone')
const {ethers} = require("ethers");

// SERVER CONFIG
const PORT = process.env.PORT || 5011
const app = express();
const server = http.createServer(app).listen(PORT, () => console.log(`Listening on ${PORT}`))

// WEB3 CONFIG
const {UNISWAP_FACTORY_ABI, UNISWAP_FACTORY_ADDRESS, UNISWAP_EXCHANGE_ABI} = require("./abis/unswap");
const {KYBER_RATE_ADDRESS, KYBER_RATE_ABI} = require("./abis/kyber");

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
const uniswapFactoryContract = new ethers.Contract(UNISWAP_FACTORY_ADDRESS, UNISWAP_FACTORY_ABI, provider)
const kyberRateContract = new ethers.Contract(KYBER_RATE_ADDRESS, KYBER_RATE_ABI, provider)

async function checkPair(args) {
	const {inputTokenSymbol, inputTokenAddress, outputTokenSymbol, outputTokenAddress, inputAmount} = args

	const exchangeAddress = await uniswapFactoryContract.getExchange(outputTokenAddress)
	const exchangeContract = new ethers.Contract(exchangeAddress, UNISWAP_EXCHANGE_ABI, provider)

	const uniswapResult = await exchangeContract.getEthToTokenInputPrice(inputAmount)
	const kyberResult = await kyberRateContract.getExpectedRate(inputTokenAddress, outputTokenAddress, inputAmount, true)

	console.table([{
		'Input Token': inputTokenSymbol,
		'Output Token': outputTokenSymbol,
		'Input Amount': ethers.utils.formatUnits(inputAmount, 'ether'),
		'Uniswap Return': ethers.utils.formatUnits(uniswapResult, 'ether'),
		'Kyber Expected Rate': ethers.utils.formatUnits(kyberResult.expectedRate, 'ether'),
		'Kyber Min Return': ethers.utils.formatUnits(kyberResult.slippageRate, 'ether'),
		'Timestamp': moment().tz('America/Chicago').format(),
	}])
}

let priceMonitor
let monitoringPrice = false

async function monitorPrice() {
	if (monitoringPrice) {
		return
	}

	console.log("Checking prices...")
	monitoringPrice = true

	try {
		// ADD YOUR CUSTOM TOKEN PAIRS HERE!!!
		await checkPair({
			inputTokenSymbol: 'ETH',
			inputTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
			outputTokenSymbol: 'MKR',
			outputTokenAddress: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
			inputAmount: ethers.utils.parseUnits('1', 'ether')
		})

		// await checkPair({
		// 	inputTokenSymbol: 'ETH',
		// 	inputTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
		// 	outputTokenSymbol: 'DAI',
		// 	outputTokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
		// 	inputAmount: ethers.utils.parseUnits('1', 'ether')
		// })

		// await checkPair({
		// 	inputTokenSymbol: 'ETH',
		// 	inputTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
		// 	outputTokenSymbol: 'KNC',
		// 	outputTokenAddress: '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
		// 	inputAmount: ethers.utils.parseUnits('1', 'ether')
		// })

		// await checkPair({
		// 	inputTokenSymbol: 'ETH',
		// 	inputTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
		// 	outputTokenSymbol: 'LINK',
		// 	outputTokenAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
		// 	inputAmount: ethers.utils.parseUnits('1', 'ether')
		// })

	} catch (error) {
		console.error(error)
		monitoringPrice = false
		clearInterval(priceMonitor)
		return
	}

	monitoringPrice = false
}

// Check markets every n seconds
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000 // 3 Seconds
priceMonitor = setInterval(async () => {
	await monitorPrice()
}, POLLING_INTERVAL)

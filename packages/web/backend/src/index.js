require('dotenv').config()
const express = require('express')
const http = require('http')
const moment = require('moment-timezone')
const {ethers} = require("ethers");

// SERVER CONFIG
const PORT = process.env.PORT || 5019
const app = express();
const server = http.createServer(app).listen(PORT, () => console.log(`Listening on ${PORT}`))

// WEB3 CONFIG
const {QUICK_ROUTER, QUICK_ROUTER_ABI} = require('./abis/quickswap');
const {SHUSHI_ROUTER, SHUSHI_ROUTER_ABI, SHUSHI_WMATIC} = require("./abis/sushi");

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
const shushiRouter = new ethers.Contract(SHUSHI_ROUTER, SHUSHI_ROUTER_ABI, provider);
const quickRouter = new ethers.Contract(QUICK_ROUTER, QUICK_ROUTER_ABI, provider);

async function checkPair(args) {
	const {inputTokenSymbol, inputTokenAddress, outputTokenSymbol, outputTokenAddress, inputAmount, outputTokenDecimal} = args
	
    const [shushiResult, quickResult] = await Promise.all([
        shushiRouter.getAmountsOut(inputAmount, [inputTokenAddress, outputTokenAddress]),
        quickRouter.getAmountsOut(inputAmount, [inputTokenAddress, outputTokenAddress])
    ]);

    const shushiVal = Number(shushiResult[1]) / Math.pow(10, outputTokenDecimal);
    const quickVal = Number(quickResult[1]) / Math.pow(10, outputTokenDecimal);

    console.log(((shushiVal - quickVal) / shushiVal) * 100, "percent");

	console.table([{
		'Input Token': inputTokenSymbol,
		'Output Token': outputTokenSymbol,
		'Input Amount': ethers.utils.formatUnits(inputAmount, 'ether'),
		// 'Uniswap Return': ethers.utils.formatUnits(uniswapResult, 'ether'),
        'Quick Return': Number(quickResult[1]) / Math.pow(10, outputTokenDecimal),
        'Shushi Return': Number(shushiResult[1]) / Math.pow(10, outputTokenDecimal),
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
			inputTokenSymbol: 'WMATIC',
			inputTokenAddress: SHUSHI_WMATIC,
			outputTokenSymbol: 'USDC',
            outputTokenDecimal: 6,
			outputTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC Token
			inputAmount: ethers.utils.parseUnits('1', 'ether')
		})
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

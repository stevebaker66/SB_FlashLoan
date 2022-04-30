const _ = require("lodash");
const ZLFlashLoan = artifacts.require("ZLFlashLoan");
const MockToken = artifacts.require("MockToken");
const IRouter = artifacts.require("IUniswapV2Router02");

const ADDR = {
	routers: {
		uniV3: web3.utils.toChecksumAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564'),
		sushi: web3.utils.toChecksumAddress('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'),
	},
	tokens: {
		matic: web3.utils.toChecksumAddress('0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'),
		aave: web3.utils.toChecksumAddress('0xD6DF932A45C0f255f85145f286eA0b292B21C90B'),
		uni: web3.utils.toChecksumAddress('0xb33EaAd8d922B1083446DC23f610c2567fB5180f'),
		dai: web3.utils.toChecksumAddress('0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'),
	}
};


contract('ZLFlashLoan', accounts => {
	let scFlashloan;
	let scMockToken;
	let uniswapV2Router;

	before(async () => {
		scFlashloan = await ZLFlashLoan.deployed();
		scMockToken = await MockToken.deployed();
		uniswapV2Router = await IRouter.at(ADDR.routers.sushi);
	});
	/*
	it('Check who is owner', async () => {
		const owner = await scFlashloan.owner();
		assert.equal(owner, accounts[0], 'Wrong owner!');
	});

	it('[Sushi::performSwap] matic -> dai', async () => {
		const input = web3.utils.toWei('100', 'ether');
		await web3.eth.sendTransaction({
			from: accounts[2],
			to: scFlashloan.address,
			value: input
		});
		const balance = await web3.eth.getBalance(scFlashloan.address);
		console.log(`Contact balance(matic) = ${balance.toString()}`);

		const tx = await scFlashloan.performSwap(
			ADDR.routers.sushi,
			"0",
			ADDR.tokens.matic,
			input,
			ADDR.tokens.dai,
			0,
		);
		assert.equal(_.get(tx, 'receipt.status'), true, 'Transaction failed');
	});

	it('[Uniswap3::performSwap] matic -> dai', async () => {
		const input = web3.utils.toWei('100', 'ether');
		await web3.eth.sendTransaction({
			from: accounts[2],
			to: scFlashloan.address,
			value: input
		});
		const balance = await web3.eth.getBalance(scFlashloan.address);
		console.log(`Contact balance(matic) = ${balance.toString()}`);

		const tx = await scFlashloan.performSwap(
			ADDR.routers.uniV3,
			"1",
			ADDR.tokens.matic,
			input,
			ADDR.tokens.dai,
			0,
		);
		assert.equal(_.get(tx, 'receipt.status'), true, 'Transaction failed');
	});
	*/
	it('Flashloan<->Uniswap<->Sushiswap', async () => {
		const result = await scFlashloan.doTask(
			ADDR.tokens.matic,
			web3.utils.toWei('100'),
			[ADDR.routers.sushi, ADDR.routers.uniV3],
			["0", "1"],
			[ADDR.tokens.dai, ADDR.tokens.matic],
			{
				from: accounts[0],
				gasLimit: 30000000,
			}
		);
		assert.equal(result, accounts[0], 'Wrong owner!');
	});
});

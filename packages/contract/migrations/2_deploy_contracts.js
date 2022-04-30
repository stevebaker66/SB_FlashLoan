const _ = require('lodash');

const ZLFlashLoan = artifacts.require("ZLFlashLoan");
module.exports = function (deployer, network, accounts) {
	if (_.chain(network).toLower().startsWith('ganache')) {
		const MockToken = artifacts.require("MockToken");
		deployer.deploy(
			MockToken,
			{
				overwrite: true,
				from: accounts[0],
			}
		);
	}

	deployer.deploy(
		ZLFlashLoan,
		process.env.AAVE_POOL_ADDRESSES_PROVIDER,
		{
			overwrite: true,
			from: accounts[0],
		}
	);
};

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract ZLFlashLoan is FlashLoanSimpleReceiverBase, ReentrancyGuard, Ownable {

    enum RouterType {
        UniswapV2,
        UniswapV3
    }

    struct ZLTask {
        uint256 _blockNumber;
        uint256 _loanAmount;
        uint256 _loanFee;
        address _loanAsset;
        address[] _routers;
        RouterType[] _routerTypes;
        address[] _outputAssets;
    }

    address constant ETHER = address(0);
    ZLTask public _currentTask;

    event LogWithdraw(
        address indexed _from,
        address indexed _assetAddress,
        uint256 amount
    );
    event LogArbitrage(
        uint256 blockNumber,
        address indexed _assetAddress,
        uint256 amount
    );

    constructor(address poolAddressProvider_)
        FlashLoanSimpleReceiverBase(
            IPoolAddressesProvider(poolAddressProvider_)
        )
    {}

    function withdraw(address asset_) public nonReentrant onlyOwner {
        uint256 assetBalance;
        if (asset_ == ETHER) {
            assetBalance = address(this).balance;
						TransferHelper.safeTransferETH(msg.sender, assetBalance);
        } else {
            assetBalance = IERC20(asset_).balanceOf(address(this));
						TransferHelper.safeTransfer(asset_, msg.sender, assetBalance);
        }
        emit LogWithdraw(msg.sender, asset_, assetBalance);
    }

    function doTask(
        address loanAsset_,
        uint256 loanAmount_,
        address[] calldata routers_,
        RouterType[] calldata routerTypes_,
        address[] calldata outputAssets_
    ) external onlyOwner {
        require(
            loanAmount_ > 0 && loanAsset_ != address(0),
            "doTask: Invalid loan parameter!"
        );

        uint256 size = routers_.length;
        require(
            size > 0 &&
                size == routerTypes_.length &&
                size == outputAssets_.length,
            "doTask: Invalid swap routers & assets!"
        );
        require(
            outputAssets_[size - 1] == loanAsset_,
            "doTask: Swap routes should be closed!"
        );

        _currentTask = ZLTask({
            _blockNumber: block.number,
            _loanAmount: loanAmount_,
            _loanAsset: loanAsset_,
            _loanFee: 0,
            _routers: routers_,
            _routerTypes: routerTypes_,
            _outputAssets: outputAssets_
        });
        POOL.flashLoanSimple(address(this), loanAsset_, loanAmount_, "", 0);
    }

    function executeOperation(
        address asset_,
        uint256 amount_,
        uint256 premium_,
        address initiator_,
        bytes calldata params_
    ) external override returns (bool) {
        require(
            _currentTask._loanFee == 0 &&
                _currentTask._blockNumber == block.number,
            "executeOperation: Attack failed!"
        );

				_currentTask._loanFee = premium_;
 				require(performTask(), "executeOperation: Task failed!");

				TransferHelper.safeApprove(asset_, address(POOL), amount_ + premium_);
        delete _currentTask;
        return true;
    }

    receive() external payable {}

    fallback() external payable {}

    ////////////////////////////////////////////////////////////////////
    function performTask() public returns (bool) {
        uint256 inputAmount = _currentTask._loanAmount;
        address inputAsset = _currentTask._loanAsset;

        uint256 lastIdx = _currentTask._routers.length - 1;
        for (uint256 idx = 0; idx < lastIdx; idx++) {
            (, inputAmount) = performSwap(
                _currentTask._routers[idx],
                _currentTask._routerTypes[idx],
                inputAsset,
                inputAmount,
                _currentTask._outputAssets[idx],
                0
            );
            inputAsset = _currentTask._outputAssets[idx];
        }

        (uint256 benefit, uint256 endAmount) = performSwap(
            _currentTask._routers[lastIdx],
            _currentTask._routerTypes[lastIdx],
            inputAsset,
            inputAmount,
            _currentTask._outputAssets[lastIdx],
            _currentTask._loanAmount + _currentTask._loanFee
        );

        if (benefit > 0) {
            emit LogArbitrage(_currentTask._blockNumber, inputAsset, benefit);
        }

        return endAmount == _currentTask._loanAmount + _currentTask._loanFee;
    }

    function performSwap(
        address router_,
        RouterType routerType_,
        address inputAsset_,
        uint256 inputAmount_,
        address outputAsset_,
        uint256 outputAmount_
    ) public returns (uint256 inputRest_, uint256 output_) {
        if (routerType_ == RouterType.UniswapV2) {
            return
                _performSwapV2(
                    router_,
                    inputAsset_,
                    inputAmount_,
                    outputAsset_,
                    outputAmount_
                );
        }

        if (routerType_ == RouterType.UniswapV3) {
            return
                _performSwapV3(
                    router_,
                    inputAsset_,
                    inputAmount_,
                    outputAsset_,
                    outputAmount_
                );
        }
        return (0, 0);
    }

    function _performSwapV2(
        address router_,
        address inputAsset_,
        uint256 inputAmount_,
        address outputAsset_,
        uint256 outputAmount_
    ) private returns (uint256 inputRest_, uint256 output_) {
        IUniswapV2Router02 swapRouter = IUniswapV2Router02(router_);
				TransferHelper.safeApprove(inputAsset_, router_, inputAmount_);

        address[] memory path = new address[](2);
        path[0] = inputAsset_;
        path[1] = outputAsset_;

        uint256[] memory returnVal;
        if (outputAmount_ == 0) {
						/*
            if (inputAsset_ == swapRouter.WETH()) {
                returnVal = swapRouter.swapExactETHForTokens{
                    value: inputAmount_
                }(outputAmount_, path, address(this), block.timestamp + 8);
            } else if (outputAsset_ == swapRouter.WETH()) {
                returnVal = swapRouter.swapExactTokensForETH(
                    inputAmount_,
                    outputAmount_,
                    path,
                    address(this),
                    block.timestamp + 8
                );
            } else */{
                returnVal = swapRouter.swapExactTokensForTokens(
                    inputAmount_,
                    outputAmount_,
                    path,
                    address(this),
                    block.timestamp + 8
                );
            }
        } else {
            /*if (inputAsset_ == swapRouter.WETH()) {
                returnVal = swapRouter.swapETHForExactTokens{
                    value: inputAmount_
                }(outputAmount_, path, address(this), block.timestamp + 8);
            } else if (outputAsset_ == swapRouter.WETH()) {
                returnVal = swapRouter.swapTokensForExactETH(
                    outputAmount_,
                    inputAmount_,
                    path,
                    address(this),
                    block.timestamp + 8
                );
            } else */{
                returnVal = swapRouter.swapTokensForExactTokens(
                    outputAmount_,
                    inputAmount_,
                    path,
                    address(this),
                    block.timestamp + 8
                );
            }
        }

        inputRest_ = inputAmount_ - returnVal[0];
        if (inputRest_ > 0) {
						TransferHelper.safeApprove(inputAsset_, router_, 0);
						TransferHelper.safeTransferFrom(inputAsset_, address(this), msg.sender, inputRest_);
        }
        output_ = returnVal[1];
    }

    function _performSwapV3(
        address router_,
        address inputAsset_,
        uint256 inputAmount_,
        address outputAsset_,
        uint256 outputAmount_
    ) private returns (uint256 inputRest_, uint256 output_) {
        ISwapRouter swapRouter = ISwapRouter(router_);
				TransferHelper.safeApprove(inputAsset_, router_, inputAmount_);

				uint256 bal1 = address(this).balance;
				uint256 bal2 = IERC20(inputAsset_).balanceOf(address(this));


        if (outputAmount_ == 0) {
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: inputAsset_,
                    tokenOut: outputAsset_,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp + 8,
                    amountIn: inputAmount_,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            inputRest_ = 0;
            output_ = swapRouter.exactInputSingle{value: bal1}(params);
        } else {
            ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
                .ExactOutputSingleParams({
                    tokenIn: inputAsset_,
                    tokenOut: outputAsset_,
                    fee: 3000,
                    recipient: address(this),
                    deadline: block.timestamp + 8,
                    amountOut: outputAmount_,
                    amountInMaximum: inputAmount_,
                    sqrtPriceLimitX96: 0
                });
            uint256 used = swapRouter.exactOutputSingle{value: bal1}(params);
            inputRest_ = inputAmount_ - used;
            output_ = outputAmount_;
        }

				if (inputRest_ > 0) {
						TransferHelper.safeApprove(inputAsset_, router_, 0);
						TransferHelper.safeTransferFrom(inputAsset_, address(this), msg.sender, inputRest_);
				}
    }
}

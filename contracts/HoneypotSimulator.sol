// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HoneypotSimulator
 * @author malvaphe
 * @notice Buy -> sell -> transfer simulation used by Crypto Honeypot Detector.
 *
 * THIS CONTRACT IS NEVER DEPLOYED.
 * Its runtime bytecode is injected at a random address through the `stateOverride`
 * parameter of `eth_call`, together with a native-coin balance override. Everything
 * happens inside a read-only call: no transaction is sent, no real funds are needed
 * and nothing can be stolen, because on-chain there is nothing to steal from.
 *
 * Flow of `simulate`:
 *   1. wrap the (fake) native balance into the wrapped native token (WETH, WBNB, ...);
 *   2. if the base token is not the wrapped native token, swap wrapped native -> base;
 *   3. BUY:      swap base -> token, measuring expected vs received amounts (buy tax);
 *   4. APPROVE:  approve the router to spend the token;
 *   5. SELL:     swap a share of the token balance back to base (sell tax);
 *   6. TRANSFER: send the remaining tokens to a fresh address (transfer tax / blocks).
 *
 * Every external interaction is wrapped in a low-level call, so a revert never aborts
 * the simulation: the revert data is returned to the caller for diagnosis.
 */

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

interface IWETH {
    function deposit() external payable;
}

interface IUniswapV2Router {
    function factory() external view returns (address);
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IUniswapV3Pool {
    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);
}

contract HoneypotSimulator {
    uint8 internal constant KIND_V2 = 0;
    uint8 internal constant KIND_V3 = 1;

    // TickMath bounds (Uniswap V3 and forks), from v3-core/contracts/libraries/TickMath.sol
    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

    struct Request {
        uint8 kind; // 0 = Uniswap V2 style router, 1 = Uniswap V3 style pool
        address dex; // V2: router address, V3: factory address
        address wrappedNative; // WETH, WBNB, WAVAX, ...
        address base; // token paired with the tested token
        address token; // tested token
        uint24 baseFee; // V3 only: fee tier of the wrappedNative/base pool
        uint24 tokenFee; // V3 only: fee tier of the base/token pool
        uint256 amountIn; // native amount used for the buy
        uint16 sellBps; // share of the token balance to sell, in basis points
    }

    struct Step {
        bool success;
        uint256 expected; // amount the pool/router says it will send (before token taxes)
        uint256 received; // balance change actually observed
        uint256 gasUsed;
        bytes error; // revert data (empty on success)
    }

    struct Result {
        address pool; // pair / pool used for the tested token
        uint256 baseSpent; // base tokens spent for the buy
        uint256 poolBaseBalance; // base tokens held by the pool before the buy (liquidity)
        Step buy;
        bool approveOk;
        uint256 sellAmount; // tokens sent to the sell
        Step sell;
        uint256 transferAmount; // tokens sent to the fresh address
        Step transfer;
    }

    /// @dev Pool allowed to call the V3 swap callback (set only during a swap).
    address private activePool;

    /// @dev Raised by `probeTransfer` when the transfer succeeded (the probe always reverts).
    error ProbeOk();

    receive() external payable {}

    function simulate(Request calldata r) external returns (Result memory res) {
        require(r.sellBps <= 10000, "sellBps");

        // 1. Wrap native coin (the balance comes from the eth_call state override)
        IWETH(r.wrappedNative).deposit{value: r.amountIn}();

        // 2. Obtain the base token
        if (r.base == r.wrappedNative) {
            res.baseSpent = r.amountIn;
        } else {
            Step memory pre = r.kind == KIND_V2
                ? _swapV2(r.dex, r.wrappedNative, r.base, r.amountIn)
                : _swapV3(r.dex, r.wrappedNative, r.base, r.baseFee, r.amountIn);
            require(pre.success && pre.received > 0, "BASE_SWAP_FAILED");
            res.baseSpent = pre.received;
        }

        // 3. BUY
        res.pool = _pool(r);
        require(res.pool != address(0), "POOL_NOT_FOUND");
        res.poolBaseBalance = _balanceOf(r.base, res.pool);
        res.buy = r.kind == KIND_V2
            ? _swapV2(r.dex, r.base, r.token, res.baseSpent)
            : _swapV3(r.dex, r.base, r.token, r.tokenFee, res.baseSpent);
        if (!res.buy.success || res.buy.received == 0) return res;

        // 4. APPROVE (V3 swaps pay through the callback, no allowance needed)
        if (r.kind == KIND_V2) {
            res.approveOk = _approve(r.token, r.dex);
        } else {
            res.approveOk = true;
        }

        // 5. SELL
        uint256 balance = _balanceOf(r.token, address(this));
        res.sellAmount = (balance * r.sellBps) / 10000;
        if (res.sellAmount > 0) {
            res.sell = r.kind == KIND_V2
                ? _swapV2(r.dex, r.token, r.base, res.sellAmount)
                : _swapV3(r.dex, r.token, r.base, r.tokenFee, res.sellAmount);
            if (!res.sell.success) {
                // Routers hide the real reason ("TRANSFER_FROM_FAILED"): replay the token
                // movement of the sell (holder -> pool) to get the token's own revert reason.
                bytes memory reason = _probeTransfer(r.token, res.pool, res.sellAmount);
                if (reason.length > 0) res.sell.error = reason;
            }
        }

        // 6. TRANSFER the remaining tokens to a fresh address
        res.transferAmount = _balanceOf(r.token, address(this));
        if (res.transferAmount > 0) {
            res.transfer = _transferTest(r.token, res.transferAmount);
        }
    }

    // ---------------------------------------------------------------------
    // Uniswap V2 style
    // ---------------------------------------------------------------------

    function _swapV2(address router, address tokenIn, address tokenOut, uint256 amountIn)
        internal
        returns (Step memory s)
    {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        if (!_approve(tokenIn, router)) {
            s.error = bytes("APPROVE_FAILED");
            return s;
        }

        // Output computed by the router from the reserves, i.e. what the pair would send
        // if no token tax is applied. A failure here usually means "no liquidity".
        (bool ok, bytes memory ret) =
            router.staticcall(abi.encodeCall(IUniswapV2Router.getAmountsOut, (amountIn, path)));
        if (!ok) {
            s.error = ret;
            return s;
        }
        uint256[] memory amounts = abi.decode(ret, (uint256[]));
        s.expected = amounts[amounts.length - 1];

        uint256 before = _balanceOf(tokenOut, address(this));
        uint256 gasBefore = gasleft();
        (ok, ret) = router.call(
            abi.encodeCall(
                IUniswapV2Router.swapExactTokensForTokensSupportingFeeOnTransferTokens,
                (amountIn, 0, path, address(this), block.timestamp)
            )
        );
        s.gasUsed = gasBefore - gasleft();
        if (!ok) {
            s.error = ret;
            return s;
        }
        s.success = true;
        s.received = _delta(_balanceOf(tokenOut, address(this)), before);
    }

    // ---------------------------------------------------------------------
    // Uniswap V3 style (direct pool swap, works with every V3 fork)
    // ---------------------------------------------------------------------

    function _swapV3(address factory, address tokenIn, address tokenOut, uint24 fee, uint256 amountIn)
        internal
        returns (Step memory s)
    {
        address pool = IUniswapV3Factory(factory).getPool(tokenIn, tokenOut, fee);
        if (pool == address(0)) {
            s.error = bytes("POOL_NOT_FOUND");
            return s;
        }
        bool zeroForOne = tokenIn < tokenOut;
        uint256 before = _balanceOf(tokenOut, address(this));

        activePool = pool;
        uint256 gasBefore = gasleft();
        (bool ok, bytes memory ret) = pool.call(
            abi.encodeCall(
                IUniswapV3Pool.swap,
                (
                    address(this),
                    zeroForOne,
                    int256(amountIn),
                    zeroForOne ? MIN_SQRT_RATIO + 1 : MAX_SQRT_RATIO - 1,
                    abi.encode(tokenIn)
                )
            )
        );
        s.gasUsed = gasBefore - gasleft();
        activePool = address(0);

        if (!ok) {
            s.error = ret;
            return s;
        }
        (int256 amount0, int256 amount1) = abi.decode(ret, (int256, int256));
        int256 out = zeroForOne ? amount1 : amount0;
        s.expected = out < 0 ? uint256(-out) : 0;
        s.success = true;
        s.received = _delta(_balanceOf(tokenOut, address(this)), before);
    }

    function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata data) external {
        _v3Callback(amount0Delta, amount1Delta, data);
    }

    function pancakeV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata data) external {
        _v3Callback(amount0Delta, amount1Delta, data);
    }

    function _v3Callback(int256 amount0Delta, int256 amount1Delta, bytes calldata data) internal {
        require(msg.sender == activePool && msg.sender != address(0), "UNAUTHORIZED_CALLBACK");
        address tokenIn = abi.decode(data, (address));
        uint256 owed = uint256(amount0Delta > 0 ? amount0Delta : amount1Delta);
        (bool ok, bytes memory ret) = tokenIn.call(abi.encodeWithSelector(0xa9059cbb, msg.sender, owed));
        if (!ok) _bubble(ret);
        require(ret.length == 0 || abi.decode(ret, (bool)), "TRANSFER_FAILED");
    }

    // ---------------------------------------------------------------------
    // Diagnostics
    // ---------------------------------------------------------------------

    /// @notice Transfers `amount` of `token` to `to` and always reverts, so no state is kept.
    ///         Reverts with ProbeOk() on success or with the token's revert data on failure.
    function probeTransfer(address token, address to, uint256 amount) external {
        require(msg.sender == address(this), "ONLY_SELF");
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(0xa9059cbb, to, amount));
        if (!ok) _bubble(ret);
        revert ProbeOk();
    }

    /// @dev Returns the token revert data of a transfer, or empty bytes if it succeeds or
    ///      reverts without data.
    function _probeTransfer(address token, address to, uint256 amount) internal returns (bytes memory) {
        (, bytes memory ret) = address(this).call(abi.encodeCall(this.probeTransfer, (token, to, amount)));
        if (ret.length == 4 && bytes4(ret) == ProbeOk.selector) return "";
        return ret;
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _pool(Request calldata r) internal view returns (address) {
        if (r.kind == KIND_V2) {
            address factory = IUniswapV2Router(r.dex).factory();
            return IUniswapV2Factory(factory).getPair(r.base, r.token);
        }
        return IUniswapV3Factory(r.dex).getPool(r.base, r.token, r.tokenFee);
    }

    function _transferTest(address token, uint256 amount) internal returns (Step memory s) {
        address recipient = address(uint160(uint256(keccak256(abi.encode(address(this), block.number, amount)))));
        uint256 before = _balanceOf(token, recipient);
        s.expected = amount;
        uint256 gasBefore = gasleft();
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(0xa9059cbb, recipient, amount));
        s.gasUsed = gasBefore - gasleft();
        if (!ok) {
            s.error = ret;
            return s;
        }
        if (ret.length >= 32 && !abi.decode(ret, (bool))) {
            s.error = bytes("TRANSFER_RETURNED_FALSE");
            return s;
        }
        s.success = true;
        s.received = _delta(_balanceOf(token, recipient), before);
    }

    /// @dev approve that tolerates non-standard tokens (no return value, USDT style reset).
    function _approve(address token, address spender) internal returns (bool) {
        if (_tryApprove(token, spender, type(uint256).max)) return true;
        // Some tokens require resetting the allowance to zero first
        return _tryApprove(token, spender, 0) && _tryApprove(token, spender, type(uint256).max);
    }

    function _tryApprove(address token, address spender, uint256 amount) internal returns (bool) {
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(0x095ea7b3, spender, amount));
        return ok && (ret.length == 0 || (ret.length >= 32 && abi.decode(ret, (bool))));
    }

    function _balanceOf(address token, address account) internal view returns (uint256) {
        (bool ok, bytes memory ret) = token.staticcall(abi.encodeCall(IERC20.balanceOf, (account)));
        if (!ok || ret.length < 32) return 0;
        return abi.decode(ret, (uint256));
    }

    function _delta(uint256 afterBalance, uint256 beforeBalance) internal pure returns (uint256) {
        return afterBalance > beforeBalance ? afterBalance - beforeBalance : 0;
    }

    function _bubble(bytes memory ret) internal pure {
        assembly {
            revert(add(ret, 32), mload(ret))
        }
    }
}

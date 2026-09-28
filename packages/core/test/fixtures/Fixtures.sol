// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Test-only contracts used by the local testbed. NEVER deploy these anywhere.

contract WETH9 {
    string public name = "Wrapped Ether";
    string public symbol = "WETH";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    receive() external payable { deposit(); }

    function deposit() public payable { balanceOf[msg.sender] += msg.value; }

    function withdraw(uint256 wad) external {
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
    }

    function totalSupply() external view returns (uint256) { return address(this).balance; }

    function approve(address guy, uint256 wad) external returns (bool) {
        allowance[msg.sender][guy] = wad;
        return true;
    }

    function transfer(address dst, uint256 wad) external returns (bool) { return transferFrom(msg.sender, dst, wad); }

    function transferFrom(address src, address dst, uint256 wad) public returns (bool) {
        require(balanceOf[src] >= wad, "WETH: balance");
        if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
            require(allowance[src][msg.sender] >= wad, "WETH: allowance");
            allowance[src][msg.sender] -= wad;
        }
        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        return true;
    }
}

/// @notice Configurable ERC20 that can behave like the most common scam patterns.
contract TestToken {
    // Behaviour flags
    uint256 public constant BLOCK_SELLS = 1; // sells revert (classic honeypot)
    uint256 public constant SELL_ONLY_IF_ZERO_GASPRICE = 2; // sells work only in simulations
    uint256 public constant BLOCK_EOA_SELLS = 4; // sells work for contracts, not for wallets
    uint256 public constant ALLOWANCE_SAME_BLOCK = 8; // approvals expire after the block they were set in
    uint256 public constant BLOCK_TRANSFERS = 16; // wallet-to-wallet transfers revert
    uint256 public constant TRADING_DISABLED = 32; // buys revert
    uint256 public constant BLOCK_KNOWN_ADDRESS = 64; // sells revert unless seller is `whitelisted`
    uint256 public constant SELL_ONLY_FROM_CONTRACT_CODE_CHECK = 128; // unused marker

    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    address public owner;
    uint256 public flags;
    uint256 public buyTaxBps;
    uint256 public sellTaxBps;
    uint256 public transferTaxBps;
    uint256 public _maxTxAmount;
    address public whitelisted;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) private _allowance;
    mapping(address => mapping(address => uint256)) private _allowanceBlock;
    mapping(address => bool) public isPair;

    constructor(string memory _name, string memory _symbol, uint256 supply) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        totalSupply = supply;
        balanceOf[msg.sender] = supply;
        _maxTxAmount = type(uint256).max;
    }

    function configure(uint256 _flags, uint256 _buyTax, uint256 _sellTax, uint256 _transferTax, uint256 _maxTx)
        external
    {
        require(msg.sender == owner, "owner");
        flags = _flags;
        buyTaxBps = _buyTax;
        sellTaxBps = _sellTax;
        transferTaxBps = _transferTax;
        _maxTxAmount = _maxTx;
    }

    function setPair(address pair, bool value) external {
        require(msg.sender == owner, "owner");
        isPair[pair] = value;
    }

    function setWhitelisted(address who) external {
        require(msg.sender == owner, "owner");
        whitelisted = who;
    }

    function renounceOwnership() external {
        require(msg.sender == owner, "owner");
        owner = address(0);
    }

    function allowance(address holder, address spender) public view returns (uint256) {
        if (flags & ALLOWANCE_SAME_BLOCK != 0 && _allowanceBlock[holder][spender] != block.number) return 0;
        return _allowance[holder][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowance[msg.sender][spender] = amount;
        _allowanceBlock[msg.sender][spender] = block.number;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 current = allowance(from, msg.sender);
        require(current >= amount, "ERC20: insufficient allowance");
        if (current != type(uint256).max) _allowance[from][msg.sender] = current - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "ERC20: balance");
        bool excluded = from == owner || to == owner;
        uint256 taxBps;

        if (!excluded) {
            require(amount <= _maxTxAmount, "Max transaction exceeded");
            if (isPair[from]) {
                require(flags & TRADING_DISABLED == 0, "Trading not enabled");
                taxBps = buyTaxBps;
            } else if (isPair[to]) {
                require(flags & BLOCK_SELLS == 0, "Sells are disabled");
                if (flags & SELL_ONLY_IF_ZERO_GASPRICE != 0) require(tx.gasprice == 0, "Nope");
                if (flags & BLOCK_EOA_SELLS != 0) require(from.code.length > 0, "Nope");
                if (flags & BLOCK_KNOWN_ADDRESS != 0) require(from == whitelisted, "Nope");
                taxBps = sellTaxBps;
            } else {
                require(flags & BLOCK_TRANSFERS == 0, "Transfers are disabled");
                taxBps = transferTaxBps;
            }
        }

        uint256 tax = (amount * taxBps) / 10000;
        balanceOf[from] -= amount;
        balanceOf[to] += amount - tax;
        if (tax > 0) balanceOf[address(0xdead)] += tax;
    }
}

interface IERC20Min {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IUniswapV3PoolMin {
    function mint(address recipient, int24 tickLower, int24 tickUpper, uint128 amount, bytes calldata data)
        external
        returns (uint256 amount0, uint256 amount1);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/// @notice Adds full-range liquidity to a Uniswap V3 pool (test helper).
contract V3LiquidityHelper {
    function mint(address pool, int24 tickLower, int24 tickUpper, uint128 liquidity) external {
        IUniswapV3PoolMin(pool).mint(msg.sender, tickLower, tickUpper, liquidity, abi.encode(msg.sender, pool));
    }

    function uniswapV3MintCallback(uint256 amount0Owed, uint256 amount1Owed, bytes calldata data) external {
        (address payer, address pool) = abi.decode(data, (address, address));
        require(msg.sender == pool, "pool");
        if (amount0Owed > 0) IERC20Min(IUniswapV3PoolMin(pool).token0()).transferFrom(payer, pool, amount0Owed);
        if (amount1Owed > 0) IERC20Min(IUniswapV3PoolMin(pool).token1()).transferFrom(payer, pool, amount1Owed);
    }
}

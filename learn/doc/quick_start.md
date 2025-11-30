# 🚀 Sui Move + Rust 快速入门指南

## 📋 第一步：环境准备（30分钟）

### 安装 Rust
```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 重启终端或运行
source ~/.cargo/env

# 验证安装
rustc --version
cargo --version
```

### 安装 Sui CLI
```bash
# 安装 Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui

# 验证安装
sui --version
```

### 配置 Sui 网络
```bash
# 初始化 Sui 客户端（选择 testnet）
sui client

# 查看当前网络
sui client active-address
sui client envs
```

## 🔥 第二步：第一个 Rust 程序（15分钟）

创建你的第一个 Rust 项目：

```bash
# 创建新项目
cargo hello_ocnetwork
cd hello_ocnetwork

# 运行项目
cargo run
```

编辑 `src/main.rs`：
```rust
fn main() {
    println!("🤖 Welcome to OCNetwork!");
    
    let bot_name = "OC-Bot-001";
    let price = 1000;
    
    println!("Bot: {}", bot_name);
    println!("Price: {} SUI", price);
    
    let result = calculate_profit(price, 0.1);
    println!("Expected profit: {} SUI", result);
}

fn calculate_profit(price: u64, rate: f64) -> u64 {
    (price as f64 * rate) as u64
}
```

运行并查看结果：
```bash
cargo run
```

## ⚡ 第三步：第一个 Move 合约（30分钟）

### 创建 Move 项目
```bash
# 在你的项目目录中
mkdir move_hello
cd move_hello

# 创建 Move.toml
cat > Move.toml << EOF
[package]
name = "hello_oc"
version = "0.0.1"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "testnet-v1.60.0" }

[addresses]
hello_oc = "0x0"
EOF

# 创建源码目录
mkdir sources
```

### 创建你的第一个 Move 合约

创建 `sources/hello.move`：
```move
module hello_oc::hello {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    
    /// 简单的问候对象
    public struct Greeting has key {
        id: UID,
        message: String,
        from: address,
    }
    
    /// 创建问候对象
    public fun create_greeting(
        message: String,
        ctx: &mut TxContext
    ): Greeting {
        Greeting {
            id: object::new(ctx),
            message,
            from: tx_context::sender(ctx),
        }
    }
    
    /// 获取问候消息
    public fun get_message(greeting: &Greeting): String {
        greeting.message
    }
    
    /// 获取发送者地址
    public fun get_from(greeting: &Greeting): address {
        greeting.from
    }
    
    /// 转移问候对象给指定地址
    public fun transfer_greeting(
        greeting: Greeting,
        to: address,
        _ctx: &mut TxContext
    ) {
        transfer::public_transfer(greeting, to);
    }
}
```

### 构建和测试合约
```bash
# 构建合约
sui move build

# 如果构建成功，你会看到：
# "Build successful"
```

## 🧪 第四步：测试 Move 合约（20分钟）

在 `sources/hello.move` 文件末尾添加测试：

```move
#[test_only]
use sui::test_scenario;

#[test]
fun test_create_greeting() {
    let mut scenario = test_scenario::begin(@0x1);
    let ctx = test_scenario::ctx(&mut scenario);
    
    let message = b"Hello, OCNetwork!";
    let greeting = create_greeting(string::utf8(message), ctx);
    
    // 验证消息
    assert!(get_message(&greeting) == string::utf8(message));
    
    // 验证发送者
    assert!(get_from(&greeting) == @0x1);
    
    test_scenario::end(scenario);
}
```

运行测试：
```bash
sui move test
```

## 🚀 第五步：部署到测试网（15分钟）

### 发布合约
```bash
# 确保你有测试网 SUI 代币
sui client gas

# 如果没有，从水龙头获取
# 访问：https://faucet.testnet.sui.io/

# 发布合约
sui client publish --gas-budget 1000000000
```

### 记录重要信息
发布成功后，你会看到类似输出：
```
PackageID: 0x1234567890abcdef...
UpgradeCap: 0xabcdef1234567890...
```

保存这些 ID，它们很重要！

## 🎯 第六步：与合约交互（20分钟）

### 创建交互脚本
创建 `interact.js`：
```javascript
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { fromB64 } = require('@mysten/sui.js/utils');

// 配置
const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const PACKAGE_ID = '0x你的包ID'; // 替换为你的包ID

// 创建问候对象
async function createGreeting(message) {
    const keypair = Ed25519Keypair.fromSecretKey(
        fromB64('你的私钥') // 替换为你的私钥
    );
    
    const tx = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: {
            kind: 'programmableTransaction',
            transactions: [{
                target: `${PACKAGE_ID}::hello::create_greeting`,
                arguments: [message],
            }],
        },
    });
    
    console.log('Transaction:', tx);
}

// 运行
createGreeting('Hello from OCNetwork!');
```

## 📚 第七步：学习项目代码（持续进行）

### 分析你的 OCNetwork 项目

1. **查看合约结构**：
```bash
cd contracts
find sources -name "*.move" | head -5
```

2. **理解核心模块**：
```bash
# 查看机器人核心逻辑
cat sources/oc_bot.move | head -20

# 查看交易对象
cat sources/trading_object.move | head -20

# 查看对象钱包
cat sources/object_wallet.move | head -20
```

3. **运行项目测试**：
```bash
sui move test
```

## 🎮 第八步：实践练习（每天30分钟）

### Rust 练习
```rust
// 练习1：创建一个交易机器人结构体
#[derive(Debug)]
struct TradingBot {
    name: String,
    balance: u64,
    strategy: String,
}

impl TradingBot {
    fn new(name: String, initial_balance: u64) -> Self {
        Self {
            name,
            balance: initial_balance,
            strategy: "conservative".to_string(),
        }
    }
    
    fn trade(&mut self, amount: u64, profit_rate: f64) -> bool {
        if self.balance >= amount {
            self.balance -= amount;
            let profit = (amount as f64 * profit_rate) as u64;
            self.balance += amount + profit;
            true
        } else {
            false
        }
    }
}

fn main() {
    let mut bot = TradingBot::new("OC-Bot-001".to_string(), 1000);
    
    println!("Bot: {}, Balance: {}", bot.name, bot.balance);
    
    if bot.trade(100, 0.1) {
        println!("Trade successful! New balance: {}", bot.balance);
    }
}
```

### Move 练习
```move
module practice::trading_bot {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    
    public struct TradingBot has key {
        id: UID,
        owner: address,
        name: String,
        balance: Coin<SUI>,
    }
    
    public fun create_bot(
        name: String,
        initial_fund: Coin<SUI>,
        ctx: &mut TxContext
    ): TradingBot {
        TradingBot {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            name,
            balance: initial_fund,
        }
    }
    
    public fun get_balance(bot: &TradingBot): u64 {
        coin::value(&bot.balance)
    }
    
    public fun get_name(bot: &TradingBot): String {
        bot.name
    }
}
```

## 📈 学习进度跟踪

### 第1周目标
- [ ] 完成环境搭建
- [ ] 运行第一个 Rust 程序
- [ ] 创建和测试第一个 Move 合约
- [ ] 成功部署到测试网

### 第2周目标
- [ ] 理解 Rust 所有权概念
- [ ] 掌握 Move 资源模型
- [ ] 分析 OCNetwork 项目结构
- [ ] 完成至少 3 个练习项目

## 🔧 常用命令速查

### Rust 命令
```bash
cargo new project_name          # 创建新项目
cargo run                       # 运行项目
cargo build                     # 构建项目
cargo test                      # 运行测试
cargo clippy                    # 代码检查
```

### Sui 命令
```bash
sui client                      # 查看客户端信息
sui client active-address       # 查看当前地址
sui client gas                  # 查看余额
sui move build                  # 构建合约
sui move test                   # 测试合约
sui client publish              # 发布合约
```

## 🆘 获取帮助

### 官方资源
- [Sui 官方文档](https://docs.sui.io/)
- [Rust 官方文档](https://doc.rust-lang.org/)
- [Move 语言指南](https://move-book.com/)

### 社区支持
- [Sui Discord](https://discord.gg/sui)
- [Rust 用户论坛](https://users.rust-lang.org/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/sui)

### 项目特定帮助
```bash
# 查看项目帮助
cd ocnetwork
cat README.md

# 查看合约文档
cd contracts
sui move doc

# 查看前端配置
cd frontweb
cat package.json
```

## 🎯 下一步

完成快速入门后，建议：

1. **深入学习**：按照 `step.md` 中的详细计划学习
2. **实践项目**：基于 OCNetwork 项目进行扩展开发
3. **参与社区**：加入 Sui 开发者社区，获取最新信息
4. **持续练习**：每天编写代码，保持技能提升

---

**记住：学习编程是一个渐进的过程，不要急于求成。每天进步一点点，坚持下去就能成功！** 💪

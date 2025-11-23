#[allow(unused_use, lint(self_transfer))]
module restart_oc::oc_bot;

use restart_oc::object_wallet::{Self, ObjectWallet};
use std::ascii::{Self, string};
use std::debug::{Self, print};
use std::option::{Self, Option};
use std::string::{Self, utf8, String};
use std::type_name;
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID};
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

/// OcBot对象基础核心结构体
public struct OcBot has key, store {
    id: UID,
    owner: address,
    profile_picture: String,
    wallet_id: Option<ID>, // 关联的钱包ID
}

/// 交易对象结构（基于OcBot）
public struct OcBotTrading has key, store {
    id: UID,
    oc: OcBot,
    owner: address,
    profile_picture: String,
    wallet_id: Option<ID>, // 关联的钱包ID
    bot: String,
    emoji: String,
    blob_id: String,
    price: u64,
    token_type: String,
    is_for_sale: bool,
}

/// 创建 OcBotTrading 对象的初始化函数
public fun create_oc_bot_trading(
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    ctx: &mut TxContext,
): OcBotTrading {
    let id = object::new(ctx);
    let ocid = object::uid_to_inner(&id);
    
    // 创建基础的 OcBot 对象
    let oc_bot = OcBot {
        id: object::new(ctx),
        owner: tx_context::sender(ctx),
        profile_picture: profile_picture,
        wallet_id: option::none(),
    };
    
    OcBotTrading {
        id,
        oc: oc_bot,
        owner: tx_context::sender(ctx),
        profile_picture,
        wallet_id: option::none(),
        bot,
        emoji,
        blob_id,
        price,
        token_type,
        is_for_sale: true,
    }
}

/// 创建带钱包的 OcBotTrading 对象
public fun create_oc_bot_trading_with_wallet(
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    clock: &Clock,
    ctx: &mut TxContext,
): (OcBotTrading, ObjectWallet) {
    let id = object::new(ctx);
    let ocid = object::uid_to_inner(&id);
    
    // 创建基础的 OcBot 对象
    let oc_bot = OcBot {
        id: object::new(ctx),
        owner: tx_context::sender(ctx),
        profile_picture: profile_picture,
        wallet_id: option::none(),
    };
    
    let trading_object = OcBotTrading {
        id,
        oc: oc_bot,
        owner: tx_context::sender(ctx),
        profile_picture,
        wallet_id: option::none(),
        bot,
        emoji,
        blob_id,
        price,
        token_type,
        is_for_sale: false, // 创建时默认不可售
    };

    // 为对象创建钱包
    let object_id = object::uid_to_inner(&trading_object.id);
    let wallet = object_wallet::create_object_wallet(object_id, clock, ctx);
    let wallet_id = object_wallet::get_wallet_id(&wallet);

    // 更新对象的钱包ID
    let mut updated_object = trading_object;
    option::fill(&mut updated_object.wallet_id, wallet_id);

    (updated_object, wallet)
}

/// 获取 OcBotTrading 的基本信息
public fun get_oc_bot_trading_info(
    object: &OcBotTrading,
): (address, String, String, String, String, u64, String, bool) {
    (
        object.owner,
        object.bot,
        object.emoji,
        object.profile_picture,
        object.blob_id,
        object.price,
        object.token_type,
        object.is_for_sale,
    )
}

/// 获取 OcBotTrading 的对象ID
public fun get_oc_bot_trading_id(object: &OcBotTrading): ID {
    object::uid_to_inner(&object.id)
}

/// 获取 OcBotTrading 的所有者
public fun get_oc_bot_trading_owner(object: &OcBotTrading): address {
    object.owner
}

/// 检查 OcBotTrading 是否有关联钱包
public fun has_oc_bot_trading_wallet(object: &OcBotTrading): bool {
    option::is_some(&object.wallet_id)
}

/// 获取 OcBotTrading 的钱包ID
public fun get_oc_bot_trading_wallet_id(object: &OcBotTrading): Option<ID> {
    object.wallet_id
}

/// 更新 OcBotTrading 的销售状态
public fun update_oc_bot_trading_sale_status(
    object: &mut OcBotTrading,
    is_for_sale: bool,
    ctx: &mut TxContext,
) {
    assert!(object.owner == tx_context::sender(ctx), 0); // 只有所有者可以更新状态
    object.is_for_sale = is_for_sale;
}

/// 更新 OcBotTrading 的价格
public fun update_oc_bot_trading_price(
    object: &mut OcBotTrading,
    new_price: u64,
    ctx: &mut TxContext,
) {
    assert!(object.owner == tx_context::sender(ctx), 0); // 只有所有者可以更新价格
    object.price = new_price;
}

/// 销毁 OcBotTrading 对象
public fun destroy_oc_bot_trading(object: OcBotTrading, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(object.owner == sender, 0); // 只有所有者可以销毁
    assert!(!object.is_for_sale, 1); // 不能销毁在售对象

    let OcBotTrading {
        id: old_id,
        oc: oc_bot,
        owner: _,
        profile_picture: _,
        wallet_id: _,
        bot: _,
        emoji: _,
        blob_id: _,
        price: _,
        token_type: _,
        is_for_sale: _,
    } = object;

    // 销毁内部的 OcBot 对象
    let OcBot {
        id: oc_bot_id,
        owner: _,
        profile_picture: _,
        wallet_id: _,
    } = oc_bot;

    object::delete(oc_bot_id);
    object::delete(old_id);
}

#[test_only]
use sui::test_scenario;

#[test]
fun test_create_oc_bot_trading() {
    let mut scenario = test_scenario::begin(@0x1);
    let ctx = test_scenario::ctx(&mut scenario);
    
    let bot = string::utf8(b"test_bot");
    let emoji = string::utf8(b"🤖");
    let profile_picture = string::utf8(b"test_avatar.png");
    let blob_id = string::utf8(b"blob_123");
    let price = 1000000;
    let token_type = string::utf8(b"SUI");
    
    let mut trading_object = create_oc_bot_trading(
        bot,
        emoji,
        profile_picture,
        blob_id,
        price,
        token_type,
        ctx,
    );
    
    // 验证创建的对象
    let (owner, bot, emoji, profile_picture, blob_id, price, token_type, is_for_sale) = get_oc_bot_trading_info(&trading_object);
    assert!(owner == @0x1); // owner
    assert!(bot == string::utf8(b"test_bot")); // bot
    assert!(emoji == string::utf8(b"🤖")); // emoji
    assert!(profile_picture == string::utf8(b"test_avatar.png")); // profile_picture
    assert!(blob_id == string::utf8(b"blob_123")); // blob_id
    assert!(price == 1000000); // price
    assert!(token_type == string::utf8(b"SUI")); // token_type
    assert!(is_for_sale == true); // is_for_sale
    
    // 验证ID获取
    let object_id = get_oc_bot_trading_id(&trading_object);
    let owner = get_oc_bot_trading_owner(&trading_object);
    assert!(owner == @0x1);
    
    // 测试更新销售状态
    update_oc_bot_trading_sale_status(&mut trading_object, false, ctx);
    let (_, _, _, _, _, _, _, updated_is_for_sale) = get_oc_bot_trading_info(&trading_object);
    assert!(updated_is_for_sale == false); // is_for_sale should be false
    
    // 测试更新价格
    update_oc_bot_trading_price(&mut trading_object, 2000000, ctx);
    let (_, _, _, _, _, updated_price, _, _) = get_oc_bot_trading_info(&trading_object);
    assert!(updated_price == 2000000); // price should be updated
    
    // 销毁对象
    destroy_oc_bot_trading(trading_object, ctx);
    
    test_scenario::end(scenario);
}

// ===== 与市场集成的上架函数 =====

/// 创建并上架 OcBotTrading 对象到市场（需要权限）
/// 这个函数调用 trading_object 模块中的相应函数
public fun create_and_list_oc_bot_trading(
    marketplace: &mut restart_oc::trading_object::Marketplace,
    cap_manager: &restart_oc::trading_object::CapManager,
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    ctx: &mut TxContext,
) {
    restart_oc::trading_object::create_and_list_oc_bot_trading(
        marketplace,
        cap_manager,
        bot,
        emoji,
        profile_picture,
        blob_id,
        price,
        token_type,
        ctx,
    );
}

/// 创建并上架 OcBotTrading 对象到市场（管理员版本，无需权限检查）
public fun create_and_list_oc_bot_trading_admin(
    marketplace: &mut restart_oc::trading_object::Marketplace,
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    ctx: &mut TxContext,
) {
    restart_oc::trading_object::create_and_list_oc_bot_trading_admin(
        marketplace,
        bot,
        emoji,
        profile_picture,
        blob_id,
        price,
        token_type,
        ctx,
    );
}

#[test]
fun test_create_oc_bot_trading_with_wallet() {
    let mut scenario = test_scenario::begin(@0x2);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // 创建 Clock 对象用于测试
    let clock = test_scenario::clock(&scenario);
    
    let bot = string::utf8(b"wallet_bot");
    let emoji = string::utf8(b"🔧");
    let profile_picture = string::utf8(b"wallet_avatar.png");
    let blob_id = string::utf8(b"blob_456");
    let price = 500000;
    let token_type = string::utf8(b"USDC");
    
    let (trading_object, wallet) = create_oc_bot_trading_with_wallet(
        bot,
        emoji,
        profile_picture,
        blob_id,
        price,
        token_type,
        clock,
        ctx,
    );
    
    // 验证创建的对象
    let (owner, bot, emoji, _, _, _, _, is_for_sale) = get_oc_bot_trading_info(&trading_object);
    assert!(owner == @0x2); // owner
    assert!(bot == string::utf8(b"wallet_bot")); // bot
    assert!(emoji == string::utf8(b"🔧")); // emoji
    assert!(is_for_sale == false); // is_for_sale should be false by default
    
    // 验证钱包关联
    assert!(has_oc_bot_trading_wallet(&trading_object) == true);
    let wallet_id = get_oc_bot_trading_wallet_id(&trading_object);
    assert!(option::is_some(&wallet_id));
    
    // 销毁对象和钱包
    destroy_oc_bot_trading(trading_object, ctx);
    object_wallet::destroy_object_wallet(wallet);
    
    test_scenario::end(scenario);
}

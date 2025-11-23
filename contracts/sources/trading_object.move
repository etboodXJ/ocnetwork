#[allow(unused_use, lint(self_transfer))]
module restart_oc::trading_object;

use restart_oc::object_wallet::{Self, ObjectWallet};
use std::ascii::{Self, string};
use std::debug::{Self, print};
use std::option::{Self, Option};
use std::string::{Self, utf8, String};
use std::type_name;
use sui::coin::{Self, Coin};
use sui::clock::{Self, Clock};
use sui::event;
use sui::object::{Self, UID};
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

/// OC对象基础核心结构体
public struct OcObject has key, store {
    id: UID,
    owner: address,
    profile_picture: String,
    wallet_id: Option<ID>, // 关联的钱包ID
}

/// 交易对象结构（基于OcObject）
public struct TradingObject has key, store {
    id: UID,
    ocid: ID,
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

/// 上架权限 Cap
public struct ListingCap has key, store {
    id: UID,
    owner: address,  // Cap 持有者
    granted_by: address,  // 授权者（通常是发布者）
    created_at: u64,
}

/// Cap 管理器
public struct CapManager has key {
    id: UID,
    admin: address,  // 管理员（发布者）
    caps: Table<address, ListingCap>,  // address -> cap
}

/// 市场共享对象
public struct Marketplace has key {
    id: UID,
    objects: vector<TradingObject>, // 存储完整的 TradingObject
    admin: address,
    treasury: address, // 接收代币支付的地址
    supported_tokens: Table<String, u64>, // 支持的代币类型名称表，name -> index
    is_paused: bool, // 市场暂停开关
}

/// 购买事件
public struct ObjectPurchased has copy, drop {
    object_id: ID,
    seller: address,
    buyer: address,
    price: u64,
    token_type: String,
    marketplace_fee: u64,
    timestamp: u64,
}

/// 创建新的交易对象并直接上架到市场（需要权限）
public fun create_and_list_trading_object(
    marketplace: &mut Marketplace,
    cap_manager: &CapManager,
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    ctx: &mut TxContext,
) {
    // 检查上架权限
    let sender = tx_context::sender(ctx);
    assert!(has_listing_permission(cap_manager, sender), 24); // 没有上架权限

    let id = object::new(ctx);
    let ocid = object::uid_to_inner(&id);
    let trading_object = TradingObject {
        id,
        ocid,
        owner: tx_context::sender(ctx),
        profile_picture,
        wallet_id: option::none(),
        bot,
        emoji,
        blob_id,
        price,
        token_type,
        is_for_sale: true,
    };

    vector::push_back(&mut marketplace.objects, trading_object);
}

/// 创建新的交易对象并直接上架到市场（管理员版本，无需权限检查）
public fun create_and_list_trading_object_admin(
    marketplace: &mut Marketplace,
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    ctx: &mut TxContext,
) {
    assert!(tx_context::sender(ctx) == marketplace.admin, 7); // 只有管理员

    let id = object::new(ctx);
    let ocid = object::uid_to_inner(&id);
    let trading_object = TradingObject {
        id,
        ocid,
        owner: tx_context::sender(ctx),
        profile_picture,
        wallet_id: option::none(),
        bot,
        emoji,
        blob_id,
        price,
        token_type,
        is_for_sale: true,
    };

    vector::push_back(&mut marketplace.objects, trading_object);
}

/// 创建新的交易对象（不自动上架）
public fun create_trading_object(
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    ctx: &mut TxContext,
): TradingObject {
    let id = object::new(ctx);
    let ocid = object::uid_to_inner(&id);
    TradingObject {
        id,
        ocid,
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

/// 初始化市场
fun init_marketplace(treasury: address, ctx: &mut TxContext) {
    let admin = tx_context::sender(ctx);
    
    // 创建市场
    let marketplace = Marketplace {
        id: object::new(ctx),
        objects: vector::empty(),
        admin,
        treasury,
        supported_tokens: table::new(ctx),
        is_paused: false, // 初始化为未暂停状态
    };
    transfer::share_object(marketplace);

    // 创建 Cap 管理器
    let mut cap_manager = CapManager {
        id: object::new(ctx),
        admin,
        caps: table::new(ctx),
    };

    // 为发布者创建上架权限 Cap 并存储在管理器中
    let mut admin_cap = ListingCap {
        id: object::new(ctx),
        owner: admin,
        granted_by: admin,
        created_at: tx_context::epoch(ctx),
    };
    
    // 将 Cap 存储在管理器中
    table::add(&mut cap_manager.caps, admin, admin_cap);
    
    // 重新创建一个 Cap 给发布者（因为上面的已经存储在表中）
    let publisher_cap = ListingCap {
        id: object::new(ctx),
        owner: admin,
        granted_by: admin,
        created_at: tx_context::epoch(ctx),
    };
    
    // 将 Cap 转移给发布者
    transfer::public_transfer(publisher_cap, admin);
    
    transfer::share_object(cap_manager);
}

// tw
public struct TRADING_OBJECT has drop {}

#[allow(unused_function)]
fun init(_otw: TRADING_OBJECT, ctx: &mut TxContext) {
    let admin = tx_context::sender(ctx);
    init_marketplace(admin, ctx)
}

/// 检查代币类型是否被支持
public fun is_token_supported<T>(marketplace: &Marketplace): bool {
    let tpname = type_name::with_defining_ids<T>();
    let fullname = *tpname.as_string();
    table::contains(&marketplace.supported_tokens, string::from_ascii(fullname))
}

/// 添加支持的代币类型 (仅管理员)
public fun add_supported_token<T>(marketplace: &mut Marketplace, ctx: &mut TxContext) {
    assert!(tx_context::sender(ctx) == marketplace.admin, 7); // 仅管理员可操作

    let tpname = type_name::with_defining_ids<T>();
    let fullname = *tpname.as_string();

    if (!table::contains(&marketplace.supported_tokens, string::from_ascii(fullname))) {
        let current_count = table::length(&marketplace.supported_tokens);
        table::add(&mut marketplace.supported_tokens, string::from_ascii(fullname), current_count);
    };
}

/// 移除支持的代币类型 (仅管理员)
public fun remove_supported_token<T>(marketplace: &mut Marketplace, ctx: &mut TxContext) {
    assert!(tx_context::sender(ctx) == marketplace.admin, 7); // 仅管理员可操作

    let tpname = type_name::with_defining_ids<T>();
    let fullname = *tpname.as_string();

    if (table::contains(&marketplace.supported_tokens, string::from_ascii(fullname))) {
        table::remove(&mut marketplace.supported_tokens, string::from_ascii(fullname));
    };
}

/// 检查特定代币类型名称是否被支持
public fun is_token_type_supported<T>(marketplace: &Marketplace): bool {
    let tpname = type_name::with_defining_ids<T>();
    let fullname = *tpname.as_string();
    table::contains(&marketplace.supported_tokens, string::from_ascii(fullname))
}

/// 获取支持的代币数量
public fun get_supported_tokens_count(marketplace: &Marketplace): u64 {
    table::length(&marketplace.supported_tokens)
}

/// 上架对象到市场（需要权限）
public fun list_object(
    marketplace: &mut Marketplace,
    cap_manager: &CapManager,
    object: TradingObject,
    ctx: &mut TxContext,
) {
    assert!(!marketplace.is_paused, 9); // 检查市场是否暂停
    assert!(object.owner == tx_context::sender(ctx), 0);
    assert!(object.is_for_sale, 1);
    
    // 检查上架权限
    let sender = tx_context::sender(ctx);
    assert!(has_listing_permission(cap_manager, sender), 24); // 没有上架权限

    vector::push_back(&mut marketplace.objects, object);
}

/// 上架对象到市场（管理员版本，无需权限检查）
public fun list_object_admin(
    marketplace: &mut Marketplace,
    object: TradingObject,
    ctx: &mut TxContext,
) {
    assert!(!marketplace.is_paused, 9); // 检查市场是否暂停
    assert!(object.owner == tx_context::sender(ctx), 0);
    assert!(object.is_for_sale, 1);
    assert!(tx_context::sender(ctx) == marketplace.admin, 7); // 只有管理员

    vector::push_back(&mut marketplace.objects, object);
}

/// 从市场下架对象
public fun delist_object(marketplace: &mut Marketplace, object_id: ID, ctx: &mut TxContext) {
    assert!(!marketplace.is_paused, 9); // 检查市场是否暂停
    let sender = tx_context::sender(ctx);
    let len = vector::length(&marketplace.objects);
    let mut i = 0;

    while (i < len) {
        let obj = vector::borrow(&marketplace.objects, i);
        if (object::uid_to_inner(&obj.id) == object_id && obj.owner == sender) {
            let trading_object = vector::remove(&mut marketplace.objects, i);
            transfer::public_transfer(trading_object, sender);
            return
        };
        i = i + 1;
    };

    abort 2 // 对象不存在或无权限
}

/// 购买对象 (使用指定代币支付)
public fun purchase_object<T>(
    marketplace: &mut Marketplace,
    object_id: ID,
    mut payment: Coin<T>,
    ctx: &mut TxContext,
) {
    assert!(!marketplace.is_paused, 9); // 检查市场是否暂停
    let sender = tx_context::sender(ctx);
    let len = vector::length(&marketplace.objects);
    let mut i = 0;

    // 验证代币类型是否被支持
    let tpname = type_name::with_defining_ids<T>();
    let fullname = *tpname.as_string();
    assert!(table::contains(&marketplace.supported_tokens, string::from_ascii(fullname)), 6); // 代币类型不被支持

    // 查找并移除对象
    while (i < len) {
        let obj = vector::borrow(&marketplace.objects, i);
        if (object::uid_to_inner(&obj.id) == object_id) {
            assert!(obj.is_for_sale, 5); // 对象不在售
            assert!(obj.owner != sender, 7); // 不能购买自己的对象

            // 验证支付代币类型与对象定价代币类型匹配
            assert!(obj.token_type == string::from_ascii(fullname), 10); // 支付代币类型不匹配

            let price = obj.price;
            assert!(coin::value(&payment) >= price, 8); // 支付金额不足

            // 获取对象信息
            let owner = obj.owner;
            let bot = obj.bot;
            let emoji = obj.emoji;
            let profile_picture = obj.profile_picture;
            let blob_id = obj.blob_id;
            let obj_price = obj.price;
            let obj_token_type = obj.token_type;
            let old_object_id = object::uid_to_inner(&obj.id);

            // 从市场中移除对象
            //let trading_object = vector::remove(&mut marketplace.objects, i);

            // 分割代币：给卖家和金库
            // let marketplace_fee = (price * 10) / 10000; // 0.1% 手续费
            // let seller_amount = price - marketplace_fee;
            let marketplace_fee = 0;
            let seller_amount = price;

            let seller_payment = coin::split(&mut payment, seller_amount, ctx);
            // let treasury_payment = coin::split(&mut payment, marketplace_fee, ctx);

            // 转移代币
            transfer::public_transfer(seller_payment, owner);
            // transfer::public_transfer(treasury_payment, marketplace.treasury);

            // 创建新的对象给买家
            let new_id = object::new(ctx);
            let new_ocid = object::uid_to_inner(&new_id);
            let new_object = TradingObject {
                id: new_id,
                ocid: new_ocid,
                owner: sender,
                profile_picture,
                wallet_id: option::none(),
                bot,
                emoji,
                blob_id,
                price: obj_price,
                token_type: obj_token_type,
                is_for_sale: true, // 购买后默认可售
            };

            transfer::public_transfer(new_object, sender);

            // 触发购买事件
            event::emit(ObjectPurchased {
                object_id: old_object_id,
                seller: owner,
                buyer: sender,
                price,
                token_type: string::from_ascii(fullname),
                marketplace_fee,
                timestamp: tx_context::epoch(ctx),
            });

            // 退还多余的代币
            transfer::public_transfer(payment, sender);

            // 销毁旧对象
            // let TradingObject {
            //     id: old_id,
            //     owner: _,
            //     bot: _,
            //     emoji: _,
            //     profile_picture: _,
            //     blob_id: _,
            //     price: _,
            //     token_type: _,
            //     is_for_sale: _
            // } = trading_object;
            // object::delete(old_id);

            return
        };
        i = i + 1;
    };

    abort 4 // 对象不存在
}

/// 更新对象价格
public fun update_price(
    marketplace: &mut Marketplace,
    object_id: ID,
    new_price: u64,
    ctx: &mut TxContext,
) {
    assert!(!marketplace.is_paused, 9); // 检查市场是否暂停
    let sender = tx_context::sender(ctx);
    let len = vector::length(&marketplace.objects);
    let mut i = 0;

    while (i < len) {
        let obj = vector::borrow_mut(&mut marketplace.objects, i);
        if (object::uid_to_inner(&obj.id) == object_id && obj.owner == sender) {
            obj.price = new_price;
            return
        };
        i = i + 1;
    };

    abort 5 // 对象不存在或无权限
}

/// 获取市场中的所有对象
public fun get_marketplace_objects(marketplace: &Marketplace): &vector<TradingObject> {
    &marketplace.objects
}

// ===== 基础对象访问辅助函数 =====

/// 获取基础对象ID
public fun get_object_id(object: &TradingObject): ID {
    object::uid_to_inner(&object.id)
}

/// 获取对象所有者
public fun get_object_owner(object: &TradingObject): address {
    object.owner
}

/// 获取对象头像
public fun get_object_profile_picture(object: &TradingObject): String {
    object.profile_picture
}

/// 获取对象钱包ID
public fun get_object_wallet_id(object: &TradingObject): Option<ID> {
    object.wallet_id
}

/// 更新基础对象信息
public fun update_base_info(
    object: &mut TradingObject,
    profile_picture: String,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);
    assert!(object.owner == sender, 17); // 只有所有者可以更新基础信息
    object.profile_picture = profile_picture;
}

/// 获取对象信息
public fun get_object_info(
    object: &TradingObject,
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

/// 检查对象是否可购买
public fun is_object_available(marketplace: &Marketplace, object_id: ID): bool {
    let len = vector::length(&marketplace.objects);
    let mut i = 0;

    while (i < len) {
        let obj = vector::borrow(&marketplace.objects, i);
        if (object::uid_to_inner(&obj.id) == object_id && obj.is_for_sale) {
            return true
        };
        i = i + 1;
    };

    false
}

/// 更新交易对象信息
public fun update_trading_object(
    marketplace: &mut Marketplace,
    object_id: ID,
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    ctx: &mut TxContext,
) {
    assert!(!marketplace.is_paused, 9); // 检查市场是否暂停
    let sender = tx_context::sender(ctx);
    let len = vector::length(&marketplace.objects);
    let mut i = 0;

    while (i < len) {
        let obj = vector::borrow_mut(&mut marketplace.objects, i);
        if (object::uid_to_inner(&obj.id) == object_id && obj.owner == sender) {
            obj.bot = bot;
            obj.emoji = emoji;
            obj.profile_picture = profile_picture;
            obj.blob_id = blob_id;
            obj.price = price;
            obj.token_type = token_type;
            return
        };
        i = i + 1;
    };

    abort 6 // 对象不存在或无权限
}

/// 更新金库地址 (仅管理员)
public fun update_treasury(
    marketplace: &mut Marketplace,
    new_treasury: address,
    ctx: &mut TxContext,
) {
    assert!(tx_context::sender(ctx) == marketplace.admin, 7);
    marketplace.treasury = new_treasury;
}

/// 暂停市场 (仅管理员)
public fun pause_marketplace(marketplace: &mut Marketplace, ctx: &mut TxContext) {
    assert!(tx_context::sender(ctx) == marketplace.admin, 7);
    marketplace.is_paused = true;
}

/// 取消暂停 (仅管理员)
public fun unpause_marketplace(marketplace: &mut Marketplace, ctx: &mut TxContext) {
    assert!(tx_context::sender(ctx) == marketplace.admin, 7);
    marketplace.is_paused = false;
}

/// 查询市场暂停状态
public fun is_marketplace_paused(marketplace: &Marketplace): bool {
    marketplace.is_paused
}

/// 重新上架已拥有的对象（需要权限）
public fun relist_object(
    marketplace: &mut Marketplace,
    cap_manager: &CapManager,
    object: TradingObject,
    ctx: &mut TxContext,
) {
    assert!(!marketplace.is_paused, 9); // 检查市场是否暂停
    assert!(object.owner == tx_context::sender(ctx), 0);
    
    // 检查上架权限
    let sender = tx_context::sender(ctx);
    assert!(has_listing_permission(cap_manager, sender), 24); // 没有上架权限

    let mut updated_object = object;
    updated_object.is_for_sale = true;

    vector::push_back(&mut marketplace.objects, updated_object);
}

/// 重新上架已拥有的对象（管理员版本，无需权限检查）
public fun relist_object_admin(
    marketplace: &mut Marketplace,
    object: TradingObject,
    ctx: &mut TxContext,
) {
    assert!(!marketplace.is_paused, 9); // 检查市场是否暂停
    assert!(object.owner == tx_context::sender(ctx), 0);
    assert!(tx_context::sender(ctx) == marketplace.admin, 7); // 只有管理员

    let mut updated_object = object;
    updated_object.is_for_sale = true;

    vector::push_back(&mut marketplace.objects, updated_object);
}

// 转移对象所有权
// public fun transfer_object(object: TradingObject, recipient: address, _ctx: &mut TxContext) {
//     transfer::public_transfer(object, recipient);
// }

/// 为交易对象创建钱包
public fun create_wallet_for_object(object: &mut TradingObject, clock: &Clock, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(object.owner == sender, 10); // 只有对象所有者可以创建钱包
    assert!(option::is_none(&object.wallet_id), 11); // 钱包已存在

    let object_id = object::uid_to_inner(&object.id);
    let wallet = object_wallet::create_object_wallet(object_id, clock, ctx);
    let wallet_id = object_wallet::get_wallet_id(&wallet);

    // 更新对象的钱包ID
    option::fill(&mut object.wallet_id, wallet_id);

    // 将钱包转移给调用者
    transfer::public_transfer(wallet, sender);
}


/// 检查对象是否有关联的钱包
    public fun has_wallet(object: &TradingObject): bool {
        option::is_some(&object.wallet_id)
    }

// ===== Cap 权限管理函数 =====

/// 检查地址是否有上架权限
public fun has_listing_permission(cap_manager: &CapManager, user: address): bool {
    table::contains(&cap_manager.caps, user)
}

/// 创建新的上架权限 Cap（仅管理员）
public fun create_listing_cap(
    cap_manager: &mut CapManager,
    recipient: address,
    ctx: &mut TxContext,
) {
    let admin = tx_context::sender(ctx);
    assert!(admin == cap_manager.admin, 20); // 只有管理员可以创建 Cap

    assert!(!table::contains(&cap_manager.caps, recipient), 21); // 接收者已有 Cap

    let new_cap = ListingCap {
        id: object::new(ctx),
        owner: recipient,
        granted_by: admin,
        created_at: tx_context::epoch(ctx),
    };

    table::add(&mut cap_manager.caps, recipient, new_cap);
}

/// 转移上架权限 Cap
public fun transfer_listing_cap(
    cap: ListingCap,
    recipient: address,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(cap.owner == sender, 22); // 只有 Cap 持有者可以转移

    let mut new_cap = cap;
    new_cap.owner = recipient;
    new_cap.granted_by = sender;
    new_cap.created_at = tx_context::epoch(ctx);

    transfer::public_transfer(new_cap, recipient);
}

/// 撤销上架权限 Cap（仅管理员）
public fun revoke_listing_cap(
    cap_manager: &mut CapManager,
    target: address,
    ctx: &mut TxContext,
) {
    let admin = tx_context::sender(ctx);
    assert!(admin == cap_manager.admin, 20); // 只有管理员可以撤销 Cap

    assert!(table::contains(&cap_manager.caps, target), 23); // 目标没有 Cap

    let cap = table::remove(&mut cap_manager.caps, target);
    
    // 销毁 Cap
    let ListingCap {
        id: old_id,
        owner: _,
        granted_by: _,
        created_at: _,
    } = cap;
    object::delete(old_id);
}

/// 获取 Cap 信息
public fun get_cap_info(cap: &ListingCap): (address, address, u64) {
    (cap.owner, cap.granted_by, cap.created_at)
}

    /// 检查 Cap 是否有效
    public fun is_cap_valid(cap_manager: &CapManager, cap: &ListingCap): bool {
        table::contains(&cap_manager.caps, cap.owner) &&
        cap.owner == table::borrow(&cap_manager.caps, cap.owner).owner
    }

/// 获取对象信息（包含钱包ID）
public fun get_object_info_with_wallet(
    object: &TradingObject,
): (address, String, String, String, String, u64, String, bool, Option<ID>) {
    (
        object.owner,
        object.bot,
        object.emoji,
        object.profile_picture,
        object.blob_id,
        object.price,
        object.token_type,
        object.is_for_sale,
        object.wallet_id,
    )
}

/// 创建带钱包的交易对象
public fun create_trading_object_with_wallet(
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    clock: &Clock,
    ctx: &mut TxContext,
): (TradingObject, ObjectWallet) {
    let id = object::new(ctx);
    let ocid = object::uid_to_inner(&id);
    let trading_object = TradingObject {
        id,
        ocid,
        owner: tx_context::sender(ctx),
        profile_picture,
        wallet_id: option::none(),
        bot,
        emoji,
        blob_id,
        price,
        token_type,
        is_for_sale: false,
    };

    let object_id = object::uid_to_inner(&trading_object.id);
    let wallet = object_wallet::create_object_wallet(object_id, clock, ctx);
    let wallet_id = object_wallet::get_wallet_id(&wallet);

    // 更新对象的钱包ID
    let mut updated_object = trading_object;
    option::fill(&mut updated_object.wallet_id, wallet_id);

    (updated_object, wallet)
}

/// 创建带钱包的交易对象并直接上架到市场
public fun create_and_list_trading_object_with_wallet(
    marketplace: &mut Marketplace,
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    clock: &Clock,
    ctx: &mut TxContext,
): (ObjectWallet, ID) {
    let (trading_object, wallet) = create_trading_object_with_wallet(
        bot,
        emoji,
        profile_picture,
        blob_id,
        price,
        token_type,
        clock,
        ctx,
    );

    let object_id = object::uid_to_inner(&trading_object.id);
    let _wallet_id = object_wallet::get_wallet_id(&wallet);

    vector::push_back(&mut marketplace.objects, trading_object);

    (wallet, object_id)
}

// ===== 钱包操作的包装函数（带代币类型检查） =====

/// 带市场检查的代币存入函数（泛型版本）
/// 确保只有市场支持的代币类型才能存入钱包
public fun deposit_token_with_marketplace_check<T>(
    marketplace: &Marketplace,
    wallet: &mut ObjectWallet,
    mut payment: Coin<T>,
    amount: u64,
    token_type: String,
    ctx: &mut TxContext,
) {
    // 检查代币类型是否被市场支持
    assert!(is_token_type_supported<T>(marketplace), 12); // 代币类型不被市场支持

    // 调用原始的存入函数
    object_wallet::deposit_token(wallet, payment, amount, token_type, ctx);
}

/// 带市场检查的代币提取函数（泛型版本）
/// 确保只有市场支持的代币类型才能从钱包提取
public fun withdraw_token_with_marketplace_check<T>(
    marketplace: &Marketplace,
    wallet: &mut ObjectWallet,
    amount: u64,
    token_type: String,
    ctx: &mut TxContext,
): Coin<T> {
    // 检查代币类型是否被市场支持
    assert!(is_token_type_supported<T>(marketplace), 12); // 代币类型不被市场支持

    // 调用原始的提取函数
    object_wallet::withdraw_token<T>(wallet, amount, token_type, ctx)
}

/// 带市场检查的代币转账函数（泛型版本）
/// 确保只有市场支持的代币类型才能在钱包间转账
public fun transfer_token_with_marketplace_check<T>(
    marketplace: &Marketplace,
    from_wallet: &mut ObjectWallet,
    to_wallet: &mut ObjectWallet,
    amount: u64,
    token_type: String,
    ctx: &mut TxContext,
) {
    // 检查代币类型是否被市场支持
    assert!(is_token_type_supported<T>(marketplace), 12); // 代币类型不被市场支持

    // 调用原始的转账函数
    object_wallet::transfer_token<T>(from_wallet, to_wallet, amount, token_type, ctx);
}

/// 带市场检查的获取余额函数（泛型版本）
/// 确保只有市场支持的代币类型才能查询余额
public fun get_balance_with_marketplace_check<T>(
    marketplace: &Marketplace,
    wallet: &ObjectWallet,
    token_type: String,
): u64 {
    // 检查代币类型是否被市场支持
    assert!(is_token_type_supported<T>(marketplace), 12); // 代币类型不被市场支持

    // 调用原始的获取余额函数
    object_wallet::get_balance<T>(wallet, &token_type)
}

/// 带市场检查的 SUI 存入函数（便捷函数）
/// 确保 SUI 被市场支持时才能存入钱包
public fun deposit_sui_with_marketplace_check(
    marketplace: &Marketplace,
    wallet: &mut ObjectWallet,
    mut payment: Coin<SUI>,
    amount: u64,
    ctx: &mut TxContext,
) {
    let sui_type = string::utf8(b"SUI");
    deposit_token_with_marketplace_check<SUI>(marketplace, wallet, payment, amount, sui_type, ctx);
}

/// 带市场检查的 SUI 提取函数（便捷函数）
/// 确保 SUI 被市场支持时才能从钱包提取
public fun withdraw_sui_with_marketplace_check(
    marketplace: &Marketplace,
    wallet: &mut ObjectWallet,
    amount: u64,
    ctx: &mut TxContext,
): Coin<SUI> {
    let sui_type = string::utf8(b"SUI");
    withdraw_token_with_marketplace_check<SUI>(marketplace, wallet, amount, sui_type, ctx)
}

/// 带市场检查的 SUI 转账函数（便捷函数）
/// 确保 SUI 被市场支持时才能在钱包间转账
public fun transfer_sui_with_marketplace_check(
    marketplace: &Marketplace,
    from_wallet: &mut ObjectWallet,
    to_wallet: &mut ObjectWallet,
    amount: u64,
    ctx: &mut TxContext,
) {
    let sui_type = string::utf8(b"SUI");
    transfer_token_with_marketplace_check<SUI>(
        marketplace,
        from_wallet,
        to_wallet,
        amount,
        sui_type,
        ctx,
    );
}

/// 带市场检查的获取 SUI 余额函数（便捷函数）
/// 确保 SUI 被市场支持时才能查询余额
public fun get_sui_balance_with_marketplace_check(
    marketplace: &Marketplace,
    wallet: &ObjectWallet,
): u64 {
    let sui_type = string::utf8(b"SUI");
    get_balance_with_marketplace_check<SUI>(marketplace, wallet, sui_type)
}

/// 检查代币类型是否被市场支持（便捷函数）
/// 这个函数可以被前端调用来验证代币类型
public fun validate_token_type_for_marketplace<T>(marketplace: &Marketplace): bool {
    is_token_type_supported<T>(marketplace)
}

// ===== 销毁功能 =====

/// 销毁事件
public struct ObjectDestroyed has copy, drop {
    object_id: ID,
    owner: address,
    timestamp: u64,
}

/// 检查交易对象是否可以销毁
/// 必须是对象所有者且对象不在市场中销售
    public fun can_destroy_trading_object(object: &TradingObject, caller: address): bool {
        object.owner == caller && !object.is_for_sale
    }

/// 销毁交易对象（仅限所有者）
/// 只能销毁不在市场中的对象
public fun destroy_trading_object(object: TradingObject, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    assert!(object.owner == sender, 13); // 只有所有者可以销毁
    assert!(!object.is_for_sale, 14); // 不能销毁在售对象

    let object_id = object::uid_to_inner(&object.id);

    // 触发销毁事件
    event::emit(ObjectDestroyed {
        object_id,
        owner: sender,
        timestamp: tx_context::epoch(ctx),
    });

    // 销毁对象
    let TradingObject {
        id: old_id,
        ocid: _,
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
    object::delete(old_id);
}

/// 销毁交易对象及其关联的钱包
/// 这是一个组合操作，确保对象和钱包一起被正确清理
public fun destroy_trading_object_with_wallet(
    object: TradingObject,
    wallet: ObjectWallet,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(object.owner == sender, 13); // 只有所有者可以销毁
    assert!(!object.is_for_sale, 14); // 不能销毁在售对象

    // 验证钱包确实属于这个对象
    let object_id = object::uid_to_inner(&object.id);
    let wallet_object_id = object_wallet::get_object_id(&wallet);
    assert!(object_id == wallet_object_id, 15); // 钱包与对象不匹配

    // 检查钱包是否为空
    assert!(object_wallet::is_wallet_empty(&wallet), 16); // 钱包不为空，无法销毁

    let trading_object_id = object::uid_to_inner(&object.id);

    // 触发销毁事件
    event::emit(ObjectDestroyed {
        object_id: trading_object_id,
        owner: sender,
        timestamp: tx_context::epoch(ctx),
    });

    // 销毁钱包
    object_wallet::destroy_object_wallet(wallet);

    // 销毁对象
    let TradingObject {
        id: old_id,
        ocid: _,
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
    object::delete(old_id);
}

/// 强制销毁交易对象及其关联的钱包（管理员功能）
/// 管理员可以销毁任何对象，即使钱包不为空（会先清空钱包）
public fun admin_destroy_trading_object_with_wallet(
    marketplace: &Marketplace,
    object: TradingObject,
    wallet: ObjectWallet,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(sender == marketplace.admin, 7); // 只有管理员可以使用此功能

    // 验证钱包确实属于这个对象
    let object_id = object::uid_to_inner(&object.id);
    let wallet_object_id = object_wallet::get_object_id(&wallet);
    assert!(object_id == wallet_object_id, 15); // 钱包与对象不匹配

    let trading_object_id = object::uid_to_inner(&object.id);

    // 触发销毁事件
    event::emit(ObjectDestroyed {
        object_id: trading_object_id,
        owner: object.owner,
        timestamp: tx_context::epoch(ctx),
    });

    // 强制销毁钱包（即使不为空）
    object_wallet::force_destroy_object_wallet(wallet);

    // 销毁对象
    let TradingObject {
        id: old_id,
        ocid: _,
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
    object::delete(old_id);
}

/// 获取交易对象的销毁状态信息
public fun get_destruction_status(object: &TradingObject): (bool, bool) {
    let can_destroy = !object.is_for_sale;
    let has_wallet = option::is_some(&object.wallet_id);
    (can_destroy, has_wallet)
}

#[test_only]
use sui::test_scenario;
// ===== OcBotTrading 集成函数 =====

/// 创建并上架 OcBotTrading 对象到市场（需要权限）
public fun create_and_list_oc_bot_trading(
    marketplace: &mut Marketplace,
    cap_manager: &CapManager,
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    ctx: &mut TxContext,
) {
    // 检查上架权限
    let sender = tx_context::sender(ctx);
    assert!(has_listing_permission(cap_manager, sender), 24); // 没有上架权限

    let id = object::new(ctx);
    let ocid = object::uid_to_inner(&id);
    
    // 创建 TradingObject 对象（使用 OcBotTrading 的数据）
    let trading_object = TradingObject {
        id,
        ocid,
        owner: tx_context::sender(ctx),
        profile_picture,
        wallet_id: option::none(),
        bot,
        emoji,
        blob_id,
        price,
        token_type,
        is_for_sale: true,
    };

    vector::push_back(&mut marketplace.objects, trading_object);
}

/// 创建并上架 OcBotTrading 对象到市场（管理员版本，无需权限检查）
public fun create_and_list_oc_bot_trading_admin(
    marketplace: &mut Marketplace,
    bot: String,
    emoji: String,
    profile_picture: String,
    blob_id: String,
    price: u64,
    token_type: String,
    ctx: &mut TxContext,
) {
    assert!(tx_context::sender(ctx) == marketplace.admin, 7); // 只有管理员

    let id = object::new(ctx);
    let ocid = object::uid_to_inner(&id);
    
    // 创建 TradingObject 对象（使用 OcBotTrading 的数据）
    let trading_object = TradingObject {
        id,
        ocid,
        owner: tx_context::sender(ctx),
        profile_picture,
        wallet_id: option::none(),
        bot,
        emoji,
        blob_id,
        price,
        token_type,
        is_for_sale: true,
    };

    vector::push_back(&mut marketplace.objects, trading_object);
}

#[test]
fun test_type() {
    let tpname = type_name::get<u64>();
    let fullname = type_name::borrow_string(&tpname);
    print(fullname);

    let tpname2 = type_name::get<string::String>();
    if (
        type_name::into_string(tpname2) == string(b"0000000000000000000000000000000000000000000000000000000000000001::string::String")
    ) {
        print(&utf8(b"ok"));
    } else {
        print(&utf8(b"no ok"));
    };
}

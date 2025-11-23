#[allow(unused_use)]
module restart_oc::scheduled_transfer;

use std::string::{Self, String};
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::clock::{Self, Clock};
use sui::event;
use sui::sui::SUI;
use sui::table::{Self, Table};
use restart_oc::object_wallet::{Self, ObjectWallet};
use restart_oc::trading_object::{Self, Marketplace};

/// 定时转账任务结构体
public struct ScheduledTransfer has key, store {
    id: UID,
    wallet_id: ID, // 关联的钱包ID
    object_id: ID, // 关联的对象ID
    from_address: address, // 发送地址
    to_address: address, // 接收地址
    token_type: String, // 代币类型
    amount: u64, // 转账金额
    execute_time: u64, // 执行时间戳
    is_executed: bool, // 是否已执行
    created_at: u64, // 创建时间戳
    created_by: address, // 创建者
}

/// 定时转账创建事件
public struct ScheduledTransferCreated has copy, drop {
    transfer_id: ID,
    wallet_id: ID,
    object_id: ID,
    from_address: address,
    to_address: address,
    token_type: String,
    amount: u64,
    execute_time: u64,
    created_by: address,
    timestamp: u64,
}

/// 定时转账执行事件
public struct ScheduledTransferExecuted has copy, drop {
    transfer_id: ID,
    wallet_id: ID,
    object_id: ID,
    from_address: address,
    to_address: address,
    token_type: String,
    amount: u64,
    executed_by: address,
    timestamp: u64,
}

/// 定时转账取消事件
public struct ScheduledTransferCancelled has copy, drop {
    transfer_id: ID,
    wallet_id: ID,
    object_id: ID,
    cancelled_by: address,
    timestamp: u64,
}

/// 创建新的定时转账任务
public fun create_scheduled_transfer(
    wallet_id: ID,
    object_id: ID,
    to_address: address,
    token_type: String,
    amount: u64,
    execute_time: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): ScheduledTransfer {
    let sender = tx_context::sender(ctx);
    let current_time = clock::timestamp_ms(clock);
    
    // 验证执行时间在未来
    assert!(execute_time > current_time, 1); // 执行时间必须在未来
    assert!(amount > 0, 2); // 转账金额必须大于0
    assert!(to_address != @0x0, 3); // 接收地址不能为零地址

    let transfer = ScheduledTransfer {
        id: object::new(ctx),
        wallet_id,
        object_id,
        from_address: sender,
        to_address,
        token_type,
        amount,
        execute_time,
        is_executed: false,
        created_at: current_time,
        created_by: sender,
    };

    // 触发创建事件
    event::emit(ScheduledTransferCreated {
        transfer_id: object::uid_to_inner(&transfer.id),
        wallet_id,
        object_id,
        from_address: sender,
        to_address,
        token_type,
        amount,
        execute_time,
        created_by: sender,
        timestamp: current_time,
    });

    transfer
}

/// 执行定时转账（任何人都可以触发）
public fun execute_scheduled_transfer(
    mut transfer: ScheduledTransfer,
    wallet: &mut ObjectWallet,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let current_time = clock::timestamp_ms(clock);
    
    // 验证转账状态
    assert!(!transfer.is_executed, 4); // 转账已经执行
    assert!(current_time >= transfer.execute_time, 5); // 还未到执行时间
    
    // 根据代币类型字符串判断使用哪种类型
    // 这里我们使用 SUI 类型作为默认，因为目前主要支持 SUI
    // 在实际使用中，应该根据 token_type 字符串来匹配正确的类型
    let balance = object_wallet::get_sui_balance(wallet);
    assert!(balance >= transfer.amount, 7); // 余额不足

    // 执行转账 - 从钱包提取金额
    let withdrawn_coin: Coin<SUI> = object_wallet::withdraw_token(wallet, transfer.amount, transfer.token_type, ctx);
    assert!(coin::value(&withdrawn_coin) == transfer.amount, 8); // 提取金额不匹配

    // 转账给接收者
    transfer::public_transfer(withdrawn_coin, transfer.to_address);

    // 标记为已执行
    transfer.is_executed = true;

    // 触发执行事件
    event::emit(ScheduledTransferExecuted {
        transfer_id: object::uid_to_inner(&transfer.id),
        wallet_id: transfer.wallet_id,
        object_id: transfer.object_id,
        from_address: transfer.from_address,
        to_address: transfer.to_address,
        token_type: transfer.token_type,
        amount: transfer.amount,
        executed_by: sender,
        timestamp: current_time,
    });

    // 销毁已执行的转账任务
    destroy_scheduled_transfer(transfer);
}

/// 带市场检查的执行定时转账函数
/// 确保只有市场支持的代币类型才能执行定时转账
/// 修复：使用类型安全的动态字段访问和正确的类型参数传递
public fun execute_scheduled_transfer_with_marketplace_check<T>(
    mut transfer: ScheduledTransfer,
    wallet: &mut ObjectWallet,
    marketplace: &Marketplace,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let current_time = clock::timestamp_ms(clock);
    
    // 验证转账状态
    assert!(!transfer.is_executed, 4); // 转账已经执行
    assert!(current_time >= transfer.execute_time, 5); // 还未到执行时间
    
    // 检查代币类型是否被市场支持
    assert!(trading_object::is_token_type_supported<T>(marketplace), 12); // 代币类型不被市场支持
    
    // 验证钱包余额 - 使用类型安全的动态字段访问
    // 关键修复：确保类型参数 T 与存储的 Coin<T> 类型完全匹配
    let balance = object_wallet::get_balance<T>(wallet, &transfer.token_type);
    
    // 添加调试信息
    let sui_balance = object_wallet::get_sui_balance(wallet);
    
    // 检查余额是否充足
    assert!(balance >= transfer.amount, 7); // 余额不足

    // 执行转账 - 从钱包提取金额
    // 关键修复：确保 withdraw_token 的类型参数与 get_balance 一致
    let withdrawn_coin = object_wallet::withdraw_token<T>(wallet, transfer.amount, transfer.token_type, ctx);
    assert!(coin::value(&withdrawn_coin) == transfer.amount, 8); // 提取金额不匹配

    // 转账给接收者
    transfer::public_transfer(withdrawn_coin, transfer.to_address);

    // 标记为已执行
    transfer.is_executed = true;

    // 触发执行事件
    event::emit(ScheduledTransferExecuted {
        transfer_id: object::uid_to_inner(&transfer.id),
        wallet_id: transfer.wallet_id,
        object_id: transfer.object_id,
        from_address: transfer.from_address,
        to_address: transfer.to_address,
        token_type: transfer.token_type,
        amount: transfer.amount,
        executed_by: sender,
        timestamp: current_time,
    });

    // 销毁已执行的转账任务
    destroy_scheduled_transfer(transfer);
}

/// 取消定时转账（仅创建者可以取消）
public fun cancel_scheduled_transfer(
    transfer: ScheduledTransfer,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    
    // 验证权限
    assert!(sender == transfer.created_by, 8); // 只有创建者可以取消
    assert!(!transfer.is_executed, 9); // 已执行的转账无法取消

    // 触发取消事件
    event::emit(ScheduledTransferCancelled {
        transfer_id: object::uid_to_inner(&transfer.id),
        wallet_id: transfer.wallet_id,
        object_id: transfer.object_id,
        cancelled_by: sender,
        timestamp: clock::timestamp_ms(clock),
    });

    // 销毁转账任务
    destroy_scheduled_transfer(transfer);
}

/// 获取定时转账信息
public fun get_transfer_info(
    transfer: &ScheduledTransfer,
): (ID, ID, ID, address, address, String, u64, u64, bool, u64, address) {
    (
        object::uid_to_inner(&transfer.id),
        transfer.wallet_id,
        transfer.object_id,
        transfer.from_address,
        transfer.to_address,
        transfer.token_type,
        transfer.amount,
        transfer.execute_time,
        transfer.is_executed,
        transfer.created_at,
        transfer.created_by,
    )
}

/// 检查转账是否可以执行
public fun can_execute(
    transfer: &ScheduledTransfer,
    current_epoch: u64,
): bool {
    !transfer.is_executed && current_epoch >= transfer.execute_time
}

/// 检查地址是否为转账创建者
public fun is_transfer_creator(
    transfer: &ScheduledTransfer,
    addr: address,
): bool {
    transfer.created_by == addr
}

/// 获取转账金额
public fun get_transfer_amount(
    transfer: &ScheduledTransfer,
): u64 {
    transfer.amount
}

/// 获取转账接收地址
public fun get_transfer_recipient(
    transfer: &ScheduledTransfer,
): address {
    transfer.to_address
}

/// 获取转账执行时间
public fun get_transfer_execute_time(
    transfer: &ScheduledTransfer,
): u64 {
    transfer.execute_time
}

/// 检查转账是否已执行
public fun is_transfer_executed(
    transfer: &ScheduledTransfer,
): bool {
    transfer.is_executed
}

/// 销毁定时转账任务
fun destroy_scheduled_transfer(transfer: ScheduledTransfer) {
    let ScheduledTransfer {
        id,
        wallet_id: _,
        object_id: _,
        from_address: _,
        to_address: _,
        token_type: _,
        amount: _,
        execute_time: _,
        is_executed: _,
        created_at: _,
        created_by: _,
    } = transfer;
    object::delete(id);
}

#[test_only]
use sui::test_scenario;

#[test]
fun test_scheduled_transfer() {
    let mut scenario = test_scenario::begin(@0x1);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // 创建 Clock 对象用于测试
    let clock = clock::create_for_testing(ctx);
    
    // 创建测试数据 - 使用正确的 ID 类型
    let wallet_uid = object::new(ctx);
    let object_uid = object::new(ctx);
    let wallet_id = object::uid_to_inner(&wallet_uid);
    let object_id = object::uid_to_inner(&object_uid);
    let to_address = @0x4;
    let token_type = string::utf8(b"SUI");
    let amount = 1000000; // 0.001 SUI
    let execute_time = 1000000; // 未来时间
    
    // 创建定时转账
    let transfer = create_scheduled_transfer(
        wallet_id,
        object_id,
        to_address,
        token_type,
        amount,
        execute_time,
        &clock,
        ctx,
    );
    
    // 测试获取转账信息
    let (transfer_id, w_id, o_id, from, to, t_type, amt, exec_time, is_executed, created_at, created_by) = get_transfer_info(&transfer);
    assert!(w_id == wallet_id, 0);
    assert!(o_id == object_id, 1);
    assert!(from == @0x1, 2);
    assert!(to == to_address, 3);
    assert!(amt == amount, 4);
    assert!(exec_time == execute_time, 5);
    assert!(!is_executed, 6);
    assert!(created_by == @0x1, 7);
    
    // 测试权限检查
    assert!(is_transfer_creator(&transfer, @0x1), 8);
    assert!(!is_transfer_creator(&transfer, @0x2), 9);
    
    // 测试取消转账
    cancel_scheduled_transfer(transfer, &clock, ctx);
    
    // 销毁测试用的 UID 对象和 Clock
    object::delete(wallet_uid);
    object::delete(object_uid);
    clock::destroy_for_testing(clock);
    
    test_scenario::end(scenario);
}

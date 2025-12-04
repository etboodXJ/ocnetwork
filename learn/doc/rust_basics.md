# 🦀 Rust 基础教程

## 📋 目录

1. [Rust 简介](#rust-简介)
2. [环境搭建](#环境搭建)
3. [基础语法](#基础语法)
4. [所有权系统](#所有权系统)
5. [结构体和枚举](#结构体和枚举)
6. [错误处理](#错误处理)
7. [集合类型](#集合类型)
8. [泛型和特征](#泛型和特征)
9. [模块系统](#模块系统)
10. [实战项目](#实战项目)

---

## 🚀 Rust 简介

### 什么是 Rust？

Rust 是一门系统编程语言，专注于：
- **安全性**：内存安全，无需垃圾回收
- **并发性**：无畏并发，避免数据竞争
- **性能**：零成本抽象，接近 C/C++ 的性能

### 为什么学习 Rust？

对于 OCNetwork 项目开发者来说，Rust 是学习 Move 语言的基础：
- Move 语言借鉴了 Rust 的所有权概念
- Rust 的类型系统帮助理解 Move 的资源模型
- Rust 的错误处理机制与 Move 类似

### Rust vs 其他语言

| 特性 | Rust | C++ | Python | JavaScript |
|------|------|-----|--------|------------|
| 内存安全 | ✅ | ❌ | ✅ | ✅ |
| 性能 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 并发安全 | ✅ | ❌ | ❌ | ❌ |
| 学习曲线 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ |

---

## 🛠️ 环境搭建

### 安装 Rust

```bash
# 官方推荐安装方式
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 按照提示选择默认安装即可

# 重启终端或运行
source ~/.cargo/env

# 验证安装
rustc --version
cargo --version
```

### 配置开发环境

```bash
# 安装常用工具
rustup component add rustfmt    # 代码格式化
rustup component add clippy     # 代码检查

# 安装 VS Code 扩展（推荐）
# - rust-analyzer
# - CodeLLDB
# - Better TOML
```

### 创建第一个项目

```bash
# 创建新项目
cargo hello_rust
cd hello_rust

# 查看项目结构
tree .
# .
# ├── Cargo.toml
# └── src
#     └── main.rs

# 运行项目
cargo run
```

---

## 📝 基础语法

### 变量和常量

```rust
fn main() {
    // 不可变变量（默认）
    let x = 5;
    println!("x = {}", x);
    
    // 可变变量
    let mut y = 10;
    y = 15;
    println!("y = {}", y);
    
    // 常量
    const MAX_POINTS: u32 = 100_000;
    println!("Max points: {}", MAX_POINTS);
    
    // 变量遮蔽（Shadowing）
    let spaces = "   ";
    let spaces = spaces.len();
    println!("Spaces: {}", spaces);
}
```

### 数据类型

```rust
fn main() {
    // 标量类型
    
    // 整数
    let small: i8 = 127;
    let medium: i32 = 1_000_000;
    let big: i64 = 1_000_000_000;
    
    // 浮点数
    let float1: f32 = 3.14;
    let float2: f64 = 2.718281828;
    
    // 布尔值
    let is_rust_fun: bool = true;
    
    // 字符
    let letter: char = '🦀';
    
    // 复合类型
    
    // 元组
    let person: (String, i32, bool) = ("Alice".to_string(), 25, true);
    let (name, age, is_student) = person;
    println!("{} is {} years old, student: {}", name, age, is_student);
    
    // 数组
    let numbers: [i32; 5] = [1, 2, 3, 4, 5];
    let first = numbers[0];
    println!("First number: {}", first);
}
```

### 函数

```rust
// 带参数和返回值的函数
fn add(a: i32, b: i32) -> i32 {
    a + b  // 表达式，没有分号
}

// 带多个返回值的函数
fn calculate_stats(numbers: &[i32]) -> (i32, f64) {
    let sum: i32 = numbers.iter().sum();
    let average: f64 = sum as f64 / numbers.len() as f64;
    (sum, average)
}

// 主函数
fn main() {
    let result = add(5, 3);
    println!("5 + 3 = {}", result);
    
    let numbers = [1, 2, 3, 4, 5];
    let (sum, avg) = calculate_stats(&numbers);
    println!("Sum: {}, Average: {:.2}", sum, avg);
}
```

### 控制流

```rust
fn main() {
    let number = 42;
    
    // if 表达式
    if number < 0 {
        println!("Negative");
    } else if number > 0 {
        println!("Positive");
    } else {
        println!("Zero");
    }
    
    // if 作为表达式
    let result = if number % 2 == 0 { "even" } else { "odd" };
    println!("{} is {}", number, result);
    
    // 循环
    
    // loop
    let mut counter = 0;
    let result = loop {
        counter += 1;
        if counter == 3 {
            break counter * 2;
        }
    };
    println!("Loop result: {}", result);
    
    // while
    let mut num = 3;
    while num != 0 {
        println!("{}!", num);
        num -= 1;
    }
    println!("Liftoff!");
    
    // for
    let a = [10, 20, 30, 40, 50];
    for element in a.iter() {
        println!("the value is: {}", element);
    }
    
    // 范围
    for number in (1..4).rev() {
        println!("{}!", number);
    }
}
```

### 模式匹配

```rust
fn main() {
    let number = 13;
    
    // match 表达式
    match number {
        1 => println!("One"),
        2 | 3 | 5 | 7 | 11 => println!("This is a prime"),
        13..=19 => println!("A teen"),
        _ => println!("Ain't special"),
    }
    
    // 匹配元组
    let point = (0, -2);
    match point {
        (0, y) => println!("On y axis at {}", y),
        (x, 0) => println!("On x axis at {}", x),
        (x, y) => println!("On ({}, {})", x, y),
    }
    
    // 匹配枚举
    let some_u8_value = Some(0u8);
    match some_u8_value {
        Some(3) => println!("three"),
        _ => (),
    }
    
    // if let 简化
    if let Some(3) = some_u8_value {
        println!("three");
    }
}
```

---

## 🔒 所有权系统

### 所有权规则

1. Rust 中的每个值都有一个所有者
2. 值在任意时刻只能有一个所有者
3. 当所有者离开作用域时，值将被丢弃

```rust
fn main() {
    // 字符串字面量
    let s1 = "hello";  // 栈上
    
    // String 类型
    let s2 = String::from("hello");  // 堆上
    
    // 所有权转移
    let s3 = s2;  // s2 的所有权转移到 s3
    // println!("{}", s2);  // 错误！s2 不再有效
    println!("{}", s3);  // 正确
    
    // 克隆
    let s4 = s3.clone();  // 深拷贝
    println!("s3 = {}, s4 = {}", s3, s4);
    
    // 函数中的所有权
    takes_ownership(s4);  // s4 的所有权被转移
    // println!("{}", s4);  // 错误！
    
    let x = 5;
    makes_copy(x);  // x 被复制，仍然有效
    println!("x = {}", x);
}

fn takes_ownership(some_string: String) {
    println!("{}", some_string);
}  // some_string 被丢弃

fn makes_copy(some_integer: i32) {
    println!("{}", some_integer);
}
```

### 引用和借用

```rust
fn main() {
    let s1 = String::from("hello");
    
    // 不可变引用
    let len = calculate_length(&s1);
    println!("Length of '{}' is {}.", s1, len);
    
    // 可变引用
    let mut s2 = String::from("hello");
    change(&mut s2);
    println!("Changed string: {}", s2);
    
    // 多个不可变引用
    let r1 = &s2;
    let r2 = &s2;
    println!("r1: {}, r2: {}", r1, r2);
    
    // 可变引用（只能有一个）
    let r3 = &mut s2;
    println!("r3: {}", r3);
}

fn calculate_length(s: &String) -> usize {
    s.len()
}  // s 离开作用域，但没有所有权，所以不会丢弃

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

### 字符串切片

```rust
fn main() {
    let s = String::from("hello world");
    
    // 字符串切片
    let hello = &s[0..5];
    let world = &s[6..11];
    
    println!("first word: {}", hello);
    println!("second word: {}", world);
    
    // 函数中使用切片
    let word = first_word(&s);
    println!("First word: {}", word);
}

fn first_word(s: &String) -> &str {
    let bytes = s.as_bytes();
    
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }
    
    &s[..]
}
```

---

## 🏗️ 结构体和枚举

### 结构体定义和使用

```rust
// 定义结构体
#[derive(Debug)]  // 派生 Debug trait
struct User {
    username: String,
    email: String,
    age: u32,
    active: bool,
}

// 元组结构体
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

// 单元结构体
struct AlwaysEqual;

impl User {
    // 关联函数（静态方法）
    fn new(username: String, email: String, age: u32) -> User {
        User {
            username,
            email,
            age,
            active: true,
        }
    }
    
    // 方法
    fn is_adult(&self) -> bool {
        self.age >= 18
    }
    
    // 可变方法
    fn birthday(&mut self) {
        self.age += 1;
        println!("Happy birthday {}! You are now {} years old.", self.username, self.age);
    }
}

fn main() {
    // 创建结构体实例
    let mut user1 = User::new(
        "alice123".to_string(),
        "alice@example.com".to_string(),
        25,
    );
    
    println!("User: {:?}", user1);
    println!("Is adult: {}", user1.is_adult());
    
    user1.birthday();
    
    // 元组结构体
    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);
    
    println!("Black color: {:?}", black);
    println!("Origin point: {:?}", origin);
}
```

### 枚举定义和使用

```rust
// 定义枚举
#[derive(Debug)]
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}

#[derive(Debug)]
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

impl Message {
    fn process(&self) {
        match self {
            Message::Quit => println!("Quit message"),
            Message::Move { x, y } => println!("Move to ({}, {})", x, y),
            Message::Write(text) => println!("Write: {}", text),
            Message::ChangeColor(r, g, b) => println!("Change color to RGB({}, {}, {})", r, g, b),
        }
    }
}

// Option 枚举
fn main() {
    let home = IpAddr::V4(127, 0, 0, 1);
    let loopback = IpAddr::V6("::1".to_string());
    
    println!("Home: {:?}", home);
    println!("Loopback: {:?}", loopback);
    
    let messages = vec![
        Message::Quit,
        Message::Move { x: 10, y: 20 },
        Message::Write("Hello, Rust!".to_string()),
        Message::ChangeColor(255, 0, 0),
    ];
    
    for message in messages {
        message.process();
    }
    
    // Option 使用
    let some_number = Some(5);
    let some_string = Some("a string");
    let absent_number: Option<i32> = None;
    
    println!("{:?}", some_number);
    println!("{:?}", some_string);
    println!("{:?}", absent_number);
}
```

---

## ⚠️ 错误处理

### Result 和 Option

```rust
use std::fs::File;
use std::io::{self, Read};

// 可能失败的函数
fn read_username_from_file() -> Result<String, io::Error> {
    let f = File::open("hello.txt");
    
    let mut f = match f {
        Ok(file) => file,
        Err(e) => return Err(e),
    };
    
    let mut s = String::new();
    
    match f.read_to_string(&mut s) {
        Ok(_) => Ok(s),
        Err(e) => Err(e),
    }
}

// 使用 ? 操作符简化
fn read_username_from_file_short() -> Result<String, io::Error> {
    let mut f = File::open("hello.txt")?;
    let mut s = String::new();
    f.read_to_string(&mut s)?;
    Ok(s)
}

// 更简洁的版本
fn read_username_from_file_shortest() -> Result<String, io::Error> {
    std::fs::read_to_string("hello.txt")
}

fn main() {
    // 处理 Result
    match read_username_from_file() {
        Ok(username) => println!("Username: {}", username),
        Err(e) => println!("Error reading file: {}", e),
    }
    
    // 使用 unwrap 或 expect
    // let username = read_username_from_file().unwrap();
    // let username = read_username_from_file().expect("Failed to read username");
    
    // Option 处理
    let numbers = vec![1, 2, 3];
    let first = numbers.get(0);
    let tenth = numbers.get(10);
    
    println!("First: {:?}", first);
    println!("Tenth: {:?}", tenth);
    
    // 使用 if let
    if let Some(first) = first {
        println!("First number is: {}", first);
    }
    
    // 使用 map
    let doubled_first = first.map(|&x| x * 2);
    println!("Doubled first: {:?}", doubled_first);
}
```

### 自定义错误类型

```rust
use std::fmt;

// 自定义错误类型
#[derive(Debug)]
enum AppError {
    Io(io::Error),
    Parse(std::num::ParseIntError),
    Custom(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::Io(err) => write!(f, "IO error: {}", err),
            AppError::Parse(err) => write!(f, "Parse error: {}", err),
            AppError::Custom(msg) => write!(f, "Custom error: {}", msg),
        }
    }
}

impl From<io::Error> for AppError {
    fn from(err: io::Error) -> Self {
        AppError::Io(err)
    }
}

impl From<std::num::ParseIntError> for AppError {
    fn from(err: std::num::ParseIntError) -> Self {
        AppError::Parse(err)
    }
}

// 使用自定义错误
fn read_and_parse(filename: &str) -> Result<i32, AppError> {
    let content = std::fs::read_to_string(filename)?;
    let number: i32 = content.trim().parse()?;
    Ok(number)
}

fn main() {
    match read_and_parse("number.txt") {
        Ok(num) => println!("Parsed number: {}", num),
        Err(e) => println!("Error: {}", e),
    }
}
```

---

## 📦 集合类型

### Vector

```rust
fn main() {
    // 创建 Vector
    let mut v: Vec<i32> = Vec::new();
    v.push(5);
    v.push(6);
    v.push(7);
    v.push(8);
    
    // 使用宏创建
    let v2 = vec![1, 2, 3, 4, 5];
    
    // 读取 Vector
    let third: &i32 = &v2[2];
    println!("The third element is {}", third);
    
    match v2.get(2) {
        Some(third) => println!("The third element is {}", third),
        None => println!("There is no third element."),
    }
    
    // 遍历 Vector
    for i in &v {
        println!("{}", i);
    }
    
    // 修改 Vector
    for i in &mut v {
        *i += 50;
    }
    
    println!("Modified v: {:?}", v);
    
    // 存储不同类型
    #[derive(Debug)]
    enum SpreadsheetCell {
        Int(i32),
        Float(f64),
        Text(String),
    }
    
    let row = vec![
        SpreadsheetCell::Int(3),
        SpreadsheetCell::Text(String::from("blue")),
        SpreadsheetCell::Float(10.12),
    ];
    
    for cell in &row {
        println!("{:?}", cell);
    }
}
```

### String

```rust
fn main() {
    // 创建字符串
    let mut s = String::new();
    s.push_str("hello");
    s.push(' ');
    s.push_str("world");
    
    println!("{}", s);
    
    // 字符串拼接
    let s1 = String::from("Hello, ");
    let s2 = String::from("world!");
    let s3 = s1 + &s2;  // s1 被移动，不能再使用
    
    println!("{}", s3);
    
    // 使用 format! 宏
    let s1 = String::from("tic");
    let s2 = String::from("tac");
    let s3 = String::from("toe");
    let s = format!("{}-{}-{}", s1, s2, s3);
    
    println!("{}", s);
    
    // 字符串切片
    let hello = "Здравствуйте";
    let s = &hello[0..4];
    println!("First 4 bytes: {}", s);
    
    // 遍历字符
    for c in "नमस्ते".chars() {
        println!("{}", c);
    }
    
    // 遍历字节
    for b in "नमस्ते".bytes() {
        println!("{}", b);
    }
}
```

### HashMap

```rust
use std::collections::HashMap;

fn main() {
    // 创建 HashMap
    let mut scores = HashMap::new();
    
    scores.insert(String::from("Blue"), 10);
    scores.insert(String::from("Yellow"), 50);
    
    // 从元组向量创建
    let teams = vec![String::from("Blue"), String::from("Yellow")];
    let initial_scores = vec![10, 50];
    
    let scores2: HashMap<_, _> = teams.into_iter().zip(initial_scores.into_iter()).collect();
    
    // 访问 HashMap
    let team_name = String::from("Blue");
    let score = scores.get(&team_name);
    
    match score {
        Some(s) => println!("Blue team score: {}", s),
        None => println!("Blue team not found"),
    }
    
    // 遍历 HashMap
    for (key, value) in &scores {
        println!("{}: {}", key, value);
    }
    
    // 更新 HashMap
    scores.insert(String::from("Blue"), 25);  // 覆盖
    
    // 只在键没有对应值时插入
    scores.entry(String::from("Red")).or_insert(30);
    scores.entry(String::from("Blue")).or_insert(30);  // 不会覆盖
    
    // 根据旧值更新
    let text = "hello world wonderful world";
    let mut map = HashMap::new();
    
    for word in text.split_whitespace() {
        let count = map.entry(word).or_insert(0);
        *count += 1;
    }
    
    println!("{:?}", map);
}
```

---

## 🎯 泛型和特征

### 泛型

```rust
// 泛型结构体
#[derive(Debug)]
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    }
}

// 为特定类型实现方法
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}

// 多个泛型参数
#[derive(Debug)]
struct Point2<T, U> {
    x: T,
    y: U,
}

// 泛型枚举
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}

// 泛型函数
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    
    largest
}

fn main() {
    let integer = Point { x: 5, y: 10 };
    let float = Point { x: 1.0, y: 4.0 };
    
    println!("Integer point: {:?}", integer);
    println!("Float point: {:?}", float);
    
    println!("Distance from origin: {}", float.distance_from_origin());
    
    let mixed = Point2 { x: 5, y: 4.0 };
    println!("Mixed point: {:?}", mixed);
    
    let number_list = vec![34, 50, 25, 100, 65];
    let result = largest(&number_list);
    println!("The largest number is {}", result);
    
    let char_list = vec!['y', 'm', 'a', 'q'];
    let result = largest(&char_list);
    println!("The largest char is {}", result);
}
```

### 特征（Traits）

```rust
// 定义特征
pub trait Summary {
    fn summarize(&self) -> String;
    
    // 默认实现
    fn summarize_verbose(&self) -> String {
        format!("(Read more from {}...)", self.summarize())
    }
}

// 为类型实现特征
pub struct NewsArticle {
    pub headline: String,
    pub location: String,
    pub author: String,
    pub content: String,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}

pub struct Tweet {
    pub username: String,
    pub content: String,
    pub reply: bool,
    pub retweet: bool,
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}

// 使用特征作为参数
pub fn notify(item: &impl Summary) {
    println!("Breaking news! {}", item.summarize());
}

// 特征约束语法
pub fn notify2<T: Summary>(item: &T) {
    println!("Breaking news! {}", item.summarize());
}

// 多个特征约束
pub fn notify3(item: &(impl Summary + Display)) {
    println!("Breaking news! {}", item.summarize());
}

// where 子句
fn some_function<T, U>(_t: &T, _u: &U) -> i32
where
    T: Display + Clone,
    U: Clone + Debug,
{
    42
}

// 返回实现了特征的类型
fn returns_summarizable() -> impl Summary {
    Tweet {
        username: String::from("horse_ebooks"),
        content: String::from("of course, as you probably already know, people"),
        reply: false,
        retweet: false,
    }
}

fn main() {
    let tweet = Tweet {
        username: String::from("horse_ebooks"),
        content: String::from("of course, as you probably already know, people"),
        reply: false,
        retweet: false,
    };
    
    println!("1 new tweet: {}", tweet.summarize());
    
    let article = NewsArticle {
        headline: String::from("Penguins win the Stanley Cup Championship!"),
        location: String::from("Pittsburgh, PA, USA"),
        author: String::from("Iceburgh"),
        content: String::from("The Pittsburgh Penguins once again are the best hockey team in the NHL."),
    };
    
    println!("New article available! {}", article.summarize());
    
    notify(&tweet);
    notify(&article);
    
    let tweet = returns_summarizable();
    println!("Returned tweet: {}", tweet.summarize());
}
```

---

## 📁 模块系统

### 模块定义和使用

```rust
// 模块定义
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {
            println!("Added to waitlist");
        }
        
        fn seat_at_table() {
            println!("Seated at table");
        }
    }
    
    mod serving {
        fn take_order() {
            println!("Taking order");
        }
        
        fn serve_order() {
            println!("Serving order");
        }
        
        fn take_payment() {
            println!("Taking payment");
        }
    }
}

// 使用模块
pub use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    // 绝对路径
    crate::front_of_house::hosting::add_to_waitlist();
    
    // 相对路径
    front_of_house::hosting::add_to_waitlist();
    
    // 使用 use 关键字
    hosting::add_to_waitlist();
}

fn main() {
    eat_at_restaurant();
}
```

### 分离模块到不同文件

```
src/
├── main.rs
├── front_of_house.rs
└── front_of_house/
    ├── mod.rs
    ├── hosting.rs
    └── serving.rs
```

```rust
// main.rs
mod front_of_house;

use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}

fn main() {
    eat_at_restaurant();
}
```

```rust
// front_of_house.rs
pub mod hosting;
pub mod serving;
```

```rust
// front_of_house/hosting.rs
pub fn add_to_waitlist() {
    println!("Added to waitlist");
}
```

---

## 🚀 实战项目

### 项目：简单的交易机器人

```rust
use std::collections::HashMap;

// 定义错误类型
#[derive(Debug)]
enum TradingError {
    InsufficientBalance,
    InvalidPrice,
    MarketClosed,
}

impl std::fmt::Display for TradingError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            TradingError::InsufficientBalance => write!(f, "Insufficient balance"),
            TradingError::InvalidPrice => write!(f, "Invalid price"),
            TradingError::MarketClosed => write!(f, "Market is closed"),
        }
    }
}

type Result<T> = std::result::Result<T, TradingError>;

// 交易对象
#[derive(Debug, Clone)]
struct TradingObject {
    id: u64,
    name: String,
    price: u64,
    owner: String,
}

impl TradingObject {
    fn new(id: u64, name: String, price: u64, owner: String) -> Self {
        Self { id, name, price, owner }
    }
    
    fn transfer_ownership(mut self, new_owner: String) -> Self {
        self.owner = new_owner;
        self
    }
}

// 交易机器人
#[derive(Debug)]
struct TradingBot {
    name: String,
    balance: u64,
    inventory: Vec<TradingObject>,
    strategy: TradingStrategy,
}

#[derive(Debug, Clone)]
enum TradingStrategy {
    Conservative { profit_margin: f64 },
    Aggressive { profit_margin: f64 },
    Balanced { profit_margin: f64 },
}

impl TradingStrategy {
    fn should_buy(&self, object: &TradingObject, bot_balance: u64) -> bool {
        if bot_balance < object.price {
            return false;
        }
        
        match self {
            TradingStrategy::Conservative { profit_margin } => {
                object.price < 1000  // 只买便宜的东西
            }
            TradingStrategy::Aggressive { profit_margin } => {
                true  // 什么都买
            }
            TradingStrategy::Balanced { profit_margin } => {
                object.price >= 500 && object.price <= 5000  // 中等价格
            }
        }
    }
    
    fn calculate_sell_price(&self, purchase_price: u64) -> u64 {
        match self {
            TradingStrategy::Conservative { profit_margin } => {
                (purchase_price as f64 * (1.0 + profit_margin)) as u64
            }
            TradingStrategy::Aggressive { profit_margin } => {
                (purchase_price as f64 * (1.0 + profit_margin)) as u64
            }
            TradingStrategy::Balanced { profit_margin } => {
                (purchase_price as f64 * (1.0 + profit_margin)) as u64
            }
        }
    }
}

impl TradingBot {
    fn new(name: String, initial_balance: u64, strategy: TradingStrategy) -> Self {
        Self {
            name,
            balance: initial_balance,
            inventory: Vec::new(),
            strategy,
        }
    }
    
    fn buy_object(&mut self, object: TradingObject) -> Result<()> {
        if self.balance < object.price {
            return Err(TradingError::InsufficientBalance);
        }
        
        if object.price == 0 {
            return Err(TradingError::InvalidPrice);
        }
        
        if !self.strategy.should_buy(&object, self.balance) {
            return Err(TradingError::MarketClosed);
        }
        
        self.balance -= object.price;
        self.inventory.push(object);
        
        println!("{} bought object for {} SUI", self.name, object.price);
        Ok(())
    }
    
    fn sell_object(&mut self, object_id: u64) -> Result<u64> {
        let index = self.inventory.iter()
            .position(|obj| obj.id == object_id)
            .ok_or(TradingError::MarketClosed)?;
        
        let object = self.inventory.remove(index);
        let sell_price = self.strategy.calculate_sell_price(object.price);
        self.balance += sell_price;
        
        println!("{} sold object for {} SUI (profit: {} SUI)", 
                self.name, sell_price, sell_price - object.price);
        
        Ok(sell_price)
    }
    
    fn get_portfolio_value(&self) -> u64 {
        let inventory_value: u64 = self.inventory.iter().map(|obj| obj.price).sum();
        self.balance + inventory_value
    }
    
    fn print_status(&self) {
        println!("\n=== {} Status ===", self.name);
        println!("Balance: {} SUI", self.balance);
        println!("Inventory: {} objects", self.inventory.len());
        println!("Portfolio Value: {} SUI", self.get_portfolio_value());
        println!("Strategy: {:?}", self.strategy);
        
        for obj in &self.inventory {
            println!("  - {} ({} SUI)", obj.name, obj.price);
        }
        println!("==================\n");
    }
}

// 市场
struct Market {
    objects: Vec<TradingObject>,
}

impl Market {
    fn new() -> Self {
        Self {
            objects: Vec::new(),
        }
    }
    
    fn add_object(&mut self, object: TradingObject) {
        self.objects.push(object);
    }
    
    fn list_objects(&self) -> &[TradingObject] {
        &self.objects
    }
    
    fn buy_object(&mut self, object_id: u64) -> Option<TradingObject> {
        let index = self.objects.iter().position(|obj| obj.id == object_id)?;
        Some(self.objects.remove(index))
    }
}

fn main() {
    // 创建市场
    let mut market = Market::new();
    
    // 添加一些交易对象
    market.add_object(TradingObject::new(1, "NFT Art #1".to_string(), 500, "Alice".to_string()));
    market.add_object(TradingObject::new(2, "NFT Art #2".to_string(), 1500, "Bob".to_string()));
    market.add_object(TradingObject::new(3, "NFT Art #3".to_string(), 3000, "Charlie".to_string()));
    market.add_object(TradingObject::new(4, "NFT Art #4".to_string(), 800, "David".to_string()));
    market.add_object(TradingObject::new(5, "NFT Art #5".to_string(), 5000, "Eve".to_string()));
    
    // 创建不同策略的机器人
    let mut conservative_bot = TradingBot::new(
        "ConservativeBot".to_string(),
        2000,
        TradingStrategy::Conservative { profit_margin: 0.1 }
    );
    
    let mut aggressive_bot = TradingBot::new(
        "AggressiveBot".to_string(),
        5000,
        TradingStrategy::Aggressive { profit_margin: 0.2 }
    );
    
    let mut balanced_bot = TradingBot::new(
        "BalancedBot".to_string(),
        3000,
        TradingStrategy::Balanced { profit_margin: 0.15 }
    );
    
    // 模拟交易
    println!("=== Market Objects ===");
    for obj in market.list_objects() {
        println!("{}: {} ({} SUI) - Owner: {}", obj.id, obj.name, obj.price, obj.owner);
    }
    println!("=====================\n");
    
    // 机器人购买对象
    let bots = [&mut conservative_bot, &mut aggressive_bot, &mut balanced_bot];
    
    for bot in &mut bots {
        println!("{} is looking for objects to buy...", bot.name);
        
        for obj in market.list_objects().to_vec() {
            match bot.buy_object(obj.clone()) {
                Ok(_) => {
                    market.buy_object(obj.id);
                }
                Err(e) => {
                    println!("  {} couldn't buy {}: {}", bot.name, obj.name, e);
                }
            }
        }
        
        bot.print_status();
    }
    
    // 机器人出售对象
    for bot in &mut bots {
        if !bot.inventory.is_empty() {
            let object_to_sell = bot.inventory[0].id;
            println!("{} is selling object {}...", bot.name, object_to_sell);
            
            match bot.sell_object(object_to_sell) {
                Ok(_) => {
                    println!("  Sale successful!");
                }
                Err(e) => {
                    println!("  Sale failed: {}", e);
                }
            }
            
            bot.print_status();
        }
    }
    
    // 最终统计
    println!("=== Final Statistics ===");
    conservative_bot.print_status();
    aggressive_bot.print_status();
    balanced_bot.print_status();
}
```

### 运行项目

```bash
# 创建新项目
cargo trading_bot
cd trading_bot

# 将上面的代码复制到 src/main.rs

# 运行项目
cargo run
```

---

## 📚 学习资源

### 官方资源
- [Rust 官方网站](https://www.rust-lang.org/)
- [Rust 程序设计语言](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [Rustlings](https://github.com/rust-lang/rustlings/)

### 在线课程
- [Rust 程序设计语言（中文版）](https://kaisery.github.io/trpl-zh-cn/)
- [Rust 语言圣经](https://course.rs/)

### 练习平台
- [Exercism Rust Track](https://exercism.org/tracks/rust)
- [HackerRank Rust](https://www.hackerrank.com/domains/rust)
- [LeetCode Rust](https://leetcode.com/)

### 社区资源
- [Rust 用户论坛](https://users.rust-lang.org/)
- [Rust Discord](https://discord.gg/rust-lang)
- [Reddit r/rust](https://www.reddit.com/r/rust/)

---

## 🎯 下一步学习

完成本教程后，建议：

1. **深入所有权系统**：理解生命周期参数
2. **学习并发编程**：线程、通道、共享状态
3. **掌握异步编程**：async/await、Tokio
4. **探索宏系统**：声明式宏和过程宏
5. **学习 Web 开发**：Actix-web、Rocket、Axum
6. **进入区块链开发**：学习 Move 语言和 Sui

---

## 💡 学习建议

1. **多写代码**：理论结合实践
2. **阅读源码**：学习优秀项目的代码
3. **参与社区**：加入 Rust 社区讨论
4. **循序渐进**：不要急于求成
5. **保持耐心**：Rust 学习曲线较陡，但回报丰厚

---

**记住：Rust 是一门强大的语言，掌握它将为你的编程生涯打开新的大门！** 🦀✨

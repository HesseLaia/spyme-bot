# SpyMe 上线行动计划（数据库与部署）

本文档回答两件事：**当前要做什么**，以及**在哪里做、是否需要另外部署**。

---

## 一、目标

- **业务目标**：满足「没有数据库上线不了」的要求，让 Bot 可以正式上线。
- **技术目标**：把游戏状态从内存 `Map` 迁到持久化存储（MySQL 或 Redis），并保留在现有代码结构里扩展的余地。

---

## 二、在哪里做？要不要另外部署？

### 代码开发：在现有仓库（你这里）完成即可

- **不需要**另开一个新项目或换仓库。
- 所有改动（加数据库层、改 `bot.js` 调用方式等）都在当前 **spyme-bot** 项目里做。
- 开发、调试可以在本地或 Cursor 里完成，和现在一样。

### 部署：分两块，通常要「另外」有环境

| 角色 | 是什么 | 在哪里 |
|------|--------|--------|
| **Bot 进程** | 跑 `node bot.js` 的 Node 服务 | 需要一台长期在线的机器：例如 Railway、公司 AWS EC2 等（你之前试过 Railway，可以继续用或换 AWS）。 |
| **数据库** | 存游戏状态的 MySQL（或 Redis） | 需要有一个「数据库服务」：公司已有的 MySQL、或云上的 RDS/Redis（如 AWS RDS、Railway MySQL 等）。 |

所以：

- **「直接在你这里搞」** = 代码在**当前这个项目里**改，不换仓库、不另起项目。
- **「另外部署」** = Bot 和数据库都要有**运行环境**：Bot 部署到云/服务器，数据库用公司或云上的 MySQL/Redis；这两部分通常需要你在 Railway / AWS 或公司内网「另外」配置好，而不是只在 Cursor 里写代码。

总结：**开发在这里搞；上线 = 把改好的代码部署到服务器 + 连上数据库。**

---

## 三、行动计划（先不改代码，只列步骤）

### 阶段 0：确认选型（和后端/团队对齐）

1. **存储选型**
   - 若公司要求必须用 **MySQL**：用 MySQL 存游戏状态（可把整局 `game` 序列化存一条记录，或拆表）。
   - 若允许 **Redis**：可按 `docx/high_scale_improvements.md` 用 Redis 做热数据，后续再加 MySQL 做历史/统计。
   - 若两者都要：Redis 存进行中对局，MySQL 存对局历史/统计。
2. **数据库从哪里来**
   - 公司已有 MySQL → 向后端要连接信息（host、库名、账号、密码），或内网地址。
   - 没有则用云上：Railway 的 MySQL 插件、或 AWS RDS 等。

### 阶段 1：设计与抽象（不写具体业务逻辑代码，只定接口）

1. **定义 game 的持久化形态**
   - 若用 MySQL：设计 1～2 张表（例如 `games` 主表 + `game_players` 或把 players 用 JSON 存一列）。
   - 若用 Redis：定 key 规范（如 `spyme:game:{chatId}`），value 存 JSON。
2. **定义仓库接口（与现有 doc 一致）**
   - `getGame(chatId)`  
   - `saveGame(game)`  
   - `deleteGame(chatId)`  
   - 在项目里新增一个模块（如 `repositories/gameRepository.js`），先做**内存实现**，保证与现有 `games` Map 行为一致，便于后面无缝替换。

### 阶段 2：接入数据库实现

1. **实现 MySQL 版（或 Redis 版）的 gameRepository**
   - 连接信息从环境变量读取（如 `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`），不写死在代码里。
2. **在 bot.js 中把对 `games` 的读写改为对 gameRepository 的调用**
   - 所有 `games.get(chatId)` → `await gameRepository.getGame(chatId)`  
   - `games.set(chatId, game)` → `await gameRepository.saveGame(game)`  
   - `games.delete(chatId)` → `await gameRepository.deleteGame(chatId)`  
   - 注意异步：handler 里该 `async/await` 的补全。
3. **本地/测试环境验证**
   - 本地跑 `node bot.js`，连接本地或测试库，完整走一局：创建、加入、开始、描述、投票、结束，再重启进程看状态是否从数据库恢复（若设计上需要恢复进行中对局）。

### 阶段 3：配置与部署

1. **环境变量**
   - 部署环境（Railway / AWS）里配置：`BOT_TOKEN`、`BOT_USERNAME`、以及数据库相关（如 `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`）。
2. **部署 Bot**
   - 代码推送到 GitHub，由 Railway 或 CI 部署到服务器；或手动在 EC2 上拉代码、`npm install`、`pm2 start bot.js` 等。
3. **数据库**
   - 若用公司 MySQL：确保部署 Bot 的机器能访问该 MySQL（同 VPC / 白名单 IP）。  
   - 若用云数据库：在控制台创建实例，拿到连接信息，写入 Bot 的环境变量。
4. **上线后检查**
   - 看日志无报错、在 Telegram 里打一局、重启 Bot 进程后确认状态是否按预期持久化（或新局能正常创建）。

### 阶段 4：（可选）历史与统计

- 若用 MySQL，可增加「对局结束写入历史表」的逻辑，便于以后做统计、报表；Redis 可只做进行中对局，历史仍写 MySQL。

---

## 四、小结

| 问题 | 结论 |
|------|------|
| 是否要另外部署？ | **要**。Bot 要部署到服务器（如 Railway/AWS），数据库要有单独的服务（公司 MySQL 或云上）。 |
| 直接在你这里搞就行？ | **代码**在现有 spyme-bot 仓库里改就行；**部署**需要你在云/公司环境里配置 Bot + 数据库。 |
| 下一步建议 | 先和后端确认：用 MySQL 还是 Redis、数据库连接从哪里要；确认后再按阶段 1→2→3 实施，需要写代码时再改。 |

当前**先不改代码**，只按本计划与团队对齐选型和环境，再按阶段推进即可。

# DEV_NOTE

## 关键决策与长期关注
- DM 行为指南文档在 `docs/dm-guide.md`，默认 DM 风格与规则以种子写入 `dm_profiles` / `dm_profile_rules`。
- 规则优先级：房规（剧本/全局配置） > 规则书 > 情境裁定（需记录）；对应字段 `scripts.rules_json` / `games.rule_overrides_json`。
- AI 流程：快速模型负责意图/合法性/拆分；本地函数执行检定与掷骰；通用模型生成叙事。
- 资源存储：R2 桶名 `dnd`，公开域名使用 `NEXT_PUBLIC_ASSET_URL`。
- 游戏记忆：使用 `game_memories` 独立表保存摘要与世界状态，回合结束后由快速模型压缩并更新角色状态。

## 账号与权限
- 登录/注册使用 better-auth（邮箱+密码），表结构已在迁移中。
- root 用户由环境变量配置（用于全局配置与管理入口）。

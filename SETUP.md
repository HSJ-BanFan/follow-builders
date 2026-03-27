# Follow Builders Notion 日报 - 配置指南

## 快速开始

### 1. 创建 Notion Integration

1. 访问 https://www.notion.so/my-integrations
2. 点击 **+ New integration**
3. 名称: `Follow Builders Daily`
4. 关联工作空间: 选择你的工作空间
5. 复制 **Internal Integration Token** (以 `secret_` 开头)

### 2. 创建 Notion 数据库

1. 在 Notion 中新建一个 Database (表格视图)
2. 数据库名称: `Follow Builders Daily`
3. 必须包含以下属性:
   - **Name** (标题) - 类型: Title
   - **Date** (日期) - 类型: Date
4. 点击右上角 **Share** → **Invite** → 选择你的 Integration

### 3. 获取数据库 ID

数据库 ID 在 URL 中:
```
https://www.notion.so/workspace/xxx?v=...
```
`xxx` 部分就是 DATABASE_ID (去掉连字符或用原始格式都行)

### 4. 配置环境变量

复制 `.env.example` 为 `.env`:
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入:
```
NOTION_API_KEY=secret_your_actual_token_here
NOTION_DATABASE_ID=your_database_id_here
```

### 5. 运行测试

```bash
# Windows
run-digest.bat

# macOS/Linux
node generate-digest-real.js
```

## 自动化设置

### Windows 任务计划程序

1. 打开任务计划程序
2. 创建基本任务
3. 触发器: 每天 9:00
4. 操作: 启动程序
5. 程序: `run-digest.bat` 的完整路径

### GitHub Actions (推荐)

查看 `.github/workflows/daily-digest.yml` 模板

## 配置选项

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `FB_LANGUAGE` | 输出语言 (zh/en/bilingual) | zh |
| `FB_TIMEZONE` | 时区 | Asia/Shanghai |
| `FB_MAX_TWEETS` | 每个 builder 显示推文数 | 2 |
| `FB_MAX_PODCASTS` | 显示播客数 | 2 |
| `FB_MAX_BLOGS` | 显示博客数 | 2 |

## 数据源

- **X/Twitter**: 25 个顶级 AI builders
- **播客**: 5 个 AI 相关播客
- **博客**: Anthropic Engineering、Claude Blog

数据来源: https://github.com/zarazhangrui/follow-builders

## 问题排查

### Error: NOTION_API_KEY not set
- 确保 `.env` 文件存在且格式正确
- 或者直接在命令行设置: `set NOTION_API_KEY=secret_xxx`

### Error: Database not found
- 检查 DATABASE_ID 是否正确
- 确保 Integration 有访问数据库的权限 (Share → Invite)

### No content fetched
- 检查网络连接
- 可能是 GitHub raw 内容被限制，稍后再试

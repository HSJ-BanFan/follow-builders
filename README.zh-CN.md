# Follow Builders Notion 日报使用指南

## 🎉 配置状态

- ✅ Notion Integration 已配置
- ✅ 数据库已连接
- ✅ 第一份日报已生成
- ⏳ 定时任务待设置

## 📊 今日数据

**日报链接**: https://www.notion.so/AI-Builders-Digest-2026-03-26-32f2efd783b8817b9208e41a5102018d

**数据量**:
- 🐦 15 条推文（来自 10 位 AI builders）
- 🎙️ 1 个播客
- 📝 1 篇博客

## 📁 文件说明

```
follow-builders-notion/
├── .env                      # ✅ 你的配置（已设置）
├── generate-digest-real.js   # ✅ 主脚本（自动读取 .env）
├── run-digest.bat            # ✅ 手动运行脚本
├── setup-schedule.bat        # ⏳ 设置定时任务（需管理员运行）
├── .env.example              # 配置模板
├── SETUP.md                  # 详细配置指南
└── package.json              # 项目配置
```

## 🚀 使用方法

### 手动运行（立即生成日报）

双击运行 `run-digest.bat`

或在命令行执行：
```bash
cd follow-builders-notion
node generate-digest-real.js
```

### 设置自动定时任务

1. **右键** `setup-schedule.bat`
2. 选择 **"以管理员身份运行"**
3. 完成！每天上午 9 点会自动生成日报

### 管理定时任务

查看/修改/删除任务：
1. 按 `Win + R`，输入 `taskschd.msc`
2. 找到任务 `FollowBuildersDailyDigest`

## ⚙️ 配置选项

编辑 `.env` 文件可自定义：

```
FB_LANGUAGE=zh          # zh=中文, en=英文, bilingual=双语
FB_TIMEZONE=Asia/Shanghai
FB_MAX_TWEETS=2         # 每位 builder 显示几条推文
FB_MAX_PODCASTS=2       # 显示几个播客
FB_MAX_BLOGS=2          # 显示几篇博客
```

## 🐛 常见问题

### 任务没有自动运行？
- 检查电脑是否在 9:00 AM 开机
- 检查任务计划程序中的任务状态
- 手动运行 `run-digest.bat` 测试

### 数据没有更新？
- Follow Builders feed 每天 UTC 6:00 更新（北京时间 14:00）
- 如果早上运行，数据可能还是昨天的

### 想更改运行时间？
- 打开 `setup-schedule.bat`
- 修改 `/st 09:00` 为你想要的时间
- 重新以管理员运行

## 📧 需要帮助？

- 查看详细配置指南: [SETUP.md](SETUP.md)
- 检查 Notion 数据库权限
- 确保 Integration 有访问数据库的权限

#!/usr/bin/env node

/**
 * Follow Builders Daily Digest Generator - 真实数据版
 * 从官方 feed 获取数据，自动生成简报并写入 Notion
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 自动加载 .env 文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    });
    // 延迟输出，等 CONFIG 初始化后再判断语言
  }
}

// 加载环境变量
loadEnvFile();

// 配置 - 从环境变量读取
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const NOTION_VERSION = '2022-06-28';

// Follow Builders Feed URLs
const FEED_X_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
const FEED_PODCASTS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json';
const FEED_BLOGS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json';

// 用户配置
const CONFIG = {
  language: process.env.FB_LANGUAGE || 'zh', // zh, en, bilingual
  timezone: process.env.FB_TIMEZONE || 'Asia/Shanghai',
  maxTweetsPerBuilder: parseInt(process.env.FB_MAX_TWEETS) || 2,
  maxPodcasts: parseInt(process.env.FB_MAX_PODCASTS) || 2,
  maxBlogs: parseInt(process.env.FB_MAX_BLOGS) || 2
};

// 多语言文案
const I18N = {
  zh: {
    title: '📊 AI 建设者日报',
    podcasts: '🎙️ 播客摘要',
    tweets: '🐦 建设者动态',
    blogs: '📝 博客文章',
    author: '👤 作者',
    viewOnX: '查看原文',
    viewBlog: '阅读全文',
    generatedAt: '📅 生成时间',
    dataSource: '数据来源',
    stats: (tweets, podcasts, blogs) => `📅 ${new Date().toLocaleDateString('zh-CN')} | 🐦 ${tweets} 条推文 | 🎙️ ${podcasts} 个播客 | 📝 ${blogs} 篇博客`,
    noContent: '今日暂无新内容，请明天再来看看！'
  },
  en: {
    title: '📊 AI Builders Daily Digest',
    podcasts: '🎙️ Podcast Summaries',
    tweets: '🐦 Builder Tweets',
    blogs: '📝 Blog Posts',
    author: '👤 Author',
    viewOnX: 'View on X',
    viewBlog: 'Read full article',
    generatedAt: '📅 Generated',
    dataSource: 'Data source',
    stats: (tweets, podcasts, blogs) => `📅 ${new Date().toLocaleDateString('en-US')} | 🐦 ${tweets} tweets | 🎙️ ${podcasts} podcasts | 📝 ${blogs} blogs`,
    noContent: 'No new content today, check back tomorrow!'
  }
};

// 获取当前语言的文案
function t(key, ...args) {
  const lang = I18N[CONFIG.language] || I18N.en;
  const value = lang[key];
  if (typeof value === 'function') {
    return value(...args);
  }
  return value || key;
}

// 验证配置
function validateConfig() {
  const isZh = CONFIG.language === 'zh';
  if (!NOTION_API_KEY) {
    console.error(isZh ? '❌ 错误: 未设置 NOTION_API_KEY' : '❌ Error: NOTION_API_KEY not set');
    console.error(isZh ? '请在 .env 文件中设置: NOTION_API_KEY=secret_xxx' : 'Set it in .env file: NOTION_API_KEY=secret_xxx');
    process.exit(1);
  }
  if (!DATABASE_ID) {
    console.error(isZh ? '❌ 错误: 未设置 NOTION_DATABASE_ID' : '❌ Error: NOTION_DATABASE_ID not set');
    console.error(isZh ? '请在 .env 文件中设置: NOTION_DATABASE_ID=xxx' : 'Set it in .env file: NOTION_DATABASE_ID=xxx');
    process.exit(1);
  }
}

// HTTP 请求辅助函数
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// 获取真实的 Follow Builders 数据
async function fetchDailyContent() {
  const isZh = CONFIG.language === 'zh';
  console.log(isZh ? '📥 正在从 Follow Builders 获取数据...' : '📥 Fetching data from Follow Builders feeds...');

  try {
    const [feedX, feedPodcasts, feedBlogs] = await Promise.all([
      fetchJSON(FEED_X_URL).catch(() => null),
      fetchJSON(FEED_PODCASTS_URL).catch(() => null),
      fetchJSON(FEED_BLOGS_URL).catch(() => null)
    ]);

    const today = new Date().toISOString().split('T')[0];
    const content = {
      title: isZh ? `AI 建设者日报 - ${today}` : `AI Builders Digest - ${today}`,
      date: today,
      podcasts: [],
      tweets: [],
      blogs: [],
      stats: {
        builders: 0,
        tweets: 0,
        podcasts: 0,
        blogs: 0
      }
    };

    // 处理播客数据
    if (feedPodcasts?.podcasts) {
      content.podcasts = feedPodcasts.podcasts
        .slice(0, CONFIG.maxPodcasts)
        .map(p => ({
          title: p.title || 'Untitled',
          summary: p.transcript ? p.transcript.substring(0, 500) + '...' : (isZh ? '暂无文稿' : 'No transcript available'),
          link: p.url,
          author: p.name,
          duration: 'N/A'
        }));
      content.stats.podcasts = content.podcasts.length;
    }

    // 处理推文数据
    if (feedX?.x) {
      feedX.x.slice(0, 10).forEach(builder => {
        if (builder.tweets) {
          const tweets = builder.tweets
            .slice(0, CONFIG.maxTweetsPerBuilder)
            .map(t => ({
              author: builder.name,
              handle: `@${builder.handle}`,
              content: t.text,
              link: t.url,
              engagement: isZh ? `${t.likes || 0} 赞` : `${t.likes || 0} likes`
            }));
          content.tweets.push(...tweets);
          content.stats.tweets += tweets.length;
        }
        content.stats.builders++;
      });
    }

    // 处理博客数据
    if (feedBlogs?.blogs) {
      content.blogs = feedBlogs.blogs
        .slice(0, CONFIG.maxBlogs)
        .map(b => ({
          title: b.title,
          author: b.author || b.name,
          summary: b.content ? b.content.substring(0, 300) + '...' : b.description || '',
          link: b.url,
          date: b.publishedAt
        }));
      content.stats.blogs = content.blogs.length;
    }

    console.log(isZh
      ? `✅ 获取成功: ${content.stats.tweets} 条推文（来自 ${content.stats.builders} 位建设者），${content.stats.podcasts} 个播客，${content.stats.blogs} 篇博客`
      : `✅ Fetched: ${content.stats.tweets} tweets from ${content.stats.builders} builders, ${content.stats.podcasts} podcasts, ${content.stats.blogs} blogs`
    );
    return content;

  } catch (error) {
    console.error(isZh ? '⚠️ 获取 feed 时出错:' : '⚠️ Error fetching feeds:', error.message);
    console.log(isZh ? '🔄 正在使用备用数据...' : '🔄 Falling back to sample data...');
    return fetchSampleContent();
  }
}

// 备用模拟数据
function fetchSampleContent() {
  const isZh = CONFIG.language === 'zh';
  const today = new Date().toISOString().split('T')[0];
  return {
    title: isZh ? `AI 建设者日报 - ${today}` : `AI Builders Digest - ${today}`,
    date: today,
    podcasts: [
      {
        title: 'Latent Space - AI Engineering',
        summary: isZh ? '本周讨论了 AI 工程化的最新趋势，包括模型部署、推理优化和生产环境的最佳实践。' : 'This week discussed the latest trends in AI engineering, including model deployment, inference optimization, and production best practices.',
        link: 'https://www.latent.space/',
        author: 'Latent Space',
        duration: '45:00'
      }
    ],
    tweets: [
      {
        author: 'Sample Builder',
        handle: '@example',
        content: isZh ? 'AI 正在改变我们构建软件的方式。' : 'AI is transforming how we build software.',
        link: 'https://x.com/',
        engagement: isZh ? '1.2K 赞' : '1.2K likes'
      }
    ],
    blogs: [],
    stats: { builders: 1, tweets: 1, podcasts: 1, blogs: 0 }
  };
}

// 生成页面内容块
function generatePageBlocks(content) {
  const blocks = [];

  // 标题
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{
        type: 'text',
        text: { content: t('title') }
      }]
    }
  });

  // 统计信息
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{
        type: 'text',
        text: {
          content: t('stats', content.stats.tweets, content.stats.podcasts, content.stats.blogs)
        }
      }],
      icon: { emoji: '📈' }
    }
  });

  // 播客部分
  if (content.podcasts.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: t('podcasts') }
        }]
      }
    });

    content.podcasts.forEach(podcast => {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{
            type: 'text',
            text: {
              content: podcast.title,
              link: { url: podcast.link }
            }
          }]
        }
      });

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: `${t('author')}: ${podcast.author}` } },
            { type: 'text', text: { content: '\n\n' } },
            { type: 'text', text: { content: podcast.summary } }
          ]
        }
      });

      blocks.push({ object: 'block', type: 'divider', divider: {} });
    });
  }

  // Twitter 部分
  if (content.tweets.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: t('tweets') }
        }]
      }
    });

    content.tweets.forEach(tweet => {
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [{
            type: 'text',
            text: { content: tweet.content }
          }]
        }
      });

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: `— ${tweet.author} ${tweet.handle} | ❤️ ${tweet.engagement} | ` } },
            { type: 'text', text: { content: t('viewOnX'), link: { url: tweet.link } } }
          ]
        }
      });

      blocks.push({ object: 'block', type: 'divider', divider: {} });
    });
  }

  // 博客部分
  if (content.blogs.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: t('blogs') }
        }]
      }
    });

    content.blogs.forEach(blog => {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{
            type: 'text',
            text: {
              content: blog.title,
              link: { url: blog.link }
            }
          }]
        }
      });

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: `${t('author')}: ${blog.author}` } },
            { type: 'text', text: { content: '\n\n' } },
            { type: 'text', text: { content: blog.summary } }
          ]
        }
      });

      blocks.push({ object: 'block', type: 'divider', divider: {} });
    });
  }

  // 底部信息
  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        type: 'text',
        text: {
          content: `${t('generatedAt')}: ${new Date().toLocaleString(CONFIG.language === 'zh' ? 'zh-CN' : 'en-US', { timeZone: CONFIG.timezone })} | ${t('dataSource')}: Follow Builders`,
          link: { url: 'https://github.com/zarazhangrui/follow-builders' }
        }
      }]
    }
  });

  return blocks;
}

// 创建 Notion 页面
function createNotionPage(title, blocks) {
  return new Promise((resolve, reject) => {
    // 简化页面数据，只包含标题属性
    const pageData = {
      parent: { database_id: DATABASE_ID },
      properties: {
        'title': {
          title: [{ type: 'text', text: { content: title } }]
        }
      },
      children: blocks
    };

    const postData = JSON.stringify(pageData);

    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: '/v1/pages',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Notion API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 主函数
async function main() {
  try {
    const isZh = CONFIG.language === 'zh';

    // 输出加载环境变量的信息
    if (fs.existsSync(path.join(__dirname, '.env'))) {
      console.log(isZh ? '✅ 已加载 .env 文件' : '✅ Loaded .env file');
    }

    console.log(isZh ? '🚀 正在生成 AI 建设者日报...' : '🚀 Starting Follow Builders Daily Digest...');
    console.log(isZh ? '⏰ 时间:' : '⏰ Time:', new Date().toLocaleString(isZh ? 'zh-CN' : 'en-US', { timeZone: CONFIG.timezone }));
    console.log(isZh ? `🌐 语言: ${CONFIG.language === 'zh' ? '中文' : 'English'}` : `🌐 Language: ${CONFIG.language}`);
    console.log('');

    validateConfig();

    // 1. 获取内容
    const content = await fetchDailyContent();

    if (content.stats.tweets === 0 && content.stats.podcasts === 0 && content.stats.blogs === 0) {
      console.log(isZh ? '⚠️ 今日暂无新内容。' : '⚠️ No new content available today.');
      process.exit(0);
    }

    // 2. 生成页面内容
    console.log(isZh ? '🎨 正在生成 Notion 页面...' : '🎨 Generating Notion page...');
    const blocks = generatePageBlocks(content);

    // 3. 创建 Notion 页面
    console.log(isZh ? '📝 正在创建 Notion 页面...' : '📝 Creating page in Notion...');
    const result = await createNotionPage(content.title, blocks);

    // 4. 保存本地 JSON 缓存（供 Claude Code 读取）
    const dailyDataDir = path.join(__dirname, 'daily-data');
    const dailyDataPath = path.join(dailyDataDir, `${content.date}.json`);
    if (!fs.existsSync(dailyDataDir)) {
      fs.mkdirSync(dailyDataDir, { recursive: true });
    }
    fs.writeFileSync(dailyDataPath, JSON.stringify(content, null, 2), 'utf-8');
    console.log(isZh ? `💾 数据已缓存: daily-data/${content.date}.json` : `💾 Data cached: daily-data/${content.date}.json`);

    console.log('');
    console.log(isZh ? '✅ 日报生成成功！' : '✅ Success! Daily digest created:');
    console.log(`📄 ${isZh ? '页面' : 'Page'}: ${result.url}`);
    console.log(`📊 ${isZh ? '统计' : 'Stats'}: ${content.stats.tweets} ${isZh ? '条推文' : 'tweets'}, ${content.stats.podcasts} ${isZh ? '个播客' : 'podcasts'}, ${content.stats.blogs} ${isZh ? '篇博客' : 'blogs'}`);

  } catch (error) {
    console.error('');
    console.error(CONFIG.language === 'zh' ? '❌ 错误:' : '❌ Error:', error.message);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { main };

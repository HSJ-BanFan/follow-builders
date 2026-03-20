#!/usr/bin/env node

/**
 * Follow Builders Daily Digest Generator
 * 每天早上 9 点自动生成简报并写入 Notion
 */

const https = require('https');

// 配置
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = 'b7a6373a-ef3d-40bd-9f7c-c9e8d5c2cfb7';
const NOTION_VERSION = '2025-09-03';

if (!NOTION_API_KEY) {
  console.error('❌ Error: NOTION_API_KEY environment variable is required');
  console.error('Set it with: export NOTION_API_KEY=your_key_here');
  process.exit(1);
}

// 模拟内容（实际应该从 Follow Builders 的中心 feed 获取）
function fetchDailyContent() {
  return {
    date: new Date().toISOString().split('T')[0],
    podcasts: [
      {
        title: 'Latent Space - AI Architecture',
        summary: '讨论了最新的 AI 架构趋势，包括多模态模型的发展方向。',
        link: 'https://youtube.com/example1'
      },
      {
        title: 'Training Data - Dataset Engineering',
        summary: '深入探讨数据工程的最佳实践，如何构建高质量训练数据集。',
        link: 'https://youtube.com/example2'
      }
    ],
    tweets: [
      {
        author: 'Andrej Karpathy',
        content: 'The future of AI is about making models more efficient and accessible.',
        link: 'https://x.com/karpathy'
      },
      {
        author: 'Swyx',
        content: 'AI engineering is becoming a distinct discipline.',
        link: 'https://x.com/swyx'
      },
      {
        author: 'Sam Altman',
        content: 'We are seeing incredible progress in AI capabilities.',
        link: 'https://x.com/sama'
      }
    ],
    insights: [
      '多模态 AI 正在成为主流趋势',
      '数据质量比数据量更重要',
      'AI 工程正在成为独立学科',
      '模型效率是关键竞争优势'
    ]
  };
}

// 使用 AI 生成摘要（简化版，实际应该调用 LLM）
async function generateSummary(content) {
  // 这里应该调用 AI API 生成双语摘要
  // 暂时返回简单格式
  const podcastSummary = content.podcasts.map(p =>
    `**${p.title}**\n${p.summary}\n🔗 ${p.link}\n`
  ).join('\n');

  const twitterSummary = content.tweets.map(t =>
    `**@${t.author}**\n${t.content}\n🔗 ${t.link}\n`
  ).join('\n');

  const insightsSummary = content.insights.map(i => `• ${i}`).join('\n');

  return {
    podcast: podcastSummary,
    twitter: twitterSummary,
    insights: insightsSummary
  };
}

// 创建 Notion 页面
function createNotionPage(data) {
  return new Promise((resolve, reject) => {
    console.log('🔍 Debug - data.date:', data.date);

    const pageData = {
      parent: {
        database_id: DATABASE_ID
      },
      properties: {
        'Date': {
          date: {
            start: data.date || new Date().toISOString().split('T')[0]
          }
        },
        'Podcast Summary': {
          rich_text: [{
            type: 'text',
            text: { content: data.podcast }
          }]
        },
        'Twitter Summary': {
          rich_text: [{
            type: 'text',
            text: { content: data.twitter }
          }]
        },
        'Key Insights': {
          rich_text: [{
            type: 'text',
            text: { content: data.insights }
          }]
        },
        'Language': {
          select: { name: '双语' }
        },
        'Status': {
          select: { name: 'Generated' }
        }
      }
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
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Notion API Error: ${res.statusCode} - ${body}`));
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
    console.log('🚀 Starting Follow Builders Daily Digest generation...');

    // 1. 获取内容
    console.log('📥 Fetching daily content...');
    const content = fetchDailyContent();

    // 2. 生成摘要
    console.log('🤖 Generating summaries...');
    const summary = await generateSummary(content);

    // 3. 创建 Notion 页面
    console.log('📝 Creating Notion page...');
    const result = await createNotionPage(summary);

    console.log('✅ Digest created successfully!');
    console.log(`📄 Page URL: ${result.url}`);
    console.log(`📅 Date: ${content.date}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { main };

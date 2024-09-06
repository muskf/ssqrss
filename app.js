const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const RSS = require('rss');
const { promisify } = require('util');
const path = require('path');
const sleep = promisify(setTimeout);
const iconv = require('iconv-lite');
const formatXml = require('xml-formatter');

const app = express();
const PORT = 53612;

app.use(express.static(path.join(__dirname, 'public')));

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
];

const cookie = 'ASPSESSIONIDQCDBDTRB=BPGFEACBBKDNKMCBNPPBPPFL';

function getRandomUserAgent() {
  const index = Math.floor(Math.random() * userAgents.length);
  return userAgents[index];
}

// 爬取目标页面的URL
const targetURL = 'http://ssq.smaxit.com.cn/html/xxyw/';

async function generateRSSFeed() {
  try {
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Referer': 'http://ssq.smaxit.com.cn/',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Cookie': cookie,
    };

    await sleep(Math.random() * 2000 + 1000);

    const { data } = await axios.get(targetURL, {
      headers: headers,
      responseType: 'arraybuffer',
    });

    const decodedData = iconv.decode(data, 'gb2312');
    const $ = cheerio.load(decodedData);

    const feed = new RSS({
      title: '学校要闻 RSS',
      description: '最新学校新闻动态',
      feed_url: 'http://localhost:3000/rss',
      site_url: targetURL,
      language: 'zh-cn',
    });

    $('ul.list2 li').each((index, element) => {
      const title = $(element).find('h4').text().trim();
      const link = $(element).find('a').attr('href');
      const description = $(element).find('p').text().trim();
      const pubDate = $(element).find('span').text().trim();

      feed.item({
        title: title,
        description: description,
        url: `http://ssq.smaxit.com.cn${link}`,
        date: pubDate,
      });
    });

    // 格式化RSS XML
    const xml = feed.xml();
    const formattedXml = formatXml(xml);

    return formattedXml;
  } catch (error) {
    console.error('Error fetching or parsing data:', error);
    return '';
  }
}

app.get('/rss', async (req, res) => {
  const rssFeed = await generateRSSFeed();
  res.set('Content-Type', 'application/rss+xml');
  res.send(rssFeed);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

app.listen(PORT, () => {
  console.log(`RSS服务正在运行：http://localhost:${PORT}/rss`);
});

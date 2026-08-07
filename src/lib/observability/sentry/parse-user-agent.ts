/** 轻量 UA 解析（仅浏览器 / OS 名，供 Sentry tag；原文另存 attribute） */

export type ParsedUserAgent = {
  browser: string;
  os: string;
};

export function parseUserAgent(ua: string | undefined): ParsedUserAgent {
  if (!ua) return { browser: 'unknown', os: 'unknown' };

  let os = 'unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X|macOS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'unknown';
  if (/OAI-SearchBot|Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|Slurp/i.test(ua)) {
    browser = 'bot';
  } else if (/Edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Chrome';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Safari';
  }

  return { browser, os };
}

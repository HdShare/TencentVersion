const fs = require("fs");
const path = require("path");

const { readFile, writeFile } = fs.promises;

const repoRoot = process.cwd();
const docsDataPath = path.join(repoRoot, "data", "docsData.json");

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHANNEL_ID = process.env.TG_CHANNEL_ID;

async function sendNotify(text) {
  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHANNEL_ID, text }),
    },
  );
  const result = await response.json();

  if (!response.ok || !result.ok) {
    console.log("发送通知失败");
    return;
  }

  console.log(`发送通知成功`);
}

async function getDouYinVersionInfo(versionCode) {
  const resp = await fetch(`https://api5-normal-lq.amemv.com/check_version/v7/?device_id=0&device_platform=android&os_api=36&aid=1128&update_version_code=${versionCode}`);
  const respJson = await resp.json();
  const name = respJson.data.real_version_name;
  const code = respJson.data.real_version_code;
  const url = respJson.data.download_url;
  return { name, code, url };
}

async function getWeChatVersionInfo() {
  const response = await fetch("https://dldir1.qq.com/weixin/android/weixin_android_alpha_config.json");
  const configText = await response.text();
  const [, url, major, minor, patch, code, cliVer, suffix = ""] = configText.match(/\burl\s*:\s*"(https:\/\/[^"\r\n]*\/weixin(\d)(\d)(\d+)android(\d+)_(0x[0-9a-f]+)_arm64(_\d+)?\.apk)"/i);
  return { name: `${major}.${minor}.${patch}`, code, cliVer: `${cliVer}${suffix}`, url };
}

function getAppVersions(docsData, appName) {
  const app = docsData.apps.find((item) => item.hero?.name === appName);

  if (!app || !Array.isArray(app.versions)) {
    throw new Error(`未找到 ${appName} 的版本列表`);
  }

  return app.versions;
}

function checkDouYinVersionUpdate(docsData, { name, code, url }) {
  const versions = getAppVersions(docsData, "DouYinAndroidCN");
  const entry = { name: `v${name}_${code}`, detail: "", url };

  console.log(`DouYin CN 最新地址: ${url}`);

  if (versions.some((item) => item.url === url)) {
    console.log("DouYin CN 地址已存在, 跳过更新");
    return null;
  }

  versions.unshift(entry);
  return {
    label: "DouYin CN",
    entry,
    notification: `DouYin_${entry.name}\n\n下载地址:\n${url}\n\n#DouYin@backup_apk`,
  };
}

function checkWeChatVersionUpdate(docsData, { name, code, cliVer, url }) {
  const versions = getAppVersions(docsData, "WeChatAndroidCN");
  const entry = { name: `v${name}(${code})_${cliVer}`, detail: "", url };

  console.log(`WeChat CN 最新地址: ${entry.url}`);

  if (versions.some((item) => item.url === entry.url)) {
    console.log("WeChat CN 地址已存在, 跳过更新");
    return null;
  }

  versions.unshift(entry);
  return {
    label: "WeChat CN",
    entry,
    notification: `WeChat_${entry.name}\n\n下载地址:\n${entry.url}\n\n#WeChat@backup_apk`,
  };
}

async function main() {
  const docsData = JSON.parse(await readFile(docsDataPath, "utf8"));
  const updates = [];

  const douYinInfo = await getDouYinVersionInfo(40000000);
  const douYinUpdate = checkDouYinVersionUpdate(docsData, douYinInfo);
  if (douYinUpdate) {
    updates.push(douYinUpdate);
  }

  const weChatInfo = await getWeChatVersionInfo();
  const weChatUpdate = checkWeChatVersionUpdate(docsData, weChatInfo);
  if (weChatUpdate) {
    updates.push(weChatUpdate);
  }

  if (updates.length === 0)  return;

  await writeFile( docsDataPath, `${JSON.stringify(docsData, null, 2)}\n`, "utf8", );
  console.log(`写入本地, 本次新增 ${updates.length} 条`);

  for (const update of updates) {
    await sendNotify(update.notification);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

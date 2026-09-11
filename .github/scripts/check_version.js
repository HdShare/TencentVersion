const fs = require("fs");
const path = require("path");

const { readFile, writeFile } = fs.promises;

const repoRoot = process.cwd();
const dyDataPath = path.join(repoRoot, "data", "dyData.json");

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHANNEL_ID = process.env.TG_CHANNEL_ID;

async function getVersionInfo(versionCode) {
  const resp = await fetch(
    `https://api5-normal-lq.amemv.com/check_version/v7/?device_id=0&aid=1128&device_platform=android&os_api=36&update_version_code=${versionCode}`,
    {
      method: "GET",
      headers: {
        "User-Agent": "com.ss.android.ugc.aweme (Linux; U; Android 16)",
      },
    },
  );
  const respJson = await resp.json();
  const name = respJson.data.real_version_name;
  const code = respJson.data.real_version_code;
  const url = respJson.data.download_url;
  return { name, code, url };
}

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

async function main() {
  const dyData = JSON.parse(await readFile(dyDataPath, "utf8"));
  console.log(`读取本地, 共 ${dyData.length} 条`);

  const { name, code, url } = await getVersionInfo(40000000);
  console.log(`最新地址: ${url}`);

  if (dyData.some((item) => item.url === url)) {
    console.log("地址已存在, 跳过更新");
    return;
  }

  dyData.unshift({ name: `v${name}_${code}`, url: url });
  await writeFile(dyDataPath, `${JSON.stringify(dyData, null, 2)}\n`, "utf8");
  console.log(`写入本地, 共 ${dyData.length} 条`);

  const message = `DouYin_${name}_${code}\n\n下载地址:\n${url}\n\n#DY@backup_apk`;
  await sendNotify(message);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

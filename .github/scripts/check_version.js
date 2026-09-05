const fs = require("fs");
const path = require("path");

const { readFile, writeFile } = fs.promises;

const repoRoot = process.cwd();
const dyDataPath = path.join(repoRoot, "data", "dyData.json");

async function getDownloadUrl(params) {
  const resp = await fetch(
    "https://api5-normal-lq.amemv.com/check_version/v7/?device_id=0&aid=1128&device_platform=android&os_api=36&update_version_code=40000000",
    {
      method: "GET",
      headers: {
        "User-Agent": "com.ss.android.ugc.aweme/400000 (Linux; U; Android 16)",
      },
    },
  );
  const respJson = await resp.json();
  const downloadUrl = respJson.data.download_url;
  return downloadUrl;
}

async function main() {
  const dyData = JSON.parse(await readFile(dyDataPath, "utf8"));
  console.log(`读取本地, 共 ${dyData.length} 条`);

  const downloadUrl = await getDownloadUrl();
  console.log(`最新地址: ${downloadUrl}`);

  if (dyData.some(({ url }) => url === downloadUrl)) {
    console.log("地址已存在, 跳过更新");
    return;
  }

  dyData.push({ url: downloadUrl });
  await writeFile(dyDataPath, `${JSON.stringify(dyData, null, 2)}\n`, "utf8");
  console.log(`写入本地, 共 ${dyData.length} 条`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const fs = require("fs");
const path = require("path");

/**
 * JRV Admin Version Automator
 * Usage: node scripts/bump-version.js [version]
 * If no version is provided, it increments the patch version.
 */

const PACKAGE_PATH = path.join(__dirname, "../package.json");
const README_PATH = path.join(__dirname, "../README_ADMIN.md");

function getKLBatchDate() {
  const d = new Date();
  // Shift to KL time (UTC+8)
  const kl = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${
    months[kl.getUTCMonth()]
  } ${kl.getUTCDate()}, ${kl.getUTCFullYear()}`;
}

function bumpVersion() {
  // 1. Read package.json
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));
  const oldVersion = pkg.version;
  let newVersion = process.argv[2];

  if (!newVersion) {
    const parts = oldVersion.split(".").map(Number);
    parts[2] += 1;
    newVersion = parts.join(".");
  }

  // 2. Update package.json
  pkg.version = newVersion;
  fs.writeFileSync(PACKAGE_PATH, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`✅ package.json: ${oldVersion} -> ${newVersion}`);

  // 3. Update README_ADMIN.md
  if (fs.existsSync(README_PATH)) {
    let readme = fs.readFileSync(README_PATH, "utf8");
    const dateStr = getKLBatchDate();

    // A. Update Top Header
    // Replace: **Latest Version:** `v1.2.3` (Updated Jan 12, 2026)
    const newHeader = `**Latest Version:** \`v${newVersion}\` (Updated ${dateStr})`;
    readme = readme.replace(
      /\*\*Latest Version:\*\* `v\d+\.\d+\.\d+` \(Updated .+\)/,
      newHeader
    );

    // B. Insert into Release History
    // We look for "## 🕒 Release History" and insert right after it
    const historyHeader = "## 🕒 Release History";
    if (readme.includes(historyHeader)) {
      const parts = readme.split(historyHeader);
      const messageArg =
        process.argv.find((arg) => arg.startsWith("--m=")) ||
        process.argv.find((arg) => arg.startsWith("--message="));

      const summary = messageArg ? messageArg.split("=")[1] : "New Update";

      const newEntry = `\n\n### \`v${newVersion}\` (${summary})\n\n- (Summary of changes for version ${newVersion})`;

      // Check if this version already has an entry to avoid duplicates if run twice
      if (!readme.includes(`### \`v${newVersion}\``)) {
        readme = parts[0] + historyHeader + newEntry + parts[1];
      }
    }

    fs.writeFileSync(README_PATH, readme);
    console.log(
      `✅ README_ADMIN.md: Version header and history updated to v${newVersion}`
    );
  }

  process.exit(0);
}

bumpVersion();

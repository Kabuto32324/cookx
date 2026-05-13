import { createInterface } from "readline";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const recipesDir = join(__dirname, "..", "src", "content", "recipes");

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("\n=== 添加新菜谱 ===\n");

  const title = await ask("菜名：");
  if (!title.trim()) {
    console.log("菜名不能为空！");
    rl.close();
    return;
  }

  const category = await ask("分类（如：川菜、家常菜、烘焙）：");
  const cover = await ask("封面图文件名（放在 public/images/ 下，如 mapo-tofu.jpg，没有直接回车）：");
  const ingredientCount = parseInt(
    (await ask("食材数量：")) || "0",
    10
  );

  const ingredients = [];
  for (let i = 0; i < ingredientCount; i++) {
    console.log(`\n-- 食材 ${i + 1} --`);
    const name = await ask("  名称：");
    const amount = await ask("  用量：");
    ingredients.push({ name, amount });
  }

  const stepCount = parseInt(
    (await ask("\n步骤数量：")) || "0",
    10
  );

  const steps = [];
  for (let i = 0; i < stepCount; i++) {
    const step = await ask(`步骤 ${i + 1}：`);
    steps.push(step);
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  let slug = title.replace(/[a-zA-Z0-9一-鿿]/g, (c) => {
    if (/[a-zA-Z0-9]/.test(c)) return c;
    return "";
  }).replace(/\s+/g, "-").toLowerCase() || `recipe-${dateStr}`;
  slug = dateStr + "-" + slug;

  const frontmatter = [
    "---",
    `title: "${title}"`,
    cover ? `cover: "/images/${cover}"` : `cover: ""`,
    `category: "${category}"`,
    "ingredients:",
    ...ingredients.map(
      (i) => `  - name: "${i.name}"\n    amount: "${i.amount}"`
    ),
    "steps:",
    ...steps.map((s) => `  - "${s}"`),
    "---",
  ].join("\n");

  const filePath = join(recipesDir, `${slug}.md`);

  if (!existsSync(recipesDir)) {
    mkdirSync(recipesDir, { recursive: true });
  }

  writeFileSync(filePath, frontmatter, "utf-8");
  console.log(`\n✅ 菜谱已创建`);

  const deploy = await ask("\n是否一键部署到 GitHub？（y/n，默认 y）：");
  if (deploy === "n" || deploy === "N") {
    console.log("\n后续手动部署：");
    console.log("  git add .");
    console.log('  git commit -m "添加新菜谱：' + title + '"');
    console.log("  git push\n");
  } else {
    console.log("\n⏳ 正在提交并推送...");
    try {
      execSync("git add -A", { cwd: join(__dirname, ".."), stdio: "pipe" });
      execSync(`git commit -m "添加新菜谱：${title}"`, {
        cwd: join(__dirname, ".."),
        stdio: "pipe",
      });
      execSync("git push origin main", {
        cwd: join(__dirname, ".."),
        stdio: "pipe",
      });
      console.log("✅ 已提交并推送到 GitHub，等待自动部署...");
      console.log(`   地址：https://github.com/Kabuto32324/cookx/actions`);
      console.log(`   网站：https://kabuto32324.github.io/cookx/`);
    } catch (e) {
      console.log("❌ 部署失败：" + e.stderr?.toString().trim() || e.message);
    }
  }

  rl.close();
}

main();

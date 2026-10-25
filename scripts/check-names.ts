// 校验暂存文件的命名。规则只有一条：
//
//   <主题>/<视频标题>/<类型> - <视频标题> via VidBee.<扩展名>
//   <主题>/<视频标题>/改为文章/<序号>.png
//
// 类型是 字幕、改为文章、总结、大纲、时间线，扩展名是 .md，总结也可以是 .png。
// 文件名里的标题必须和所在目录名一致。改为文章的分页图放在
// 改为文章/ 下，文件名是纯数字序号。
//
// 不检查 README.md、AGENTS.md、.gitignore、scripts/、.githooks/。

const KINDS: Record<string, string[]> = {
  字幕: [".md"],
  改为文章: [".md"],
  总结: [".md", ".png"],
  大纲: [".md"],
  时间线: [".md"],
};

const SKIPPED = new Set(["README.md", "AGENTS.md", ".gitignore"]);

function violation(path: string): string | null {
  if (SKIPPED.has(path) || path.startsWith("scripts/") || path.startsWith(".githooks/")) {
    return null;
  }
  const parts = path.split("/");
  if (parts.length === 4 && parts[2] === "改为文章" && /^\d+\.png$/.test(parts[3])) {
    return null;
  }
  if (parts.length !== 3) {
    return "必须放在 <主题>/<视频标题>/ 下";
  }
  const [topic, title, name] = parts;
  if (!topic || !title) return "缺少主题或标题目录";
  for (const [kind, exts] of Object.entries(KINDS)) {
    for (const ext of exts) {
      if (name === `${kind} - ${title} via VidBee${ext}`) return null;
    }
  }
  return "文件名必须是「字幕|改为文章|总结|大纲|时间线 - <所在目录名> via VidBee.md」，总结也可以是 .png";
}

const out = Bun.spawnSync(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], {
  stdout: "pipe",
});
if (out.exitCode !== 0) process.exit(out.exitCode ?? 1);

const bad = out.stdout
  .toString()
  .split("\0")
  .filter(Boolean)
  .flatMap((path) => {
    const why = violation(path);
    return why ? [[path, why] as const] : [];
  });

if (bad.length === 0) process.exit(0);

console.error("文件名不符合 read 文库的命名规则，提交被拒绝：");
for (const [path, why] of bad) console.error(`  ${path}\n    ${why}`);
process.exit(1);

const fs = require('node:fs');
const path = require('node:path');

function appendChatToReport(overviewPath, reportPath) {
  if (!fs.existsSync(overviewPath)) {
    console.error(`Error: overview file not found at ${overviewPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(reportPath)) {
    console.error(`Error: report file not found at ${reportPath}`);
    process.exit(1);
  }

  const lines = fs
    .readFileSync(overviewPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  let chatLog = '\n## 附录：完整聊天记录\n\n*以下是本次跑团过程中玩家与GM的原始记录：*\n\n';

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'USER_INPUT' && entry.content) {
        let content = entry.content;
        // remove <USER_REQUEST> tags and metadata
        content = content.replace(/<USER_REQUEST>\n?/, '').replace(/\n?<\/USER_REQUEST>[\s\S]*/, '');
        if (content.trim()) {
          chatLog += `**【调查员】**：\n> ${content.trim().replace(/\n/g, '\n> ')}\n\n`;
        }
      } else if (entry.source === 'MODEL' && entry.type === 'PLANNER_RESPONSE' && entry.content) {
        chatLog += `**【GM】**：\n${entry.content.trim()}\n\n---\n\n`;
      }
    } catch (_error) {
      // Ignore parse errors
    }
  }

  let reportContent = fs.readFileSync(reportPath, 'utf8');

  // remove the previous appendix if exists
  const appendixIndex = reportContent.indexOf('## 附录：完整聊天记录');
  const oldAppendixIndex = reportContent.indexOf('## 附录：玩家行动记录');

  const targetIndex = appendixIndex !== -1 ? appendixIndex : oldAppendixIndex !== -1 ? oldAppendixIndex : -1;

  if (targetIndex !== -1) {
    reportContent = reportContent.substring(0, targetIndex);
  }

  reportContent += chatLog;
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Successfully appended chat logs from ${overviewPath} to ${reportPath}`);
}

// CLI Support
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node append_chat.js <overview_txt_path> <report_markdown_path>');
    process.exit(1);
  }

  const overviewPath = path.resolve(process.cwd(), args[0]);
  const reportPath = path.resolve(process.cwd(), args[1]);

  appendChatToReport(overviewPath, reportPath);
}

module.exports = { appendChatToReport };

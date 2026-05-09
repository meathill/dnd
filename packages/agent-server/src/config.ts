export type AgentServerConfig = {
  port: number;
  hostname: string;
  // 与 website worker 共享的鉴权 token
  authToken: string;
  // workspace 根目录（绝对路径）
  workspaceRoot: string;
  // skill 源目录（git 仓库里的 skills/）；启动时把它复制 / 链接到每个 session workspace 的 .opencode/skills
  skillsSourceDir: string;
  // opencode 模式
  opencodeMode: 'stub' | 'opencode';
  opencodeBaseUrl: string;
};

export function loadConfig(): AgentServerConfig {
  const port = Number(process.env.PORT ?? '4180');
  const hostname = process.env.HOSTNAME ?? '0.0.0.0';
  const authToken = process.env.AGENT_SERVER_TOKEN?.trim();
  if (!authToken) {
    throw new Error('AGENT_SERVER_TOKEN 未配置');
  }
  const workspaceRoot = process.env.AGENT_WORKSPACE_ROOT?.trim() || '/var/agent/workspace';
  const skillsSourceDir = process.env.AGENT_SKILLS_DIR?.trim() || '/var/agent/skills';
  const opencodeMode = process.env.OPENCODE_MODE === 'opencode' ? 'opencode' : 'stub';
  const opencodeBaseUrl = process.env.OPENCODE_BASE_URL?.trim() || 'http://127.0.0.1:4096';

  return {
    port,
    hostname,
    authToken,
    workspaceRoot,
    skillsSourceDir,
    opencodeMode,
    opencodeBaseUrl,
  };
}

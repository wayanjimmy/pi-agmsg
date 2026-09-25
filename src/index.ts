import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

function script(name: string, args: string[], body?: string): Promise<string> {
  const path = join(process.env.AGMSG_HOME || join(homedir(), '.agents/skills/agmsg'), 'scripts', `${name}.sh`);
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [path, ...args], { env: { ...process.env, AGMSG_SELF_RENAME: 'off' } });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (part: string) => { stdout += part; });
    child.stderr.setEncoding('utf8').on('data', (part: string) => { stderr += part; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `agmsg exited ${code}`)));
    child.stdin.end(body);
  });
}

export default function agmsgExtension(pi: ExtensionAPI) {
  pi.registerCommand('agmsg', {
    description: 'agmsg: join <team> <name> | status | team | send <recipient> <message> | inbox',
    handler: async (input, ctx) => {
      const [action, ...rest] = input.trim().split(/\s+/);
      const project = ctx.cwd;
      const identity = async () => {
        const result = await script('whoami', [project, 'pi']);
        if (!result.startsWith('agent=')) throw new Error('No unique Pi identity here. Run /agmsg join <team> <name> first.');
        const agent = result.match(/(?:^|\s)agent=(\S+)/)?.[1];
        const teams = result.match(/(?:^|\s)teams=(\S+)/)?.[1]?.split(',');
        if (!agent || !teams || teams.length !== 1) throw new Error('Choose one team and Pi identity for this project.');
        return { agent, team: teams[0] };
      };
      try {
        let output: string;
        switch (action) {
          case 'join':
            if (rest.length !== 2) throw new Error('Usage: /agmsg join <team> <name>');
            output = await script('join', [rest[0], rest[1], 'pi', project]);
            break;
          case 'status': {
            const { team, agent } = await identity();
            output = `Team: ${team}; agent: ${agent}`;
            break;
          }
          case 'team': {
            const { team } = await identity();
            output = await script('team', [team]);
            break;
          }
          case 'send': {
            const match = input.trim().match(/^send\s+(\S+)\s+([\s\S]+)$/);
            if (!match) throw new Error('Usage: /agmsg send <recipient> <message>');
            const [, recipient, body] = match;
            const { team, agent } = await identity();
            output = await script('send', [team, agent, recipient, '--body', '-'], body);
            break;
          }
          case 'inbox':
          case '': {
            const { team, agent } = await identity();
            output = await script('inbox', [team, agent]);
            break;
          }
          default:
            throw new Error('Usage: /agmsg join <team> <name> | status | team | send <recipient> <message> | inbox');
        }
        ctx.ui.notify(output, 'info');
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), 'error');
      }
    },
  });
}

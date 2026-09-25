import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const upstream = process.env.AGMSG_SOURCE;

test('Pi plugin and command exchange messages through a disposable agmsg installation', { skip: !upstream }, async () => {
  const home = await mkdtemp(join(tmpdir(), 'pi-agmsg-'));
  const previous = { HOME: process.env.HOME, AGMSG_PLUGIN_DIRS: process.env.AGMSG_PLUGIN_DIRS };
  try {
    process.env.HOME = home;
    process.env.AGMSG_PLUGIN_DIRS = join(root, 'plugins');
    const env = { ...process.env, AGMSG_SELF_NAME: 'off' };
    execFileSync('bash', [join(upstream, 'install.sh'), '--cmd', 'agmsg', '--agent-type', 'cursor'], { env });
    const scripts = join(home, '.agents/skills/agmsg/scripts');
    const run = (name, ...args) => execFileSync('bash', [join(scripts, name), ...args], { env, encoding: 'utf8' });
    assert.match(run('plugin.sh', 'list'), /types\/pi\s+UNTRUSTED/);
    assert.throws(() => run('join.sh', 'trial', 'pi-one', 'pi', home));
    run('plugin.sh', 'trust', 'types/pi');
    assert.match(run('plugin.sh', 'list'), /types\/pi\s+trusted/);
    assert.match(run('delivery.sh', 'status', 'pi', home), /mode: off/);

    const commands = new Map();
    const { default: extension } = await import('../src/index.ts');
    extension({ registerCommand: (name, spec) => commands.set(name, spec) });
    const notices = [];
    const ctx = { cwd: home, ui: { notify: (message, level) => notices.push({ message, level }) } };
    const agmsg = async (args) => commands.get('agmsg').handler(args, ctx);
    await agmsg('join trial pi-one');
    assert.match(run('team.sh', 'trial'), /pi-one \(pi\)/);
    run('join.sh', 'trial', 'claude-one', 'claude-code', home);
    await agmsg('send claude-one --flag `literal` 雪\nsecond line');
    assert.match(run('inbox.sh', 'trial', 'claude-one'), /--flag `literal` 雪\\nsecond line/);
    run('join.sh', 'trial', 'send', 'cursor', home);
    await agmsg('send send recipient-name-also-command');
    assert.match(run('inbox.sh', 'trial', 'send'), /pi-one: recipient-name-also-command/);
    run('send.sh', 'trial', 'claude-one', 'pi-one', 'reply');
    await agmsg('inbox');
    assert.ok(notices.some(({ message }) => message.includes('claude-one: reply')));
    await agmsg('inbox');
    assert.equal(notices.at(-1).message, 'No new messages.');
    await agmsg('status');
    assert.match(notices.at(-1).message, /trial.*pi-one/);
    assert.match(await readFile(join(home, '.agents/skills/agmsg/VERSION'), 'utf8'), /\S/);
  } finally {
    process.env.HOME = previous.HOME;
    if (previous.AGMSG_PLUGIN_DIRS === undefined) delete process.env.AGMSG_PLUGIN_DIRS;
    else process.env.AGMSG_PLUGIN_DIRS = previous.AGMSG_PLUGIN_DIRS;
    await rm(home, { recursive: true, force: true });
  }
});

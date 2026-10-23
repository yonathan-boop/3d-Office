import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandWallScreen } from './commandWall.ts';

test('CommandWallScreen initializes screen mesh and bezel hierarchy', () => {
  const wallScreen = new CommandWallScreen();
  assert.ok(wallScreen.group, 'group exists');
  assert.equal(wallScreen.group.name, 'command_wall_display');

  const names = wallScreen.group.children.map((c) => c.name);
  assert.ok(names.includes('command_wall_bezel'), 'bezel mesh exists');
  assert.ok(names.includes('command_wall_screen'), 'screen mesh exists');
});

test('CommandWallScreen handles update without throwing even if headless', () => {
  const wallScreen = new CommandWallScreen();
  assert.doesNotThrow(() => {
    wallScreen.update(
      { activeWorkers: 3, idleWorkers: 1, tasksInProgress: 2, commitsPerHour: 18, fps: 60 },
      [
        {
          id: '1',
          timestamp: Date.now(),
          workerName: 'Agent Linus',
          action: 'merged PR #1',
          type: 'pr_merged',
        },
      ]
    );
  });
});

function buildWarpOzEnvironmentExample() {
  return [
    '# Warp Oz Environment Example',
    '',
    'This file documents a minimal Warp Oz environment scaffold for this workspace.',
    '',
    '## Notes',
    '',
    '- Warp Oz can consume skills from `.agents/skills/`.',
    '- Keep coordinator/specialist orchestration in generated agent content and skills.',
    '- Use this as a reference for configuring repositories and startup commands in Oz.',
    '',
    '## Example (conceptual)',
    '',
    '```json',
    '{',
    '  "name": "workspace-orchestration",',
    '  "repos": [',
    '    { "path": "./repos/agent-factory" },',
    '    { "path": "./repos/multirepo-space" }',
    '  ],',
    '  "startup": [',
    '    "npm --prefix repos/agent-factory test",',
    '    "bash repos/multirepo-space/scripts/workspace-setup.sh status ."',
    '  ]',
    '}',
    '```',
    '',
  ].join('\n');
}

module.exports = {
  buildWarpOzEnvironmentExample,
};

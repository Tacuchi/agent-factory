// Modelo canónico de orquestación independiente de plataforma.
// Se mapea a formatos nativos en agent-writer.js

const VALID_ROLES = ['coordinator', 'specialist', 'reviewer', 'architect', 'custom'];

function createProfile({
    agentId,
    role = 'specialist',
    scope = '.',
    delegatesTo = [],
    toolsCanonical = [],
    instructions = '',
    metadata = {},
} = {}) {
    if (!agentId) throw new Error('agentId is required');
    if (!VALID_ROLES.includes(role)) throw new Error(`Invalid role '${role}'. Valid: ${VALID_ROLES.join(', ')}`);

    return {
        agentId,
        role,
        scope,
        delegatesTo,
        toolsCanonical,
        instructions,
        metadata: {
            scope: metadata.scope || null,
            autoInvoke: metadata.autoInvoke || null,
            author: metadata.author || null,
            version: metadata.version || '1.0',
        },
    };
}

function buildRoutingTable(specialists) {
    if (!specialists || specialists.length === 0) return '';
    const rows = specialists.map((s) => `| \`${s}\` | Specialist |`);
    return `| Agent | Role |\n|-------|------|\n${rows.join('\n')}`;
}

module.exports = { VALID_ROLES, createProfile, buildRoutingTable };

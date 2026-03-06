function ensureAgentSuffix(name) {
  return name.endsWith('-agent') ? name : `${name}-agent`;
}

function parseTools(tools) {
  if (Array.isArray(tools)) {
    return tools.map((tool) => String(tool).trim()).filter(Boolean);
  }

  if (!tools) {
    return [];
  }

  return String(tools)
    .split(',')
    .map((tool) => tool.trim())
    .filter(Boolean);
}

function parseSpecialists(specialistsCsv) {
  if (!specialistsCsv) {
    return [];
  }

  return String(specialistsCsv)
    .split(',')
    .map((specialist) => specialist.trim())
    .filter(Boolean)
    .map((specialist) => ensureAgentSuffix(specialist));
}

function buildOrchestrationProfile({
  name,
  role,
  scope,
  tools,
  instructions,
  specialists,
  description,
}) {
  return {
    agentId: ensureAgentSuffix(name),
    role,
    scope: scope || '.',
    delegatesTo: parseSpecialists(specialists),
    toolsCanonical: parseTools(tools),
    instructions: instructions || '',
    description: description || '',
  };
}

module.exports = {
  buildOrchestrationProfile,
  parseTools,
};

"use strict";

function parseRoleList(val) {
  if (!val) return [];
  return String(val)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

const TIER1_ROLE_IDS = parseRoleList(process.env.TIER1_ROLE_IDS);
const TIER2_ROLE_IDS = parseRoleList(process.env.TIER2_ROLE_IDS);
const TIER3_ROLE_IDS = parseRoleList(process.env.TIER3_ROLE_IDS);
const TIER4_ROLE_IDS = parseRoleList(process.env.TIER4_ROLE_IDS);
const TIER5_ROLE_IDS = parseRoleList(process.env.TIER5_ROLE_IDS);
const TIER6_ROLE_IDS = parseRoleList(process.env.TIER6_ROLE_IDS);

const ALLOWED_POSTER_ROLE_IDS = parseRoleList(process.env.ALLOWED_POSTER_ROLE_IDS);

// Returns true if memberRoleIds contains any id from allowedRoleIds
function hasAnyRole(memberRoleIds, allowedRoleIds) {
  if (!Array.isArray(memberRoleIds) || !Array.isArray(allowedRoleIds)) return false;
  const set = new Set(memberRoleIds);
  for (const r of allowedRoleIds) {
    if (set.has(r)) return true;
  }
  return false;
}

// Highest tier wins. 0 means no tier.
function computeTier(roleIds) {
  const set = new Set(roleIds || []);
  if (TIER6_ROLE_IDS.some(r => set.has(r))) return 6;
  if (TIER5_ROLE_IDS.some(r => set.has(r))) return 5;
  if (TIER4_ROLE_IDS.some(r => set.has(r))) return 4;
  if (TIER3_ROLE_IDS.some(r => set.has(r))) return 3;
  if (TIER2_ROLE_IDS.some(r => set.has(r))) return 2;
  if (TIER1_ROLE_IDS.some(r => set.has(r))) return 1;
  return 0;
}

module.exports = {
  // env-derived lists
  TIER1_ROLE_IDS,
  TIER2_ROLE_IDS,
  TIER3_ROLE_IDS,
  TIER4_ROLE_IDS,
  TIER5_ROLE_IDS,
  TIER6_ROLE_IDS,
  ALLOWED_POSTER_ROLE_IDS,

  // helpers
  hasAnyRole,
  computeTier
};

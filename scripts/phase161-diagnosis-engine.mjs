import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const loadJson = p => JSON.parse(fs.readFileSync(path.isAbsolute(p) ? p : path.join(root, p), "utf8"));

const schema = loadJson("assets/data/phase161-diagnosis-engine-schema-v1.json");
const questionsDoc = loadJson("assets/data/phase161-question-catalog-v1.json");
const rulesDoc = loadJson("assets/data/phase161-rule-pack-v1.json");

const questionById = new Map(questionsDoc.questions.map(q => [q.id, q]));
const observationMeta = new Map(schema.canonical_observations.map(o => [o.key, o]));
const layerOrder = new Map(schema.canonical_layers.map(l => [l.id, l.order]));

const weakUnknown = new Set([undefined, null, "", "unknown", "not_tested", "not_solqvia_tested"]);
const positiveStates = new Set(["confirmed", "registered", "configured", "connected", "validated", "enabled_by_policy", "provisioned", "in_service", "exact_snapshot", "partial_snapshot"]);
const negativeStates = new Set(["failed", "not_registered", "not_configured", "disconnected", "not_validated", "disabled_by_policy", "not_provisioned", "out_of_service", "emergency_only"]);

const seedQuestions = {
  esim_setup: ["q_sim_recognized", "q_esim_profile_enabled", "q_carrier_line_activation", "q_service_state"],
  no_service: ["q_sim_recognized", "q_service_state"],
  no_mobile_data: ["q_sim_recognized", "q_service_state", "q_data_registration", "q_selected_data_line", "q_apn_dnn", "q_packet_session", "q_ip_link", "q_dns", "q_validation", "q_runtime_data"],
  voice_failure: ["q_sim_recognized", "q_service_state", "q_ims_policy", "q_ims_entitlement", "q_ims_registration", "q_voice_capability", "q_voice_outgoing", "q_voice_incoming"],
  sms_failure: ["q_sim_recognized", "q_service_state", "q_ims_policy", "q_ims_entitlement", "q_ims_registration", "q_sms_send", "q_sms_receive"],
  wifi_calling_failure: ["q_ims_policy", "q_ims_entitlement", "q_ims_registration", "q_software_snapshot"],
  volte_vonr_check: ["q_ims_policy", "q_ims_entitlement", "q_ims_registration", "q_voice_capability", "q_voice_outgoing", "q_vonr_bearer", "q_volte_bearer", "q_software_snapshot"],
  fiveg_or_aggregation_check: ["q_physical_channels", "q_software_snapshot"],
  general_connectivity: ["q_sim_recognized", "q_service_state", "q_data_registration", "q_runtime_data", "q_ims_registration", "q_software_snapshot"]
};

function isUnknownValue(v) {
  return weakUnknown.has(v);
}

function isQuestionAnswered(question, observations) {
  const v = observations[question.observation];
  if (question.id === "q_software_snapshot") {
    return v === "exact_snapshot" || v === "partial_snapshot";
  }
  return !isUnknownValue(v);
}

function matchCondition(condition, observations) {
  const v = observations[condition.observation];
  switch (condition.op) {
    case "eq": return v === condition.value;
    case "neq": return v !== condition.value;
    case "in": return Array.isArray(condition.value) && condition.value.includes(v);
    case "not_in": return Array.isArray(condition.value) && !condition.value.includes(v);
    case "known": return !isUnknownValue(v);
    case "unknown": return isUnknownValue(v);
    case "truthy": return !isUnknownValue(v) && Boolean(v);
    case "falsy": return !isUnknownValue(v) && !Boolean(v);
    default: return false;
  }
}

function ruleMatches(rule, goal, observations) {
  if (!rule.goals.includes(goal)) return false;
  if ((rule.all_of || []).some(c => !matchCondition(c, observations))) return false;
  if ((rule.any_of || []).length && !(rule.any_of || []).some(c => matchCondition(c, observations))) return false;
  if ((rule.exclude_if || []).some(c => matchCondition(c, observations))) return false;
  return true;
}

function ruleLocalized(rule, observations) {
  if (rule.localize_on_match === true) return true;
  const conditions = rule.localized_when || [];
  return conditions.length > 0 && conditions.every(c => matchCondition(c, observations));
}

function unique(values) {
  return [...new Set(values)];
}

function orderedLayerResult(observations, stateSet, direction) {
  const found = [];
  for (const [key, value] of Object.entries(observations)) {
    if (!stateSet.has(value)) continue;
    const meta = observationMeta.get(key);
    if (!meta) continue;
    found.push({ layer: meta.layer, order: layerOrder.get(meta.layer) ?? 999, observation: key, value });
  }
  if (!found.length) return null;
  found.sort((a, b) => direction === "first" ? a.order - b.order : b.order - a.order);
  return found[0];
}

function questionScore(questionId, activeRules, observations) {
  const q = questionById.get(questionId);
  if (!q || isQuestionAnswered(q, observations)) return -Infinity;
  const splitCount = activeRules.filter(r => (r.next_question_ids || []).includes(questionId)).length;
  const order = layerOrder.get(q.layer) ?? 90;
  return (
    splitCount * schema.decision_policy.question_score.candidate_split_weight +
    ((100 - order) / 10) * schema.decision_policy.question_score.dependency_order_weight +
    q.safety * schema.decision_policy.question_score.safety_weight -
    q.effort * schema.decision_policy.question_score.effort_penalty +
    q.priority / 10
  );
}

function chooseQuestion(goal, activeRules, observations) {
  const fromRules = unique(activeRules.flatMap(r => r.next_question_ids || []));
  let pool = fromRules.filter(id => {
    const q = questionById.get(id);
    return q && !isQuestionAnswered(q, observations);
  });

  if (!pool.length) {
    pool = (seedQuestions[goal] || []).filter(id => {
      const q = questionById.get(id);
      return q && !isQuestionAnswered(q, observations);
    });
    if (pool.length) return questionById.get(pool[0]);
    return null;
  }

  pool.sort((a, b) => {
    const diff = questionScore(b, activeRules, observations) - questionScore(a, activeRules, observations);
    return diff || (questionById.get(b)?.priority || 0) - (questionById.get(a)?.priority || 0);
  });
  return questionById.get(pool[0]) || null;
}

function detectContradictions(observations) {
  const issues = [];
  if (observations["network.service_state"] === "out_of_service" && observations["data.runtime"] === "confirmed") {
    issues.push("Current no-service and confirmed runtime-data observations conflict unless they come from different timestamps/subscriptions.");
  }
  if (observations["network.data_registration"] === "not_registered" && observations["data.packet_session"] === "connected") {
    issues.push("Data registration absent and packet session connected are inconsistent unless scope/time/subscription differs.");
  }
  return issues;
}

function diagnose(input) {
  const goal = input.goal || "general_connectivity";
  if (!schema.goals.includes(goal)) throw new Error("Unsupported goal: " + goal);

  const observations = { ...(input.observations || {}) };
  const activeRules = rulesDoc.rules.filter(r => ruleMatches(r, goal, observations));
  const localizedRules = activeRules.filter(r => ruleLocalized(r, observations));
  const contradictions = detectContradictions(observations);

  let candidateFailureIds = unique(activeRules.flatMap(r => r.candidate_failure_ids || []));
  if (contradictions.length) candidateFailureIds = unique(["evidence_contradiction", ...candidateFailureIds]);

  const nextQuestion = contradictions.length
    ? questionById.get("q_software_snapshot")
    : (localizedRules.length ? null : chooseQuestion(goal, activeRules, observations));

  let diagnosisStatus = "inconclusive";
  if (contradictions.length) diagnosisStatus = "requires_more_evidence";
  else if (localizedRules.length) diagnosisStatus = "localized";
  else if (nextQuestion) diagnosisStatus = "requires_more_evidence";

  const candidateQuestionIds = unique([
    ...activeRules.flatMap(r => r.next_question_ids || []),
    ...((seedQuestions[goal] || []).slice(0, 6))
  ]);

  const evidenceGaps = candidateQuestionIds
    .map(id => questionById.get(id))
    .filter(Boolean)
    .filter(q => !isQuestionAnswered(q, observations))
    .map(q => q.observation);

  const forbiddenInferences = unique(activeRules.flatMap(r => r.forbidden_inferences || []));

  const lastConfirmed = orderedLayerResult(observations, positiveStates, "last");
  const firstFailed = orderedLayerResult(observations, negativeStates, "first");

  return {
    schema_version: "1.0",
    release: "phase161-failure-diagnosis-engine",
    generated_at: new Date().toISOString(),
    diagnosis_status: diagnosisStatus,
    goal,
    last_confirmed_layer: lastConfirmed,
    first_explicit_failed_layer: firstFailed,
    candidate_failure_ids: candidateFailureIds,
    matched_rule_ids: activeRules.map(r => r.id),
    localized_rule_ids: localizedRules.map(r => r.id),
    next_question: nextQuestion ? {
      id: nextQuestion.id,
      observation: nextQuestion.observation,
      prompt_ja: nextQuestion.prompt_ja,
      prompt_en: nextQuestion.prompt_en,
      expected_answers: nextQuestion.expected_answers
    } : null,
    evidence_gaps: unique(evidenceGaps),
    contradictions,
    forbidden_inferences: forbiddenInferences,
    note: "This engine localizes evidence gaps/failure candidates. It does not convert unobserved internal states into a root-cause claim."
  };
}

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) out[args[i].slice(2)] = args[i + 1];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.input) {
  console.error("Usage: node scripts/phase161-diagnosis-engine.mjs --input <json> [--out <json>]");
  process.exit(2);
}
const input = loadJson(args.input);
const result = diagnose(input);
const output = JSON.stringify(result, null, 2) + "\n";
if (args.out) fs.writeFileSync(path.isAbsolute(args.out) ? args.out : path.join(root, args.out), output);
else process.stdout.write(output);

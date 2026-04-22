export function buildMailRegressionSuites() {
  return [
    {
      id: "mail-trust",
      label: "Mail Trust",
      description: "Verify email command trust routing keeps known senders in acknowledgement-only mode and trusted senders queue commands.",
      cases: [
        {
          id: "known-command-safe-reply",
          label: "Known sender gets safe reply only",
          kind: "internal",
          mode: "mail_command_trust",
          message: {
            subject: "Nova: send me the latest status",
            sourceIdentity: {
              kind: "email",
              label: "Known Sender",
              email: "known@example.com",
              trustLevel: "known"
            },
            triage: {
              likelySpam: false,
              likelyPhishing: false
            }
          },
          expected: {
            detected: true,
            action: "safe_reply_only",
            text: "send me the latest status",
            reasonIncludes: "Known sources may receive a non-confidential acknowledgement"
          }
        },
        {
          id: "unknown-command-user-decision",
          label: "Unknown sender is routed to user decision",
          kind: "internal",
          mode: "mail_command_trust",
          message: {
            subject: "Nova: send me the latest status",
            sourceIdentity: {
              kind: "email",
              label: "Unknown Sender",
              email: "unknown@example.com",
              trustLevel: "unknown"
            },
            triage: {
              likelySpam: false,
              likelyPhishing: false
            }
          },
          expected: {
            detected: true,
            action: "user_decision_required",
            text: "send me the latest status",
            reasonIncludes: "referred the request to the user decision system"
          }
        },
        {
          id: "trusted-command-auto-queue",
          label: "Trusted sender auto-queues",
          kind: "internal",
          mode: "mail_command_trust",
          message: {
            subject: "Nova: inspect the queue and summarize blockers",
            sourceIdentity: {
              kind: "email",
              label: "Trusted Sender",
              email: "trusted@example.com",
              trustLevel: "trusted"
            },
            triage: {
              likelySpam: false,
              likelyPhishing: false
            }
          },
          expected: {
            detected: true,
            action: "auto_queue",
            text: "inspect the queue and summarize blockers",
            reasonIncludes: "has full trust and may issue commands"
          }
        },
        {
          id: "trusted-command-reassessed-from-config",
          label: "Trusted sender is re-resolved from current config",
          kind: "internal",
          mode: "mail_command_trust",
          observerConfigPatch: {
            app: {
              trust: {
                records: [
                  {
                    label: "Trusted Sender",
                    email: "trusted@example.com",
                    trustLevel: "trusted"
                  }
                ]
              }
            }
          },
          message: {
            subject: "Nova: inspect the queue and summarize blockers",
            fromName: "Trusted Sender",
            fromAddress: "trusted@example.com",
            sourceIdentity: {
              kind: "email",
              label: "Trusted Sender",
              email: "trusted@example.com",
              trustLevel: "unknown"
            },
            triage: {
              likelySpam: false,
              likelyPhishing: false
            }
          },
          expected: {
            detected: true,
            action: "auto_queue",
            text: "inspect the queue and summarize blockers",
            reasonIncludes: "has full trust and may issue commands"
          }
        },
        {
          id: "trusted-command-comma-prefix",
          label: "Trusted sender command with comma prefix",
          kind: "internal",
          mode: "mail_command_trust",
          message: {
            subject: "Nova, inspect the queue and summarize blockers",
            sourceIdentity: {
              kind: "email",
              label: "Trusted Sender",
              email: "trusted@example.com",
              trustLevel: "trusted"
            },
            triage: {
              likelySpam: false,
              likelyPhishing: false
            }
          },
          expected: {
            detected: true,
            action: "auto_queue",
            text: "inspect the queue and summarize blockers",
            reasonIncludes: "has full trust and may issue commands"
          }
        },
        {
          id: "trusted-command-hyphen-prefix",
          label: "Trusted sender command with hyphen prefix",
          kind: "internal",
          mode: "mail_command_trust",
          message: {
            subject: "nova - inspect the queue and summarize blockers",
            sourceIdentity: {
              kind: "email",
              label: "Trusted Sender",
              email: "trusted@example.com",
              trustLevel: "trusted"
            },
            triage: {
              likelySpam: false,
              likelyPhishing: false
            }
          },
          expected: {
            detected: true,
            action: "auto_queue",
            text: "inspect the queue and summarize blockers",
            reasonIncludes: "has full trust and may issue commands"
          }
        },
        {
          id: "trusted-spam-blocked",
          label: "Trusted sender flagged as spam is blocked",
          kind: "internal",
          mode: "mail_command_trust",
          message: {
            subject: "Nova: open the latest invoice",
            sourceIdentity: {
              kind: "email",
              label: "Trusted Sender",
              email: "trusted@example.com",
              trustLevel: "trusted"
            },
            triage: {
              likelySpam: true,
              likelyPhishing: false
            }
          },
          expected: {
            detected: true,
            action: "blocked",
            text: "open the latest invoice",
            reasonIncludes: "flagged as spam or phishing"
          }
        }
      ]
    }
  ];
}

function buildUnavailableFailure(message = "Mail regression runtime is unavailable.", context = {}) {
  if (typeof context.buildRegressionFailure === "function") {
    return context.buildRegressionFailure(message);
  }
  return {
    passed: false,
    failures: [message],
    actual: null
  };
}

function applyObserverConfigPatch(previousConfig = {}, observerConfigPatch = {}) {
  return {
    ...previousConfig,
    ...observerConfigPatch,
    app: {
      ...(previousConfig.app || {}),
      ...(observerConfigPatch.app || {}),
      trust: {
        ...(previousConfig.app?.trust || {}),
        ...(observerConfigPatch.app?.trust || {})
      }
    }
  };
}

export async function runMailInternalRegressionCase(testCase = {}, context = {}) {
  const mode = String(testCase?.mode || "").trim();
  if (mode !== "mail_command_trust") {
    return null;
  }

  const determineMailCommandAction = typeof context.determineMailCommandAction === "function"
    ? context.determineMailCommandAction
    : null;
  if (!determineMailCommandAction) {
    return buildUnavailableFailure(undefined, context);
  }

  const getObserverConfig = typeof context.getObserverConfig === "function"
    ? context.getObserverConfig
    : null;
  const setObserverConfig = typeof context.setObserverConfig === "function"
    ? context.setObserverConfig
    : null;
  const failures = [];
  const observerConfigPatch = testCase?.observerConfigPatch && typeof testCase.observerConfigPatch === "object"
    ? testCase.observerConfigPatch
    : null;
  const previousConfig = getObserverConfig ? getObserverConfig() : null;

  if (observerConfigPatch && (!getObserverConfig || !setObserverConfig || !previousConfig || typeof previousConfig !== "object")) {
    return buildUnavailableFailure("Mail regression config patch support is unavailable.", context);
  }

  if (observerConfigPatch && previousConfig && setObserverConfig) {
    setObserverConfig(applyObserverConfigPatch(previousConfig, observerConfigPatch));
  }

  try {
    const actual = determineMailCommandAction(testCase.message || {});
    if (actual?.detected !== Boolean(testCase.expected?.detected)) {
      failures.push(`Expected detected=${Boolean(testCase.expected?.detected)}, got ${Boolean(actual?.detected)}.`);
    }
    if (String(actual?.action || "").trim() !== String(testCase.expected?.action || "").trim()) {
      failures.push(`Expected action ${testCase.expected?.action}, got ${actual?.action || "(none)"}.`);
    }
    const expectedText = String(testCase.expected?.text || "").trim();
    if (expectedText && String(actual?.text || "").trim() !== expectedText) {
      failures.push(`Expected command text ${expectedText}, got ${actual?.text || "(none)"}.`);
    }
    const expectedReasonIncludes = String(testCase.expected?.reasonIncludes || "").trim();
    if (expectedReasonIncludes && !String(actual?.reason || "").includes(expectedReasonIncludes)) {
      failures.push(`Expected reason to include ${expectedReasonIncludes}.`);
    }
    return {
      passed: failures.length === 0,
      failures,
      actual
    };
  } finally {
    if (observerConfigPatch && previousConfig && setObserverConfig) {
      setObserverConfig(previousConfig);
    }
  }
}

'use strict';

const INCIDENT_APP_CHECK_POLICY = Object.freeze({
  contractVersion: 1,
  mode: 'disabled',
  disabled: true,
  configured: false,
  enforced: false,
  tokenRequired: false,
  reason: 'spark-hosting-no-app-check'
});

function incidentCallableOptions(options = {}) {
  return Object.freeze({
    ...options,
    enforceAppCheck: INCIDENT_APP_CHECK_POLICY.enforced
  });
}

function incidentAppCheckMetadata(request = {}) {
  return Object.freeze({
    appCheckMode: INCIDENT_APP_CHECK_POLICY.mode,
    appCheckEnforced: INCIDENT_APP_CHECK_POLICY.enforced,
    appCheckTokenPresent: Boolean(request?.app),
    appCheckPolicyVersion: INCIDENT_APP_CHECK_POLICY.contractVersion,
    appCheckPolicyReason: INCIDENT_APP_CHECK_POLICY.reason
  });
}

module.exports = {
  INCIDENT_APP_CHECK_POLICY,
  incidentCallableOptions,
  incidentAppCheckMetadata
};

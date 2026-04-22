# Mail Plugin for local-ai-home-assistant

Optional mail plugin for [`doctarock/local-ai-home-assistant`](https://github.com/doctarock/local-ai-home-assistant). It adds IMAP inbox polling, SMTP sending, mail UI panels, mail watch rules, and tool hooks for agent workflows.

## What It Does

- Polls a configured IMAP inbox for recent messages.
- Sends mail through the configured SMTP account.
- Shows a Mail UI tab and a Mail secrets tab.
- Stores mailbox passwords through the host secret store instead of writing them into config.
- Supports mail watch rules for trash, archive, forward, and review workflows.
- Registers mail tools such as `poll_mailbox`, `send_mail`, and `move_mail`.

## Security Notes

This plugin can read inbox metadata/body previews, send email, and move messages to trash or archive. Only enable it in a trusted local deployment where the host app enforces its normal authentication, permissions, and high-risk tool controls.

Further to this, if you add a trusted contact, the agent can execute commands from email requests. This is highly risky, there is no spoofing protection currently, consider it very experimental.

Do not commit real mailbox passwords, app passwords, tokens, `.env` files, or local runtime state. Passwords should be stored through the host secret store using the Mail secrets UI.

## Host Requirements

The host app should provide the mail runtime dependencies through `mailDomainContext`. The plugin expects the core app to own configuration, secret storage, task state, parser dependencies, and event broadcasting.

Required or commonly used context entries include:

- `observerSecrets`
- `getObserverConfig`
- `fs`
- `writeVolumeText`
- `MAIL_WATCH_RULES_PATH`
- `MAIL_QUARANTINE_LOG_PATH`
- `DOCUMENT_RULES_PATH`
- `PROMPT_MAIL_RULES_PATH`
- `getMailState`
- `getMailWatchRulesState`
- `setMailWatchRulesState`
- `simpleParser`
- `nodemailer`
- task helpers such as `createQueuedTask`, `createWaitingTask`, `listAllTasks`, and `closeTaskRecord`

Optional planner/persona helpers are consumed when present and skipped gracefully when absent.

## Configuration

Mail accounts are configured by the host app. A typical host mail config includes:

- `mail.enabled`
- `mail.activeAgentId`
- `mail.pollIntervalMs`
- `mail.imap.host`
- `mail.imap.port`
- `mail.imap.secure`
- `mail.smtp.host`
- `mail.smtp.port`
- `mail.smtp.secure`
- `mail.smtp.requireTLS`
- `mail.agents`

Each mail agent should have an email/user and a password handle. Store the actual password through the secrets UI.
```

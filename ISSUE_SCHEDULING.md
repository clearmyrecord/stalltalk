# Issue Scheduling

Vercel calls `/api/scheduler/publish-issues` hourly via `vercel.json`. Set `CRON_SECRET` in environment variables; cron requests should send it as a bearer token or `secret` query parameter when invoked manually outside Vercel.

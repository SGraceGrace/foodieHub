# Render & Blueprint — How It Works

## The Two Things

| Thing | What it is |
|---|---|
| `render.yaml` | A file in your repo that describes your services (names, Dockerfiles, env vars) |
| Blueprint | Render's feature that reads `render.yaml` and creates/manages services |

They are connected like this:

```
render.yaml  →  Blueprint reads it  →  creates/manages services
```

**Without Blueprint** — `render.yaml` is just a text file sitting in your repo. Render ignores it completely.

**With Blueprint** — Render watches `render.yaml` and uses it to manage your services.

---

## What Blueprint Does

### 1. Auto-deploy on code push
Once a service is created via Blueprint, every time you push code to `main` → Render automatically redeploys that service. No manual clicking needed.

### 2. Backup / disaster recovery
Blueprint remembers all your services and their config. If you accidentally delete a service, go to the Blueprint page → click **Sync** → Render recreates it with the correct Dockerfile, env vars, everything.

### 3. Adding new services
When you add a new service to `render.yaml` and push:
1. Render doesn't react automatically
2. You go to Blueprint → click **Sync**
3. Render sees the new service → creates it
4. From that point on, code pushes auto-deploy it like all other services

---

## Auto vs Manual

| Action | Auto or Manual? |
|---|---|
| Push code to `main` → existing service redeploys | ✅ Automatic |
| Add new service to `render.yaml` → gets created | 🔁 Manual Sync once |
| Delete a service → recreate it | 🔁 Manual Sync once |

---

## Environment Variables and `sync: false`

In `render.yaml`, secret values are marked `sync: false`:

```yaml
envVars:
  - key: JWT_KEY
    sync: false        # secret — fill in manually in the dashboard
  - key: JWT_EXPIRATION
    value: "3600000"   # not a secret — set automatically
```

- `value: "something"` → Render sets it automatically, no action needed
- `sync: false` → Render leaves it blank and asks you to type the value in the dashboard

**Why?** Secrets (passwords, API keys) must never be committed to the repo. `sync: false` says "this variable exists but its value lives in the dashboard only."

### Flow when adding a new service with env vars

```
1. Add service to render.yaml with sync: false for secrets
2. Push to main
3. Go to Blueprint → click Sync
4. Render shows empty input fields for each sync: false variable
5. Type in the values
6. Click Deploy
```

---

## Simple Mental Model

> **`render.yaml`** is a shopping list.
> **Blueprint** is the person who goes shopping.
> Render doesn't go shopping on its own — you hand it the list by clicking Sync.
> But once the shopping is done (service created), restocking (code deploys) happens automatically.

---

## Summary

```
render.yaml + Blueprint = your services are documented in code
                          + auto-deploy on every git push
                          + easy recovery if a service is deleted
```

The manual Sync is only ever needed for:
- First time setting up Blueprint
- Adding a new service
- Recreating a deleted service

Everything else (day-to-day code pushes) is fully automatic.

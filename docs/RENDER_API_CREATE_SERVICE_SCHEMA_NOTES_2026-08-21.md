# Render API Notes for Render 2 Creation

**Sources read on 2026-08-21:**

- https://api-docs.render.com/reference/create-service
- https://api-docs.render.com/reference/update-env-vars-for-service
- https://render.com/docs/api

The official Render API documents `POST https://api.render.com/v1/services` for creating a service. Required create fields include `type`, `name`, `ownerId`, and `repo`; `branch`, `autoDeploy`, `rootDir`, `envVars`, `secretFiles`, `environmentId`, and service-type-specific details are supported. The service type required for the Trynext standby is `web_service`.

The official API docs state that `PUT https://api.render.com/v1/services/{serviceId}/env-vars` replaces the complete environment-variable list for a service. Variables omitted from the request are removed. Environment-variable changes do not deploy automatically; a separate deploy call is required. Therefore, any environment update must first read and preserve the full existing variable set, must never guess missing secrets, and must be treated as a mutation requiring careful review.

The official Render API guide confirms API-key authentication with `Authorization: Bearer <key>`, and the service-list endpoint is a valid read-only credential check. The user-provided second-workspace key returned HTTP 200 from `GET https://api.render.com/v1/owners` and exposed the workspace owner `tea-d7n82jegvqtc73angelg` (`it's workspace`, email `itmedofficial1@gmail.com`). A read-only service inventory for that owner returned one existing unrelated service: `va-api`, service ID `srv-d7o08gho3t8c73evuj80`, repository `georgelsmith333-hub/vamanger`, URL `https://va-api.onrender.com`, Free plan, Oregon, not suspended. That existing service must not be modified or repurposed.

The next safe Render 2 action is to create a new uniquely named Trynext web service in this same second workspace, using the existing Trynext GitHub repository and the isolated tested implementation commit/branch, with no Render Postgres resource and no new Neon database. Before applying environment variables, the service’s full existing variable set must be read and preserved. The user-provided key must remain in the temporary protected file only and must not appear in source control, logs, or documents beyond the fact that it validated successfully.

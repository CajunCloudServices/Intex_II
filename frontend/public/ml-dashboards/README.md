# ML dashboard static assets

Sensitive pipeline JSON and HTML dashboards were removed from this public folder. Staff-facing ML content is loaded from the authenticated API (`GET /api/ml-dashboard/data/{fileKey}`) and rendered in React on **ML insights**.

Pipeline outputs should be copied to `backend/Intex.Api/Data/ml-dashboards/` for deployment (not committed if they contain real data).

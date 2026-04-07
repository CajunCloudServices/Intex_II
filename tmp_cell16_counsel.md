## 6. Evaluation & Interpretation

### Business Interpretation

**What OLS tells us (Explanatory):**
- The emotional shift model reveals which session characteristics are associated with residents *feeling better* by the end.
- If `intv_healing` has a positive, significant coefficient, it suggests Healing-focused sessions may be more effective at improving emotional state, all else equal.
- The duration sweet-spot analysis reveals whether longer sessions have diminishing returns.

**What Gradient Boosting tells us (Predictive):**
- Given a session's setup (type, duration, resident history, planned interventions), the model estimates the probability that a concern will be flagged.
- This can be surfaced as a supervisor alert: "Session with Resident #12 today has a 68% probability of surfacing a concern — supervisor should be available."

**Consequences of errors:**
- **False negative (missing a concern):** Supervisor not available when a session surfaces a serious issue. High cost.
- **False positive (flagging a normal session):** Supervisor on standby unnecessarily. Low cost.
- **We set threshold at 0.35** to prioritize recall (catch more true concerns at cost of some false alarms).

## 7. Causal & Relationship Analysis

**Key relationships found:**
- Starting emotional state is strongly predictive of both shift and concerns — lower starting states are associated with more concerns, which is theoretically expected.
- The number of prior sessions shows a pattern — residents earlier in their time in care may be more volatile.
- Intervention type associations with emotional shift require careful interpretation: social workers likely choose interventions based on the resident's needs, creating selection bias. A resident needing Legal Services may have more complex trauma, making the Legal Services coefficient reflect case complexity rather than intervention quality.

**What we cannot claim:**
- That any specific intervention *causes* emotional improvement. Random assignment of interventions would be needed to establish causality.
- That the model's predictions are accurate for residents at new safehouses with different demographics.

## 8. Deployment Notes

**API endpoint:**
```
POST /api/ml/session-concern-risk
Body: { resident_id, session_type, duration_minutes, interventions_planned, session_date }
Response: { concern_probability, risk_level, recommended_supervisor_availability }
```

**Web app integration:**
- **Process Recording form:** When a social worker logs a planned session, the system shows a concern probability score.
- **Admin Dashboard:** Daily session schedule with color-coded risk flags for supervisors.
- **Process Recording history:** Each past session shows its concern probability vs. actual outcome for model transparency.

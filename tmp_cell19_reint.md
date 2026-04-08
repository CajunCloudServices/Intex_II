## 6. Evaluation & Interpretation

### Business Interpretation

**What the Logistic Regression tells us (Explanatory):**
- Standardized coefficients show which factors have the strongest association with positive outcomes, controlling for other variables.
- Positive coefficients indicate protective factors (e.g., more counseling sessions, higher health scores).
- Negative coefficients indicate risk factors (e.g., more high-severity incidents, concerns flagged frequently).

**What the Random Forest tells us (Predictive):**
- Given a resident's full profile, the model estimates their probability of positive trajectory.
- Feature importances confirm the most influential variables for prediction.

**Consequences of errors:**
- **False negative (missing a struggling resident):** High cost — a girl who needs intervention doesn't get it. Tune toward high recall.
- **False positive (flagging a stable resident):** Lower cost — unnecessary case conference wastes staff time but doesn't harm the resident.
- **Recommended threshold:** Lower the classification threshold (e.g., 0.40 instead of 0.50) to prioritize recall.

**Small sample caveat:** With 60 residents, all results should be interpreted with caution. Cross-validation reduces but does not eliminate overfitting risk. As the organization grows and more resident records accumulate, retraining will substantially improve reliability.

## 7. Causal & Relationship Analysis

**Relationships discovered:**
- Health scores and education progress trends are positively associated with positive trajectory — consistent with theory that holistic wellbeing drives recovery.
- Counseling session frequency shows a positive association — more contact may reflect both more support AND social worker attention to higher-need cases (confounding).
- High-severity incidents are negatively associated — expected and theoretically sound.

**Causal limitations:**
- We cannot claim that *increasing* sessions *causes* better outcomes. Residents with more sessions may also receive more holistic support, have more engaged social workers, or have been in care longer.
- Intervention types (Healing, Teaching, Legal) may reflect case type rather than treatment effect.
- Recommended: collect data on specific interventions applied and outcomes to enable more credible causal analysis.

## 8. Deployment Notes

**API endpoint:**
```
GET /api/ml/reintegration-risk/{resident_id}
Response: { resident_id, risk_score, positive_probability, top_risk_factors, recommended_action }
```

**Web app integration:**
- Displayed on the **Admin Dashboard** as a "Case Risk Overview" widget
- Each resident card shows a color-coded risk score (green/yellow/red)
- Social workers can click in for the top contributing factors
- Triggers automatic case conference recommendation when probability drops below 0.40

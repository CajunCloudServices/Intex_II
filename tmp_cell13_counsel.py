from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, classification_report, RocCurveDisplay, confusion_matrix

# Features known BEFORE the session ends (no leakage of outcomes)
PRED_FEATURES4 = [
    'session_duration_minutes', 'session_type_individual',
    'emotion_start_num', 'intv_healing', 'intv_teaching',
    'intv_legal_services', 'intv_caring', 'n_interventions',
    'session_count_prior', 'initial_risk_num',
    'sub_cat_trafficked', 'sub_cat_sexual_abuse', 'has_special_needs',
    'total_incidents', 'month', 'day_of_week'
]

model_df4 = process_full.dropna(subset=PRED_FEATURES4 + ['concerns_flagged']).copy()
X4 = model_df4[PRED_FEATURES4]
y4 = model_df4['concerns_flagged'].astype(int)

X_tr4, X_te4, y_tr4, y_te4 = train_test_split(X4, y4, test_size=0.2, stratify=y4, random_state=42)

print(f"Train: {len(X_tr4)} | Test: {len(X_te4)}")
print(f"Concerns flagged rate: {y4.mean():.1%}")

# Compare models
models4 = {
    'Logistic Regression': Pipeline([('sc', StandardScaler()), ('m', LogisticRegression(max_iter=500))]),
    'Random Forest':       Pipeline([('sc', StandardScaler()), ('m', RandomForestClassifier(n_estimators=100, random_state=42))]),
    'Gradient Boosting':   Pipeline([('sc', StandardScaler()), ('m', GradientBoostingClassifier(n_estimators=150, learning_rate=0.05, max_depth=4, random_state=42))]),
}

skf4 = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
for name, pipe in models4.items():
    cv = cross_validate(pipe, X_tr4, y_tr4, cv=skf4, scoring=['roc_auc','f1'])
    print(f"{name:22s}  AUC={cv['test_roc_auc'].mean():.4f}  F1={cv['test_f1'].mean():.4f}")

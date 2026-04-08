# ── Final model evaluation ────────────────────────────────────────────────
best_pipe4 = models4['Gradient Boosting']
best_pipe4.fit(X_tr4, y_tr4)

y_proba4 = best_pipe4.predict_proba(X_te4)[:, 1]
y_hat4   = (y_proba4 >= 0.35).astype(int)  # lower threshold — prioritize recall

auc4 = roc_auc_score(y_te4, y_proba4)
print(f"Test ROC-AUC: {auc4:.4f}")
print("\nClassification Report (threshold=0.35):")
print(classification_report(y_te4, y_hat4, target_names=['No Concern','Concern Flagged']))

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
RocCurveDisplay.from_predictions(y_te4, y_proba4, ax=axes[0], name='Gradient Boosting')
axes[0].set_title('ROC Curve — Concerns Flagged Prediction', fontsize=12)

cm4 = confusion_matrix(y_te4, y_hat4)
sns.heatmap(cm4, annot=True, fmt='d', cmap='Oranges', ax=axes[1],
            xticklabels=['Predicted No','Predicted Concern'],
            yticklabels=['Actual No','Actual Concern'])
axes[1].set_title('Confusion Matrix (threshold=0.35)', fontsize=12)
plt.tight_layout()
plt.savefig('p4_roc_confusion.png', dpi=120, bbox_inches='tight')
plt.show()

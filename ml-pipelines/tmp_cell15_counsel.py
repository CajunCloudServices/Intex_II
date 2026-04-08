# ── Feature importance ────────────────────────────────────────────────────
gb4 = best_pipe4.named_steps['m']
fi4 = pd.DataFrame({
    'feature': PRED_FEATURES4,
    'importance': gb4.feature_importances_
}).sort_values('importance', ascending=False)

fig, ax = plt.subplots(figsize=(10, 7))
ax.barh(fi4['feature'][::-1], fi4['importance'][::-1], color='darkorange')
ax.set_title('Feature Importances — Concerns Flagged Classifier', fontsize=13)
ax.set_xlabel('Importance')
plt.tight_layout()
plt.savefig('p4_feature_importance.png', dpi=120, bbox_inches='tight')
plt.show()

print("Top features:")
print(fi4.head(10).to_string(index=False))

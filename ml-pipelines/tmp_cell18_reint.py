# ── Feature importance ────────────────────────────────────────────────────
rf_model = best_pred_pipe.named_steps['m']
fi_df = pd.DataFrame({
    'feature': PRED_FEATURES,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False).head(15)

fig, ax = plt.subplots(figsize=(10, 6))
ax.barh(fi_df['feature'][::-1], fi_df['importance'][::-1], color='steelblue')
ax.set_title('Top 15 Feature Importances — Random Forest', fontsize=13)
ax.set_xlabel('Importance')
plt.tight_layout()
plt.savefig('p2_feature_importance.png', dpi=120, bbox_inches='tight')
plt.show()

print("Top 10 features:")
print(fi_df.head(10).to_string(index=False))

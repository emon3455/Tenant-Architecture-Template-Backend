// user has featureAccess array (user shape) with new action object structure
export const can = (user: any, featureKey: string, action: string) => {
  const f = (user?.featureAccess || []).find((x: any) => x.key === featureKey);
  if (!f) return false;
  
  // Check parent-level actions (now objects with {description, value, isActive})
  const parentActions = f.actions || [];
  for (const actionObj of parentActions) {
    if (!actionObj.isActive) continue; // Skip inactive actions
    
    const actionValue = typeof actionObj === 'string' ? actionObj : actionObj.value;
    if (actionValue === "all" || actionValue === action) return true;
  }

  // Check subFeature actions
  for (const sf of (f.subFeatures || [])) {
    const subActions = sf.actions || [];
    for (const actionObj of subActions) {
      if (!actionObj.isActive) continue; // Skip inactive actions
      
      const actionValue = typeof actionObj === 'string' ? actionObj : actionObj.value;
      if (actionValue === "all" || actionValue === action) return true;
    }
  }
  
  return false;
};

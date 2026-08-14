(() => {
  const config = window.CRUSH_SUPABASE || {};
  const configured =
    typeof config.url === "string" &&
    config.url.startsWith("https://") &&
    !config.url.includes("YOUR_PROJECT_ID") &&
    typeof config.publishableKey === "string" &&
    config.publishableKey.length > 20 &&
    !config.publishableKey.includes("YOUR_SUPABASE");

  window.CRUSH_DB_READY = configured;
  window.crushSupabase = configured && window.supabase
    ? window.supabase.createClient(config.url, config.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
})();

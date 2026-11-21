const ids = ['backendUrl', 'token', 'webhookUrl'];
chrome.storage.local.get('settings').then(({ settings = {} }) => {
  ids.forEach((i) => (document.getElementById(i).value = settings[i] || ''));
});
document.getElementById('save').onclick = async () => {
  const settings = Object.fromEntries(ids.map((i) => [i, document.getElementById(i).value.trim()]));
  await chrome.storage.local.set({ settings });
  document.getElementById('ok').textContent = 'Salvo ✔';
};

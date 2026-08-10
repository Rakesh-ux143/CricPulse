const SESSION_KEY='crickscoreTournamentSession';
function getTournamentSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch(e){sessionStorage.removeItem(SESSION_KEY);return null}}
function saveTournamentSession(t){sessionStorage.setItem(SESSION_KEY,JSON.stringify({id:t.id,name:t.name,loginTime:Date.now()}))}
function clearTournamentSession(){sessionStorage.removeItem(SESSION_KEY)}
function requireTournamentLogin(){if(!getTournamentSession()){location.replace('admin.html');return false}return true}
function logoutTournament(){clearTournamentSession();location.replace('admin.html')}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

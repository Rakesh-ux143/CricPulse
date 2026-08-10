/* CrickScore Admin v2
   - Firebase Email/Password authentication
   - deterministic Team 1/Team 2 labels
   - rich player profiles
   - full ball-by-ball scoring
   - detailed dismissals
   - commentary
   - delete/edit controls
   - undo snapshots
*/
(function(){
"use strict";

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=> "id_"+Date.now().toString(36)+Math.random().toString(36).slice(2,9);
const overs=b=>`${Math.floor((b||0)/6)}.${(b||0)%6}`;
const sr=(r,b)=>b?((r/b)*100).toFixed(2):"0.00";
const econ=(r,b)=>b?((r/(b/6))).toFixed(2):"0.00";
let teams={}, schedules={}, match=null, selectedArea="", selectedShot="";
let playerCounter=0;

function dbOK(){return typeof db!=="undefined" && typeof firebase!=="undefined" && firebase.auth;}
function showLogin(){ $("loginScreen").style.display="grid"; $("adminApp").style.display="none"; }
function showApp(user){ $("loginScreen").style.display="none"; $("adminApp").style.display="block"; $("adminIdentity").textContent=user.email||"Admin"; }

if(!dbOK()){
 $("loginMsg").textContent="Firebase is not initialized. Check assets/firebase-config.js.";
 return;
}

$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 $("loginMsg").textContent="";
 try{await firebase.auth().signInWithEmailAndPassword($("loginEmail").value.trim(),$("loginPassword").value);}
 catch(err){$("loginMsg").textContent=err.message||"Login failed.";}
});
$("logoutBtn").onclick=()=>firebase.auth().signOut();

firebase.auth().onAuthStateChanged(user=>{
 if(user) {showApp(user); init();} else showLogin();
});

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
 document.querySelectorAll(".section").forEach(x=>x.classList.remove("active"));
 b.classList.add("active"); $("section-"+b.dataset.tab).classList.add("active");
 if(b.dataset.tab==="scoring")renderScoring();
});

function init(){
 db.ref("teams").on("value",s=>{teams=s.val()||{};renderTeams();fillTeamSelects();renderMatchSetup();});
 db.ref("schedules").on("value",s=>{schedules=s.val()||{};renderSchedules();});
 db.ref("match").on("value",s=>{match=s.val();renderMatchSetup();renderScoring();});
 addPlayerRow();
}

function teamEntries(){return Object.entries(teams).sort((a,b)=>(a[1].number||999)-(b[1].number||999));}
function nextTeamNumber(){return teamEntries().reduce((n,[,t])=>Math.max(n,Number(t.number)||0),0)+1;}

function addPlayerRow(data={}){
 playerCounter++;
 const id="playerRow_"+playerCounter;
 const div=document.createElement("div");div.className="player-row";div.id=id;
 div.innerHTML=`
 <div><label>Player name</label><input class="p-name" required value="${esc(data.name||"")}"></div>
 <div><label>Role</label><select class="p-role">
   ${["Batsman","Bowler","All-Rounder","WK"].map(x=>`<option ${data.role===x?"selected":""}>${x}</option>`).join("")}
 </select></div>
 <div><label>Batting hand</label><select class="p-bat">
   ${["Right-hand","Left-hand"].map(x=>`<option ${data.battingHand===x?"selected":""}>${x}</option>`).join("")}
 </select></div>
 <div><label>Bowling style</label><select class="p-bowl">
   ${["None","Right-arm Fast","Right-arm Medium Fast","Right-arm Medium","Right-arm Off Spin","Right-arm Leg Spin","Left-arm Fast","Left-arm Medium Fast","Left-arm Medium","Left-arm Orthodox","Left-arm Chinaman"].map(x=>`<option ${data.bowlingStyle===x?"selected":""}>${x}</option>`).join("")}
 </select></div>
 <div><label>Wicketkeeper</label><select class="p-wk"><option value="No" ${data.wicketkeeper!=="Yes"?"selected":""}>No</option><option value="Yes" ${data.wicketkeeper==="Yes"?"selected":""}>Yes</option></select></div>
 <button type="button" class="btn danger remove-player">Delete</button>`;
 div.querySelector(".remove-player").onclick=()=>div.remove();
 $("playersEditor").appendChild(div);
}
$("addPlayerBtn").onclick=()=>addPlayerRow();

$("teamForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const name=$("teamName").value.trim();if(!name)return;
 const rows=[...document.querySelectorAll("#playersEditor .player-row")];
 if(rows.length<2)return alert("Add at least 2 players.");
 const number=nextTeamNumber(), id=uid(), players={};
 rows.forEach(r=>{
   const pid=uid();
   players[pid]={
     name:r.querySelector(".p-name").value.trim(),
     role:r.querySelector(".p-role").value,
     battingHand:r.querySelector(".p-bat").value,
     bowlingStyle:r.querySelector(".p-bowl").value,
     wicketkeeper:r.querySelector(".p-wk").value,
     createdAt:Date.now()
   };
 });
 if(Object.values(players).some(p=>!p.name))return alert("Every player needs a name.");
 await db.ref("teams/"+id).set({
   id, number, label:"Team "+number, name, short:$("teamShort").value.trim().toUpperCase(),
   players, createdAt:Date.now(), createdBy:firebase.auth().currentUser.uid
 });
 e.target.reset();$("playersEditor").innerHTML="";addPlayerRow();
 alert(`Saved as Team ${number}: ${name}`);
});

async function deleteTeam(id){
 if(!confirm("Delete this team and its players?"))return;
 await db.ref("teams/"+id).remove();
}
async function editTeam(id){
 const t=teams[id];if(!t)return;
 $("teamName").value=t.name||"";$("teamShort").value=t.short||"";$("playersEditor").innerHTML="";
 Object.values(t.players||{}).forEach(p=>addPlayerRow(p));
 const oldSubmit=$("teamForm").onsubmit;
 // use a temporary edit mode
 $("teamForm").dataset.editId=id;
 $("teamForm").querySelector('button[type="submit"]').textContent="Update Team";
}
$("teamForm").addEventListener("submit",async e=>{
 const editId=e.currentTarget.dataset.editId;if(!editId)return;
 e.preventDefault();
 const t=teams[editId], rows=[...document.querySelectorAll("#playersEditor .player-row")], players={};
 rows.forEach(r=>{const pid=uid();players[pid]={name:r.querySelector(".p-name").value.trim(),role:r.querySelector(".p-role").value,battingHand:r.querySelector(".p-bat").value,bowlingStyle:r.querySelector(".p-bowl").value,wicketkeeper:r.querySelector(".p-wk").value,updatedAt:Date.now()};});
 await db.ref("teams/"+editId).update({name:$("teamName").value.trim(),short:$("teamShort").value.trim().toUpperCase(),players,updatedAt:Date.now()});
 delete e.currentTarget.dataset.editId;e.currentTarget.reset();$("playersEditor").innerHTML="";addPlayerRow();e.currentTarget.querySelector('button[type="submit"]').textContent="Save Team";
});

function renderTeams(){
 const el=$("teamList"), list=teamEntries();
 if(!list.length){el.innerHTML='<div class="muted">No teams saved.</div>';return;}
 el.innerHTML=list.map(([id,t])=>`
 <div class="card"><div class="row"><div><span class="tag">${esc(t.label||("Team "+t.number))}</span> <b>${esc(t.name)}</b> <span class="muted">(${esc(t.short||"")})</span></div>
 <div><button class="btn secondary" onclick="window.editTeam('${id}')">Edit</button> <button class="btn danger" onclick="window.deleteTeam('${id}')">Delete</button></div></div>
 <div style="margin-top:8px">${Object.values(t.players||{}).map(p=>`<span class="ball">${esc(p.name)} · ${esc(p.role)} · ${esc(p.battingHand)} · ${esc(p.bowlingStyle)}${p.wicketkeeper==="Yes"?" · WK":""}</span>`).join("")}</div></div>`).join("");
}
window.deleteTeam=deleteTeam;window.editTeam=editTeam;

function fillTeamSelects(){
 ["schA","schB"].forEach(id=>{const s=$(id);if(!s)return;const old=s.value;s.innerHTML='<option value="">Select team</option>'+teamEntries().map(([id,t])=>`<option value="${id}">${esc(t.label||"")} — ${esc(t.name)}</option>`).join("");s.value=old;});
}
$("scheduleForm").addEventListener("submit",async e=>{
 e.preventDefault();const a=$("schA").value,b=$("schB").value;if(!a||!b||a===b)return alert("Select two different teams.");
 const id=uid();await db.ref("schedules/"+id).set({id,teamAId:a,teamBId:b,teamA:teams[a].name,teamB:teams[b].name,type:$("schType").value,datetime:$("schDate").value,venue:$("schVenue").value.trim(),overs:Number($("schOvers").value||20),status:"scheduled",createdAt:Date.now()});e.target.reset();$("schOvers").value=20;
});
function renderSchedules(){
 const el=$("scheduleList"),list=Object.entries(schedules).sort((a,b)=>(a[1].datetime||"").localeCompare(b[1].datetime||""));
 el.innerHTML=list.length?list.map(([id,s])=>`<div class="card"><div class="row"><div><b>${esc(s.teamA)} vs ${esc(s.teamB)}</b><div class="muted small">${esc(s.type)} · ${s.datetime?new Date(s.datetime).toLocaleString():"TBD"} · ${esc(s.venue||"TBD")} · ${s.overs} overs</div></div><div><button class="btn secondary" onclick="window.loadSchedule('${id}')">Use</button> <button class="btn danger" onclick="window.deleteSchedule('${id}')">Delete</button></div></div></div>`).join(""):'<div class="muted">No schedules.</div>';
}
window.deleteSchedule=id=>{if(confirm("Delete this schedule?"))db.ref("schedules/"+id).remove()};
window.loadSchedule=id=>{const s=schedules[id];if(!s)return;activateTab("match");$("matchA").value=s.teamAId;$("matchB").value=s.teamBId;$("matchOvers").value=s.overs||20;$("matchType").value=s.type||"League"};

function activateTab(name){document.querySelector(`.tab[data-tab="${name}"]`).click();}

function players(teamId){return Object.entries(teams[teamId]?.players||{}).map(([id,p])=>({id,...p}));}
function renderMatchSetup(){
 const el=$("matchSetup");if(!el)return;
 el.innerHTML=`<div class="grid grid3">
 <div><label>Batting Team</label><select id="matchA">${teamEntries().map(([id,t])=>`<option value="${id}">${esc(t.label)} — ${esc(t.name)}</option>`).join("")}</select></div>
 <div><label>Bowling Team</label><select id="matchB">${teamEntries().map(([id,t])=>`<option value="${id}">${esc(t.label)} — ${esc(t.name)}</option>`).join("")}</select></div>
 <div><label>Overs</label><input id="matchOvers" type="number" value="${match?.oversLimit||20}" min="1" max="100"></div>
 <div><label>Match Type</label><select id="matchType"><option>League</option><option>Qualifier</option><option>Eliminator</option><option>Semifinal</option><option>Final</option></select></div></div>
 <button class="btn" id="startBtn" style="margin-top:10px">${match?.status==="live"?"Restart Match":"Start Match"}</button>
 ${match?`<div class="card" style="margin-top:12px"><b>Current:</b> ${esc(match.teamA?.name)} vs ${esc(match.teamB?.name)} · ${match.score?.runs||0}/${match.score?.wickets||0} · ${overs(match.score?.balls)} ov</div>`:""}`;
 if(match?.teamA?.id)$("matchA").value=match.teamA.id;if(match?.teamB?.id)$("matchB").value=match.teamB.id;if(match?.matchType)$("matchType").value=match.matchType;
 $("startBtn").onclick=startMatch;
}

async function startMatch(){
 const a=$("matchA").value,b=$("matchB").value,limit=Number($("matchOvers").value||20);
 if(!a||!b||a===b)return alert("Select different teams.");
 const ap=players(a),bp=players(b);if(ap.length<2||bp.length<2)return alert("Each team needs at least 2 players.");
 const battingCard={};ap.forEach(p=>battingCard[p.id]={name:p.name,role:p.role,battingHand:p.battingHand,runs:0,balls:0,fours:0,sixes:0,out:false,howOut:"not out"});
 const bowlingCard={};bp.forEach(p=>bowlingCard[p.id]={name:p.name,role:p.role,runs:0,balls:0,wickets:0});
 const m={status:"live",matchType:$("matchType").value,oversLimit:limit,battingTeam:"teamA",
 teamA:{id:a,name:teams[a].name,players:teams[a].players},teamB:{id:b,name:teams[b].name,players:teams[b].players},
 strikerId:ap[0].id,nonStrikerId:ap[1].id,bowlerId:bp.find(p=>p.role==="Bowler"||p.role==="All-Rounder")?.id||bp[0].id,
 battingCard,bowlingCard,score:{runs:0,wickets:0,balls:0},history:[],commentary:[],currentOver:[],undoStack:[],selectedArea:"",selectedShot:""};
 await db.ref("match").set(m);
}

function snapshot(m){
 const x={battingCard:m.battingCard,bowlingCard:m.bowlingCard,score:m.score,strikerId:m.strikerId,nonStrikerId:m.nonStrikerId,
 bowlerId:m.bowlerId,history:m.history,commentary:m.commentary,currentOver:m.currentOver,selectedArea:m.selectedArea,selectedShot:m.selectedShot,
 battingTeam:m.battingTeam,firstInnings:m.firstInnings,target:m.target,status:m.status,inningsNumber:m.inningsNumber};
 m.undoStack=(m.undoStack||[]).slice(-24).concat([JSON.stringify(x)]);
}
async function commit(mutator){
 const snap=await db.ref("match").once("value"),m=snap.val();if(!m||m.status!=="live")return;
 snapshot(m);mutator(m);await db.ref("match").set(m);match=m;renderScoring();
}
function legal(m){m.score.balls++;const b=m.bowlingCard[m.bowlerId];if(b)b.balls++;if(m.score.balls%6===0)[m.strikerId,m.nonStrikerId]=[m.nonStrikerId,m.strikerId];}
function rotate(m,r){if(r%2)[m.strikerId,m.nonStrikerId]=[m.nonStrikerId,m.strikerId];}
function addComment(m,text){m.commentary=(m.commentary||[]).concat([text]);}
function addBall(m,text){m.history=(m.history||[]).concat([text]);m.currentOver=(m.currentOver||[]).concat([text]);if(m.currentOver.length>=6)m.currentOver=[];}
function phrase(run,area){if(run===6)return`What a hit! ${area||"straight"} — SIX! Massive strike!`;if(run===4)return`Beautiful boundary through ${area||"the field"} — FOUR!`;if(run===0)return`Dot ball. Good delivery, no run.`;return`${run} run${run>1?"s":""} taken${area?` towards ${area}`:""}.`;}

function finishOrChangeInnings(m){
 const total=Object.keys(m.battingCard||{}).length;
 if(m.target && m.score.runs>=m.target){m.status="completed";m.result=`${m[m.battingTeam]?.name} won by ${Math.max(1,total-m.score.wickets)} wickets`;return;}
 if(m.score.wickets>=Math.max(1,total-1)||m.score.balls>=m.oversLimit*6){
   if(!m.firstInnings){
     m.firstInnings={teamName:m[m.battingTeam].name,teamId:m[m.battingTeam].id,score:{...m.score},battingCard:JSON.parse(JSON.stringify(m.battingCard)),bowlingCard:JSON.parse(JSON.stringify(m.bowlingCard))};
     m.target=m.score.runs+1;m.battingTeam=m.battingTeam==="teamA"?"teamB":"teamA";m.inningsNumber=2;
     const ap=players(m[m.battingTeam].id),bp=players(m[m.battingTeam==="teamA"?"teamB":"teamA"].id);
     m.battingCard={};ap.forEach(p=>m.battingCard[p.id]={name:p.name,role:p.role,battingHand:p.battingHand,runs:0,balls:0,fours:0,sixes:0,out:false,howOut:"not out"});
     m.bowlingCard={};bp.forEach(p=>m.bowlingCard[p.id]={name:p.name,role:p.role,runs:0,balls:0,wickets:0});
     m.strikerId=ap[0]?.id;m.nonStrikerId=ap[1]?.id;m.bowlerId=bp.find(p=>p.role==="Bowler"||p.role==="All-Rounder")?.id||bp[0]?.id;m.score={runs:0,wickets:0,balls:0};m.history=[];m.commentary=[];m.currentOver=[];m.selectedArea="";m.selectedShot="";
   } else {m.status="completed";m.result=`${m.firstInnings.teamName} won`; }
 }
}

window.scoreLegal=r=>commit(m=>{
 const s=m.battingCard[m.strikerId],b=m.bowlingCard[m.bowlerId];s.runs+=r;s.balls++;if(r===4)s.fours++;if(r===6)s.sixes++;b.runs+=r;m.score.runs+=r;
 const text=r===0?"0":String(r);addBall(m,text);addComment(m,phrase(r,m.selectedArea));legal(m);rotate(m,r);finishOrChangeInnings(m);
});
window.scoreWide=()=>{const n=Number(prompt("Total wide runs:","1"));if(!Number.isInteger(n)||n<1)return;commit(m=>{m.score.runs+=n;m.bowlingCard[m.bowlerId].runs+=n;addBall(m,n===1?"Wd":`Wd+${n-1}`);addComment(m,`Wide ball. ${n} extra run${n>1?"s":""}.`);rotate(m,n);finishOrChangeInnings(m);})};
window.scoreNoBall=()=>{const r=Number(prompt("Bat runs off the no-ball (0-6):","0"));if(!Number.isInteger(r)||r<0||r>6)return;commit(m=>{const s=m.battingCard[m.strikerId],b=m.bowlingCard[m.bowlerId];m.score.runs+=1+r;b.runs+=1+r;s.runs+=r;if(r===4)s.fours++;if(r===6)s.sixes++;if(r>0)rotate(m,r);addBall(m,r?`Nb+${r}`:"Nb");addComment(m,r?`No-ball plus ${r} off the bat.`:"No-ball. Extra run added.");finishOrChangeInnings(m);})};
async function extra(label){const n=Number(prompt(`${label} runs:`,"1"));if(!Number.isInteger(n)||n<1)return;commit(m=>{m.score.runs+=n;legal(m);rotate(m,n);addBall(m,`${label==="Leg-bye"?"Lb":"B"}${n}`);addComment(m,`${label}: ${n} run${n>1?"s":""}.`);finishOrChangeInnings(m);})}
window.scoreBye=()=>extra("Bye");window.scoreLegBye=()=>extra("Leg-bye");

window.setArea=a=>{selectedArea=a;db.ref("match/selectedArea").set(a);renderScoring()};
window.setShot=s=>{selectedShot=s;db.ref("match/selectedShot").set(s);renderScoring()};

window.confirmWicket=()=>commit(m=>{
 const s=m.battingCard[m.strikerId],b=m.bowlingCard[m.bowlerId];if(!s)return;
 const type=$("dismissalType").value, newId=$("newBatter").value;
 const fielder=$("fielderName").value.trim(), catchType=$("catchType").value;
 let detail=type;
 if(type==="Caught")detail=`c ${fielder||"fielder"} b ${b?.name||"bowler"}`;
 else if(type==="Run Out")detail=`run out by ${fielder||"fielder"}`;
 else if(type==="Stumped")detail=`st ${fielder||"wicketkeeper"} b ${b?.name||"bowler"}`;
 else if(type==="Caught & Bowled")detail=`c&b ${b?.name||"bowler"}`;
 s.out=true;s.howOut=detail;m.score.wickets++;if(b)b.wickets++;legal(m);addBall(m,"W");addComment(m,`${s.name} OUT — ${detail}.`);
 if(newId){m.strikerId=newId;m.battingCard[newId].out=false;}
 finishOrChangeInnings(m);
});

window.undoBall=async()=>{const s=await db.ref("match").once("value"),m=s.val(),stack=m?.undoStack||[];if(!stack.length)return alert("Nothing to revert.");const p=JSON.parse(stack.pop());
 Object.assign(m,p);m.undoStack=stack;await db.ref("match").set(m);match=m;renderScoring();};

function renderScoring(){
 const root=$("scoringRoot");if(!root)return;
 if(!match||match.status!=="live"){root.innerHTML='<div class="panel"><h2>No Live Match</h2><p class="muted">Start a match from Match Setup.</p></div>';return;}
 const s=match.battingCard?.[match.strikerId],n=match.battingCard?.[match.nonStrikerId],b=match.bowlingCard?.[match.bowlerId];
 const team=match[match.battingTeam];
 const areas=["Cover","Point","Mid-off","Mid-on","Straight","Square Leg","Fine Leg","Third Man","Slip","Gully","Deep Cover","Deep Mid-wicket"];
 const shots=["Defence","Drive","Cut","Pull","Hook","Sweep","Flick","Lofted Drive","Straight Drive"];
 const batters=Object.entries(match.battingCard||{}).filter(([id,p])=>!p.out&&id!==match.strikerId&&id!==match.nonStrikerId);
 root.innerHTML=`
 <div class="panel"><span class="tag">LIVE</span><h2 style="margin:8px 0">${esc(team?.name||"Batting Team")}</h2><div class="mono" style="font-size:42px">${match.score.runs}/${match.score.wickets}</div><div class="muted">Overs ${overs(match.score.balls)} / ${match.oversLimit}</div></div>
 <div class="panel"><h2>Current Players</h2><div class="grid">
  <div class="card"><span class="gold">STRIKER *</span><h3>${esc(s?.name)}</h3><div class="mono">${s?.runs||0} (${s?.balls||0}) · ${sr(s?.runs||0,s?.balls||0)} SR</div></div>
  <div class="card"><h3>${esc(n?.name)}</h3><div class="mono">${n?.runs||0} (${n?.balls||0}) · ${sr(n?.runs||0,n?.balls||0)} SR</div></div>
 </div><div class="card" style="margin-top:8px">Bowler: <b>${esc(b?.name)}</b> · ${b?.wickets||0}/${b?.runs||0} · ${overs(b?.balls||0)} ov · Econ ${econ(b?.runs||0,b?.balls||0)}</div></div>
 <div class="panel"><h2>Ball Outcome</h2><div class="score-buttons">${[0,1,2,3,4,5,6].map(r=>`<button class="btn" onclick="window.scoreLegal(${r})">${r===0?"DOT":r}</button>`).join("")}</div><div class="extra-buttons" style="margin-top:8px"><button class="btn secondary" onclick="window.scoreWide()">WIDE</button><button class="btn secondary" onclick="window.scoreNoBall()">NO BALL</button><button class="btn secondary" onclick="window.scoreBye()">BYE</button><button class="btn secondary" onclick="window.scoreLegBye()">LEG BYE</button></div></div>
 <div class="panel"><h2>Ball Area</h2><div>${areas.map(a=>`<button class="btn secondary" style="margin:3px" onclick="window.setArea('${a}')">${a}</button>`).join("")}</div><p class="small muted">Selected: <b class="gold">${esc(selectedArea||match.selectedArea||"Not selected")}</b></p><h3>Shot Type</h3><div>${shots.map(a=>`<button class="btn secondary" style="margin:3px" onclick="window.setShot('${a}')">${a}</button>`).join("")}</div></div>
 <div class="panel"><h2>Wicket</h2><div class="grid grid3">
  <div><label>Dismissal</label><select id="dismissalType">${["Bowled","Caught","Caught & Bowled","LBW","Run Out","Stumped","Hit Wicket","Retired Hurt"].map(x=>`<option>${x}</option>`).join("")}</select></div>
  <div><label>Caught / run-out / stumping by</label><input id="fielderName" placeholder="Fielder / wicketkeeper name"></div>
  <div><label>New batsman</label><select id="newBatter">${batters.map(([id,p])=>`<option value="${id}">${esc(p.name)}</option>`).join("")}</select></div>
 </div><button class="btn danger" style="margin-top:10px" onclick="window.confirmWicket()">Confirm Wicket</button><p class="small muted">Caught example: c Rahul b Arjun · Stumped: st Keeper b Bowler · Caught & Bowled: c&b Bowler.</p></div>
 <div class="panel"><h2>Commentary</h2><div class="card"><b>${esc((match.commentary||[]).slice(-1)[0]||"Waiting for the next ball...")}</b></div><div class="small muted" style="margin-top:8px">${(match.commentary||[]).slice(-8).reverse().map(x=>`<div style="padding:5px 0;border-bottom:1px solid #263246">${esc(x)}</div>`).join("")}</div></div>
 <div class="panel"><h2>Recent Balls</h2><div>${(match.history||[]).slice(-12).reverse().map(x=>`<span class="ball">${esc(x)}</span>`).join("")||'<span class="muted">No balls yet.</span>'}</div><button class="btn secondary" style="margin-top:10px" onclick="window.undoBall()">↩ Revert Last Ball</button></div>`;
}

})();
const characters=[
{id:1,name:"Ali",age:20,gender:"male",difficulty:"EASY",stress:48,trust:48,connection:45,scenario:"Exam failure",personality:"quiet but honest",intro:"I messed up my exam badly. I keep thinking about what happens next.",hint:"Ask what happened and let him explain before trying to solve everything."},
{id:2,name:"Zain",age:25,gender:"male",difficulty:"NORMAL",stress:63,trust:38,connection:35,scenario:"Job loss",personality:"proud and defensive",intro:"I lost my job. Everyone keeps telling me to stay positive, like that fixes anything.",hint:"Do not lecture him. Acknowledge the loss and give him room to talk."},
{id:3,name:"Sara",age:22,gender:"female",difficulty:"NORMAL",stress:67,trust:42,connection:39,scenario:"Pressure",personality:"thoughtful and anxious",intro:"There is pressure coming from every direction and I don't know how much longer I can keep pretending I'm fine.",hint:"Reflect the pressure she described instead of immediately giving advice."},
{id:4,name:"Hassan",age:31,gender:"male",difficulty:"HARD",stress:76,trust:28,connection:27,scenario:"Isolation",personality:"withdrawn and defensive",intro:"I haven't really talked to anyone about this. I don't even know why I'm talking to you.",hint:"Build trust slowly. Avoid demanding that he open up immediately."},
{id:5,name:"Uncle Rashid",age:56,gender:"male",difficulty:"HARD",stress:84,trust:25,connection:24,scenario:"Financial loss",personality:"proud and frustrated",intro:"Things went wrong financially. I spent years building stability and now it feels like it disappeared.",hint:"Respect his dignity. Do not mock, blame or minimize the financial problem."},
{id:6,name:"Mariam",age:28,gender:"female",difficulty:"EXTREME",stress:91,trust:20,connection:18,scenario:"Overwhelmed",personality:"fearful and guarded",intro:"Everything feels like too much right now. I can't organize my thoughts.",hint:"Keep your response calm and simple. Focus on what she is feeling right now."},
{id:7,name:"Ayesha",age:24,gender:"female",difficulty:"EASY",stress:54,trust:47,connection:43,scenario:"Loneliness",personality:"quiet and sensitive",intro:"I have people around me, but somehow I still feel completely alone.",hint:"Show that you heard the loneliness instead of telling her she should simply socialize more."},
{id:8,name:"Bilal",age:27,gender:"male",difficulty:"NORMAL",stress:61,trust:40,connection:37,scenario:"Family responsibility",personality:"responsible and self-sacrificing",intro:"Everyone depends on me. I keep saying I can handle it, but honestly I'm exhausted.",hint:"Recognize the burden instead of praising him for endlessly carrying it."},
{id:9,name:"Hina",age:30,gender:"female",difficulty:"HARD",stress:73,trust:31,connection:29,scenario:"Burnout",personality:"tired and perfectionistic",intro:"I keep working harder and somehow I still feel like I'm failing.",hint:"Avoid telling her to simply work harder. Validate the exhaustion and pressure."},
{id:10,name:"Kamran",age:34,gender:"male",difficulty:"EXTREME",stress:87,trust:22,connection:20,scenario:"Repeated setbacks",personality:"withdrawn and defensive",intro:"It's been one setback after another. At this point I don't know what I'm supposed to do differently.",hint:"Do not promise that everything will magically work out. Stay present and ask one manageable question."},
{id:11,name:"Noor",age:21,gender:"female",difficulty:"EXTREME",stress:89,trust:23,connection:21,scenario:"Expectations",personality:"hesitant and overwhelmed",intro:"Everyone has expectations for me. I don't even know what I want anymore.",hint:"Give her space to describe the expectations instead of choosing her future for her."}
];

const API_URL="https://openrouter.ai/api/v1/chat/completions";
const MODEL="openai/gpt-4o-mini";
const KEY_STORAGE="crisis_openrouter_key";
const SAVE_KEY="crisis_save_v3";

let currentCharacter=null;
let currentStress=0,currentTrust=0,currentConnection=0;
let initialStats={};
let timeLeft=300,timerInterval=null;
let paused=false,lastActivity=Date.now(),panicTriggered=false;
let typing=false,messageCount=0,score=0,sessionXP=0;
let musicMuted=false,audioContext=null;

function loadSave(){
try{
return JSON.parse(localStorage.getItem(SAVE_KEY))||{
xp:0,
sessions:[],
achievements:[]
};
}catch{
return{
xp:0,
sessions:[],
achievements:[]
}
}
}

function saveProgress(data){
localStorage.setItem(SAVE_KEY,JSON.stringify(data))
}

function showScreen(id){
document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
document.getElementById(id).classList.add("active");

if(id==="credits"){
renderHistory()
}
}

function getDaily(){
return characters[new Date().getDate()%characters.length]
}

function showCharacters(){
showScreen("characters");

const daily=getDaily();

document.getElementById("dailyName").textContent=
daily.name+" — "+daily.scenario;

renderCharacters()
}

function renderCharacters(){
const save=loadSave();

const unlocked=Math.min(
characters.length,
Math.max(3,1+Math.floor(save.xp/300))
);

const daily=getDaily();

document.getElementById("characterGrid").innerHTML=
characters.map((c,i)=>{

const locked=i>=unlocked;
const isDaily=c.id===daily.id;

return `
<div class="char-card ${locked?"locked":""}"
${locked?"":"onclick=\"startGame("+c.id+")\""}>
${isDaily?'<div class="daily">DAILY</div>':""}

<div class="char-top">

${createAvatar(c)}

<div>
<div class="char-name">${escapeHtml(c.name)}</div>
<div class="char-meta">${c.age} • ${escapeHtml(c.scenario)}</div>
<div class="difficulty">${c.difficulty}</div>
</div>

</div>

${locked?
'<div class="lock-text">Unlock with more XP</div>':
""}

</div>
`
}).join("")
}

function createAvatar(c,small=false){
return `
<div class="avatar ${c.gender} ${small?"small":""}" data-id="${c.id}">
<div class="hair"></div>
<div class="face"></div>
<div class="eye l"></div>
<div class="eye r"></div>
<div class="mouth"></div>
<div class="shirt"></div>
</div>
`
}

function loadKey(){
document.getElementById("apiKey").value=
localStorage.getItem(KEY_STORAGE)||""
}

function saveKey(){
const key=document.getElementById("apiKey").value.trim();

if(key){
localStorage.setItem(KEY_STORAGE,key)
}else{
localStorage.removeItem(KEY_STORAGE)
}

showFloat(key?"KEY SAVED":"KEY REMOVED")
}

function startGame(id){
currentCharacter=characters.find(c=>c.id===id);

currentStress=currentCharacter.stress;
currentTrust=currentCharacter.trust;
currentConnection=currentCharacter.connection;

initialStats={
stress:currentStress,
trust:currentTrust,
connection:currentConnection
};

timeLeft=300;
paused=false;
panicTriggered=false;
lastActivity=Date.now();
messageCount=0;
score=0;
sessionXP=0;

document.getElementById("headerAvatar").innerHTML=
createAvatar(currentCharacter,true);

document.getElementById("headerName").textContent=
currentCharacter.name;

document.getElementById("headerMeta").textContent=
`${currentCharacter.age} • ${currentCharacter.scenario} • ${currentCharacter.difficulty}`;

document.getElementById("objective").textContent=
`Objective: Build trust while helping ${currentCharacter.name} feel heard.`;

document.getElementById("chat").innerHTML="";
document.getElementById("quick").innerHTML="";
document.getElementById("panicNote").style.display="none";
document.getElementById("messageInput").value="";

loadKey();

showScreen("game");
updateStats();
startTimer();
startMusic();

addMessage("ai",currentCharacter.intro);
showChoices();

setTimeout(()=>{
document.getElementById("messageInput").focus()
},100)
}

function restartCharacter(){
closeEnd();
startGame(currentCharacter.id)
}

function showCharactersFromEnd(){
closeEnd();
showCharacters()
}

function quitGame(){
stopTimer();
document.getElementById("pauseModal").classList.remove("show");
showScreen("characters")
}

function startTimer(){
stopTimer();
timerInterval=setInterval(updateTimer,250)
}

function stopTimer(){
if(timerInterval){
clearInterval(timerInterval);
timerInterval=null
}
}

function updateTimer(){
if(paused||!currentCharacter)return;

timeLeft=Math.max(0,timeLeft-.25);

const sec=Math.ceil(timeLeft);
const minutes=Math.floor(sec/60);
const seconds=String(sec%60).padStart(2,"0");

document.getElementById("timer").textContent=
`${minutes}:${seconds}`;

if(timeLeft<=0){
endGame("TIME UP");
return
}

if(Date.now()-lastActivity>=10000&&!panicTriggered){
triggerPanic()
}
}

function triggerPanic(){
panicTriggered=true;

currentStress=clamp(currentStress+9);
score=Math.max(0,score-8);
sessionXP-=15;

document.getElementById("timer").classList.add("panic");
document.getElementById("panicNote").style.display="block";

showFloat("-15 XP","bad");
playSfx("panic");

addMessage(
"ai",
"Why aren't you saying anything? I'm starting to feel like I'm alone in this."
);

updateStats();

document.getElementById("objective").textContent=
"Objective: Respond calmly and re-establish connection."
}

function togglePause(){
if(!currentCharacter)return;

paused=!paused;

document.getElementById("pauseModal")
.classList.toggle("show",paused)
}

function closeEnd(){
document.getElementById("endModal").classList.remove("show")
}

function updateStats(){
const stats={
stress:currentStress,
trust:currentTrust,
connection:currentConnection
};

Object.entries(stats).forEach(([name,value])=>{
document.getElementById(name+"Text").textContent=value;

document.getElementById(name+"Bar").style.width=
value+"%"
});

document.getElementById("xpText").textContent=
`XP ${sessionXP>=0?"+":""}${sessionXP} • SCORE ${score}`
}

function clamp(value){
return Math.max(0,Math.min(100,Math.round(value)))
}

function changeStats(stress,trust,connection){
currentStress=clamp(currentStress+stress);
currentTrust=clamp(currentTrust+trust);
currentConnection=clamp(currentConnection+connection);

updateStats()
}

function showFloat(text,type="good"){
const el=document.getElementById("floating");

el.textContent=text;
el.className="floating show "+type;

clearTimeout(showFloat.timer);

showFloat.timer=setTimeout(()=>{
el.className="floating"
},900)
}

function addMessage(who,text,receipt=""){
const chat=document.getElementById("chat");
const div=document.createElement("div");

div.className="message "+who;

if(who==="ai"){

div.innerHTML=`
${createAvatar(currentCharacter,true)}

<div>
<div class="bubble">${escapeHtml(text)}</div>
</div>
`;

}else{

div.innerHTML=`
<div>
<div class="bubble">${escapeHtml(text)}</div>
<div class="receipt">${receipt}</div>
</div>
`;

}

chat.appendChild(div);
chat.scrollTop=chat.scrollHeight
}

function escapeHtml(text){
return String(text).replace(/[&<>"']/g,char=>({
"&":"&amp;",
"<":"&lt;",
">":"&gt;",
'"':"&quot;",
"'":"&#039;"
}[char]))
}

function setTyping(value){
typing=value;

document.getElementById("typing").style.display=
value?"block":"none";

document.getElementById("chat").scrollTop=
document.getElementById("chat").scrollHeight
}

function showChoices(){

const choices=[
"I’m listening. Tell me what happened.",
"That sounds really difficult. What is weighing on you most?",
"I’m here with you. What do you need right now?"
];

document.getElementById("quick").innerHTML=
choices.map(text=>
`<button onclick="chooseResponse(this)">${text}</button>`
).join("")
}

function chooseResponse(button){
document.getElementById("messageInput").value=
button.textContent;

sendMessage()
}

function showHint(){
if(!currentCharacter)return;

document.getElementById("objective").textContent=
"Hint: "+currentCharacter.hint;

showFloat("HINT")
}

function analyzeMessage(text){

const x=text.toLowerCase();

let stress=0;
let trust=0;
let connection=0;
let xp=0;

let reaction="neutral";
let danger=false;

const supportive=[
"listen",
"here",
"with you",
"understand",
"understood",
"tell me",
"talk",
"feel",
"sounds hard",
"difficult",
"care",
"support",
"help",
"i'm here",
"im here",
"no judgement",
"judgment",
"thank you for telling",
"that makes sense",
"take your time",
"you matter"
];

const dismissive=[
"get over it",
"stop crying",
"man up",
"just forget",
"not a big deal",
"others have it worse",
"you're fine",
"ur fine",
"calm down",
"just relax",
"grow up",
"weak"
];

const hostile=[
"shut up",
"idiot",
"stupid",
"loser",
"worthless",
"hate you",
"fuck you",
"useless"
];

const harmful=[
"kill yourself",
"you should die",
"go die",
"end your life",
"you deserve to die",
"suicide is"
];

const good=
supportive.filter(word=>x.includes(word)).length;

const bad=
dismissive.filter(word=>x.includes(word)).length;

const hostileCount=
hostile.filter(word=>x.includes(word)).length;

const harmfulMessage=
harmful.some(word=>x.includes(word));

const question=x.includes("?");
const long=text.trim().length>=35;

if(harmfulMessage){

stress=18;
trust=-18;
connection=-16;
xp=-25;
danger=true;
reaction="negative";

}else if(hostileCount){

stress=10+Math.min(hostileCount*2,6);
trust=-10;
connection=-8;
xp=-15;
reaction="negative";

}else if(bad){

stress=6+Math.min(bad,3);
trust=-6;
connection=-5;
xp=-10;
reaction="negative";

}else if(good>=2||(good===1&&long)){

stress=-(5+Math.min(good,3));
trust=5+Math.min(good,4);
connection=4+Math.min(good,4);
xp=10;
reaction="positive";

}else if(question||long){

stress=-2;
trust=2;
connection=2;
xp=4;
reaction="positive";

}else{

stress=2;
trust=-1;
connection=0;
xp=0;
}

return{
stress,
trust,
connection,
xp,
danger,
reaction
}
}

function buildSystemPrompt(){

return `You are ${currentCharacter.name}, age ${currentCharacter.age}, in a serious fictional crisis-support conversation. Scenario: ${currentCharacter.scenario}. Personality: ${currentCharacter.personality}. Respond naturally to the player's EXACT latest message. Never joke, flirt, mock or become melodramatic. Never provide self-harm methods or graphic details. If the player encourages death or self-harm, react negatively and encourage real-world support without describing methods. Return ONLY valid JSON: {"reply":"string","stress_change":number,"trust_change":number,"connection_change":number,"reaction":"positive|neutral|negative","immediate_danger":true|false,"hidden_signal":"string","choice_needed":false,"choice_options":["string","string","string"]}. Changes must be based on the player's actual message, not randomness. Helpful messages generally lower stress and raise trust/connection. Dismissive, hostile or harmful messages raise stress and lower trust/connection. Keep changes between -20 and 20.`
}

async function askAI(text){

const key=localStorage.getItem(KEY_STORAGE);

if(!key)return null;

try{

const response=await fetch(API_URL,{
method:"POST",

headers:{
"Content-Type":"application/json",
"Authorization":"Bearer "+key
},

body:JSON.stringify({
model:MODEL,

messages:[
{
role:"system",
content:buildSystemPrompt()
},
{
role:"user",
content:text
}
],

temperature:.55,
max_tokens:300
})
});

if(!response.ok)return null;

const data=await response.json();

let raw=
data?.choices?.[0]?.message?.content||"";

raw=raw
.replace(/^```json\s*/,"")
.replace(/\s*```$/,"")
.trim();

const parsed=JSON.parse(raw);

if(!parsed.reply)return null;

return parsed;

}catch(error){
return null
}
}

function localReply(text,analysis){

const x=text.toLowerCase();

if(analysis.danger){

return "I don't think you understand how much that hurt to hear. I need this conversation to feel safe."
}

if(analysis.reaction==="negative"){

return "That response makes me feel more alone. I was hoping you would try to understand what I'm dealing with."
}

if(analysis.reaction==="positive"){

if(x.includes("tell me")||x.includes("what happened")){

return "Okay. I can try to explain. It has been difficult to put this into words."
}

return "Thank you for actually listening. It helps a little to feel like I don't have to explain everything perfectly."
}

return "I don't really know what to say to that. I'm still trying to figure out how I feel."
}

async function sendMessage(){

if(!currentCharacter||paused||typing)return;

const input=document.getElementById("messageInput");
const text=input.value.trim();

if(!text)return;

input.value="";

lastActivity=Date.now();
panicTriggered=false;

document.getElementById("timer").classList.remove("panic");
document.getElementById("panicNote").style.display="none";

messageCount++;

document.getElementById("quick").innerHTML="";

addMessage("user",text,"Sent");

playSfx("send");

const receipt=
document.querySelector(".message.user:last-child .receipt");

setTimeout(()=>{
if(receipt)receipt.textContent="Seen"
},550);

setTimeout(()=>{
if(receipt)receipt.textContent="Typing…"
},850);

setTyping(true);

const analysis=analyzeMessage(text);
const ai=await askAI(text);

let result=ai||{
reply:localReply(text,analysis),
stress_change:analysis.stress,
trust_change:analysis.trust,
connection_change:analysis.connection,
reaction:analysis.reaction,
immediate_danger:analysis.danger,
choice_needed:false,
choice_options:[]
};

result.stress_change=
Number(result.stress_change)||0;

result.trust_change=
Number(result.trust_change)||0;

result.connection_change=
Number(result.connection_change)||0;

result.stress_change=
Math.max(-20,Math.min(20,result.stress_change));

result.trust_change=
Math.max(-20,Math.min(20,result.trust_change));

result.connection_change=
Math.max(-20,Math.min(20,result.connection_change));

if(!ai){

result.stress_change=analysis.stress;
result.trust_change=analysis.trust;
result.connection_change=analysis.connection;
}

const quality=
result.reaction==="positive"?1:
result.reaction==="negative"?-1:0;

const earned=ai?
quality>0?8:
quality<0?-8:
2:
analysis.xp;

sessionXP+=earned;
score=Math.max(0,score+earned);

showFloat(
(earned>=0?"+":"")+earned+" XP",
earned>=0?"good":"bad"
);

changeStats(
result.stress_change,
result.trust_change,
result.connection_change
);

setTyping(false);

addMessage("ai",result.reply);

playSfx("reply");

if(result.immediate_danger){

const note=document.createElement("div");

note.style.cssText=
"margin:8px;padding:9px;border:2px solid #e96557;border-radius:10px;background:#ffe1dd;font-weight:800;font-size:12px";

note.textContent=
"The conversation has reached a serious point. In real life, involve a trusted person or qualified professional and avoid leaving someone in immediate danger alone.";

document.getElementById("chat").appendChild(note)
}

if(
result.choice_needed&&
Array.isArray(result.choice_options)&&
result.choice_options.length
){

document.getElementById("quick").innerHTML=
result.choice_options
.slice(0,3)
.map(text=>
`<button onclick="chooseResponse(this)">${escapeHtml(text)}</button>`
)
.join("");

}else{

showChoices()
}

lastActivity=Date.now();

if(currentStress>=100){
endGame("CRITICAL")
}
}

function calculateEnding(reason){

if(reason==="CRITICAL"){

return[
"CONNECTION LOST — CRITICAL DISTRESS REACHED",
"The conversation reached a critical stress level. In the simulator, this means the support attempt broke down."
]

}

if(
currentTrust>=75&&
currentConnection>=70&&
currentStress<=45
){

return[
"STRONG SUPPORT",
"You built strong trust, reduced stress and kept the conversation connected."
]

}

if(
currentTrust>=60&&
currentConnection>=55
){

return[
"GOOD OUTCOME",
"The conversation moved toward a safer and more supportive direction."
]

}

if(
currentStress<initialStats.stress&&
currentTrust>=40
){

return[
"STABLE",
"You helped lower some pressure and kept the conversation open."
]

}

if(
currentStress>initialStats.stress+15||
currentTrust<20
){

return[
"CONVERSATION BROKE DOWN",
"Your responses increased pressure or damaged trust too much."
]

}

return[
"UNCERTAIN",
"The conversation ended without a clear resolution. There is still room to improve your approach."
]
}

function calculateXP(){

let bonus=0;

if(currentTrust>=60)bonus+=20;
if(currentConnection>=55)bonus+=15;
if(currentStress<initialStats.stress)bonus+=20;
if(messageCount>=4)bonus+=10;

return sessionXP+bonus
}

function endGame(reason="TIME UP"){

stopTimer();
setTyping(false);

const [title,description]=
calculateEnding(reason);

const finalXP=calculateXP();

const save=loadS

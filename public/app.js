'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stateNames={AL:'Alabama',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
const skillTerms=['customer service','customer support','communication','sales','data entry','excel','google sheets','microsoft office','typing','scheduling','administration','bookkeeping','billing','claims','insurance','troubleshooting','technical support','phone','email','chat','spanish','english','zendesk','salesforce','hubspot','computer','writing','editing','payroll','accounts payable','healthcare','medical','collections','remote','python','javascript','sql','project management'];
let jobs=[],feed=null,currentState='',currentCity='',view='explore',limit=60,geo=null,resumeFile=null;
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
let saved=read('dfj-saved',[]),tracker=read('dfj-tracker',{}),resume=read('dfj-resume',{text:'',skills:[],name:''});
let params=new URLSearchParams(location.search);if(stateNames[params.get('state')]){currentState=params.get('state');currentCity='';}
const dateLabel=d=>new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
function persist(){try{localStorage.setItem('dfj-saved',JSON.stringify(saved));localStorage.setItem('dfj-tracker',JSON.stringify(tracker));localStorage.setItem('dfj-resume',JSON.stringify(resume));}catch{toast('This browser is out of space. Your changes may not be saved.');}}
let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000);}
const matching=j=>j.skills.filter(s=>resume.skills.includes(s));
const score=j=>matching(j).length;
const scopedJobs=()=>jobs;
const stateCount=s=>scopedJobs().filter(j=>j.states.includes(s)).length;
function jumpToResults(){const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;$('#results').scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});}
function updateAddress(){const p=new URLSearchParams();if(currentState)p.set('state',currentState);history.replaceState(null,'',location.pathname+(p.size?'?'+p:''));}
function openResume(){$('#resumeText').value=resume.text;$('#fileStatus').textContent=resume.name?'Your saved resume: '+resume.name:'';$('#downloadResume').hidden=!resumeFile;$('#resumeDialog').showModal();}
['uploadBtn','bannerUpload'].forEach(id=>$('#'+id).onclick=openResume);
$$('[data-close]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
$$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
Object.entries(stateNames).sort((a,b)=>a[1].localeCompare(b[1])).forEach(([abbr,name])=>$('#stateSelect').add(new Option(name,abbr)));
$('#stateSelect').value=currentState;
function syncExperience(){
 const landing=view==='explore'&&!currentState;
 document.body.classList.toggle('landing',landing);
 document.body.classList.toggle('has-state',view==='explore'&&(!!currentState));
 document.body.classList.toggle('workspace-view',view!=='explore');
 $('#results').hidden=landing;
 $('#resumeBanner').hidden=true;
 $('footer').hidden=landing;
}
function setView(next){
 updateAddress();
 view=next;limit=60;$('#search').value='';$('#discipline').value='';$('#termFilter').value='';
 $$('.nav').forEach(n=>{n.classList.toggle('active',n.dataset.view===next);if(n.dataset.view===next)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
 $('#exploreSurface').hidden=next!=='explore';$('#resumeBanner').hidden=next!=='explore';
 const titles={explore:'Where will you <br>work from?',matches:'You bring the skills.<br><em>Let’s find a place for them.</em>',saved:'The ones that caught your eye.<br><em>All right here.</em>',applications:'Big things start small.<br><em>Keep your next steps here.</em>'};
 const subtitles={explore:'You’ve got skills to put to work. Let’s find a place to use them.',matches:'A few familiar skills can be the start of something new.',saved:'Less searching all over again. More time figuring out what feels right.',applications:'Stay on top of the forms, the follow-ups, and the good news.'};
 $('#pageTitle').innerHTML=titles[next];$('#pageSubtitle').textContent=subtitles[next];$('#introEyebrow').hidden=next!=='explore';
 $('#sort').value=next==='matches'?'match':'city';render();
 if(next==='matches'&&!resume.text)openResume();
}
$$('.nav').forEach(n=>n.onclick=()=>setView(n.dataset.view));
function setState(state){const wasList=$('#map').hidden;currentState=state;currentCity='';$('#stateSelect').value=state;limit=60;$('#sort').value='city';updateAddress();setMapMode(true);render();if(wasList&&state)$('#stateSelect').focus({preventScroll:true});}
function setCity(city){currentCity=city;limit=60;updateAddress();renderCities();renderJobs();jumpToResults();}
$('#stateSelect').onchange=e=>setState(e.target.value);$('#clearState').onclick=()=>{setState('');};$('#showStateJobs').onclick=()=>{currentCity='';updateAddress();renderCities();renderJobs();jumpToResults();};
function renderCities(){
 $('#cityTitle').textContent=currentState?'Job types':'States with openings';$('#cityHelp').textContent='Choose the state you live in. Remote eligibility still matters.';
 const counts={};jobs.filter(j=>!currentState||j.states.includes(currentState)).forEach(j=>{const key=currentState?j.discipline:null;if(key)counts[key]=(counts[key]||0)+1;});
 const entries=currentState?Object.entries(counts).sort((a,b)=>a[0].localeCompare(b[0])):Object.entries(stateNames).filter(([s])=>stateCount(s)).map(([s,n])=>[s,stateCount(s)]).sort((a,b)=>stateNames[a[0]].localeCompare(stateNames[b[0]]));
 $('#cityCount').textContent=entries.length+(currentState?' types':' states');$('#cities').innerHTML=entries.length?entries.map(([key,n])=>'<button class="city" data-location="'+esc(key)+'"><span>'+esc(currentState?key:stateNames[key])+'</span><small>'+n+' ↗</small></button>').join(''):'<p class="privacy">No confirmed matches here yet. We only list jobs with a published no-degree path and remote work.</p>';
 $$('#cities [data-location]').forEach(b=>b.onclick=()=>{if(!currentState){setState(b.dataset.location);return;}$('#discipline').value=b.dataset.location;renderJobs();jumpToResults();});
 $('#showStateJobs').hidden=!currentState||!entries.length;$('#showStateJobs').textContent='See '+stateCount(currentState)+' remote jobs ↓';$('#clearState').hidden=!currentState;
}
function drawMap(){
 if(!geo||!window.d3||!window.topojson)return;
 $('#map .map-loading')?.remove();
 const features=topojson.feature(geo,geo.objects.states).features.filter(f=>Object.values(stateNames).includes(f.properties.name));
 const projection=d3.geoAlbersUsa().fitExtent([[12,14],[736,410]],{type:'FeatureCollection',features}),path=d3.geoPath(projection);
 const abbreviation=f=>Object.keys(stateNames).find(k=>stateNames[k]===f.properties.name);
 const stateClass=f=>{const s=abbreviation(f),n=stateCount(s);return s===currentState?'selected':n>20?'has-jobs high':n>6?'has-jobs medium':n?'has-jobs':'';};
 const svg=d3.select('#map').selectAll('svg').data([null]).join('svg').attr('viewBox','0 0 790 425').attr('aria-label','48 contiguous United States');
 const showTip=f=>{$('#mapTooltip').textContent=f.properties.name+' · '+stateCount(abbreviation(f))+' job locations';$('#mapTooltip').hidden=false;};
 const hideTip=()=>{$('#mapTooltip').hidden=true;};
 svg.selectAll('path').data(features).join('path').attr('d',path).attr('class',f=>'state-path '+stateClass(f)).attr('tabindex',0).attr('role','button').attr('aria-label',f=>f.properties.name+': '+stateCount(abbreviation(f))+' job locations').attr('aria-pressed',f=>abbreviation(f)===currentState).on('click',(_,f)=>{setState(abbreviation(f));hideTip();}).on('keydown',(e,f)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setState(abbreviation(f));hideTip();}}).on('mouseenter',(_,f)=>showTip(f)).on('mouseleave',hideTip).on('focus',(_,f)=>showTip(f)).on('blur',hideTip).selectAll('title').data(f=>[f]).join('title').text(f=>f.properties.name+' · '+stateCount(abbreviation(f))+' openings');
 const small={NH:[754,62],VT:[716,42],MA:[770,98],RI:[770,122],CT:[750,146],NJ:[724,175],DE:[713,199],MD:[700,222]};
 svg.selectAll('line').data(features.filter(f=>small[abbreviation(f)])).join('line').attr('class','label-leader').attr('x1',f=>path.centroid(f)[0]).attr('y1',f=>path.centroid(f)[1]).attr('x2',f=>small[abbreviation(f)][0]-9).attr('y2',f=>small[abbreviation(f)][1]-3);
 svg.selectAll('text').data(features).join('text').attr('transform',f=>'translate('+(small[abbreviation(f)]||path.centroid(f))+')').attr('text-anchor','middle').attr('class',f=>'state-label '+stateClass(f)).text(abbreviation);
 $('#stateGrid').innerHTML=Object.entries(stateNames).sort((a,b)=>a[1].localeCompare(b[1])).map(([s,n])=>'<button class="'+(s===currentState?'active':'')+'" data-state="'+s+'" aria-label="'+n+': '+stateCount(s)+' openings" aria-pressed="'+(s===currentState)+'"><b>'+n+'</b><small>'+stateCount(s)+'</small></button>').join('');
 $$('#stateGrid button').forEach(b=>b.onclick=()=>setState(b.dataset.state));
}
function setMapMode(map){$('#mapAlternativeLabel').textContent=map?'Browse by state':'Back to the map';$('#map').hidden=!map;$('#stateGrid').hidden=map;$('#mapMode').classList.toggle('selected',map);$('#listMode').classList.toggle('selected',!map);$('#mapMode').setAttribute('aria-pressed',map);$('#listMode').setAttribute('aria-pressed',!map);$('#mapAlternative').setAttribute('aria-label',map?'Choose a state from a list':'Back to the map');$('#mapAlternative').title=map?'Choose a state from a list':'Back to the map';}
$('#mapMode').onclick=()=>setMapMode(true);$('#listMode').onclick=()=>setMapMode(false);
$('#mapAlternative').onclick=()=>setMapMode($('#map').hidden);

function filteredJobs(){
 const q=$('#search').value.trim().toLowerCase(),field=$('#discipline').value,term=$('#termFilter').value;
 return jobs.filter(j=>(view!=='explore'||(!currentState||j.states.includes(currentState)))&&(!q||(j.title+' '+j.company+' '+j.city+' '+j.skills.join(' ')).toLowerCase().includes(q))&&(!field||j.discipline===field)&&(!term||j.term.includes(term))&&(view!=='saved'||saved.includes(j.id))&&(view!=='applications'||tracker[j.id])&&(view!=='matches'||resume.text&&score(j)>0)).sort((a,b)=>{
  if(view==='explore'){const city=a.discipline.localeCompare(b.discipline);if(city)return city;}
  if($('#sort').value==='match'){const overlap=score(b)-score(a);if(overlap)return overlap;}
  if(view!=='explore'&&$('#sort').value==='city'){const city=a.discipline.localeCompare(b.discipline);if(city)return city;}
  return a.company.localeCompare(b.company)||a.title.localeCompare(b.title)||a.city.localeCompare(b.city);
 });
}
const statusOptions=['Preparing','Opened employer form','Applied','Interviewing','Offer','Closed'];
function card(j){
 const overlap=score(j),initials=j.company==='SpaceX'?'X':j.company.split(' ').map(x=>x[0]).slice(0,2).join('');
 return '<article class="job"><div class="job-top"><div class="company-logo" aria-hidden="true">'+esc(initials)+'</div><button class="save '+(saved.includes(j.id)?'saved':'')+'" data-save="'+esc(j.id)+'" aria-label="'+(saved.includes(j.id)?'Unsave':'Save')+' '+esc(j.title)+' at '+esc(j.company)+'" aria-pressed="'+saved.includes(j.id)+'">'+(saved.includes(j.id)?'♥':'♡')+'</button></div><div class="company-line">'+esc(j.company)+' <span class="verified" aria-label="Employer source">✓</span></div><h3><button data-detail="'+esc(j.id)+'">'+esc(j.title)+'</button></h3><div class="metadata"><span>⌖ '+esc(j.stateSummary)+'</span><span>◷ '+esc(j.term)+'</span>'+(j.details?.duration?'<span>'+esc(j.details.duration)+' · '+esc(j.details.arrangement)+'</span>':'')+'<span class="meta-pay">'+esc(j.pay==='See employer posting'?'Pay: ask the employer':j.pay)+'</span></div><div class="tags"><span class="tag">'+esc(j.discipline)+'</span><span class="tag">No college degree required</span>'+j.skills.filter(s=>s.toLowerCase()!==j.discipline.toLowerCase()).slice(0,2).map(s=>'<span class="tag">'+esc(s)+'</span>').join('')+'</div>'+(view==='applications'?'<label class="tracker-status"><span class="privacy">Where things stand</span><br><select class="status-select" data-status="'+esc(j.id)+'" aria-label="Application status for '+esc(j.title)+'">'+statusOptions.map(s=>'<option '+(tracker[j.id]===s?'selected':'')+'>'+s+'</option>').join('')+'</select></label>':'')+'<div class="job-actions"><button class="view-btn" data-detail="'+esc(j.id)+'">See the details ↗</button>'+(resume.text&&overlap?'<span class="match-pill">'+overlap+' shared skills</span>':'<span class="privacy">'+esc(j.details?.arrangement||'See details')+'</span>')+'</div></article>';
}
function renderJobs(){
 syncExperience();
 $('#savedCount').textContent=saved.length;
 const initial=view==='explore'&&!currentState,list=initial?[]:filteredJobs();
 $('#resultsLabel').textContent={explore:currentCity?'Jobs in '+currentCity:currentState?'Let’s see what’s in '+stateNames[currentState]+'.':'Pick a state. We’ll take it from there.',matches:'A few places your skills could take you.',saved:'Your saved jobs.',applications:'Your applications. Your next moves.'}[view];
 $('#resultsSubtitle').textContent={explore:currentState?(currentCity?'One city. A closer look at what’s open.':'Grouped by job type. Every role meets both criteria.'):'Choose your state. Find work that fits.',matches:resume.text?'Sorted by the skills you share with each role. It’s a starting point, not a verdict.':'Add your resume to get started.',saved:'Keep the good ones close. Come back when you’re ready.',applications:'Opening an employer form isn’t the same as applying. Update each step when you’re ready.'}[view];
 $('#resultCount').textContent=list.length;$('#resultCount').hidden=initial;$('#filters').hidden=initial;$('#sortWrap').hidden=initial;
 $('#activeFilters').innerHTML=view==='explore'?(currentState?'<button class="chip" id="stateChip">'+esc(stateNames[currentState])+' ×</button>':'')+(currentCity?'<button class="chip gold" id="cityChip">'+esc(currentCity)+' ×</button>':''):'';
 if($('#stateChip'))$('#stateChip').onclick=()=>setState('');if($('#cityChip'))$('#cityChip').onclick=()=>{currentCity='';limit=60;updateAddress();renderCities();renderJobs();};
 $('#profileNotice').hidden=view!=='matches';$('#profileNotice').innerHTML=resume.text?'We found '+resume.skills.length+' skills in your resume. Your matches use shared skills—an AI service isn’t connected. <button class="text-button" id="editResume">Update my resume ↗</button>':'Your projects and coursework count, too. Add your resume and let’s see what turns up.';
 if($('#editResume'))$('#editResume').onclick=openResume;
 if(initial){$('#jobs').innerHTML='<div class="starter-hint"><span class="hint-icon" aria-hidden="true">↖</span><p><strong>No need to know exactly what you’re looking for.</strong><br>Start with somewhere you’d like to be. You can narrow down the job type, schedule, and skills from there.</p></div>';$('#loadMore').hidden=true;return;}
 if(!list.length){const heading={matches:resume.text?'Nothing familiar just yet.':'Let’s start with you.',saved:'Seen something you like?',applications:'One small step gets it going.'}[view]||'Nothing here right now.';const message={matches:'Try adding a few more skills or projects to your resume. You can always browse the map, too.',saved:'Tap the heart on an job. We’ll keep it here for you.',applications:'Open an job and add it to your list. Then take it one step at a time.'}[view]||'Try another job type or schedule. We’ll keep checking for new openings.';$('#jobs').innerHTML='<div class="empty"><strong>'+heading+'</strong>'+message+'</div>';$('#loadMore').hidden=true;return;}
 const visible=list.slice(0,limit);
 if(view==='explore'){
  const groups=new Map();visible.forEach(j=>{const key=j.discipline+'|'+currentState;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(j);});
  $('#jobs').innerHTML=[...groups].map(([key,rows])=>{const [city,groupState]=key.split('|');const all=list.filter(j=>j.discipline===city).length;return '<section class="city-section" aria-label="Jobs in '+esc(city)+'"><div class="city-group-heading"><button data-city-group="'+esc(city)+'" data-group-state="'+groupState+'">'+esc(city)+'<span>'+esc(stateNames[groupState])+' ↗</span></button><span>'+all+' job'+(all===1?'':'s')+'</span></div><div class="job-grid">'+rows.map(card).join('')+'</div></section>';}).join('');
 }else $('#jobs').innerHTML='<div class="job-grid">'+visible.map(card).join('')+'</div>';
 $('#loadMore').hidden=list.length<=limit;$('#loadMore').textContent='More jobs ('+(list.length-visible.length)+' left) ↓';
 $$('[data-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.detail));$$('[data-save]').forEach(b=>b.onclick=()=>toggleSave(b.dataset.save));$$('[data-city-group]').forEach(b=>b.onclick=()=>{currentState=b.dataset.groupState;$('#stateSelect').value=currentState;$('#discipline').value=b.dataset.cityGroup;renderJobs();jumpToResults();});$$('[data-status]').forEach(s=>s.onchange=()=>{tracker[s.dataset.status]=s.value;persist();toast('Next step saved. You’ve got this.');});
}
function render(){const scoped=scopedJobs();$('#total').textContent=scoped.length;$('#stateCount').textContent=new Set(scoped.flatMap(j=>j.states)).size;$('#employerCount').textContent=new Set(scoped.map(j=>j.company)).size;renderCities();drawMap();renderJobs();}
function toggleSave(id){saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];persist();renderJobs();toast(saved.includes(id)?'Saved. Come back to it anytime.':'Taken off your saved list.');}
['search','discipline','termFilter','sort'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',()=>{limit=60;renderJobs();}));
$('#clearFilters').onclick=()=>{$('#search').value='';$('#discipline').value='';$('#termFilter').value='';currentCity='';limit=60;updateAddress();renderCities();renderJobs();};$('#loadMore').onclick=()=>{limit+=60;renderJobs();};
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();if($('#filters').hidden){toast('Pick a state first. Then search its jobs.');return;}$('#search').focus();}});
function listSection(title,items,fallback){return '<section class="detail-section"><h3>'+title+'</h3>'+(items?.length?'<ul>'+items.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'<p>'+fallback+'</p>')+'</section>';}
function openDetail(id){
 const j=jobs.find(x=>x.id===id);if(!j)return;const d=j.details||{},shared=matching(j),fact=(name,value)=>'<div class="fact"><label>'+name+'</label><span>'+esc(value)+'</span></div>';
 $('#detailContent').innerHTML='<div class="detail-header"><div class="eyebrow">'+esc(j.company)+' · '+esc(j.discipline)+'</div><h2 id="detailTitle">'+esc(j.title)+'</h2><p>⌖ '+esc(j.stateSummary)+' &nbsp; · &nbsp; '+esc(d.arrangement||'See employer posting')+'</p><div class="detail-quick"><div><label>SCHEDULE</label><strong>'+esc(j.term)+'</strong></div><div><label>EDUCATION</label><strong>'+esc(j.degreePolicy)+'</strong></div><div><label>WHAT IT PAYS</label><strong>'+esc(j.pay==='See employer posting'?'Not listed in our feed':j.pay)+'</strong></div></div></div><div class="detail-body"><div class="detail-main"><section class="detail-section"><h3>A little about the role</h3><p>'+esc(j.summary)+'</p></section>'+listSection('What you’ll get to do',d.responsibilities,'The employer has the full rundown. Open the original posting below to see the work and projects involved.')+listSection('What they’re looking for',d.requirements,j.eligibility?.length?esc(j.eligibility.join('. '))+'.':'Check the original posting for degree, skills, and work authorization requirements.')+(d.preferred?.length?listSection('A few nice-to-haves',d.preferred,''):'')+'<section class="detail-section"><h3>Skills that come up</h3><div class="tags">'+j.skills.map(s=>'<span class="tag">'+esc(s)+'</span>').join('')+'</div></section>'+listSection('Pay, perks & practical things',d.benefits,'Benefits and support vary. Check the employer’s posting for benefits, equipment, and any travel requirements.')+(resume.text?'<section class="detail-section"><h3>Where your skills overlap</h3><p>'+(shared.length?'You share these skills with the posting: '+esc(shared.join(', '))+'.':'We didn’t find exact skill matches. That doesn’t have to rule it out.')+'</p><p class="privacy">This is a shared-skill check, not an AI assessment or a hiring decision.</p></section>':'')+'</div><aside class="detail-sidebar"><h3>The useful details</h3>'+fact('Application deadline',j.deadline==='Not specified · check employer'?'No deadline listed. Check with the employer.':j.deadline)+fact('Employment type',j.term)+fact('Weekly hours',d.hours||'See the employer’s schedule')+fact('No-degree pathway',j.degreePolicy)+fact('State eligibility',j.locationNote)+fact('Work eligibility',j.eligibility?.find(s=>/export/i.test(s))||'Check U.S. work authorization and sponsorship rules with the employer.')+fact('Employer source checked',dateLabel(j.checked))+'<p class="privacy">Both criteria are checked against the employer posting. Open the source for the full experience, equipment, licensing, and state requirements.</p><div class="detail-toolbar"><button id="detailSave" class="secondary">'+(saved.includes(id)?'♥ Saved':'♡ Save for later')+'</button><button id="trackRole" class="secondary">'+(tracker[id]?'On my list ✓':'Track this one +')+'</button>'+(resumeFile?'<button id="detailDownload" class="text-button">Get my resume ↓</button>':'')+'</div></aside></div><div class="detail-bottom"><p class="privacy">Ready to give it a shot? Follow the source listing to complete the employer’s application. Opening the form doesn’t submit an application.</p><a id="applyLink" class="primary gold" target="_blank" rel="noopener noreferrer" href="'+esc(j.url)+'">Apply on employer’s site ↗</a></div>';
 $('#detailSave').onclick=()=>{toggleSave(id);$('#detailSave').textContent=saved.includes(id)?'♥ Saved':'♡ Save for later';};
 $('#trackRole').onclick=()=>{tracker[id]=tracker[id]||'Preparing';persist();$('#trackRole').textContent='On my list ✓';toast('Added to My applications. One step at a time.');};
 $('#applyLink').onclick=()=>{if(!tracker[id]||tracker[id]==='Preparing')tracker[id]='Opened employer form';persist();if(view==='applications')renderJobs();};if($('#detailDownload'))$('#detailDownload').onclick=downloadFile;
 $('#detailDialog').showModal();$('#detailDialog').scrollTop=0;
}
function info(){const rows=feed?.sources||[];$('#infoContent').innerHTML='<div class="eyebrow">TWO RULES. EVERY JOB.</div><h2 id="infoTitle">No degree. Work from home.</h2><p>Every listing must identify remote work and a published route that does not require a college degree: high school/GED accepted, a degree explicitly optional, or equivalent experience accepted. Silence about education is not enough.</p><p>No degree does not mean no experience, licenses, training, equipment, or work authorization. Those requirements still matter. Hybrid and office-required jobs are excluded.</p><h3>Where you live still matters.</h3><p>Choose your state to see matching remote opportunities. U.S.-remote listings without named restrictions are marked for state confirmation. Employer rules can change; confirm eligibility before applying.</p><h3>Fresh listings</h3><p>Connected sources are checked daily and hourly during visits. Removed jobs leave the catalog after a successful refresh. Failed sources keep their last good records for up to seven days, marked for recheck.</p>'+rows.map(s=>'<div class="source-row"><a target="_blank" rel="noopener noreferrer" href="'+esc(s.url)+'">'+esc(s.name)+' ↗</a><span>'+s.count+' jobs · '+(s.ok?'connected':'recheck needed')+'</span></div>').join('')+'<h3>Your resume stays here.</h3><p>Resume files, saved jobs, and application notes stay in this browser. Matching uses shared skills; it is not AI screening. Applying opens the employer’s official form. We never submit an application for you.</p><p class="privacy">Degree Free Jobs is an independent project. The design follows the owner’s EngIntern site.</p>';$('#infoDialog').showModal();}
$('#sourcesBtn').onclick=info;
let dbPromise;function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{let r=indexedDB.open('degreefreejobs-resume',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}))}async function fileStore(action,file){let d=await db();return new Promise((resolve,reject)=>{let tx=d.transaction('files',action==='get'?'readonly':'readwrite'),st=tx.objectStore('files'),r=action==='get'?st.get('resume'):action==='delete'?st.delete('resume'):st.put(file,'resume');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function loadFile(file){if(!file)return;if(file.size>10*1024*1024){toast('A little too big. Choose a resume under 10 MB.');return}let ext=file.name.split('.').pop().toLowerCase();if(!['pdf','docx','txt'].includes(ext)){toast('Try a PDF, Word (DOCX), or text file.');return}$('#fileStatus').textContent='Getting to know your resume…';$('#matchBtn').disabled=true;try{let text='';if(ext==='txt')text=await file.text();if(ext==='docx'){let result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});text=result.value}if(ext==='pdf'){let pdfjs=await import('/vendor/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.mjs';let doc=await pdfjs.getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;let pages=[];for(let i=1;i<=doc.numPages;i++){let page=await doc.getPage(i),content=await page.getTextContent();pages.push(content.items.map(x=>x.str).join(' '))}text=pages.join('\n')}if(text.trim().length<30)throw Error('We couldn’t read the text. If this is a scanned PDF, paste your resume below.');await fileStore('put',file);resumeFile=file;resume.name=file.name;$('#resumeText').value=text.slice(0,60000);$('#fileStatus').textContent='✓ '+file.name+' · Ready for review';$('#downloadResume').hidden=false;toast('Got it. Check the text, then let’s find some matches.')}catch(e){$('#fileStatus').textContent=e.message||'This file gave us trouble. You can paste your resume below instead.'}finally{$('#matchBtn').disabled=false}}
$('#resumeFile').onchange=e=>loadFile(e.target.files[0]);let zone=$('#dropzone');zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#resumeFile').click()}};zone.ondragover=e=>{e.preventDefault();zone.classList.add('drag')};zone.ondragleave=()=>zone.classList.remove('drag');zone.ondrop=e=>{e.preventDefault();zone.classList.remove('drag');loadFile(e.dataTransfer.files[0])};
$('#matchBtn').onclick=()=>{let text=$('#resumeText').value.trim();if(text.length<30){toast('Tell us a little more—your projects and coursework count, too.');return}resume.text=text.slice(0,60000);resume.skills=skillTerms.filter(s=>new RegExp('(^|[^a-z])'+s.replace(/[+]/g,'\\+')+'([^a-z]|$)','i').test(text));persist();$('#resumeDialog').close();setView('matches');toast(resume.skills.length+' skills found. Let’s see where they lead.')};
$('#removeResume').onclick=async()=>{await fileStore('delete');resumeFile=null;resume={text:'',skills:[],name:''};persist();$('#resumeText').value='';$('#fileStatus').textContent='Your resume has been removed from this device.';$('#downloadResume').hidden=true;renderJobs();toast('Your resume and its saved skills are gone from this device.')};function downloadFile(){if(!resumeFile)return;let url=URL.createObjectURL(resumeFile),a=document.createElement('a');a.href=url;a.download=resumeFile.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}$('#downloadResume').onclick=downloadFile;
async function loadJobs(force=false){
 $('#refreshBtn').disabled=true;$('#freshLabel').textContent='Checking openings…';
 try{
  const response=await fetch(force?'/api/refresh':'/api/jobs',{method:force?'POST':'GET'});if(!response.ok)throw Error('We couldn’t reach the job feeds. Give it another try.');
  feed=await response.json();jobs=feed.jobs;
  $('#total').textContent=jobs.length;$('#stateCount').textContent=new Set(jobs.flatMap(j=>j.states)).size;$('#employerCount').textContent=new Set(jobs.map(j=>j.company)).size;
  const failed=feed.sources.filter(s=>!s.ok).length;
  $('#freshLabel').textContent=failed?failed+' employer feed'+(failed===1?'':'s')+' need a recheck':'Sources checked';
  $('#freshTime').textContent=new Date(feed.updated).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const selected=$('#discipline').value;$('#discipline').innerHTML='<option value="">All job types</option>'+[...new Set(jobs.map(j=>j.discipline))].sort().map(d=>'<option>'+esc(d)+'</option>').join('');$('#discipline').value=selected;
  
  render();if(force)toast('All checked. You’re looking at the latest openings.');
 }catch(error){$('#freshLabel').textContent='We hit a connection snag';$('#freshTime').textContent='Try the refresh button';if(!feed){$('#cityHelp').textContent='We couldn’t reach the listings. Try again below.';$('#cities').innerHTML='<button id="retryFeed" class="secondary">Try again ↻</button>';$('#retryFeed').onclick=()=>loadJobs(true);}
if(!jobs.length)$('#jobs').innerHTML='<div class="empty"><strong>The job feeds aren’t answering.</strong>Try the refresh button above. We’ll be right here.</div>';toast(error.message);}
 finally{$('#refreshBtn').disabled=false;}
}
$('#refreshBtn').onclick=()=>loadJobs(true);
updateAddress();renderCities();renderJobs();
Promise.all([
 fetch('/vendor/states.json').then(r=>r.json()).then(data=>{geo=data;drawMap();}).catch(()=>{$('#map').innerHTML='<p class="privacy">The map didn’t load. You can still choose a state from the menu.</p>';setMapMode(false);}),
 loadJobs(),
 fileStore('get').then(file=>{resumeFile=file||null;}).catch(()=>{})
]);
setInterval(()=>{if(!document.hidden)loadJobs();},3600000);
// A restrained depth effect, with no animation on touch or reduced-motion devices.
const parallaxPreference=matchMedia('(min-width: 900px) and (hover: hover) and (prefers-reduced-motion: no-preference)');
let parallaxFrame=0;
function updateParallax(){
 parallaxFrame=0;
 const enabled=parallaxPreference.matches&&view==='explore';
 document.body.classList.toggle('parallax-enabled',enabled);
 const progress=enabled?Math.min(window.scrollY,300):0;
 document.documentElement.style.setProperty('--map-drift',Math.round(progress*.12)+'px');
 document.documentElement.style.setProperty('--title-drift',Math.round(progress*-.055)+'px');
}
function scheduleParallax(){if(!parallaxFrame)parallaxFrame=requestAnimationFrame(updateParallax);}
window.addEventListener('scroll',scheduleParallax,{passive:true});
window.addEventListener('resize',scheduleParallax,{passive:true});
parallaxPreference.addEventListener('change',scheduleParallax);
new MutationObserver(scheduleParallax).observe(document.body,{attributes:true,attributeFilter:['class']});
updateParallax();

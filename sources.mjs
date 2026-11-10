import{plain,extractPay}from'./details.mjs';
export const states={AL:'Alabama',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
export const sources=[['gh','encoura','Encoura'],['gh','oscar','Oscar Health'],['gh','frontlinewildfire','Frontline Wildfire Defense'],['gh','hoodhp','HP Hood'],['gh','ironmountainsolutions','IronMountain Solutions'],['gh','knock','Knock'],['gh','computergeneratedsolutions','CGS Group'],['gh','trace3','Trace3'],['gh','connectionshealthsolutions','Connections Health Solutions'],['lever','enablecomp','EnableComp'],['lever','kobie','Kobie Marketing'],['lever','cleanspark','CleanSpark'],['lever','bannerbank','Banner Bank']];
export const skillTerms=['customer service','customer support','communication','sales','data entry','excel','google sheets','microsoft office','typing','scheduling','administration','bookkeeping','billing','claims','insurance','troubleshooting','technical support','phone','email','chat','spanish','english','zendesk','salesforce','hubspot','computer','writing','editing','payroll','accounts payable','healthcare','medical','collections','remote','python','javascript','sql','project management'];
const degreeRx=/bachelor|master.?s? degree|associate.?s? degree|doctoral|doctorate|ph\.?d|\b(?:BS|BA|BSc|B\.S\.|B\.A\.)\b.*(?:degree|equivalent)|college degree|university degree/i;
export function degreePolicy(raw){
 const blocks=raw.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<\/(?:li|p|h[1-6]|div)>/gi,'\n').split(/\n|(?<=[.!?])\s+/).map(plain).filter(Boolean);
 let evidence=null;
 for(const line of blocks){
  if(/no (?:college |university )?degree (?:is )?required|degree (?:is )?not required|do not require.*degree/i.test(line)){evidence={type:'No degree required',text:'The employer explicitly says a college degree is not required.'};continue;}
  if(/high school (?:diploma|degree)|\bGED\b/i.test(line))evidence??={type:'High school / GED accepted',text:'The posting accepts a high school diploma or GED. A college degree is not listed as mandatory.'};
  if(degreeRx.test(line)){
   if(/(?:degree|education|bachelor.{0,35})[^.!?]{0,100}\bor\b[^.!?]{0,55}(?:equivalent|comparable|relevant|work|professional)\s*(?:work\s*)?experience|equivalent (?:combination of )?(?:education and )?experience[^.!?]{0,70}\b(?:degree|education)\b/i.test(line)){evidence??={type:'Experience instead of a degree',text:'The employer accepts equivalent experience as an alternative to the stated degree. Experience requirements still apply.'};continue;}
   if(/preferred|nice.to.have|a plus|optional|not (?:required|necessary)/i.test(line)&&!/required[^.!?]{0,20}(?:bachelor|master|associate)/i.test(line)){evidence??={type:'Degree optional / preferred',text:'A degree is preferred or optional rather than mandatory in the published qualification.'};continue;}
   return null;
  }
 }
 return evidence;
}
function namedStates(text){return Object.entries(states).filter(([s,n])=>new RegExp('\\b'+n+'\\b','i').test(text)||new RegExp('(?:^|[,&;/()\\s-])'+s+'(?=$|[,&;/()\\s-])').test(text)).map(([s])=>s);}
export function geography(location,text){
 if(/Canada|Australia|United Kingdom|\bUK\b|India|Philippines|Mexico|Europe|Ireland/i.test(location)&&!/United States|\bUSA?\b/.test(location))return{states:[],note:'Outside U.S. eligibility.'};
 const local=namedStates(location);if(local.length)return{states:local,note:'Location eligibility listed by the employer: '+local.map(s=>states[s]).join(', ')+'.'};
 const restricted=text.match(/(?:must (?:live|reside|be located)|open to candidates who reside|eligible (?:in|states)|approved states|only (?:hiring|hire)|reside in one of)[^.!?]{0,500}/ig)||[];
 for(const line of restricted){const specific=namedStates(line);if(specific.length)return{states:specific,note:'Residence restrictions apply. Review the employer posting before applying.'};}
 if(!/\b(?:US|USA|U\.S\.|United States|America)\b/i.test(location+' '+text.slice(0,1800)))return{states:[],note:'U.S. state eligibility is not clear; confirm with the employer.'};
 let eligible=Object.keys(states);const exclusions=text.match(/(?:cannot (?:hire|work)|not (?:hiring|available|eligible)|excluding|except|not (?:be )?(?:located|reside))[^.!?]{0,250}/ig)||[];
 for(const line of exclusions){const excluded=namedStates(line);eligible=eligible.filter(s=>!excluded.includes(s));}
 return{states:eligible,note:'Posted as U.S. remote. Confirm your state with the employer; location rules can change.'};
}
export function qualify(j,src){
 const gh=src[0]==='gh',title=gh?j.title:j.text,location=gh?j.location?.name:j.categories?.location;
 const raw=gh?j.content:(j.description||j.descriptionPlain||'')+' '+(j.lists||[]).map(x=>'<h3>'+x.text+'</h3>'+x.content).join(' '),text=plain(raw||'');
 if(!title||!location||/test job|sandbox|talent community|talent pool/i.test(title))return null;
 if(/hybrid|on.?site/i.test(location+' '+title)||/this (?:is|role is|position is) (?:not remote|on.?site)|required to (?:work|be) (?:in.office|on.?site)|in.office requirement|must (?:work|be) on.?site/i.test(text))return null;
 const remote=/remote|work from home/i.test(location+' '+title)||j.workplaceType==='remote'||/this is a remote (?:position|role)|this (?:role|position) is (?:fully )?remote|fully remote|100% remote|work from home|work.from.home|work arrangement[^.]{0,40}remote/i.test(text);
 if(!remote)return null;
 const degree=degreePolicy(raw||'');if(!degree)return null;
 const geo=geography(location,text);
 // No country assumptions: unclear-U.S. jobs stay out of this U.S. collection.
 if(!geo.states.length)return null;
 const deadline=text.match(/(?:application deadline|apply by|applications? close(?:s)?(?: on)?):?\s*([A-Za-z]+\s+\d{1,2},?\s+20\d\d|20\d\d-\d\d-\d\d)/i)?.[1];if(deadline&&Date.parse(deadline)+86400000<Date.now())return null;
 const discipline=/customer|member service|call center|concierge/i.test(title)?'Customer support':/sales|account (?:executive|manager)|business development/i.test(title)?'Sales':/billing|claims|medical|credential|revenue|denial/i.test(title)?'Healthcare & billing':/accounting|bookkeep|payroll|financial|credit|loan/i.test(title)?'Finance & admin':/technical|service desk|help desk|IT |engineer|software/i.test(title)?'Technical support & IT':/data|analyst/i.test(title)?'Data & operations':/writing|editor|content|marketing/i.test(title)?'Writing & marketing':'Operations & admin';
 const schedule=/part[ -]?time/i.test(title+' '+(j.categories?.commitment||'')+' '+text.slice(0,1500))?'Part-time':/full[ -]?time/i.test(title+' '+(j.categories?.commitment||'')+' '+text.slice(0,1500))?'Full-time':/\bcontract(?:or)?\b|\bfreelance\b/i.test(j.categories?.commitment||'')||/\bcontractor\b|\bfreelance\b|\(contract\)/i.test(title)?'Contract':'Schedule not listed';
 const experience=text.match(/\b(\d+(?:\s*[-–+]\s*\d+|\+)?)\s*(?:years?|yrs?)\s+(?:of )?(?:relevant |professional |related |previous |customer service |work )?experience/i)?.[1];
 const skills=skillTerms.filter(s=>new RegExp('(^|[^a-z])'+s+'([^a-z]|$)','i').test(text));
 return{id:src[1]+'-'+j.id,source:src[1],company:src[2],title,city:'Work from home',states:geo.states,stateSummary:geo.states.length===48?'U.S. remote · confirm your state':geo.states.length?geo.states.join(', '):'Confirm state eligibility',discipline,skills,term:schedule,employmentType:schedule,pay:extractPay(text,j.salaryRange),degreePolicy:degree.type,degreeEvidence:degree.text,remoteEvidence:'The posting identifies this role as remote or work from home.',locationNote:geo.note,details:{arrangement:'Work from home',requirements:[degree.text,experience?'Relevant experience: approximately '+experience+' years; see the full posting for the specific field.':'Check the employer’s experience and skill requirements.',geo.note],hours:schedule==='Part-time'?'Part-time; exact hours on employer posting':'See employer schedule',benefits:[]},deadline:deadline||'Not specified · check employer',url:gh?j.absolute_url:j.hostedUrl,summary:'A work-from-home role with a published path that does not require a college degree. Experience, equipment, licensing, and state restrictions may still apply.',eligibility:[degree.text,geo.note],checked:new Date().toISOString()};
}
export async function readSource(src){const url=src[0]==='gh'?'https://boards-api.greenhouse.io/v1/boards/'+src[1]+'/jobs?content=true':'https://api.lever.co/v0/postings/'+src[1]+'?mode=json';const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json(),rows=src[0]==='gh'?d.jobs:d;if(!Array.isArray(rows))throw Error('Invalid employer feed');return rows.map(j=>qualify(j,src)).filter(Boolean);}

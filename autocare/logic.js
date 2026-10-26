var RC=(function(){
var TYPES=['Oil change','Tire rotation','Tires','Brakes','Battery','Air filter','Cabin filter','Wiper blades','Transmission fluid','Coolant','Spark plugs','Inspection','Registration renewal','Insurance renewal','Car wash','Other'];
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function days(a,b){return Math.round((Date.parse(b)-Date.parse(a))/864e5);}
function addDays(d,n){var t=new Date(Date.parse(d)+n*864e5);return t.toISOString().slice(0,10);}
function defaults(){return {vehicles:[],logs:[],reminders:[],cur:null};}
function desc(v){return [v.year,v.make,v.model].filter(Boolean).join(' ');}
function addVehicle(db,v){v.id=uid();db.vehicles.push(v);db.cur=v.id;var o=+v.odo||0,t=today();
 db.reminders.push({id:uid(),vid:v.id,type:'Oil change',miles:5000,days:180,lastOdo:o,lastDate:t},
  {id:uid(),vid:v.id,type:'Tire rotation',miles:7500,days:0,lastOdo:o,lastDate:t},
  {id:uid(),vid:v.id,type:'Registration renewal',miles:0,days:365,lastOdo:o,lastDate:t});return v;}
function status(r,odo,now){now=now||today();var res={state:'ok',milesLeft:null,daysLeft:null};
 if(r.miles>0){res.milesLeft=r.lastOdo+r.miles-odo;}
 if(r.days>0){res.daysLeft=days(now,addDays(r.lastDate,r.days));}
 var over=(res.milesLeft!==null&&res.milesLeft<=0)||(res.daysLeft!==null&&res.daysLeft<=0);
 var soon=(res.milesLeft!==null&&res.milesLeft<=Math.max(500,r.miles*0.1))||(res.daysLeft!==null&&res.daysLeft<=Math.max(7,r.days*0.1));
 res.state=over?'overdue':soon?'due':'ok';return res;}
function addLog(db,e){e.id=uid();db.logs.push(e);var v=db.vehicles.find(function(x){return x.id===e.vid});
 if(v&&e.odo>v.odo)v.odo=e.odo;
 db.reminders.forEach(function(r){if(r.vid===e.vid&&r.type===e.type){r.lastOdo=e.odo;r.lastDate=e.date;}});return e;}
function totals(db,vid){var t={all:0,year:0,count:0,byType:{}},y=today().slice(0,4);
 db.logs.forEach(function(l){if(l.vid!==vid)return;var c=+l.cost||0;t.all+=c;t.count++;if(l.date.slice(0,4)===y)t.year+=c;t.byType[l.type]=(t.byType[l.type]||0)+c;});return t;}
function validate(o){return o&&Array.isArray(o.vehicles)&&Array.isArray(o.logs)&&Array.isArray(o.reminders)&&!!o&&Array.isArray(o.vehicles);}
return {TYPES:TYPES,uid:uid,today:today,addDays:addDays,defaults:defaults,desc:desc,addVehicle:addVehicle,status:status,addLog:addLog,totals:totals,validate:validate};
})();
if(typeof module!=='undefined')module.exports=RC;

var fs = require('fs');
var http = require('http');

var rt = { hostname: 'localhost', port: 8008 };
var fl = { hostname: '127.0.0.1', port: 8080 };
//var flowkeys = 'ipsource,ipdestination,udpsourceport,udpdestinationport';
var flowkeys = 'ipsource,ipdestination,tcpsourceport,tcpdestinationport';
//var udpflowkeys = 'ipsource,ipdestination,udpsourceport,udpdestinationport';
var threshold = 1000000; 

var insertsigflowcount =0;
var insertmicroflowcount = 0;

var idx = 0;

var links = {};

// mininet mapping between sFlow ifIndex numbers and switch/port names
var ifindexToPort = {};
var switchlist = {};
var path = '/sys/devices/virtual/net/';
var devs = fs.readdirSync(path);
for(var i = 0; i < devs.length; i++) {
 var dev = devs[i];
 var parts = dev.match(/(.*)-(.*)/);
 if(!parts) continue;

 var ifindex = fs.readFileSync(path + dev + '/ifindex');
 ifindex = parseInt(ifindex).toString();
 var port = {'switch':parts[1],'port':dev};
 ifindexToPort[ifindex] = port;
 var switchID = {'switch':parts[1]};
 switchlist[ifindex] = switchID;
}

function extend(destination, source) {
 for (var property in source) {
  if (source.hasOwnProperty(property)) {
   destination[property] = source[property];
  }
 }
 return destination;
}

function jsonGet(target,path,callback) {
 var options = extend({method:'GET',path:path},target);
 var req = http.request(options,function(resp) {
  var chunks = [];
  resp.on('data', function(chunk) { chunks.push(chunk); });
  resp.on('end', function() { callback(JSON.parse(chunks.join(''))); });
  });
  req.end();
};

function jsonPut(target,path,value,callback) {
 var options = extend({method:'PUT',headers:{'content-type':'application/json'},path:path},target);
 var req = http.request(options,function(resp) {
  var chunks = [];
  resp.on('data', function(chunk) { chunks.push(chunk); });
  resp.on('end', function() { callback(chunks.join('')); });
 });
 req.write(JSON.stringify(value));
 req.end();
};


function jsonPost(target,path,value,callback) {
 var options = extend({method:'POST',headers:{'content-type':'application/json'},path:path},target);
 var req = http.request(options,function(resp) {
  var chunks = [];
  resp.on('data', function(chunk) { chunks.push(chunk); });
  resp.on('end', function() { callback(chunks.join('')); });
 });
 req.write(JSON.stringify(value));
 req.end();
}

function jsonPostFlow(target,path,value,callback) {
 var options = extend({method:'POST',headers:{'content-type':'application/json','Accept': 'application/json',},path:path},target);
 var req = http.request(options,function(resp) {
  var chunks = [];
  resp.on('data', function(chunk) { chunks.push(chunk); });
  resp.on('end', function() { callback(chunks.join('')); });
 });
 req.write(JSON.stringify(value));
 req.end();
}

 //unique flowname and auto-generated
//insert flow through Floodlight
function insertFlow(swdpid, flowName,outPort,tablenum, topKey){ 
  var parts = topKey.split(',');
  var message = {"switch":swdpid,
 	   	  "name": flowName,
		  "cookie":"0",
		  "table": tablenum,
		  "eth_type":"0x800",
		  "ip_proto":"0x6",
		  "ipv4_src":"10.0.0.4",
		  "ipv4_dst":"10.0.0.1",
		  "active":"true",
		  "actions":"output=" +outPort +""
		};
  console.log("message=" + JSON.stringify(message));
  jsonPostFlow(fl,'/wm/staticflowpusher/json', message,
     function(response) {
	console.log("result=" + JSON.stringify(response))
      });

}

function insertFlow2(swdpid, flowName,outPort,tablenum, topKey){ 
  var parts = topKey.split(',');
  var message = {"switch":swdpid,
 	   	  "name": flowName,
		  "cookie":"0",
		  "eth_type": "0x800",
		  "ip_proto":"0x6",
		  "ipv4_src":"10.0.0.1",
		  "ipv4_dst":"10.0.0.4",
		  "table":tablenum,
		  "active":"true",
		  "actions":"output=" +outPort +""
		};
  console.log("message=" + JSON.stringify(message));
  jsonPostFlow(fl,'/wm/staticflowpusher/json', message,
     function(response) {
	console.log("result=" + JSON.stringify(response))
      });

}

function getLinkRecord(agent,ifindex) {
 var linkkey = agent + ">" + ifindex;
 var rec = links[linkkey];
 if(!rec) {
  rec = {agent:agent, ifindex:ifindex, port:ifindexToPort[ifindex]};
  links[linkkey] = rec;
 }
 return rec;
}

function getSwitchNum(ifindex) {
 var linkkey = ifindex;
 var recSwitch = links[linkkey];
 if(!recSwitch) {
  recSwitch = {switchid:switchlist[ifindex]};
  links[linkkey] = recSwitch;
 }
 return recSwitch;
}


function updateLinkLoads(metrics) {  
 for(var i = 0; i < metrics.length; i++) {
  var metric = metrics[i];
  var rec = getLinkRecord(metric.agent,metric.dsIndex);
  rec.total = metric.metricValue;


 }
}

//function largeFlow(link,flowKey,now,dt) {
//function largeFlow(link,flowKey,flowValue,now,dt) {
function printFlow(link,flowKey,flowValue,now,topKey) {
 var parts = topKey.split(',');
 
 console.log(now + " " + " " + link.port.port + " " + flowKey + " " + "value:  "+ flowValue);
 console.log("ipsource: " +parts[0]);
}

function getSwitchID(link){
 console.log("detecting switch " + link.switchid.switch);
 var sw = link.switchid.switch;
 var swInNum = sw.replace( /\D+/g, '');
 //console.log("Detecting Switch No. : " + swInNum );
 var dpid = "00:00:00:00:00:00:00:0" + swInNum ;
 console.log("DPID : " + dpid );
 return dpid;
 /*
 if (typeof sw === 'string'){
   console.log(" String!!!");
 } */

}

/*
function getEvents(id) {
 console.log( "id before jsonget " + id  );
 jsonGet(rt,'/events/json?maxEvents=10&timeout=60&eventID='+ id,
  function(events) {
   var nextID = id;
    console.log( "ID : " + nextID  );
   if(events.length > 0) {
    nextID = events[0].eventID;
    events.reverse();
    var now = (new Date()).getTime();
    console.log( " before for loop " );

    for(var i = 0; i < events.length; i++) {
     var evt = events[i];  	
     var dt = now - evt.timestamp;   //timestamp is num of millisec since Jan 1 1970
     console.log( "now: " + now ); 
     console.log( " inside for loop " );

     if('detail' == evt.thresholdID
	&& Math.abs(dt) < 5000) {
       // && Math.abs(dt) < 5000) { //5000 ms equivalent to 5sec
      var flowKey = evt.flowKey;
      var flowValue = evt.value.toFixed(2); //get value in bytes from event
      var rec = getLinkRecord(evt.agent,evt.dataSource);
      largeFlow(rec,flowKey,flowValue,now,dt);

      console.log( " if statement " );
     }
    }
   }
   getEvents(nextID);
  }
 );
}

*/
// flowkeys => 'ipsource,ipdestination,tcpsourceport,tcpdestinationport';
function setEventHandler(evt) {
 var agent = evt.agent;
 /*var ports = ofInterfaceToPort(agent);
 if(ports && ports.length == 1) {
  var dpid = ports[0].dpid;*/
  var id = "add" + idx++;
  var k = evt.flowKey.split(',');
  var rule1= {
   priority:32768, idleTimeout:0, in_port:2,
   match:{nw_src:k[0], nw_dst:k[1],tp_src:k[2], tp_dest:k[3]},
   actions:{actions:output=3}
  };
  var rule2= {
   priority:32768, idleTimeout:0,in_port:3,
   match:{nw_src:k[1], nw_dst:k[0],tp_src:k[3], tp_dest:k[2]},
   actions:{actions:output=2}
  };
  var rule3= {
   priority:32768, idleTimeout:0,in_port:3,
   match:{nw_src:k[0], nw_dst:k[1],tp_src:k[2], tp_dest:k[3]},
   actions:{actions:output=1}
  };
  var rule4= {
   priority:32768, idleTimeout:0,in_port:1,
   match:{nw_src:k[1], nw_dst:k[0],tp_src:k[3], tp_dest:k[2]},
   actions:{actions:output=3}
  };
  var rule5= {
   priority:32768, idleTimeout:0,in_port:2,
   match:{nw_src:k[0], nw_dst:k[1],tp_src:k[2], tp_dest:k[3]},
   actions:{actions:output=1}
  };
  var rule6= {
   priority:32768, idleTimeout:0,in_port:1,
   match:{nw_src:k[1], nw_dst:k[0],tp_src:k[3], tp_dest:k[2]},
   actions:{actions:output=2}
  };
  setOfRule("00:00:00:00:00:00:00:04",id,rule1);
  setOfRule("00:00:00:00:00:00:00:04",id,rule2);
  setOfRule("00:00:00:00:00:00:00:03",id,rule3);
  setOfRule("00:00:00:00:00:00:00:03",id,rule4);
  setOfRule("00:00:00:00:00:00:00:01",id,rule5);
  setOfRule("00:00:00:00:00:00:00:01",id,rule6);
 //}
}


function getFlows(event, rec, recSwitch) {
  jsonGet(rt,'/metric/' + event.agent + '/' + event.dataSource + '.' + event.metric + '/json',
    function(metrics) {
      if(metrics && metrics.length == 1) {

        var metric = metrics[0];
        if(metric.metricValue > threshold
           && metric.topKeys
           && metric.topKeys.length > 0) {
            
	     console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++" );
	     console.log(" above threshold " );
	    var now = (new Date()).getTime();
            var topKey = metric.topKeys[0].key;
	    var flowValue = metric.topKeys[0].value.toFixed(2);
	    printFlow(rec,topKey, flowValue,now,topKey);
	    //console.log("metricValue " + metric.metricValue.toFixed(2));
	    console.log(" significant flow " + flowValue);
            var swID= getSwitchID(recSwitch);
	   /* flow start from client once......*/
	   
	     if(insertsigflowcount ==0 ) {

	        insertFlow("00:00:00:00:00:00:00:01", "flow_mod_1","1", "1", topKey);
		insertFlow2("00:00:00:00:00:00:00:01", "flow_mod_2","2", "1",topKey);
	        insertFlow("00:00:00:00:00:00:00:03", "flow_mod_3","1", "1",topKey);
		insertFlow2("00:00:00:00:00:00:00:03", "flow_mod_4","3", "1",topKey);
		insertFlow("00:00:00:00:00:00:00:04", "flow_mod_5","3", "1", topKey);
		insertFlow2("00:00:00:00:00:00:00:04", "flow_mod_6","2", "1", topKey);
 		insertsigflowcount++;
            } 
		console.log("sig flow count " + insertsigflowcount);	   

	    /* modify flow so that it go to changed data path above */

        }
         
	else if( metric.metricValue < threshold
           && metric.topKeys
           && metric.topKeys.length > 0) { 
	
	    console.log("-----------------------------------------------------" );
	    console.log(" below threshold " );
	    var now = (new Date()).getTime();
            var topKey = metric.topKeys[0].key;
	    var flowValue = metric.topKeys[0].value.toFixed(2);
	   // console.log("metricValue " + metric.metricValue.toFixed(2));
             console.log(" micro flow "+ flowValue);
	    printFlow(rec,topKey, flowValue,now,topKey);
            var swID= getSwitchID(recSwitch);
	   /*try insert only once......*/
	     if(insertmicroflowcount ==0 ) {        
	        insertFlow("00:00:00:00:00:00:00:01", "flow_mod_7","1","2", topKey);
		insertFlow2("00:00:00:00:00:00:00:01", "flow_mod_8","3", "2", topKey);
	        insertFlow("00:00:00:00:00:00:00:02", "flow_mod_9","3", "2", topKey);
		insertFlow2("00:00:00:00:00:00:00:02", "flow_mod_10","2", "2", topKey);
		insertFlow("00:00:00:00:00:00:00:04", "flow_mod_11","1", "2", topKey);
		insertFlow2("00:00:00:00:00:00:00:04", "flow_mod_12","2", "2", topKey);
		 insertmicroflowcount++;
             } 
 	      console.log("micro flow count " + insertmicroflowcount);
         	

	    /* modify flow so that it go to changed data path above*/

         }//end else if
	 else{
            console.log("###########################################" );
	    console.log(" top key undefined ");
	    console.log("###########################################" );
	   return ;
          }// end else

      }
    }
  );  
          //insertsigflowcount =0;
	  //insertmicroflowcount =0;
}

function getEvents(id) {
  jsonGet(rt,'/events/json?maxEvents=10&timeout=60&eventID='+ id,
    function(events) {
      var nextID = id;
      if(events.length > 0) {
        nextID = events[0].eventID;
	console.log( "\t");
	console.log(" eventID "+ nextID);
        events.reverse();
        for(var i = 0; i < events.length; i++) {
          if('detail' == events[i].thresholdID) {
	        //var flowValue = events[i].value.toFixed(2); //get value in bytes from event
                var rec = getLinkRecord(events[i].agent,events[i].dataSource);
  	        var recSwitch = getSwitchNum(events[i].dataSource);
		getFlows(events[i],  rec, recSwitch);
	  }
        }
      }
      console.log( "\t");
      getEvents(nextID);  
    }
  );
}


function startMonitor() {
 getEvents(-1);
 setInterval(function() {
  //jsonGet(rt,'/dump/ALL/ALL/json', updateLinkLoads)
  jsonGet(rt,'/dump/ALL/total/json', updateLinkLoads)
 }, 1000);//interval of 1000millisecs
}

function setTotalFlows() {
 jsonPut(rt,'/flow/total/json',
  {value:'bytes',filter:'outputifindex!=discard&direction=ingress', t:200},
  function() { setDetailedFlows(); }
 );
}

function setDetailedFlows() {
 jsonPut(rt,'/flow/detail/json',
  {
   keys:flowkeys,
   value:'bytes',filter:'outputifindex!=discard&direction=ingress',
   n:10,
   t:2
  },
  function() { setThreshold(); }
 );
}


function setThreshold() {
 jsonPut(rt,'/threshold/detail/json',
  {
   metric:'detail',
   value: threshold, //bits per sec
   byFlow: true
  },
  function() { startMonitor(); }
 );
}

function initialize() {
 setTotalFlows();
}

initialize();

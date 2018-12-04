var fs = require('fs');
var http = require('http');

var rt = { hostname: 'localhost', port: 8008 };
var flowkeys = 'ipsource,ipdestination,udpsourceport,udpdestinationport';
var threshold = 125000; 

var links = {};

// mininet mapping between sFlow ifIndex numbers and switch/port names
var ifindexToPort = {};
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

function getLinkRecord(agent,ifindex) {
 var linkkey = agent + ">" + ifindex;
 var rec = links[linkkey];
 if(!rec) {
  rec = {agent:agent, ifindex:ifindex, port:ifindexToPort[ifindex]};
  links[linkkey] = rec;
 }
 return rec;
}

function updateLinkLoads(metrics) {  
 for(var i = 0; i < metrics.length; i++) {
  var metric = metrics[i];
  var rec = getLinkRecord(metric.agent,metric.dsIndex);
  rec.total = metric.metricValue;


 }
}

function largeFlow(link,flowKey,now,dt) {
//function largeFlow(link,flowKey,flowValue,now,dt) {
//function printFlow(link,flowKey,flowValue,now) {
 //console.log(now + " " + " " + link.port.port + " " + flowKey + " " + "value:  "+ flowValue);
  console.log(now + " " + " " + link.port.port + " " + flowKey);
}


function getEvents(id) {
 //console.log( "id before jsonget " + id  );
 jsonGet(rt,'/events/json?maxEvents=10&timeout=60&eventID='+ id,
  function(events) {
   var nextID = id;
    //console.log( "ID : " + nextID  );
   if(events.length > 0) {
    nextID = events[0].eventID;
    events.reverse();
    var now = (new Date()).getTime();
    console.log( " before for loop " );

    for(var i = 0; i < events.length; i++) {
     var evt = events[i];  	
     var dt = now - evt.timestamp;   //timestamp is num of millisec since Jan 1 1970
     //console.log( "now: " + now ); 
     //console.log( " inside for loop " );

     if('detail' == evt.thresholdID
	&& Math.abs(dt) < 5000) {
       // && Math.abs(dt) < 5000) { //5000 ms equivalent to 5sec
      var flowKey = evt.flowKey;
      var flowValue = evt.value.toFixed(2); //get value in bytes from event
      var rec = getLinkRecord(evt.agent,evt.dataSource);
      largeFlow(rec,flowKey,now,dt);

      console.log( " if statement " );
     }
    }
   }
   getEvents(nextID);
  }
 );
}


/*
function getFlows(event, rec) {
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
	    //printFlow(rec,topKey, flowValue,now);
	    //console.log("metricValue " + metric.metricValue.toFixed(2));
	    console.log(" significant flow " + flowValue);
        }
	else{
		console.log("-----------------------------------------------------" );
	    console.log(" below threshold " );
	    var now = (new Date()).getTime();
            var topKey = metric.topKeys[0].key;
	    var flowValue = metric.topKeys[0].value.toFixed(2);
	   // console.log("metricValue " + metric.metricValue.toFixed(2));
             console.log(" micro flow "+ flowValue);
	    //printFlow(rec,topKey, flowValue,now);
           }//end else
        
      }
    }
  );  
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
		getFlows(events[i],  rec);
	  }
        }
      }
      console.log( "\t");
      getEvents(nextID);  
    }
  );
}
*/

function startMonitor() {
 getEvents(-1);
 setInterval(function() {
  //jsonGet(rt,'/dump/ALL/ALL/json', updateLinkLoads)
  jsonGet(rt,'/dump/ALL/total/json', updateLinkLoads)
 }, 1000);//interval of 1000millisecs
}

function setTotalFlows() {
 jsonPut(rt,'/flow/total/json',
  {value:'bytes',filter:'outputifindex!=discard&direction=ingress', t:2},
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
   value: threshold,
   byFlow: true
  },
  function() { startMonitor(); }
 );
}

function initialize() {
 setTotalFlows();
}

initialize();

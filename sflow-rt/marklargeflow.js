var flowkeys = 'ipsource,ipdestination';
var value = 'bytes';
var filter = 'direction=ingress';

var trigger = 100000;
var release = 100;

var tos = '0x4';

var metricName = 'mark';
var id = 0;
var controls = {};
var enabled = true;

var collectorIP = "127.0.0.1";
var collectorPort = 6343;

// Floodlight OpenFlow Controller REST API
var floodlight = 'http://127.0.0.1:8080/';
var listswitches = floodlight+'wm/core/controller/switches/json';
var flowpusher = floodlight+'wm/staticflowentrypusher/json';
var clearflows = floodlight+'wm/staticflowentrypusher/clear/all/json'; 

function clearOpenFlow() {
  http(clearflows);
}

function setOpenFlow(spec) {
  http(flowpusher, 'post','application/json',JSON.stringify(spec));
}

function deleteOpenFlow(spec) {
  http(flowpusher, 'delete','application/json',JSON.stringify(spec));
}

var agents = {};
function discoverAgents() {
  var res = http(listswitches);
  var dps = JSON.parse(res);
  for(var i = 0; i < dps.length; i++) {
    var dp = dps[i];
    var agent = dp.inetAddress.match(/\/(.*):/)[1];
    var ports = dp.ports;
    var nameToNumber = {};
    var names = [];
    // get ifName to OpenFlow port number mapping
    // and list of OpenFlow enabled ports
    for (var j = 0; j < dp.ports; j++) {
      var port = dp.ports[j];
      var name = port.name.match(/^port (.*)$/)[1];
      names.push(name);
      nameToNumber[name] = port.portNumber;
    }
    agents[agent] = {dpid:dp.dpid,names:names,nameToNumber:nameToNumber}; 
  }
}

function initializeAgent(agent) {
  var rec = agents[agent];
  var server = new ALUServer(agent,user,password);
  rec.server = server;

  var ports = rec.names.join(' ');

  server.login();

  // configure sFlow
  server.runCmds([
    'sflow agent ip ' + agent,
    'sflow receiver 1 name InMon address '+collectorIP+' udp-port '+collectorPort,
    'sflow sampler 1 port '+ports+' receiver 1 rate '+sampling,
    'sflow poller 1 port '+ports+' receiver 1 interval '+polling
  ]);

  // get ifIndex to ifName mapping
  var res = server.rest('get','mib','ifXTable',{mibObject0:'ifName'});
  var rows = res.result.data.rows;
  var ifIndexToName = {};
  for(var ifIndex in rows) ifIndexToName[ifIndex] = rows[ifIndex].ifName;

  server.logout();

  agents[agent].ifIndexToName = ifIndexToName;
}

function mark(agent,dataSource,flowkey) {
  if(controls[flowkey]) return;

  var rec = agents[agent];
  if(!rec) return;

  var name = 'ctl' + id++;
  var parts = flowkey.split(',');
  setOpenFlow({name:name,switch:rec.dpid,cookie:0,
               priority:500,active:true,
               'ether-type':'0x0800','src-ip':parts[0],'dst-ip':parts[1],
               actions:'set-tos-bits='+tos+',output=normal'});

    controls[flowkey] = { 
 name: name, 
 agent:agent,
        dataSource:dataSource,
 action:'mark', 
 time: (new Date()).getTime() 
    };
}

function unmark(flowkey) {
  if(!controls[flowkey]) return;

  deleteOpenFlow({name:controls[flowkey].name});
  delete controls[flowkey];
}

discoverAgents();

for(var agent in agents) {
    initializeAgent(agent);
}
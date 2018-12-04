// author: InMon
// version: 1.0
// date: 12/12/2013
// description: Startup settings

// Define large flow as greater than 1Mbits/sec for 1 second or longer
//var bits_per_second = 1000000*8
//var duration_seconds = 1;
//var idx =0;

setGroups('default',
{
  external:['0.0.0.0/0','::/0'],
  private:['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','FC00::/7'],
  multicast:['224.0.0.0/4']
});

//setFlow('flow',{keys:'ipsource,ipdestination,direction,inputifindex,outputifindex,ipid,ipprotocol',value:'bytes',log:true});

//setFlow('flow',{keys:'ipsource,ipdestination,direction,inputifindex,outputifindex',filter:'direction=ingress',value:'bytes',log:true});
setFlow('tcp',{keys:'ipsource,ipdestination,tcpsourceport,tcpdestinationport',filter:'direction=ingress', value:'bytes', t:duration_seconds});

//setThreshold('flow',{metric:'flow',value:1000000});
setThreshold('significant',{metric:'tcp',value:bits_per_second, byFlow:true, timeout:5})

/*
setEventHandler(function(evt) {
 var agent = evt.agent;
 var ports = ofInterfaceToPort(agent.ifindex);
 if(ports && ports.length == 1) {
 var dpid = ports[0].dpid;
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
  setOfRule('00:00:00:00:00:00:00:04',id,rule1);
  setOfRule('00:00:00:00:00:00:00:04',id,rule2);
  setOfRule('00:00:00:00:00:00:00:03',id,rule3);
  setOfRule('00:00:00:00:00:00:00:03',id,rule4);
  setOfRule('00:00:00:00:00:00:00:01',id,rule5);
  setOfRule('00:00:00:00:00:00:00:01',id,rule6);
  //setOfRule(dpid,id,rule);
 }
},['significant']);
*/

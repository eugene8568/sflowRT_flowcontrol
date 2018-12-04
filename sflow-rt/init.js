// author: InMon
// version: 1.0
// date: 12/12/2013
// description: Startup settings

// Define large flow as greater than 1Mbits/sec for 1 second or longer

setGroups('default',
{
  external:['0.0.0.0/0','::/0'],
  private:['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','FC00::/7'],
  multicast:['224.0.0.0/4']
});

setFlow('pair',{keys:'ipsource,ipdestination,tcpsourceport,tcpdestinationport',value:'bytes',filter:'outputifindex!=discard&direction=ingress'});

//setFlow('inuti',{keys:'ifinutilization',value:'bytes'});
//setFlow('tcp',{keys:'ipsource,ipdestination,tcpsourceport,tcpdestinationport',filter:'direction=ingress', value:'bytes', t:duration_seconds});

//setThreshold('inutilization',{metric:'ifinutilization',value:80});
//setThreshold('oututilization',{metric:'ifoututilization',value:80});
//setThreshold('significant',{metric:'tcp',value:bits_per_second, byFlow:true, timeout:5})

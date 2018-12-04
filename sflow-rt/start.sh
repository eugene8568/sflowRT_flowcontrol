#!/bin/sh

sudo ovs-vsctl -- --id=@sflow create sflow agent=eth0 target=\"127.0.0.1:6343\" sampling=2000 polling=20 -- -- set bridge s1 sflow=@sflow -- set bridge s2 sflow=@sflow -- set bridge s3 sflow=@sflow -- set bridge s4 sflow=@sflow

HOME=`dirname $0`
cd $HOME

JAR="./lib/sflowrt.jar"
JVM_OPTS="-Xms200M -Xmx200M -XX:+UseG1GC -XX:MaxGCPauseMillis=100"
RT_OPTS="-Dsflow.port=6343 -Dhttp.port=8008"
SCRIPTS="-Dscript.file=init.js"

exec java ${JVM_OPTS} ${RT_OPTS} ${SCRIPTS} -jar ${JAR}


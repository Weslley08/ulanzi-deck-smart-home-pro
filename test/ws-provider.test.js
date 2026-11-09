import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {HomeAssistantProvider} from '../src/ha-provider.js';
class FakeSocket extends EventEmitter {
  static sockets=[];
  constructor(url,options) {super();this.url=url;this.options=options;this.readyState=1;this.sent=[];FakeSocket.sockets.push(this);}
  send(data){this.sent.push(JSON.parse(data));}
  close(){this.readyState=3;this.emit('close');}
  receive(msg){this.emit('message',JSON.stringify(msg));}
}
test('auth handshake, subscribe, confirmed event and close',()=>{
  FakeSocket.sockets=[];
  const p=new HomeAssistantProvider({url:'https://ha.example',token:'secret',WebSocketImpl:FakeSocket});
  let state;
  p.subscribe(s=>state=s.state);
  p.connect();
  const ws=FakeSocket.sockets[0];
  assert.equal(ws.url,'wss://ha.example/api/websocket');
  assert.equal(ws.options.followRedirects,false);
  ws.receive({type:'auth_required'});
  assert.deepEqual(ws.sent[0],{type:'auth',access_token:'secret'});
  ws.receive({type:'auth_ok'});
  assert.equal(ws.sent[1].type,'subscribe_events');
  ws.receive({type:'event',event:{data:{new_state:{entity_id:'light.desk',state:'on'}}}});
  assert.equal(state,'on');
  assert.equal(p.getState('light.desk').state,'on');
  p.close();
});
test('auth_invalid stops automatic reconnect',()=>{
  FakeSocket.sockets=[];
  const p=new HomeAssistantProvider({url:'https://ha.example',token:'invalid',WebSocketImpl:FakeSocket});
  p.connect();
  FakeSocket.sockets[0].receive({type:'auth_invalid'});
  assert.equal(p.authFailed,true);
  assert.equal(p.timer,null);
  p.close();
});

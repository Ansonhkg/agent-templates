import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { CodexConnection } from '../src/codex-connection/server/connection';
const home=await mkdtemp(join(tmpdir(),'codex-connection-login-'));
const connection=new CodexConnection({workspace:join(home,'workspace'),codexHome:home});
try {
  const before=await connection.refresh(); assert.equal(before.connected,false);
  const login=await connection.login('browser'); assert.ok(login.login?.url.startsWith('https://')); assert.ok(login.login?.id);
  const cancel=await connection.cancelLogin(); assert.equal(cancel.login,undefined); assert.equal(cancel.connected,false);
  const again=await connection.login('device'); assert.ok(again.login?.userCode);
  await connection.cancelLogin();
  await connection.logout(); assert.equal(connection.snapshot().connected,false);
  await connection.reconnect(); assert.equal(connection.snapshot().status,'signed-out');
  console.log(JSON.stringify({isolatedHome:true,browserLoginStart:true,cancel:true,deviceLoginStart:true,signedOutLogout:true,reconnect:true}));
} finally {connection.close(); await new Promise(r=>setTimeout(r,200));await rm(home,{recursive:true,force:true});}

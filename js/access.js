// Private access: the app is for the owner's business only. A phone or computer opens the app
// only after the owner's access code has been typed once on it. Only a hash of the code is stored here.
import { db } from './db.js';
import { hashPin } from './backup.js';

export const ACCESS = {"salt":"+jWY8zbGs7DtyLHlswh1KA==","hash":"Mfs8e4AzHZMJ6QeQUmMtkfzWzLVES4jb4eA+2l/lVtE="};

export async function accessGate() {
  if ((await db.get('kv', 'access')) === ACCESS.hash) return;
  const box = document.getElementById('lock');
  box.hidden = false;
  box.innerHTML = `<div class="lock-box"><img src="icons/logo-128.png" alt="" width="72" height="72"><h2>LIMPIEZA VITORIA ALAVA</h2>
    <p>App privada. Escribe tu código de acceso.<br><span class="small muted">Private app. Enter your access code.</span></p>
    <input id="accIn" type="text" autocapitalize="characters" autocomplete="off" spellcheck="false" style="letter-spacing:.08em;font-size:1.1rem">
    <button class="btn" id="accBtn">Entrar / Enter</button><p id="accErr" class="neg small"></p></div>`;
  await new Promise((resolve) => {
    const tryIt = async () => {
      const v = document.getElementById('accIn').value.trim().toUpperCase();
      const { hash } = await hashPin(v, ACCESS.salt);
      if (hash !== ACCESS.hash) { document.getElementById('accErr').textContent = 'Código incorrecto / Wrong code'; return; }
      await db.put('kv', ACCESS.hash, 'access');
      box.hidden = true; box.innerHTML = '';
      resolve();
    };
    document.getElementById('accBtn').onclick = tryIt;
    document.getElementById('accIn').onkeydown = (e) => { if (e.key === 'Enter') tryIt(); };
    document.getElementById('accIn').focus();
  });
}

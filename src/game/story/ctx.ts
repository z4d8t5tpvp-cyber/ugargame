import type { BankId, CharacterId, GameState, PhoneAppId, TgMessage, Toast } from '../types';
import { uid } from '../util';
import { hero as heroFx, notify as notifyFx, thought as thoughtFx, toast as toastFx, trust as trustFx } from '../engine/core';
import { incoming, spend } from '../engine/banks';

export type MsgSpec = {
  from: string; // CharacterId | 'me' | 'system' | free id (group member)
  text: string;
  fromName?: string;
  kind?: TgMessage['kind'];
  duration?: number;
  scene?: TgMessage['scene'];
  file?: TgMessage['file'];
  dealId?: string;
  /** Real seconds of "typing" before this message. */
  wait?: number;
};

export interface ScriptChoice {
  id: string;
  text: string;
  /** Shown only when this returns true. */
  if?: (d: GameState) => boolean;
  run?: (c: Ctx) => void;
  next?: string;
}

export interface ScriptNode {
  msgs: MsgSpec[] | ((d: GameState) => MsgSpec[]);
  choices?: ScriptChoice[];
  next?: string;
  run?: (c: Ctx) => void;
}

export interface Script {
  chat: string;
  nodes: Record<string, ScriptNode>;
}

export interface Ctx {
  d: GameState;
  script(id: string, node?: string, delaySec?: number): void;
  say(chat: string, m: MsgSpec, delaySec?: number): void;
  cutscene(id: string): void;
  trust(id: CharacterId, delta: number): void;
  hero(delta: { energy?: number; stress?: number; attention?: number }): void;
  flag(k: string, v?: boolean | number | string): void;
  has(k: string): boolean;
  notify(app: PhoneAppId | 'system' | 'sms', title: string, body: string): void;
  toast(kind: Toast['kind'], text: string): void;
  thought(text: string, force?: boolean): void;
  give(bank: BankId, amount: number, title: string, comment?: string): void;
  pay(amount: number, title: string): boolean;
  showChat(chat: string): void;
  later(min: number, type: string, payload?: Record<string, unknown>): void;
  team(id: CharacterId, inTeam?: boolean): void;
}

// Script registry is filled by content modules.
export const SCRIPTS: Record<string, Script> = {};
export const registerScripts = (s: Record<string, Script>) => Object.assign(SCRIPTS, s);

const typingTime = (m: MsgSpec) => {
  if (m.wait !== undefined) return m.wait;
  if (m.kind === 'voice' || m.kind === 'video') return 2.2;
  if (m.kind === 'file' || m.kind === 'deal') return 1.4;
  return Math.min(4.5, 0.9 + m.text.length / 70);
};

export function playNode(d: GameState, scriptId: string, nodeId: string, delaySec = 0) {
  const sc = SCRIPTS[scriptId];
  const node = sc?.nodes[nodeId];
  if (!sc || !node) return;
  const msgs = typeof node.msgs === 'function' ? node.msgs(d) : node.msgs;
  let t = d.rt + delaySec;
  const lastQueued = d.tgQueue.filter((q) => q.chatId === sc.chat).reduce((m, q) => Math.max(m, q.at), 0);
  t = Math.max(t, lastQueued);
  if (!msgs.length) {
    d.tgQueue.push({ chatId: sc.chat, at: t, msg: { from: 'system', kind: 'system', text: '' }, then: { scriptId, nodeId, stage: 'choices' }, silent: true });
    return;
  }
  msgs.forEach((m, i) => {
    t += typingTime(m);
    const { wait: _w, ...rest } = m;
    d.tgQueue.push({
      chatId: sc.chat,
      at: t,
      msg: { kind: 'text', ...rest },
      then: i === msgs.length - 1 ? { scriptId, nodeId, stage: 'choices' } : undefined,
    });
  });
}

/** Called when the last message of a node has been delivered. */
export function nodeDone(d: GameState, scriptId: string, nodeId: string) {
  const sc = SCRIPTS[scriptId];
  const node = sc?.nodes[nodeId];
  if (!node) return;
  const c = makeCtx(d);
  node.run?.(c);
  const choices = node.choices?.filter((ch) => !ch.if || ch.if(d));
  if (choices && choices.length) {
    d.tgPending[sc.chat] = { chatId: sc.chat, scriptId, nodeId, options: choices.map((ch) => ({ id: ch.id, text: ch.text })) };
  } else if (node.next) {
    playNode(d, scriptId, node.next, 0.4);
  }
}

export function choose(d: GameState, chatId: string, optionId: string) {
  const p = d.tgPending[chatId];
  if (!p) return;
  const sc = SCRIPTS[p.scriptId];
  const node = sc?.nodes[p.nodeId];
  const ch = node?.choices?.find((x) => x.id === optionId);
  if (!ch) return;
  delete d.tgPending[chatId];
  pushMsg(d, chatId, { from: 'me', kind: 'text', text: ch.text });
  ch.run?.(makeCtx(d));
  if (ch.next) playNode(d, p.scriptId, ch.next, 0.6);
}

export function pushMsg(d: GameState, chatId: string, m: Omit<TgMessage, 'id' | 'at'>) {
  const chat = d.tg[chatId];
  if (!chat) return;
  chat.visible = true;
  chat.messages.push({ id: uid('tm'), at: d.now, ...m });
  if (chat.messages.length > 220) chat.messages.splice(0, chat.messages.length - 220);
  d.tgOrder = [chatId, ...d.tgOrder.filter((x) => x !== chatId)];
  if (m.from !== 'me') {
    const viewing = d.ui.phoneApp === 'telegram' && d.ui.tgChat === chatId && !d.ui.phoneLocked;
    if (!viewing) {
      chat.unread++;
      const preview = m.kind === 'voice' ? '🎤 Голосовое сообщение' : m.kind === 'video' ? '📹 Видеосообщение' : m.kind === 'file' ? `📎 ${m.file?.name}` : m.kind === 'deal' ? '🤝 Предложение OTC' : m.text;
      notifyFx(d, 'telegram', chat.kind === 'group' ? `${chat.title}: ${m.fromName ?? ''}` : chat.title, preview, chatId);
    }
  }
}

export function tgTick(d: GameState) {
  if (!d.tgQueue.length) return;
  const due = d.tgQueue.filter((q) => q.at <= d.rt);
  if (!due.length) return;
  d.tgQueue = d.tgQueue.filter((q) => q.at > d.rt);
  due.sort((a, b) => a.at - b.at);
  for (const q of due) {
    if (!q.silent) pushMsg(d, q.chatId, q.msg);
    if (q.then) nodeDone(d, q.then.scriptId, q.then.nodeId);
  }
}

// Late-bound hooks to avoid import cycles with the director.
export const hooks: { cutscene: (d: GameState, id: string) => void } = { cutscene: () => {} };

export function makeCtx(d: GameState): Ctx {
  const c: Ctx = {
    d,
    script: (id, node = 'start', delay = 0) => playNode(d, id, node, delay),
    say: (chat, m, delay = 0) => {
      const lastQueued = d.tgQueue.filter((q) => q.chatId === chat).reduce((mx, q) => Math.max(mx, q.at), 0);
      const { wait, ...rest } = m;
      d.tgQueue.push({ chatId: chat, at: Math.max(d.rt + delay, lastQueued) + (wait ?? typingTime(m)), msg: { kind: 'text', ...rest } });
    },
    cutscene: (id) => hooks.cutscene(d, id),
    trust: (id, delta) => trustFx(d, id, delta),
    hero: (delta) => heroFx(d, delta),
    flag: (k, v = true) => {
      d.flags[k] = v;
    },
    has: (k) => !!d.flags[k],
    notify: (app, title, body) => notifyFx(d, app, title, body),
    toast: (kind, text) => toastFx(d, kind, text),
    thought: (text, force) => thoughtFx(d, text, force),
    give: (bank, amount, title, comment) => {
      incoming(d, bank, amount, { title, comment, kind: 'sbp_in' });
    },
    pay: (amount, title) => {
      const order: BankId[] = ['sber', 'tbank', 'alfa'];
      for (const b of order) {
        if (spend(d, b, amount, title).ok) return true;
      }
      return false;
    },
    showChat: (chat) => {
      if (d.tg[chat]) d.tg[chat].visible = true;
    },
    later: (min, type, payload) => {
      d.scheduled.push({ id: uid('ev'), at: d.now + min, type, payload });
    },
    team: (id, inTeam = true) => {
      d.characters[id].inTeam = inTeam;
      d.characters[id].met = true;
    },
  };
  return c;
}

/* =========================================================
   逆熵协议 · 引擎 engine.js
   —— 纯规则，不碰 DOM，方便单独测试与替换
   依赖：content.js 定义的全局 CONTENT
   ========================================================= */
(function (root) {
  "use strict";

  var C = root.CONTENT;
  var CFG = C.config;
  var SAVE_KEY = "entropy_protocol_save_v1";
  var persistent = false;   // localStorage 是否可用（file:// 或隐私模式下可能不可用）
  var store = (function () {
    try {
      var t = "__t";
      localStorage.setItem(t, "1");
      localStorage.removeItem(t);
      persistent = true;
      return localStorage;
    } catch (e) {
      var mem = {};
      return {
        getItem: function (k) { return k in mem ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      };
    }
  })();

  var S = null;
  var subs = [];
  var choice = null;        // 需要玩家做选择（碎片三选一）
  var story = null;         // 当前剧情节点
  var storyQueue = [];      // 待播剧情

  /* ---------- 基础工具 ---------- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function d6() {
    var n = Math.floor(Math.random() * 6) + 1;
    if (has("ruleHack")) n = Math.min(6, n + 1);
    return n;
  }
  function has(id) { return S && S.fragments.indexOf(id) >= 0; }
  function log(msg, cls) {
    S.log.push({ m: msg, c: cls || "info" });
    if (S.log.length > 260) S.log.shift();
  }
  function emit(type) {
    for (var i = 0; i < subs.length; i++) {
      try { subs[i](type || "change"); } catch (e) { /* 忽略 UI 异常 */ }
    }
  }
  function save() {
    if (!S) return;
    try { store.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  }
  function hasSave() {
    try { return !!store.getItem(SAVE_KEY); } catch (e) { return false; }
  }
  function clearSave() { try { store.removeItem(SAVE_KEY); } catch (e) {} }

  /* ---------- 数值 ---------- */
  function taxFor(day) {
    return Math.round(CFG.taxBase + CFG.taxGrowth * day + Math.max(0, S.cash) * CFG.taxCashRate);
  }
  function netWorth() {
    var v = CFG.valuation;
    return Math.round(S.cash + S.influence * v.influence + S.ep * v.ep +
      S.memory * v.memory + S.intel * v.intel - S.debt);
  }
  function apMax() {
    var ap = CFG.apBase;
    if (S.health < 50) ap -= 1;
    if (S.health < 25) ap -= 1;
    if (has("timeFold")) ap += 1;
    return Math.max(1, ap);
  }
  function fragmentDrain() {
    var n = S.fragments.filter(function (f) { return f !== "badge"; }).length;
    return Math.max(0, Math.ceil((n - CFG.freeFragments) / 2));
  }
  function gain(amount, opts) {
    opts = opts || {};
    var v = amount;
    if (!opts.raw && has("entropyAnchor")) v = Math.round(amount * (1 - CFG.anchorIncomePenalty));
    S.cash += v;
    return v;
  }
  function spend(amount) {
    S.cash -= amount;
    if (S.cash < 0) S.cash = 0;
  }
  function addHealth(n) { S.health = clamp(S.health + n, 0, CFG.maxHealth); }
  function addMemory(n) { S.memory = clamp(S.memory + n, 0, CFG.maxMemory); }
  function addEntropy(n) { S.entropy = Math.max(0, S.entropy + n); }

  /* ---------- 碎片 ---------- */
  function fragmentPool() {
    return Object.keys(C.fragments).filter(function (k) {
      return k !== "badge" && S.fragments.indexOf(k) < 0;
    });
  }
  function pickRandom(pool) {
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function threeOptions() {
    var pool = fragmentPool().slice();
    var out = [];
    while (out.length < 3 && pool.length) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }
  // 徽章：只要手上还有 7 枚非徽章的碎片，就一定能拿回徽章。
  // 否则「规则被抹除」这类事件会把隐藏结局的钥匙悄悄弄丢。
  function syncBadge() {
    var n = 0;
    for (var i = 0; i < S.fragments.length; i++) if (S.fragments[i] !== "badge") n++;
    if (n >= CFG.badgeCount && S.fragments.indexOf("badge") < 0) {
      S.fragments.push("badge");
      log("七枚碎片彼此靠近，拼出一枚徽章。", "event");
    }
  }
  function grantFragment(id) {
    if (!id || S.fragments.indexOf(id) >= 0) return false;
    S.fragments.push(id);
    log("获得规则碎片：" + C.fragments[id].name, "good");
    syncBadge();
    return true;
  }
  function checkForget() {
    if (S.memory >= CFG.forgetMemoryBelow || !S.fragments.length) return;
    var p = CFG.forgetChance;
    if (has("memoryCash")) p *= 2;
    if (Math.random() < p) {
      var pending = S.fragments.filter(function (x) { return x !== "badge"; });
      if (!pending.length) return;
      var lost = pending[Math.floor(Math.random() * pending.length)];
      S.fragments.splice(S.fragments.indexOf(lost), 1);
      log("记忆崩塌，你忘掉了一条规则：" + C.fragments[lost].name, "bad");
      syncBadge();
    }
  }

  /* ---------- 行动表 ---------- */
  var ACTIONS = [
    {
      id: "work", name: "打工", cost: 1, tag: "收入",
      desc: "+" + CFG.workPay + " 现金 · -" + CFG.workHealth + " 健康 · +2 信用",
      can: function () { return S.health > CFG.workHealth ? null : "健康不够，你站不住了"; },
      run: function () {
        var v = gain(CFG.workPay);
        addHealth(-CFG.workHealth);
        S.credit = clamp(S.credit + 2, 0, 100);
        log("打工：+" + v + " 现金，-" + CFG.workHealth + " 健康", "good");
      }
    },
    {
      id: "rest", name: "休息", cost: 1, tag: "恢复",
      desc: "+" + CFG.restHealth + " 健康",
      can: function () { return S.health >= CFG.maxHealth ? "健康已经满了" : null; },
      run: function () { addHealth(CFG.restHealth); log("休息：+" + CFG.restHealth + " 健康", "good"); }
    },
    {
      id: "social", name: "社交", cost: 1, tag: "影响力",
      desc: "-300 现金 · +5 影响力，掷出 4+ 再 +5",
      can: function () { return S.cash >= 300 ? null : "现金不足 300"; },
      run: function () {
        spend(300);
        var r = d6();
        var inf = 5 + (r >= 4 ? 5 : 0);
        S.influence += inf;
        log("社交：-300 现金，+" + inf + " 影响力（掷出 " + r + "）", "good");
      }
    },
    {
      id: "study", name: "学习情报", cost: 1, tag: "情报",
      desc: "-500 现金 · +1 情报",
      can: function () { return S.cash >= 500 ? null : "现金不足 500"; },
      run: function () { spend(500); S.intel += 1; log("学习：-500 现金，+1 情报（共 " + S.intel + "）", "info"); }
    },
    {
      id: "craft", name: "合成碎片", cost: 1, tag: "规则",
      desc: "3 情报 → 从 3 枚碎片中选 1 枚",
      can: function () { return S.intel >= 3 ? null : "情报不足 3 点"; },
      run: function () {
        S.intel -= 3;
        var opts = threeOptions();
        if (!opts.length) { gain(2000, { raw: true }); log("没有新规则可合成，返还 2000 现金", "info"); return; }
        choice = { kind: "fragment", source: "craft", options: opts, title: "合成：选择一条规则" };
      }
    },
    {
      id: "invLow", name: "低风险投资", cost: 1, tag: "投资", amount: true,
      desc: "投入 ≤ 全部现金，次日按 市场×1.03 返还",
      can: function () { return S.cash >= 100 ? null : "至少需要 100 现金"; },
      run: function (input) {
        var amt = Math.floor(input && input.amount || 0);
        if (!(amt >= 100)) { log("投资金额无效", "bad"); return "abort"; }
        if (amt > S.cash) amt = Math.floor(S.cash);
        spend(amt);
        S.pending.push({ amount: amt });
        log("低风险投资 " + amt + " 现金，次日结算", "info");
      }
    },
    {
      id: "invHigh", name: "高风险投资", cost: 1, tag: "投资", amount: true,
      desc: "投入 ≤ " + CFG.highCap + "：1-3 全损，4-5 返 1.8 倍，6 返 3.2 倍",
      can: function () { return S.cash >= 100 ? null : "至少需要 100 现金"; },
      run: function (input) {
        var amt = Math.floor(input && input.amount || 0);
        if (!(amt >= 100)) { log("投资金额无效", "bad"); return "abort"; }
        amt = Math.min(amt, Math.floor(S.cash), CFG.highCap);
        spend(amt);
        var r = d6(), ret = 0;
        if (r >= 6) ret = Math.round(amt * 3.2);
        else if (r >= 4) ret = Math.round(amt * 1.8);
        S.cash += ret;
        log("高风险投资掷出 " + r + "，收回 " + ret + " 现金", ret > amt ? "good" : "bad");
        if (ret === 0) S.stats.investLose++; else S.stats.investWin++;
      }
    },
    {
      id: "loan", name: "借贷", cost: 1, tag: "现金",
      desc: "+1000 现金 · 债务 +1050 · 信用 -5",
      can: function () { return null; },
      run: function () {
        gain(1000, { raw: true });
        var add = CFG.loanDebt;
        if (has("creditLever") && S.credit > 70) add = Math.round(CFG.loanDebt / 2);
        S.debt += add;
        S.credit = clamp(S.credit - 5, 0, 100);
        log("借贷：+1000 现金，债务 +" + add + "，信用 -5", "bad");
      }
    },
    {
      id: "pawn", name: "典当记忆", cost: 1, tag: "记忆", amount: true,
      desc: "每 10 记忆换 800 现金 · 熵 +1",
      can: function () { return S.memory >= 10 ? null : "记忆不足 10"; },
      run: function (input) {
        var amt = Math.floor(input && input.amount || 0);
        amt = amt - (amt % 10);
        if (amt < 10) { log("金额无效（需为 10 的倍数）", "bad"); return "abort"; }
        amt = Math.min(amt, Math.floor(S.memory / 10) * 10);
        var units = amt / 10;
        S.memory -= amt;
        gain(units * 800, { raw: true });
        S.credit = clamp(S.credit - 2, 0, 100);
        addEntropy(1);
        log("典当 " + amt + " 记忆，+" + units * 800 + " 现金，熵 +1", "bad");
      }
    },
    {
      id: "black", name: "黑市交易", cost: 1, tag: "熵", choice: true,
      desc: "10 健康 → 1 逆熵点 或 500 现金 · 熵 +1",
      can: function () { return S.health > 10 ? null : "健康太低，没人敢跟你交易"; },
      run: function (input) {
        var takeCash = !!(input && input.blackCash);
        addHealth(-10);
        addEntropy(1);
        if (takeCash) { gain(500); log("黑市：-10 健康，+500 现金，熵 +1", "bad"); }
        else { S.ep += 1; log("黑市：-10 健康，+1 逆熵点，熵 +1", "bad"); }
      }
    },
    {
      id: "challenge", name: "挑战交易所", cost: 1, tag: "熵",
      desc: "熵 +1 · 掷 1d6 赌一把",
      can: function () { return null; },
      run: function () {
        addEntropy(1);
        var r = d6();
        if (r <= 2) {
          if (S.cash >= 1000) { spend(1000); log("挑战失败（掷出 " + r + "），损失 1000 现金", "bad"); }
          else { addHealth(-15); log("挑战失败（掷出 " + r + "），健康 -15", "bad"); }
        } else if (r <= 4) {
          var opts = threeOptions();
          if (opts.length) choice = { kind: "fragment", source: "challenge", options: opts, title: "交易所的赌注：挑一条规则" };
          else { gain(3000, { raw: true }); log("挑战成功，但规则已被抽空，+3000 现金", "good"); }
        } else {
          if (Math.random() < 0.5) { S.ep += 2; log("挑战成功（掷出 " + r + "），+2 逆熵点", "good"); }
          else { gain(3000, { raw: true }); log("挑战成功（掷出 " + r + "），+3000 现金", "good"); }
        }
      }
    },
    {
      id: "anchor", name: "购买熵减锚", cost: 1, tag: "熵",
      desc: "-500 现金 · 熵 -1",
      can: function () { return S.cash >= 500 ? null : "现金不足 500"; },
      run: function () { spend(500); addEntropy(-1); log("购买熵减锚：-500 现金，熵 -1", "good"); }
    },
    {
      id: "auction", name: "规则拍卖", cost: 0, tag: "规则",
      desc: "每 5 天开放 · 3000 现金或 1 逆熵点 → 三选一",
      can: function () {
        if (S.day % 5 !== 0) return "拍卖只在第 5、10、15、20、25、30 天开放";
        if (S.usedToday.auction) return "今天已经拍过了";
        if (S.ep < 1 && S.cash < 3000) return "需要 1 逆熵点或 3000 现金";
        return null;
      },
      run: function () {
        if (S.ep >= 1) S.ep -= 1; else spend(3000);
        S.usedToday.auction = true;
        var opts = threeOptions();
        if (!opts.length) { log("没有未被抽走的规则了，拍卖流拍（资源已退还）", "bad"); gain(3000, { raw: true }); return; }
        choice = { kind: "fragment", source: "auction", options: opts, title: "拍卖台：三选一" };
      }
    }
  ];

  var ACTION_MAP = {};
  ACTIONS.forEach(function (a) { ACTION_MAP[a.id] = a; });

  /* ---------- 剧情 ---------- */
  function pushStory(scene) {
    if (S.seen.indexOf(scene.id) >= 0) return false;
    storyQueue.push(scene);
    return true;
  }
  function checkStory() {
    for (var i = 0; i < C.scenes.length; i++) {
      var sc = C.scenes[i];
      if (S.seen.indexOf(sc.id) >= 0) continue;
      if (sc.day && S.day < sc.day) continue;
      if (sc.when && !sc.when(S, api)) continue;
      pushStory(sc);
      break;
    }
  }
  function nextStory() {
    if (!story) story = storyQueue.shift() || null;
    return story;
  }

  /* ---------- 结局 ---------- */
  function pickEnding() {
    for (var i = 0; i < C.endings.length; i++) {
      var e = C.endings[i];
      var ok = false;
      try { ok = !!e.when(S, api); } catch (err) { ok = false; }
      if (ok) return e;
    }
    return C.endings[C.endings.length - 1];
  }
  function finish(reason) {
    if (S.over) return;
    S.over = true;
    S.endReason = reason || "结算";
    S.net = netWorth();
    var e = pickEnding();
    S.endingId = e.id;
    log("════════════════════", "event");
    log("第 " + S.day + " 天，" + S.endReason + "。", "event");
    log("净资产：" + S.net + " 现金等值", "sys");
    log("结局：【" + e.title + "】", "event");
    log("════════════════════", "event");
    save();
    emit("ending");
  }
  function checkDeath() {
    if (S.over) return true;
    if (S.health <= 0) { S.health = 0; finish("健康归零"); return true; }
    if (S.memory <= 0) { S.memory = 0; finish("记忆燃尽"); return true; }
    if (S.entropy >= CFG.entropyMax) { S.entropy = CFG.entropyMax; finish("熵值满溢"); return true; }
    return false;
  }

  /* ---------- 每日流程 ---------- */
  function startDay(n) {
    S.day = n;
    S.usedToday = {};
    S.crash = false;

    // 1. 熵税
    var tax = taxFor(n);
    S.lastTax = tax;
    if (S.cash >= tax) {
      spend(tax);
      log("第 " + n + " 天 · 缴纳熵税 " + tax + " 现金", "sys");
    } else {
      var paid = S.cash;
      spend(S.cash);
      var owe = tax - paid;
      if (has("healthPledge")) {
        var loss = Math.min(15, Math.ceil(owe / 50));
        addHealth(-loss);
        log("第 " + n + " 天 · 熵税差 " + owe + "，健康抵押生效：-" + loss + " 健康", "bad");
      } else {
        var hl = Math.min(15, Math.ceil(owe / 100));
        addHealth(-hl);
        addMemory(-hl);
        log("第 " + n + " 天 · 熵税差 " + owe + "，交易所取走 " + hl + " 健康与 " + hl + " 记忆", "bad");
      }
    }

    // 2. 债务利息
    if (S.debt > 0) {
      var interest = Math.round(S.debt * CFG.debtRate);
      S.debt += interest;
      log("债务利息 +" + interest + "（当前债务 " + Math.round(S.debt) + "）", "bad");
    }

    // 3. 碎片侵蚀记忆
    var drain = fragmentDrain();
    if (drain > 0) {
      addMemory(-drain);
      log("身上 " + S.fragments.length + " 条规则在啃食记忆：-" + drain + " 记忆", "bad");
    }

    // 4. 时间折叠
    if (has("timeFold")) { addHealth(-CFG.timeFoldHealth); log("时间折叠：-" + CFG.timeFoldHealth + " 健康", "bad"); }

    // 5. 熵减锚
    if (has("entropyAnchor") && S.entropy > 0) {
      addEntropy(-1);
      log("熵减锚自行运转：熵 -1", "good");
    }

    // 6. 市场
    var r = Math.floor(Math.random() * 6) + 1;
    S.market = +(1 + (r - 3) * 0.05).toFixed(2);
    log("市场波动系数：" + S.market, "sys");

    // 7. 随机事件（每 3 天）
    if (n % 3 === 0) triggerEvent();

    // 8. 剧情
    checkStory();

    // 9. AP
    S.ap = apMax();

    checkDeath();
    save();
    emit("day");
  }

  function triggerEvent() {
    var r = Math.floor(Math.random() * 6) + 1;
    log("—— 交易所广播（" + r + "）——", "event");
    switch (r) {
      case 1:
        S.crash = true;
        log("市场崩盘：今天结算的投资全部减半。", "bad");
        break;
      case 2:
        addHealth(-10);
        log("旧伤发作：-10 健康。", "bad");
        break;
      case 3:
        if (S.debt > 3000) {
          var pay = Math.round(S.debt * 0.1);
          if (S.cash >= pay) { spend(pay); S.debt -= pay; log("催收：立即偿还 " + pay + "。", "bad"); }
          else { S.credit = clamp(S.credit - 20, 0, 100); addEntropy(1); log("催收：无力偿还，信用 -20，熵 +1。", "bad"); }
        } else { log("催收员路过，看了一眼你的账本，走了。", "sys"); }
        break;
      case 4:
        gain(600, { raw: true });
        log("一笔没人认领的尾款打到你账上：+600 现金。", "good");
        break;
      case 5:
        addMemory(8);
        log("你梦见了签约之前的下午：+8 记忆。", "good");
        break;
      case 6: {
        var pool6 = S.fragments.filter(function (x) { return x !== "badge"; });
        if (pool6.length) {
          var f6 = pool6[Math.floor(Math.random() * pool6.length)];
          S.fragments.splice(S.fragments.indexOf(f6), 1);
          log("世界短暂地忘了你的一条规则：" + C.fragments[f6].name + " 被抹掉了。", "bad");
          syncBadge();
        } else {
          gain(400, { raw: true });
          log("交易所例行抽查：+400 现金补贴。", "good");
        }
        break;
      }
    }
  }

  function endDay() {
    if (!S || S.over) return;
    if (storyQueue.length) return;
    // 结算隔夜投资
    for (var i = 0; i < S.pending.length; i++) {
      var p = S.pending[i];
      var ret = p.amount * S.market * (1 + CFG.lowRate);
      if (has("compound")) ret *= (1 + CFG.compoundRate);
      if (S.crash) ret *= 0.5;
      ret = Math.round(ret);
      S.cash += ret;
      log("投资结算：返还 " + ret + " 现金" + (S.crash ? "（崩盘减半）" : ""), "good");
    }
    S.pending = [];
    if (S.day >= CFG.days) { finish("三十日到期"); return; }
    startDay(S.day + 1);
    emit("day");
  }

  function postAction() {
    checkForget();
    if (checkDeath()) { emit("ending"); return; }
    checkStory();
    save();
    emit("change");
  }

  /* ---------- 对外操作 ---------- */
  function doAction(id, input) {
    if (!S || S.over || storyQueue.length || choice) return false;
    var a = ACTION_MAP[id];
    if (!a) return false;
    var why = a.can();
    if (why) { log(why, "bad"); emit("change"); return false; }
    if (S.ap < a.cost) { log("行动点不足", "bad"); emit("change"); return false; }
    var res = a.run(input || {});
    if (res === "abort") { emit("change"); return false; }
    S.ap -= a.cost;
    S.stats.actions++;
    postAction();
    return true;
  }

  function useFragment(id, input) {
    if (!S || S.over || storyQueue.length) return false;
    if (!has(id)) return false;
    if (S.usedToday[id]) { log("今天已经用过了", "bad"); return false; }
    S.usedToday[id] = true;

    if (id === "memoryCash") {
      var amt = Math.floor(input && input.amount || 0);
      amt = Math.min(amt - (amt % 10), Math.floor(S.memory / 10) * 10);
      if (amt < 10) { S.usedToday[id] = false; log("至少需要 10 记忆", "bad"); return false; }
      S.memory -= amt;
      gain(amt / 10 * 1000, { raw: true });
      log("记忆套现：" + amt + " 记忆 → " + (amt / 10 * 1000) + " 现金", "info");
    } else if (id === "influenceCash") {
      var n = Math.min(Math.floor(input && input.amount || 0), S.influence);
      if (n < 1) { S.usedToday[id] = false; log("没有可兑现的影响力", "bad"); return false; }
      S.influence -= n;
      gain(n * 120, { raw: true });
      log("影响力兑现：" + n + " → " + n * 120 + " 现金", "info");
    } else if (id === "debtShift") {
      if (S.debt <= 0) { S.usedToday[id] = false; log("没有债务", "bad"); return false; }
      var shift = Math.round(S.debt * 0.5);
      var memLoss = Math.ceil(shift / 800) * 5;
      S.debt -= shift;
      addMemory(-memLoss);
      log("债务转移：债务 -" + shift + "，记忆 -" + memLoss, "bad");
    } else return false;

    postAction();
    return true;
  }

  function currentChoice() { return choice; }
  function resolveChoice(id) {
    if (!choice) return false;
    choice = null;
    if (id) grantFragment(id);
    save();
    emit("change");
    return true;
  }

  function currentStory() { return story || (storyQueue.length ? (story = storyQueue.shift()) : null); }
  function resolveStory(index) {
    if (!story) return false;
    var c = story.choices && story.choices[index];
    if (!c) return false;
    if (c.require && !c.require(S)) { log(c.reqText || "条件不足", "bad"); emit("change"); return false; }
    S.seen.push(story.id);
    if (c && c.effect) applyEffect(c.effect);
    if (c && c.log) log(c.log, c.tone || "info");
    var reply = c && c.reply ? c.reply : null;
    story = null;
    S.lastReply = reply;
    if (reply) log(reply, c.tone === "bad" ? "bad" : "story");
    checkDeath();
    if (!S.over) checkStory();
    save();
    emit("story");
    return true;
  }

  function applyEffect(eff) {
    if (!eff) return;
    if (eff.cash > 0) gain(eff.cash);
    else if (eff.cash < 0) spend(-eff.cash);
    if (eff.health) addHealth(eff.health);
    if (eff.memory) addMemory(eff.memory);
    if (eff.credit) S.credit = clamp(S.credit + eff.credit, 0, 100);
    if (eff.influence) S.influence = Math.max(0, S.influence + eff.influence);
    if (eff.ep) S.ep = Math.max(0, S.ep + eff.ep);
    if (eff.entropy) addEntropy(eff.entropy);
    if (eff.debt) S.debt = Math.max(0, S.debt + eff.debt);
    if (eff.intel) S.intel = Math.max(0, S.intel + eff.intel);
    if (eff.flags) for (var k in eff.flags) S.flags[k] = eff.flags[k];
    if (eff.fragment) grantFragment(eff.fragment);
    if (eff.log) log(eff.log, eff.tone || "event");
  }

  /* ---------- 生命周期 ---------- */
  var api = {};

  function newGame() {
    S = {
      version: C.version,
      day: 1, ap: CFG.apBase,
      cash: CFG.startCash, health: CFG.startHealth, memory: CFG.startMemory,
      credit: CFG.startCredit, influence: 0, ep: 0, entropy: 0, debt: 0, intel: 0,
      fragments: [], pending: [], market: 1, crash: false,
      flags: {}, seen: [], log: [], over: false, endingId: null, endReason: "",
      usedToday: {}, stats: { actions: 0, investWin: 0, investLose: 0 },
      net: 0, lastTax: 0, lastReply: null
    };
    choice = null; story = null; storyQueue = [];
    log("你走进交易所。玻璃门在你身后合上，外面那座城市正在忘记自己是什么。", "story");
    startDay(1);
    emit("new");
  }

  function loadGame() {
    try {
      var raw = store.getItem(SAVE_KEY);
      if (!raw) return false;
      S = JSON.parse(raw);
      if (!S || !S.version) return false;
      choice = null; story = null; storyQueue = [];
      if (!S.over) checkStory();
      emit("load");
      return true;
    } catch (e) { return false; }
  }

  api = {
    version: C.version,
    newGame: newGame,
    loadGame: loadGame,
    hasSave: hasSave,
    clearSave: clearSave,
    save: save,
    state: function () { return S; },
    actions: function () {
      return ACTIONS.map(function (a) {
        var why = null;
        if (S.over) why = "本局已结束";
        else if (storyQueue.length || story) why = "先读完这段";
        else if (choice) why = "先做一个选择";
        else if (S.ap < a.cost) why = "行动点不足";
        else why = a.can();
        return { id: a.id, name: a.name, cost: a.cost, desc: a.desc, tag: a.tag,
                 amount: !!a.amount, choice: !!a.choice, disabled: !!why, reason: why };
      });
    },
    doAction: doAction,
    useFragment: useFragment,
    endDay: endDay,
    currentChoice: currentChoice,
    resolveChoice: resolveChoice,
    currentStory: currentStory,
    resolveStory: resolveStory,
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
    actionBook: function () {
      return ACTIONS.map(function (a) {
        return { id: a.id, name: a.name, cost: a.cost, desc: a.desc, tag: a.tag, amount: !!a.amount, choice: !!a.choice };
      });
    },
    fragmentBook: function () { return C.fragments; },
    netWorth: netWorth,
    taxFor: function (d) { return S ? taxFor(d) : 0; },
    apMax: apMax,
    fragmentDrain: fragmentDrain,
    canPersist: function () { return persistent; },
    canEndDay: function () { return S && !S.over && !storyQueue.length && !story && !choice; },
    ending: function () {
      if (!S || !S.endingId) return null;
      for (var i = 0; i < C.endings.length; i++) if (C.endings[i].id === S.endingId) return C.endings[i];
      return null;
    }
  };

  root.ENGINE = api;
})(typeof window !== "undefined" ? window : globalThis);

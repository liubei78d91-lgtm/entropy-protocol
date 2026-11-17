/* 逆熵协议 · ui.js —— 界面与交互 */
(function () {
  "use strict";
  var C = window.CONTENT, E = window.ENGINE;
  var $ = function (id) { return document.getElementById(id); };
  var SCREENS = ["title", "rules", "about", "game", "ending"];
  var modalState = { type: null, key: null };
  var returnTo = "title";

  function inGame() {
    var S = E.state();
    return !!(S && !S.over);
  }
  function openRules(fromGame) {
    returnTo = fromGame ? "game" : "title";
    buildRules();
    var start = $("btn-rules-start");
    if (start) start.style.display = fromGame ? "none" : "flex";
    var close = $("btn-rules-close");
    if (close) close.textContent = fromGame ? "返回交易所" : "先不签";
    showScreen("rules");
  }
  function openAbout(fromGame) {
    returnTo = fromGame ? "game" : "title";
    buildAbout();
    showScreen("about");
  }
  function goBack() {
    if (returnTo === "game" && inGame()) { showScreen("game"); sync(); }
    else showScreen("title");
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function showScreen(name) {
    SCREENS.forEach(function (s) {
      var n = $("screen-" + s);
      if (n) n.classList.toggle("hidden", s !== name);
    });
    window.scrollTo(0, 0);
  }

  /* ================= 静态内容 ================= */
  function buildRules() {
    var body = "";
    C.rules.forEach(function (r) {
      body += '<div class="rule-block"><h3>' + esc(r.h) + "</h3>";
      (r.p || []).forEach(function (p) { body += "<p>" + p + "</p>"; });
      body += "</div>";
    });
    $("rules-body").innerHTML = body;
    var a = "";
    E.actionBook().forEach(function (x) {
      a += '<div class="rule-line"><span class="rn">' + esc(x.name) + '</span><span class="rd">' + esc(x.desc) +
        '</span><span class="rc">' + (x.cost ? x.cost + " AP" : "0 AP") + "</span></div>";
    });
    $("rules-actions").innerHTML = a;
  }

  function buildAbout() {
    var h = "";
    h += '<div class="rule-block"><h3>版本</h3><p>v' + esc(C.version) + "（" + esc(C.release) + "）</p>";
    h += "<p>单文件离线游戏：不联网、不收集任何数据。存档只保存在这台设备的浏览器里。</p></div>";
    h += '<div class="rule-block"><h3>更新记录</h3>';
    (C.changelog || []).forEach(function (c) {
      h += "<p><strong>v" + esc(c.v) + "</strong> · " + esc(c.date) + "<br>" + c.notes.join("<br>") + "</p>";
    });
    h += "</div>";
    h += '<div class="rule-block"><h3>玩法</h3><p>三十天，每天 3 点行动点。做选择，别把自己弄丢。</p></div>';
    $("about-body").innerHTML = h;
  }

  /* ================= 游戏界面 ================= */
  function renderGame(S) {
    $("hud-day").textContent = S.day;
    var ap = "";
    for (var i = 0; i < Math.max(S.ap, 0); i++) ap += '<span class="ap-pip on"></span>';
    for (var j = 0; j < Math.max(0, E.apMax() - S.ap); j++) ap += '<span class="ap-pip"></span>';
    $("hud-ap").innerHTML = ap;
    $("hud-ap-num").textContent = S.ap;

    renderStats(S);
    renderFrags(S);
    renderActions(S);
    renderLog(S);

    $("actions-hint").textContent = "明日熵税 ≈ " + E.taxFor(S.day + 1);
    var ph = $("persist-hint");
    if (ph) ph.classList.toggle("hidden", !!E.canPersist());
    $("btn-endday").disabled = !E.canEndDay();
    $("btn-endday").textContent = S.day >= C.config.days ? "结算这一天 →" : "结束这一天 →";
  }

  function renderStats(S) {
    var items = [
      ["现金", Math.round(S.cash), ""],
      ["健康", S.health, S.health < 30 ? "warn" : ""],
      ["记忆", S.memory, S.memory < 30 ? "warn" : ""],
      ["信用", S.credit, ""],
      ["影响力", S.influence, ""],
      ["逆熵点", S.ep, ""],
      ["熵值", S.entropy, S.entropy >= 7 ? "ent" : ""],
      ["债务", Math.round(S.debt), S.debt > 0 ? "warn" : ""],
      ["情报", S.intel, ""],
      ["市场", "×" + S.market.toFixed(2), ""]
    ];
    var html = "";
    items.forEach(function (it) {
      html += '<div class="stat ' + it[2] + '"><div class="k">' + it[0] + '</div><div class="v">' + it[1] + "</div></div>";
    });
    $("stats").innerHTML = html;
  }

  function renderFrags(S) {
    if (!S.fragments.length) {
      $("frags").innerHTML = '<span class="frag-empty">尚无规则碎片 · 第 3 枚起每天会啃食记忆</span>';
      return;
    }
    $("frags").innerHTML = S.fragments.map(function (id) {
      var f = C.fragments[id];
      if (!f) return "";
      return '<span class="frag' + (id === "badge" ? " badge" : "") + '" data-frag="' + id + '">' + esc(f.name) + "</span>";
    }).join("");
  }

  function renderActions(S) {
    var list = E.actions();
    var html = "";
    list.forEach(function (a) {
      var cost = a.cost ? '<span class="cost">' + a.cost + " AP</span>" : '<span class="cost">0 AP</span>';
      html += '<button class="action" data-act="' + a.id + '"' + (a.disabled ? " disabled" : "") + ">" +
        '<span class="an">' + esc(a.name) + cost + "</span>" +
        '<span class="ad">' + esc(a.desc) + "</span>" +
        (a.disabled && a.reason ? '<span class="ar">' + esc(a.reason) + "</span>" : "") +
        "</button>";
    });
    // 碎片技能
    if (S.fragments.indexOf("memoryCash") >= 0) {
      html += '<button class="action special" data-fragact="memoryCash"' + (S.usedToday.memoryCash ? " disabled" : "") + '>' +
        '<span class="an">记忆套现<span class="cost">0 AP</span></span><span class="ad">10 记忆 → 1000 现金（每天一次）</span></button>';
    }
    if (S.fragments.indexOf("influenceCash") >= 0) {
      html += '<button class="action special" data-fragact="influenceCash"' + (S.usedToday.influenceCash ? " disabled" : "") + '>' +
        '<span class="an">影响力兑现<span class="cost">0 AP</span></span><span class="ad">1 影响力 → 120 现金（每天一次）</span></button>';
    }
    if (S.fragments.indexOf("debtShift") >= 0) {
      html += '<button class="action special" data-fragact="debtShift"' + (S.usedToday.debtShift ? " disabled" : "") + '>' +
        '<span class="an">债务转移<span class="cost">0 AP</span></span><span class="ad">50% 债务 → 记忆损失（每天一次）</span></button>';
    }
    $("actions").innerHTML = html;
  }

  function renderLog(S) {
    var box = $("log");
    var items = S.log.slice(-80);
    box.innerHTML = items.map(function (l) {
      return '<div class="' + (l.c || "info") + '">' + esc(l.m) + "</div>";
    }).join("");
    box.scrollTop = box.scrollHeight;
  }

  /* ================= 弹层 ================= */
  function closeModal() {
    var root = $("modal-root");
    root.classList.add("hidden");
    root.innerHTML = "";
    modalState = { type: null, key: null };
  }
  function openModal(html) {
    var root = $("modal-root");
    root.innerHTML = '<div class="modal">' + html + "</div>";
    root.classList.remove("hidden");
  }

  function openStoryScene(sc) {
    var html = '<div class="modal-kicker">' + esc(sc.title) + "</div>";
    (sc.lines || []).forEach(function (line) {
      var isQuote = line.charAt(0) === "「";
      html += '<p class="' + (isQuote ? "q" : "") + '">' + esc(line) + "</p>";
    });
    html += '<div class="choices">';
    (sc.choices || []).forEach(function (c, i) {
      var blocked = c.require && !c.require(E.state());
      html += '<button class="choice" data-choice="' + i + '"' + (blocked ? " disabled" : "") + ">" +
        esc(c.text) + (blocked ? '<span class="req">' + esc(c.reqText || "条件不足") + "</span>" : "") +
        "</button>";
    });
    html += "</div>";
    openModal(html);
    modalState = { type: "story", key: sc.id };
  }

  function openFragmentChoice(ch) {
    var html = '<div class="modal-kicker">规则碎片</div><h2>' + esc(ch.title) + "</h2>" +
      '<p>碎片会跟着你走。它会改写规则，也会慢慢啃掉你的记忆。</p><div class="choices">';
    ch.options.forEach(function (id) {
      var f = C.fragments[id] || { name: id, desc: "" };
      html += '<button class="choice" data-frag="' + id + '"><strong>' + esc(f.name) + "</strong><span class=\"req\" style=\"color:#7d8fa3\">" + esc(f.desc) + "</span></button>";
    });
    html += "</div>";
    openModal(html);
    modalState = { type: "choice", key: ch.source };
  }

  function openAmount(cfg) {
    var html = '<div class="modal-kicker">' + esc(cfg.kicker || "交易") + "</div><h2>" + esc(cfg.title) + "</h2>";
    if (cfg.hint) html += "<p>" + esc(cfg.hint) + "</p>";
    html += '<input class="amount-input" id="amount-input" type="number" inputmode="numeric" value="' +
      cfg.initial + '" min="' + cfg.step + '" max="' + cfg.max + '" step="' + cfg.step + '">';
    html += '<div class="amount-box">';
    [0.25, 0.5, 1].forEach(function (p) {
      var v = Math.max(cfg.step, Math.floor(cfg.max * p / cfg.step) * cfg.step);
      if (v > cfg.max) v = cfg.max;
      html += '<button class="chip" data-amt="' + v + '">' + (p === 1 ? "全部 " : Math.round(p * 100) + "% ") + v + "</button>";
    });
    html += "</div>";
    html += '<div class="row"><button class="btn btn-ghost" id="amount-cancel">取消</button>' +
      '<button class="btn btn-primary" id="amount-ok">确认</button></div>';
    openModal(html);
    modalState = { type: "amount", key: cfg.key };
    var input = $("amount-input");
    input.addEventListener("input", function () {
      input.value = input.value.replace(/[^\d]/g, "").slice(0, 7);
    });
    input.focus();
    $("amount-cancel").onclick = closeModal;
    $("amount-ok").onclick = function () {
      var v = Math.floor(Number(input.value || 0));
      if (!(v >= cfg.step)) { input.value = cfg.initial; return; }
      v = Math.min(v, cfg.max);
      closeModal();
      cfg.onOk(v);
    };
  }

  function openBlack() {
    var html = '<div class="modal-kicker">黑市</div><h2>用 10 点健康换什么？</h2>' +
      '<p>不管换哪样，熵都会 +1。健康不是钱，但在这里它很接近钱。</p><div class="choices">' +
      '<button class="choice" data-black="ep">换 1 点逆熵点</button>' +
      '<button class="choice" data-black="cash">换 500 现金</button>' +
      "</div>";
    openModal(html);
    modalState = { type: "black", key: "black" };
  }

  function openMenu() {
    var html = '<div class="modal-kicker">选项</div><h2>交易所</h2><div class="choices">' +
      '<button class="choice" data-menu="rules">协议条款</button>' +
      '<button class="choice" data-menu="about">关于 / 版本 v' + esc(C.version) + "</button>" +
      '<button class="choice" data-menu="title">回到门厅（保留存档）</button>' +
      '<button class="choice" data-menu="restart">撕毁这一份，重新开始</button>' +
      "</div>";
    openModal(html);
    modalState = { type: "menu", key: "menu" };
  }

  function openFragmentInfo(id) {
    var f = C.fragments[id];
    if (!f) return;
    openModal('<div class="modal-kicker">规则碎片</div><h2>' + esc(f.name) + "</h2><p>" + esc(f.desc) + "</p>" +
      '<div class="row"><button class="btn btn-ghost" id="frag-close">知道了</button></div>');
    modalState = { type: "fraginfo", key: id };
    $("frag-close").onclick = closeModal;
  }

  /* ================= 结局 ================= */
  function renderEnding() {
    var S = E.state();
    var e = E.ending();
    if (!S || !e) return;
    closeModal();
    $("ending-title").textContent = e.title;
    $("ending-text").innerHTML = (e.text || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    var stats = [
      ["净资产", S.net], ["天数", S.day + " / " + C.config.days], ["健康", S.health],
      ["记忆", S.memory], ["熵值", S.entropy], ["债务", Math.round(S.debt)],
      ["现金", Math.round(S.cash)], ["影响力", S.influence], ["碎片", S.fragments.length]
    ];
    $("ending-stats").innerHTML = stats.map(function (it) {
      return '<div class="stat"><div class="k">' + it[0] + '</div><div class="v">' + it[1] + "</div></div>";
    }).join("");
    showScreen("ending");
  }

  /* ================= 同步 ================= */
  function sync() {
    var S = E.state();
    if (!S) { showScreen("title"); return; }
    if (S.over) { renderEnding(); return; }
    showScreen("game");
    renderGame(S);
    var sc = E.currentStory();
    if (sc) {
      if (modalState.type !== "story" || modalState.key !== sc.id) openStoryScene(sc);
      return;
    }
    var ch = E.currentChoice();
    if (ch && modalState.type !== "choice") openFragmentChoice(ch);
  }

  /* ================= 事件 ================= */
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest ? ev.target.closest("button, .frag") : null;
    if (!t) return;

    // 剧情选项
    if (t.dataset && t.dataset.choice !== undefined) {
      var idx = Number(t.dataset.choice);
      closeModal();
      E.resolveStory(idx);
      sync();
      return;
    }
    // 碎片三选一
    if (t.dataset && t.dataset.frag && t.classList.contains("choice")) {
      closeModal();
      E.resolveChoice(t.dataset.frag);
      sync();
      return;
    }
    // 碎片详情
    if (t.classList && t.classList.contains("frag") && t.dataset.frag) {
      openFragmentInfo(t.dataset.frag);
      return;
    }
    // 行动
    if (t.dataset && t.dataset.act) {
      var id = t.dataset.act;
      var S = E.state();
      if (!S) return;
      if (id === "black") { openBlack(); return; }
      if (id === "invLow" || id === "invHigh") {
        var max = id === "invHigh" ? Math.min(Math.floor(S.cash), C.config.highCap) : Math.floor(S.cash);
        if (max < 100) { return; }
        openAmount({
          kicker: "投资", title: id === "invHigh" ? "押多少？" : "投多少？",
          hint: id === "invHigh"
            ? "掷出 1-3 全损，4-5 返 1.8 倍，6 返 3.2 倍。上限 " + C.config.highCap + "。"
            : "次日按「市场 × 1.03」返还。市场均值 1.00。",
          max: max, step: 100, initial: Math.min(max, Math.max(100, Math.floor(max / 2))),
          key: id,
          onOk: function (v) { E.doAction(id, { amount: v }); sync(); }
        });
        return;
      }
      if (id === "pawn") {
        var maxMem = Math.floor(S.memory / 10) * 10;
        if (maxMem < 10) return;
        openAmount({
          kicker: "典当", title: "当掉多少记忆？",
          hint: "每 10 点记忆换 800 现金，熵 +1。记忆是有限的。",
          max: maxMem, step: 10, initial: Math.min(maxMem, 10), key: "pawn",
          onOk: function (v) { E.doAction("pawn", { amount: v }); sync(); }
        });
        return;
      }
      E.doAction(id, {});
      sync();
      return;
    }
    // 碎片技能
    if (t.dataset && t.dataset.fragact) {
      var fid = t.dataset.fragact;
      var St = E.state();
      if (fid === "memoryCash") {
        var mx = Math.floor(St.memory / 10) * 10;
        openAmount({ kicker: "碎片技能", title: "套现多少记忆？", hint: "10 记忆 → 1000 现金。每天一次。",
          max: mx, step: 10, initial: Math.min(mx, 10), key: "memoryCash",
          onOk: function (v) { E.useFragment("memoryCash", { amount: v }); sync(); } });
        return;
      }
      if (fid === "influenceCash") {
        openAmount({ kicker: "碎片技能", title: "兑现多少影响力？", hint: "1 影响力 → 120 现金。每天一次。",
          max: St.influence, step: 1, initial: Math.min(St.influence, 1), key: "influenceCash",
          onOk: function (v) { E.useFragment("influenceCash", { amount: v }); sync(); } });
        return;
      }
      E.useFragment(fid, {});
      sync();
      return;
    }
    // 黑市
    if (t.dataset && t.dataset.black) {
      closeModal();
      E.doAction("black", { blackCash: t.dataset.black === "cash" });
      sync();
      return;
    }
    // 菜单
    if (t.dataset && t.dataset.menu) {
      var m = t.dataset.menu;
      closeModal();
      if (m === "rules") { openRules(true); }
      else if (m === "about") { openAbout(true); }
      else if (m === "title") { returnTo = "title"; showScreen("title"); }
      else if (m === "restart") {
        if (window.confirm("撕毁当前契约，从第一天重新开始？存档会被覆盖。")) {
          E.clearSave(); E.newGame(); sync();
        }
      }
      return;
    }
    // 金额快捷
    if (t.dataset && t.dataset.amt) {
      var inp = $("amount-input");
      if (inp) inp.value = t.dataset.amt;
      return;
    }
  });

  /* ================= 启动 ================= */
  function boot() {
    buildRules();
    buildAbout();
    $("tagline").textContent = C.tagline;
    $("title-version").textContent = "v" + C.version;
    var tw = $("title-warn");
    if (tw) tw.classList.toggle("hidden", !!E.canPersist());

    var btnContinue = $("btn-continue");
    if (!E.hasSave()) { btnContinue.disabled = true; btnContinue.textContent = "继续上次的契约（暂无存档）"; }

    $("btn-new").onclick = function () { E.newGame(); sync(); };
    btnContinue.onclick = function () {
      if (!E.loadGame()) { alert("存档读取失败，可能来自旧版本。"); return; }
      sync();
    };
    $("btn-rules").onclick = function () { openRules(false); };
    $("btn-about").onclick = function () { openAbout(false); };
    $("btn-rules-back").onclick = goBack;
    $("btn-rules-close").onclick = goBack;
    $("btn-rules-start").onclick = function () { E.newGame(); sync(); };
    $("btn-about-back").onclick = goBack;
    $("btn-clear-save").onclick = function () {
      if (window.confirm("确定清除存档？这一局就没了。")) {
        E.clearSave();
        alert("存档已清除。");
      }
    };
    $("btn-menu").onclick = openMenu;
    $("btn-endday").onclick = function () { E.endDay(); sync(); };
    $("btn-again").onclick = function () { E.clearSave(); E.newGame(); sync(); };
    $("btn-to-title").onclick = function () { showScreen("title"); };
    $("modal-root").onclick = function (ev) {
      if (ev.target === $("modal-root") && modalState.type !== "story" && modalState.type !== "choice") closeModal();
    };

    E.subscribe(function () {
      var S = E.state();
      if (!S) return;
      if (S.over) { renderEnding(); return; }
      if ($("screen-game").classList.contains("hidden")) {
        // 从标题/规则进入游戏
        showScreen("game");
      }
      sync();
    });

    showScreen("title");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.UI = { sync: sync };
})();
